import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {makeSpacesManifest} from "../scripts/build-spaces-manifest.mjs";

async function source(){
  const dir=await mkdtemp(join(tmpdir(),"spaces-sage-"));
  await mkdir(join(dir,"dune","pages"),{recursive:true});
  await writeFile(join(dir,"index.json"),JSON.stringify({books:[
    {id:"dune",title:"Dune",totalPages:2},
    {id:"empty-book",title:"Empty",totalPages:0}
  ]}));
  await writeFile(join(dir,"dune","info.json"),JSON.stringify({
    id:"dune",title:"Dune",author:"Frank Herbert",
    description:"Example source",totalPages:2
  }));
  for(const [n,text] of [[1,"First safe page"],[2,"Second safe page"]]){
    await writeFile(join(dir,"dune","pages",n+".json"),
      JSON.stringify({page:n,totalPages:2,text}));
  }
  return dir;
}
test("Sage emits deterministic canonical genre manifest and preserves zero-page record",async()=>{
  const dir=await source();
  try{
    const a=await makeSpacesManifest(dir),b=await makeSpacesManifest(dir);
    assert.deepEqual(a,b);
    assert.equal(a.schemaVersion,1);
    assert.equal(a.books.length,1);
    assert.equal(a.books[0].genre,"Science Fiction");
    assert.match(a.books[0].pageDigest,/^[a-f0-9]{64}$/);
    assert.match(a.books[0].digest,/^[a-f0-9]{64}$/);
    assert.deepEqual(a.skipped,[{sourceBookId:"empty-book",reason:"zero_pages"}]);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test("Sage manifest builder refuses missing pages, duplicate IDs and changed numbering",async()=>{
  const dir=await source();
  try{
    await writeFile(join(dir,"dune","pages","2.json"),
      JSON.stringify({page:1,totalPages:2,text:"Second safe page"}));
    await assert.rejects(()=>makeSpacesManifest(dir),/Invalid source page/);
    await writeFile(join(dir,"index.json"),
      JSON.stringify({books:[{id:"dune",totalPages:2},{id:"dune",totalPages:2}]}));
    await assert.rejects(()=>makeSpacesManifest(dir),/Invalid source page|Duplicate/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
