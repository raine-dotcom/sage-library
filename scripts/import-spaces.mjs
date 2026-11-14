#!/usr/bin/env node
// Stage and atomically publish processed sage-library books into Spaces.
// No activation without an explicit Spaces-import workflow opt-in and secrets.
// Run locally without credentials: node scripts/import-spaces.mjs --dry-run
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {resolveShelf} from "./spaces-genres.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const DATA=path.join(ROOT,"data");
const ID=/^[a-z0-9][a-z0-9-]{0,179}$/;
const TOKEN=/^slib_[A-Za-z0-9_-]{40,192}$/;
const HASH=x=>createHash("sha256").update(x,"utf8").digest("hex");
const dryRun=process.argv.includes("--dry-run");
const only=process.argv.find(x=>x.startsWith("--book="))?.slice("--book=".length);
const MAX_PAGES=5000;
const PAGE_BATCH_SIZE=12;
const SHORT_TIMEOUT_MS=30000;

export function makeManifest(book,pages){
  if(!book||typeof book!=="object"||!ID.test(book.id)||typeof book.title!=="string"||
    !book.title.trim()||book.title.length>250||
    typeof book.author!=="string"||book.author.length>220||
    typeof book.description!=="string"||book.description.length>1500||
    !Number.isSafeInteger(book.totalPages)||book.totalPages<1||
    book.totalPages>MAX_PAGES||!Array.isArray(pages)||pages.length!==book.totalPages)
    throw Error("Invalid book metadata or page count: "+String(book?.id));
  for(const page of pages){
    if(typeof page!=="string"||!page.trim()||page.length>18000)
      throw Error("Invalid page content: "+book.id);
  }
  const genre=resolveShelf(book);
  const pageDigest=HASH(JSON.stringify(pages));
  const author=book.author.trim()||null;
  const title=book.title.trim();
  const description=book.description.trim();
  const digest=HASH(JSON.stringify([
    book.id,title,author,description,genre,book.totalPages,pageDigest
  ]));
  return {sourceBookId:book.id,title,author,description,genre,
    totalPages:book.totalPages,digest,pageDigest};
}

export async function readBookPages(book,root=DATA){
  if(!ID.test(book.id)||!Number.isSafeInteger(book.totalPages)||
    book.totalPages<1||book.totalPages>MAX_PAGES)throw Error("Invalid book ID/count");
  const result=[];
  for(let n=1;n<=book.totalPages;n++){
    const source=path.join(root,book.id,"pages",String(n)+".json");
    const data=JSON.parse(await readFile(source,"utf8"));
    if(data.page!==n||data.totalPages!==book.totalPages)
      throw Error("Mismatched source page sequence: "+book.id+" page "+n);
    result.push(data.text);
  }
  return result;
}

function config(){
  const token=process.env.SPACES_IMPORT_TOKEN||"";
  const raw=process.env.SPACES_IMPORT_URL||"";
  if(!TOKEN.test(token))throw Error("Spaces import token is missing or invalid");
  let url;
  try{url=new URL(raw);}catch{throw Error("Spaces import URL is missing or invalid");}
  // Prevent a misconfigured CI secret from sending credentials to a
  // different host, a plaintext origin or an embedded userinfo URL.
  if(url.protocol!=="https:"||url.hostname!=="spaces.artificiallyferal.com"||
     url.port||url.pathname!=="/"||url.search||url.hash||url.username||url.password)
    throw Error("Import destination must be https://spaces.artificiallyferal.com/");
  const cloudflareId=process.env.SPACES_CF_ACCESS_CLIENT_ID||"";
  const cloudflareSecret=process.env.SPACES_CF_ACCESS_CLIENT_SECRET||"";
  if(Boolean(cloudflareId)!==Boolean(cloudflareSecret))
    throw Error("Cloudflare service credentials must be configured as a pair");
  return {url,token,cloudflareId,cloudflareSecret};
}

async function post(config,endpoint,payload){
  const headers={"Content-Type":"application/json",
    "Authorization":"Bearer "+config.token};
  if(config.cloudflareId){
    headers["CF-Access-Client-Id"]=config.cloudflareId;
    headers["CF-Access-Client-Secret"]=config.cloudflareSecret;
  }
  // Stage/page/publish are idempotent; bounded retries are safe if
  // the server completed an earlier request but the connection failed.
  let last;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const response=await fetch(new URL(endpoint,config.url),{
        method:"POST",headers,body:JSON.stringify(payload),
        redirect:"error",signal:AbortSignal.timeout(SHORT_TIMEOUT_MS)
      });
      if(!response.ok){
        const status=response.status;
        if(status>=500&&attempt<3){last=Error("Import server status "+status);continue;}
        throw Error("Spaces import "+endpoint+" failed with HTTP "+status);
      }
      const body=await response.json();
      if(!body||typeof body!=="object")throw Error("Malformed import response");
      return body;
    }catch(error){
      last=error;
      if(attempt>=3||/^Spaces import /.test(String(error.message)))throw error;
    }
  }
  throw last||Error("Import failed");
}

export async function syncBook(config,manifest,pages){
  const staged=await post(config,"/api/library-import/stage",manifest);
  if(typeof staged.alreadyPublished!=="boolean")throw Error("Invalid stage response");
  if(staged.alreadyPublished)return "unchanged";
  for(let offset=0;offset<pages.length;offset+=PAGE_BATCH_SIZE){
    const batch=pages.slice(offset,offset+PAGE_BATCH_SIZE).map((text,i)=>({
      pageNumber:offset+i+1,text
    }));
    const accepted=await post(config,"/api/library-import/pages",{
      sourceBookId:manifest.sourceBookId,digest:manifest.digest,pages:batch
    });
    if(accepted.alreadyPublished!==false||accepted.accepted!==batch.length)
      throw Error("Unexpected page acknowledgement for "+manifest.sourceBookId);
  }
  const published=await post(config,"/api/library-import/publish",{
    sourceBookId:manifest.sourceBookId,digest:manifest.digest
  });
  if(published.published!==true||published.pages!==manifest.totalPages)
    throw Error("Invalid publish acknowledgement: "+manifest.sourceBookId);
  return "published";
}

async function main(){
  const index=JSON.parse(await readFile(path.join(DATA,"index.json"),"utf8"));
  if(!Array.isArray(index.books))throw Error("Missing source book index");
  const seen=new Set();
  const entries=index.books.filter(b=>!only||b.id===only);
  if(only&&!entries.length)throw Error("Unknown source book ID");
  const remote=dryRun?null:config();
  let published=0,unchanged=0,skipped=0;
  for(const book of entries){
    if(typeof book?.id!=="string"||!ID.test(book.id)||seen.has(book.id))
      throw Error("Invalid or duplicate source book ID");
    seen.add(book.id);
    if(book.totalPages===0){
      skipped++;
      console.warn("Skipping book with no readable pages:",book.id);
      continue;
    }
    const pages=await readBookPages(book);
    const manifest=makeManifest(book,pages);
    if(dryRun){
      console.log("Verified:",manifest.sourceBookId,"| shelf:",manifest.genre,
        "| pages:",manifest.totalPages);
      continue;
    }
    const outcome=await syncBook(remote,manifest,pages);
    if(outcome==="published")published++;else unchanged++;
    console.log("Spaces catalog:",manifest.sourceBookId,outcome);
  }
  console.log("Library check complete:",{
    books:entries.length,skipped, ...(dryRun?{dryRun:true}:{published,unchanged})
  });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(e=>{console.error("Library import stopped:",e.message);process.exitCode=1;});
