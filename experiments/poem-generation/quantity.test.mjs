import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {quantity,fixture,lotusFixture} from './quantity-fixtures.mjs';
import {validateQuantityContract} from './quantity-contract.mjs';
import {buildPlan} from './planner.mjs';
import {createGenerationService} from './service.mjs';
test('3.1 requires quantity and checks evidence, references and finite count ranges',()=>{
  const a=lotusFixture();assert(validateQuantityContract(a,a.poem).valid);
  for(const mutate of [v=>delete v.entities[0].quantity,v=>v.entities[0].quantity.evidence=['虚构依据'],v=>v.entities[0].quantity.evidence=['映日荷花别样红'],v=>Object.assign(v.entities[0].quantity,{mode:'exact',min:1,max:2}),v=>v.entities[0].quantity.x=123,v=>v.schema_version='3.0']){const b=structuredClone(a);mutate(b);assert.equal(validateQuantityContract(b,b.poem).valid,false);}
});
test('explicit exact quantities make distinct units while an isolated boat stays one',()=>{
  const e=fixture('两朵花，一叶孤舟。',[{text:'花',quantity:quantity({mode:'exact',min:2,max:2,unit:'朵',scope:'individual',evidence:['两朵花']})},{text:'孤舟',kind:'object',quantity:quantity({mode:'exact',min:1,max:1,unit:null,scope:'individual',extent:'local',evidence:['一叶孤舟']})}]);
  assert(validateQuantityContract(e,e.poem).valid);const p=buildPlan(e);assert.equal(p.layers.find(l=>l.tool==='flower').instances.length,2);assert.equal(p.layers.find(l=>l.tool==='boat').instances.length,1);assert(p.layers.every(l=>l.quantity.exact));assert.notDeepEqual(p.layers.find(l=>l.tool==='flower').instances[0].placement,p.layers.find(l=>l.tool==='flower').instances[1].placement);
});
test('a lotus field has broad, layered coverage without inventing water, and no-qiong does not freeze it',()=>{
  const p=buildPlan(lotusFixture());assert.deepEqual(p.layers.map(l=>l.tool),['lotus','lotus']);assert(p.layers.every(l=>l.instances.length>8&&l.animate));assert(p.layers.every(l=>l.quantity.collective&&!l.quantity.exact));
  const leaves=p.layers[0].instances;assert(Math.max(...leaves.map(i=>i.placement.at[0]))-Math.min(...leaves.map(i=>i.placement.at[0]))>.8);assert(Math.max(...leaves.map(i=>i.placement.scale))/Math.min(...leaves.map(i=>i.placement.scale))>2);assert.equal(new Set(leaves.map(i=>i.variant)).size,3);
});
test('scope keeps distance, groups and branch counts separate from individual counts',()=>{
  const a=fixture('十里荷花，三枝柳，一行鱼。',[{text:'荷花',quantity:quantity({mode:'exact',min:10,max:10,unit:'里',scope:'extent',extent:'spread',evidence:['十里荷花']})},{text:'柳',quantity:quantity({mode:'exact',min:3,max:3,unit:'枝',scope:'part',evidence:['三枝柳']})},{text:'鱼',quantity:quantity({mode:'exact',min:1,max:1,unit:'行',scope:'group',evidence:['一行鱼']})}]);
  assert(validateQuantityContract(a,a.poem).valid);const p=buildPlan(a);assert.notEqual(p.layers.find(l=>l.tool==='lotus').quantity.rendered,10);assert(p.layers.find(l=>l.tool==='willow').quantity.partUnsupported);assert(!p.layers.find(l=>l.tool==='willow').quantity.exact);assert(p.layers.find(l=>l.tool==='fish').instances.length>1);
  const branches=fixture('三两枝梅。',[{text:'梅',quantity:quantity({mode:'range',min:2,max:3,unit:'枝',scope:'part',evidence:['三两枝梅']})}]);assert.equal(buildPlan(branches).layers[0].instances.length,3);assert(!buildPlan(branches).layers[0].quantity.exact);
});
test('few and range differ from expansive fields, and duplicated references stay one semantic entity',()=>{
  const a=fixture('三两朵花，几尾鱼。',[{text:'花',quantity:quantity({mode:'range',min:2,max:3,unit:'朵',scope:'individual',evidence:['三两朵花']})},{text:'鱼',quantity:quantity({mode:'few',unit:'尾',scope:'individual',evidence:['几尾鱼']})}]);
  assert(validateQuantityContract(a,a.poem).valid);const p=buildPlan(a);assert(p.layers.every(l=>l.instances.length<=3));
  const b=fixture('舟行，船行。',[{text:'舟',mentions:['舟','船'],concept:'同一条船',quantity:quantity({mode:'exact',min:1,max:1,scope:'individual',evidence:['舟行']})}]);assert.equal(buildPlan(b).layers[0].instances.length,1);
});
test('large exact counts are bounded with a visible limitation and deterministic grouping',()=>{
  const a=fixture('百朵花。',[{text:'花',quantity:quantity({mode:'exact',min:100,max:100,unit:'朵',scope:'individual',evidence:['百朵花']})}]);const p=buildPlan(a);assert.equal(p.layers[0].instances.length,48);assert(!p.layers[0].quantity.exact);assert(p.notes.some(n=>n.includes('预算')));assert.deepEqual(p,buildPlan(a));
});
test('unsupported and absent objects are not invented to fill the page',()=>{
  const a=fixture('满园桃花，水不见。',[{text:'桃花',quantity:quantity({mode:'many',extent:'spread',evidence:['满园桃花']})},{text:'水',kind:'environment',presence:'absent'}]);assert.deepEqual(buildPlan(a).layers.filter(l=>!l.inferred).map(l=>l.tool),['tree']);assert(!buildPlan(a).layers.some(l=>l.tool==='water'));assert(buildPlan(a).omitted.some(e=>e.name==='水'));
});
test('explicit quantity mode requests quantity-aware semantics and refuses a legacy answer without repairing it',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'poem-quantity-'));try{
    const config=join(dir,'credentials');await writeFile(config,'https://example.invalid/v1\ndummy-quantity-key\ntest-model\n');let calls=0;
    const service=createGenerationService({credentialsPath:config,runsDir:join(dir,'runs'),fetcher:async(_url,options)=>{calls++;const request=JSON.parse(options.body);assert(request.messages[0].content.includes('3.1'));assert(request.messages[0].content.includes('quantity'));return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(lotusFixture())}}]}));}});
    const a=await service.analyze({poem:lotusFixture().poem,mode:'quantity'});assert(a.validation.valid);assert.equal(a.mode,'quantity');await service.analyze({poem:a.poem,mode:'quantity'});assert.equal(calls,1);
    const broken=createGenerationService({credentialsPath:config,runsDir:join(dir,'bad'),fetcher:async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({...lotusFixture(),schema_version:'3.0'})}}]}))});assert.equal((await broken.analyze({poem:a.poem,mode:'quantity'})).validation.valid,false);assert.equal(await broken.latest(),null);
  }finally{await rm(dir,{recursive:true,force:true});}
});
