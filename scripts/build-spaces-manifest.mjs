#!/usr/bin/env node
/**
 * Creates the pinned-revision manifest consumed by Spaces' pull worker.
 * The human uploads source books, not individual genre shelves.
 *
 * A full, successfully processed data/ snapshot is mandatory. One zero-page
 * legacy entry is permitted and recorded as skipped; any corrupt readable
 * book stops publication of the manifest.
 */
import {readFile,writeFile,rename,unlink} from "node:fs/promises";
import {join,resolve} from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath,pathToFileURL} from "node:url";
import {classifyGenre,GENRE_SHELVES} from "./genres.mjs";

const root=resolve(fileURLToPath(new URL("../data/",import.meta.url)));
const BOOK=/^[a-z0-9][a-z0-9-]{0,179}$/;
const digest=x=>createHash("sha256").update(x,"utf8").digest("hex");
const readJson=async p=>JSON.parse(await readFile(p,"utf8"));
function check(v,predicate,message){if(!predicate(v))throw Error(message);return v;}
export async function makeSpacesManifest(sourceDir=root){
  const index=await readJson(join(sourceDir,"index.json"));
  if(!Array.isArray(index?.books)||index.books.length>5000)
    throw Error("Invalid Sage generated index");
  const seen=new Set(),books=[],skipped=[];
  for(const item of index.books){
    const id=check(item?.id,x=>typeof x==="string"&&BOOK.test(x),"Invalid source ID");
    if(seen.has(id))throw Error("Duplicate source ID");
    seen.add(id);
    const count=check(item.totalPages,
      x=>Number.isSafeInteger(x)&&x>=0&&x<=5000,"Invalid source page count");
    if(count===0){
      skipped.push({sourceBookId:id,reason:"zero_pages"});
      continue;
    }
    const info=await readJson(join(sourceDir,id,"info.json"));
    if(info?.id!==id||info.totalPages!==count)
      throw Error("Source metadata mismatch: "+id);
    const pages=[];
    for(let n=1;n<=count;n++){
      const page=await readJson(join(sourceDir,id,"pages",n+".json"));
      if(page?.page!==n||page.totalPages!==count||
          typeof page.text!=="string"||!page.text.trim()||
          page.text.length>18000)
        throw Error("Invalid source page: "+id+" #"+n);
      pages.push(page.text);
    }
    const genre=GENRE_SHELVES.includes(info.genre||item.genre)
      ?info.genre||item.genre
      :classifyGenre({id,title:info.title,description:info.description});
    const manifest={
      sourceBookId:id,
      title:String(info.title||id).slice(0,250),
      author:info.author?String(info.author).slice(0,220):null,
      description:String(info.description||"").slice(0,1500),
      genre,
      totalPages:count,
      pageDigest:digest(JSON.stringify(pages))
    };
    if(!manifest.title.trim()||manifest.author!==null&&manifest.author.length>220||
       !GENRE_SHELVES.includes(manifest.genre))throw Error("Bad catalog record: "+id);
    books.push({...manifest,digest:digest(JSON.stringify(manifest))});
  }
  return {schemaVersion:1,source:"raine-dotcom/sage-library",
    books,skipped};
}
export async function writeSpacesManifest(sourceDir=root){
  const manifest=await makeSpacesManifest(sourceDir);
  const target=join(sourceDir,"spaces-manifest.json");
  const temp=target+".pending-"+process.pid;
  try{
    await writeFile(temp,JSON.stringify(manifest,null,2)+"\n",{flag:"wx",mode:0o600});
    await rename(temp,target);
  }finally{await unlink(temp).catch(()=>{});}
  return manifest;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.length!==3||process.argv[2]!=="--write"){
    console.error("Usage: node scripts/build-spaces-manifest.mjs --write");
    process.exitCode=2;
  }else{
    writeSpacesManifest().then(report=>console.log(
      "Spaces manifest built:",{books:report.books.length,skipped:report.skipped.length}
    )).catch(e=>{console.error("Spaces manifest failed:",e.message);process.exitCode=1;});
  }
}
