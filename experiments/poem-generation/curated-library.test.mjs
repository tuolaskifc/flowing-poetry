import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import lib from './curated-library.js';
import lexicon from './imagery-lexicon.js';
const catalog=JSON.parse(await readFile(new URL('./curated-poems.json',import.meta.url),'utf8'));
test('twenty editorial samples retain sources, gaps and five unfinished focus paintings',()=>{
  assert.equal(lib.validate(catalog),catalog);assert.equal(catalog.poems.length,20);assert.equal(catalog.poems.filter(p=>p.focus).length,5);
  const tools=new Set(lexicon.rules.map(r=>r.tool));
  for(const p of catalog.poems){assert(p.imagery.length&&p.gaps.length);assert(p.available_tools.every(t=>tools.has(t)));assert.notEqual(p.review,'已认可');assert(p.source.note);}
  assert(catalog.poems.some(p=>p.available_tools.length===0),'unimplemented scenes remain in the collection');
});
test('source metadata excludes editorial interpretations and drawing targets',()=>{
  const source=lib.sourceFor(catalog.poems[0]);assert.deepEqual(Object.keys(source).sort(),['author','dynasty','provider','title']);assert.equal(source.provider,'精选诗句库');assert(!JSON.stringify(source).includes(catalog.poems[0].goal));
});
test('selection cycles the full library with focus samples first and supports stable ids',()=>{
  const list=lib.ordered(catalog);assert(list.slice(0,5).every(p=>p.focus));assert.equal(lib.next(catalog,'不在库中的输入').id,'p01');assert.equal(lib.next(catalog,list.at(-1).poem).id,'p01');
  assert.equal(lib.find(catalog,'p03').author,'韦应物');assert.equal(lib.find(catalog,'missing'),null);
  const visited=new Set();let text='';for(let i=0;i<20;i++){const p=lib.next(catalog,text);visited.add(p.id);text=p.poem;}assert.equal(visited.size,20);
});
test('duplicate texts, missing attribution and oversized inputs fail validation',()=>{
  const duplicate=structuredClone(catalog);duplicate.poems[1].poem=duplicate.poems[0].poem;assert.throws(()=>lib.validate(duplicate),/重复/);
  const missing=structuredClone(catalog);missing.poems[0].source.url='http://example.invalid';assert.throws(()=>lib.validate(missing),/出处/);
  const long=structuredClone(catalog);long.poems[0].poem='月'.repeat(201);assert.throws(()=>lib.validate(long),/长度/);
});
