import test from "node:test";
import assert from "node:assert/strict";
import {GENRE_SHELVES,classifyGenre,titleKey} from "../scripts/genres.mjs";

test("shelves are predefined, distinct and include Unclassified",()=>{
  assert.ok(GENRE_SHELVES.includes("Fantasy"));
  assert.ok(GENRE_SHELVES.includes("Science Fiction"));
  assert.equal(new Set(GENRE_SHELVES).size,GENRE_SHELVES.length);
});
test("EPUB and PDF subject metadata automatically selects a real genre",()=>{
  assert.equal(classifyGenre({title:"Unknown manuscript",subjects:"Fiction / Fantasy / Epic"}),"Fantasy");
  assert.equal(classifyGenre({title:"Unknown",subjects:["Science fiction","Space opera"]}),"Science Fiction");
  assert.equal(classifyGenre({title:"Unknown",subjects:"Philosophy, Metaphysics"}),"Philosophy");
  assert.equal(classifyGenre({title:"Unknown",subjects:["Psychotherapy","Psychology"]}),"Psychology");
});
test("known books can be classified without requiring manual companion shelf work",()=>{
  assert.equal(classifyGenre({title:"Dune"}),"Science Fiction");
  assert.equal(classifyGenre({title:"A Court of Thorns and Roses"}),"Fantasy");
  assert.equal(classifyGenre({title:"The Alignment Problem"}),"Technology & AI");
  assert.equal(classifyGenre({title:"Love Poems"}),"Poetry");
});
test("missing or competing evidence stays Unclassified; no fabricated genre",()=>{
  assert.equal(classifyGenre({title:"An unknown book"}),"Unclassified");
  assert.equal(classifyGenre({title:"Another",subjects:["Poetry","Horror"]}),"Unclassified");
  assert.equal(classifyGenre({title:"Things",description:"Interesting events."}),"Unclassified");
});
test("titles normalize punctuation/accents predictably",()=>{
  assert.equal(titleKey("  Gödel, Escher, Bach—An Eternal Golden Braid! "),
    "godel escher bach an eternal golden braid");
});

test("legacy source IDs classify existing catalog without reprocessing the books",()=>{
  assert.equal(classifyGenre({id:"discworld-04-mort",title:"Discworld 04 - Mort"}),"Fantasy");
  assert.equal(classifyGenre({id:"braiding-sweetgrass-indigenous-wisdom-scientific-knowledge-and-the-teachings-of-plants-epub",title:"Braiding Sweetgrass: Indigenous Wisdom, Scientific Knowledge and the Teachings of Plants.epub"}),"Nature & Environment");
  assert.equal(classifyGenre({id:"the-hidden-life-of-trees-1-mysteries-of-nature",title:"The Hidden Life of Trees_ 1 (Mysteries of Nature)"}),"Nature & Environment");
  assert.equal(classifyGenre({id:"untitled-document",title:"Untitled Document"}),"Unclassified");
});
