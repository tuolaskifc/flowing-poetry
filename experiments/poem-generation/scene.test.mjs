import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {benchmarks} from './scene-benchmarks.mjs';
import {validateSceneContract} from './scene-contract.mjs';
import {fixture,quantity} from './quantity-fixtures.mjs';
import {buildPlan} from './planner.mjs';
import {createGenerationService} from './service.mjs';
test('twenty fixed scene fixtures preserve source quotations and bounded spatial evidence',()=>{for(const b of benchmarks){const r=validateSceneContract(b.analysis,b.poem);assert(r.valid,b.id+': '+r.errors.join(';'));}});
test('natural places use physical tools while named places and unsupported water shapes stay gaps',()=>{
 const a=fixture('寒江望长安，野渡见瀑布。',[{text:'寒江',kind:'place'},{text:'长安',kind:'place'},{text:'野渡',kind:'place'},{text:'瀑布',kind:'place'}]);
 const p=buildPlan(a);assert(p.layers.some(l=>l.tool==='water'));assert(p.layers.some(l=>l.tool==='landscape'&&l.options.form==='shore'));assert.deepEqual(p.omitted.map(e=>e.name),['长安','瀑布']);
 const variants=fixture('山中松下，河畔望松江。',[{text:'山中',kind:'place'},{text:'松下',kind:'place'},{text:'河畔',kind:'place'},{text:'松江',kind:'place'}]);const v=buildPlan(variants);assert.deepEqual(v.omitted.map(e=>e.name),['松江']);assert(v.layers.some(l=>l.tool==='tree'));
});
test('natural scenery is never invented solely from a normalized concept or missing presence',()=>{
 const a=fixture('长安，树不见。',[{text:'长安',kind:'place',concept:'江边的楼'},{text:'树',presence:'absent',kind:'organism'}]);assert.equal(buildPlan(a).layers.length,0);
});
test('pine, woods, ground and mountain form distinct structures without adding extra scenery',()=>{
 const p=buildPlan(benchmarks[0].analysis);assert.equal(p.layers.find(l=>l.tool==='tree').options.form,'pine');assert(!p.layers.some(l=>l.tool==='landscape'));assert(p.spatial[0].visualized);assert(!p.spatial[1].visualized);
 const woods=buildPlan(benchmarks[8].analysis);assert(woods.layers.find(l=>l.tool==='tree').instances.length>5);assert(woods.omitted.some(e=>e.name==='青苔'));
 const range=buildPlan(benchmarks[16].analysis);assert(range.layers.some(l=>l.tool==='landscape'&&l.options.form==='mountain'));
});
test('boat is kept singular, placed in water, and compound river-boat names do not become water',()=>{
 const p=buildPlan(benchmarks[11].analysis),boat=p.layers.find(l=>l.tool==='boat');assert.equal(boat.instances.length,1);assert(p.spatial[0].visualized);assert(boat.instances[0].placement.at[1]>.46);assert(p.layers.find(l=>l.tool==='water').surface);
 const b=fixture('江船火独明。',[{text:'江船',kind:'object'}]);assert.deepEqual(buildPlan(b).layers.map(l=>l.tool),['boat']);
});
test('spatial checks reject invented endpoints, evidence, fields and unsupported versions',()=>{
 const a=benchmarks[0].analysis;
 for(const change of [v=>v.spatial[0].target='i99',v=>v.spatial[0].evidence=['虚构关系'],v=>v.spatial[0].evidence=['明月'],v=>v.spatial[0].x=12,v=>v.spatial[0].source=v.spatial[0].target,v=>v.entities[1].presence='absent',v=>v.schema_version='3.1']){const b=structuredClone(a);change(b);assert(!validateSceneContract(b,b.poem).valid);}
});
test('only asserted supported relationships alter geometry or add an explicitly requested reflection',()=>{
 const a={...fixture('月影映水，竹外两朵花。',[{text:'月',quantity:quantity()},{text:'水'},{text:'竹'},{text:'花',quantity:quantity({mode:'exact',min:2,max:2,scope:'individual',evidence:['两朵花']})}]),schema_version:'3.2',spatial:[{type:'reflects_on',source:'i1',target:'i2',modality:'asserted',basis:'inferred',evidence:['月影映水']},{type:'outside',source:'i4',target:'i3',modality:'asserted',basis:'explicit',evidence:['竹外两朵花']}]};
 assert(validateSceneContract(a,a.poem).valid);const p=buildPlan(a);assert(p.spatial.every(r=>r.visualized));assert(p.layers.find(l=>l.tool==='moon').reflection);assert.equal(p.layers.find(l=>l.tool==='flower').instances.length,2);
 a.spatial.forEach(r=>r.modality='possible');const q=buildPlan(a);assert(q.spatial.every(r=>!r.visualized));assert(!q.layers.find(l=>l.tool==='moon').reflection);
});
test('default service requests 3.2 spatial semantics and rejects an old reply without repair',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'poem-scene-'));try{const path=join(dir,'config');await writeFile(path,'https://example.invalid/v1\ndummy-scene-value\nmodel\n');let calls=0;
 const good=benchmarks[0].analysis,service=createGenerationService({credentialsPath:path,runsDir:join(dir,'runs'),fetcher:async(_url,options)=>{calls++;const request=JSON.parse(options.body);assert(request.messages[0].content.includes('spatial'));assert(request.messages[0].content.includes('3.2'));return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(good)}}]}));}});
 const r=await service.analyze({poem:good.poem});assert(r.validation.valid);assert.equal(r.mode,'scene');await service.analyze({poem:good.poem});assert.equal(calls,1);
 const bad=createGenerationService({credentialsPath:path,runsDir:join(dir,'bad'),fetcher:async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({...good,schema_version:'3.1'})}}]}))});assert(!(await bad.analyze({poem:good.poem})).validation.valid);assert.equal(await bad.latest(),null);
 }finally{await rm(dir,{force:true,recursive:true});}
});
