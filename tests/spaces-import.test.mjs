import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {SHELVES,resolveShelf} from "../scripts/spaces-genres.mjs";
import {makeManifest,readBookPages} from "../scripts/import-spaces.mjs";

const source={id:"dune",title:"Dune",author:"Frank Herbert",
  description:"",totalPages:2};
const pages=["First synthetic test page","Second synthetic test page"];
test("genre shelves match Spaces API's canonical identifiers",()=>{
  assert.equal(SHELVES.length,16);
  assert.equal(new Set(SHELVES).size,SHELVES.length);
  assert.equal(resolveShelf(source),"Science Fiction");
  assert.equal(resolveShelf({id:"unseen",subjects:["urban fantasy"]}),"Fantasy");
  assert.equal(resolveShelf({id:"unseen",genre:"Technology & AI"}),"Technology & AI");
  assert.equal(resolveShelf({id:"untitled-document",description:""}),"Unclassified");
  assert.equal(resolveShelf({id:"dune",genre:"Unclassified"}),"Science Fiction");
});
test("manifest hashes pages and includes genre changes in immutable version ID",()=>{
  const one=makeManifest(source,pages);
  const again=makeManifest(source,pages);
  assert.deepEqual(one,again);
  assert.match(one.pageDigest,/^[a-f0-9]{64}$/);
  assert.match(one.digest,/^[a-f0-9]{64}$/);
  assert.notEqual(makeManifest({...source,genre:"Fantasy"},pages).digest,one.digest);
  assert.notEqual(makeManifest(source,["Different","Second synthetic test page"]).digest,
    one.digest);
});
test("invalid or unverified books cannot be staged",()=>{
  assert.throws(()=>makeManifest({...source,totalPages:3},pages));
  assert.throws(()=>makeManifest({...source,id:"../forged"},pages));
  assert.throws(()=>makeManifest(source,["","Text"]));
  assert.throws(()=>makeManifest(source,["x".repeat(18001),"Text"]));
  assert.throws(()=>makeManifest({...source,title:""},pages));
});
test("reader rejects missing/out-of-order pages before import",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"spaces-sage-"));
  try{
    const dir=path.join(root,"dune","pages");
    await mkdir(dir,{recursive:true});
    await writeFile(path.join(dir,"1.json"),JSON.stringify({page:1,totalPages:2,text:pages[0]}));
    await writeFile(path.join(dir,"2.json"),JSON.stringify({page:2,totalPages:2,text:pages[1]}));
    assert.deepEqual(await readBookPages(source,root),pages);
    await writeFile(path.join(dir,"2.json"),JSON.stringify({page:3,totalPages:2,text:pages[1]}));
    await assert.rejects(()=>readBookPages(source,root),/Mismatched source page/);
  }finally{await rm(root,{recursive:true,force:true});}
});
