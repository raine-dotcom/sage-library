#!/usr/bin/env node
/**
 * GitHub Actions upload bridge: generated JSON -> authenticated Spaces API.
 * Requires two repository secrets; absent secrets mean no import.
 * Import is incremental/idempotent, does not delete books and cannot publish
 * a partial/mismatched revision.
 */
import {readFile,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {classifyGenre,GENRE_SHELVES} from "./genres.mjs";

const root=resolve(fileURLToPath(new URL("../data/",import.meta.url)));
const idPattern=/^[a-z0-9][a-z0-9-]{0,179}$/;
const dryRun=process.argv.includes("--dry-run");
const reportPath=process.argv.find(x=>x.startsWith("--manifest-report="))?.slice("--manifest-report=".length);
if(reportPath&&!dryRun)throw Error("Manifest export is allowed only in --dry-run mode");
const token=process.env.SPACES_LIBRARY_IMPORT_TOKEN||"";
const value=process.env.SPACES_LIBRARY_IMPORT_BASE_URL||"";
if(!dryRun&&(!(/^slib_[A-Za-z0-9_-]{40,192}$/).test(token)||!value)){
  console.error("Spaces import not configured; no requests made.");
  process.exit(2);
}
let origin="";
if(!dryRun)try{
  const url=new URL(value);
  if(url.protocol!=="https:"||url.hostname!=="spaces.artificiallyferal.com"||
    url.port||url.username||url.password||url.search||
    url.hash||url.pathname!=="/")throw Error("not the approved Spaces HTTPS origin");
  origin=url.origin;
}catch{throw Error("SPACES_LIBRARY_IMPORT_BASE_URL must be a trusted HTTPS origin");}
const accessId=process.env.SPACES_CF_ACCESS_CLIENT_ID||"";
const accessSecret=process.env.SPACES_CF_ACCESS_CLIENT_SECRET||"";
if(!dryRun&&Boolean(accessId)!==Boolean(accessSecret))
  throw Error("Cloudflare Access client ID and secret must both be set");
const readJson=async(path)=>JSON.parse(await readFile(path,"utf8"));
async function send(path,payload){
  const result=await fetch(origin+path,{
    method:"POST",redirect:"error",signal:AbortSignal.timeout(20000),
    headers:{Authorization:"Bearer "+token,"Content-Type":"application/json",
      Accept:"application/json",
      ...(accessId?{"CF-Access-Client-Id":accessId,
        "CF-Access-Client-Secret":accessSecret}:{})},
    body:JSON.stringify(payload)
  });
  const body=await result.text();
  if(body.length>3000)throw Error("Spaces importer returned oversized response");
  let parsed;
  try{parsed=JSON.parse(body);}catch{throw Error("Spaces importer returned invalid JSON");}
  if(!result.ok)throw Error("Spaces import request failed ("+result.status+"): "+
    String(parsed.error||"unknown"));
  return parsed;
}
let imported=0,unchanged=0,skipped=0;
const manifests=[];
const catalog=await readJson(join(root,"index.json"));
if(!Array.isArray(catalog.books))throw Error("Invalid generated catalog");
const ids=new Set();
for(const book of catalog.books){
  const id=book.id;
  if(typeof id!=="string"||!idPattern.test(id)||ids.has(id))
    throw Error("Unsafe or duplicate book ID in index");
  ids.add(id);
  const count=book.totalPages;
  if(!Number.isSafeInteger(count)||count<1||count>5000){
    console.warn("Skipping incomplete book "+id+": "+String(count)+" pages");
    skipped++;continue;
  }
  const info=await readJson(join(root,id,"info.json"));
  if(info.id!==id||info.totalPages!==count)
    throw Error("Info/index mismatch for "+id);
  const texts=[];
  for(let n=1;n<=count;n++){
    const page=await readJson(join(root,id,"pages",n+".json"));
    if(page.page!==n||page.totalPages!==count||
      typeof page.text!=="string"||!page.text.trim()||
      page.text.length>18000)throw Error("Unusable page "+n+" for "+id);
    texts.push(page.text);
  }
  const pageDigest=createHash("sha256").update(JSON.stringify(texts),"utf8").digest("hex");
  const manifest={
    sourceBookId:id,title:String(info.title||id).slice(0,250),
    author:info.author?String(info.author).slice(0,220):null,
    description:String(info.description||"").slice(0,1500),
    genre:GENRE_SHELVES.includes(info.genre||book.genre)?(info.genre||book.genre):
      classifyGenre({id,title:info.title,description:info.description}),
    totalPages:count,pageDigest
  };
  // Include metadata in revision identity: a genre correction can publish
  // a new catalog version even when the book's page contents are unchanged.
  const digest=createHash("sha256").update(JSON.stringify(manifest),"utf8").digest("hex");
  if(dryRun){
    manifests.push({...manifest,digest});
    console.log("Dry run verified:",id,"genre:",manifest.genre,"pages:",count);
    unchanged++;continue;
  }
  const prepared=await send("/api/library-import/stage",{...manifest,digest});
  if(prepared.alreadyPublished===true){
    unchanged++;continue;
  }
  if(typeof prepared.versionId!=="string")throw Error("Stage not confirmed for "+id);
  for(let offset=0;offset<count;offset+=12){
    const pages=texts.slice(offset,offset+12).map((text,i)=>({
      pageNumber:offset+i+1,text
    }));
    const uploaded=await send("/api/library-import/pages",{
      sourceBookId:id,digest,pages
    });
    if(uploaded.accepted!==pages.length&&uploaded.alreadyPublished!==true)
      throw Error("Unconfirmed page batch for "+id);
  }
  const published=await send("/api/library-import/publish",{sourceBookId:id,digest});
  if(published.published!==true||published.pages!==count)
    throw Error("Publish not confirmed for "+id);
  console.log("Verified published:",id,"pages:",count);
  imported++;
}
if(reportPath){
  await writeFile(reportPath,JSON.stringify({books:manifests},null,2)+"\n",{flag:"wx",mode:0o600});
  console.log("Wrote private metadata/version manifest (no book pages).");
}
console.log("Spaces Library sync finished:",{imported,unchanged,skipped,dryRun});
