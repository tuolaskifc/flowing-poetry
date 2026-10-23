import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateAbstract} from './abstract-contract.mjs';
import {buildAbstractPlan} from './abstract-plan.mjs';
import {createGenerationService} from './service.mjs';
import {loadAbstractCases} from './abstract-cases.mjs';
const drawing=createRequire(import.meta.url)('./abstract-scene.js');
const cases=await loadAbstractCases(),first=cases[0].record.analysis;
test('four first requests retain the original rejection and local revalidation changes no semantics',async()=>{
 const capture=JSON.parse(await readFile(new URL('../../poem-flow/verification/abstract/capture.json',import.meta.url),'utf8'));assert.equal(capture.calls.length,4);assert.equal(capture.calls.filter(c=>c.valid).length,3);assert(capture.noAutomaticRetry);
 for(const c of cases){assert(c.record);assert(validateAbstract(c.record.analysis,c.poem).valid);const raw=JSON.parse(await readFile(new URL('../../poem-flow/verification/abstract/'+c.id+'-record.json',import.meta.url),'utf8'));assert.deepEqual(c.record.analysis,raw.analysis);if(c.id==='a02'){assert(!raw.validation.valid);assert.equal(c.record.localRevalidation.changedSemanticFields,0);}const request=JSON.parse(await readFile(new URL('../../poem-flow/verification/abstract/'+c.id+'-request.json',import.meta.url),'utf8'));assert.deepEqual(JSON.parse(request.messages.at(-1).content),{poem:c.poem});}
});
test('abstract schema checks evidence, endpoints and rejects drawing instructions',()=>{
 for(const mutate of [a=>a.x=0,a=>a.subjects[0].mentions=['不存在的词'],a=>a.relations[0].target='a88',a=>a.processes[0].evidence=['编造引用'],a=>a.poem='改了输入',a=>a.subjects[0].id=a.subjects[1].id,a=>a.subjects[0].color='#ff0000']){const a=structuredClone(first);mutate(a);assert(!validateAbstract(a,first.poem).valid);}
 assert(!validateAbstract(null,first.poem).valid);assert(!validateAbstract([],first.poem).valid);
});
test('absence is a result, not permission to execute other asserted actions on an absent subject',()=>{
 const a=structuredClone(cases[1].record.analysis),p=a.processes.find(p=>a.subjects.find(s=>s.id===p.subject).presence==='absent');assert(p);assert.equal(p.temporal,'already');assert(validateAbstract(a,a.poem).valid);p.temporal='ongoing';assert(!validateAbstract(a,a.poem).valid);
});
test('candidate, reference, gap and pure time have different representation boundaries',()=>{
 const p=buildAbstractPlan(first);assert(p.nodes.some(n=>n.label==='追忆'&&n.mode==='candidate'));assert(p.omitted.some(n=>n.label==='当时'));assert(p.relations.some(r=>r.modality==='possible'));
 assert(buildAbstractPlan(cases[1].record.analysis).nodes.some(n=>n.mode==='gap'));assert(buildAbstractPlan(cases[2].record.analysis).nodes.some(n=>n.mode==='reference'));
 const mixed=buildAbstractPlan(cases[3].record.analysis);assert(mixed.concretePlan);assert.deepEqual(mixed.concretePlan.layers.filter(l=>!l.inferred).map(l=>l.tool),['moon','building']);assert.equal(mixed.concretePlan.provenance.basis,'local-semantic-adapter');
 const geometry=drawing.compose(mixed,{seed:11}),a=drawing.positions(mixed,geometry,0,{},true),b=drawing.positions(mixed,geometry,80,{},true);for(const n of a.filter(n=>n.kind==='concrete'))assert.deepEqual(b.find(v=>v.id===n.id).at,n.at,'hybrid relation anchors must remain on actual scenery');
});
test('many seeded variations stay reproducible, finite and preserve the interpreted subject identities',()=>{
 const p=buildAbstractPlan(first),before=JSON.stringify(p),keys=new Set();
 for(const [style] of drawing.styles)for(let seed=1;seed<=12;seed++){
  const a=drawing.compose(p,{seed,style});assert.deepEqual(drawing.compose(p,{seed,style}),a);keys.add(a.geometryKey);assert.deepEqual(a.nodes.map(n=>n.id),p.nodes.map(n=>n.id));assert(a.nodes.every(n=>n.at.every(Number.isFinite)&&n.radius>0&&n.count<100));
 }
 assert.equal(keys.size,drawing.styles.length*12);assert.equal(JSON.stringify(p),before);
});
test('automatic night variants keep a dark base and manual colors remain a viewing choice',()=>{
 const p=buildAbstractPlan(cases[3].record.analysis);for(let seed=0;seed<40;seed++)assert(drawing.compose(p,{seed}).palette.dark);assert.equal(drawing.compose(p,{palette:'paper'}).palette.id,'paper');
});
test('possible and negated relations do not silently become asserted travel or accumulation',()=>{
 const p=buildAbstractPlan(first);p.processes=[];p.relations=[{source:p.nodes[0].id,target:p.nodes[1].id,kind:'approach',modality:'possible'}];const c=drawing.compose(p,{seed:5});assert.deepEqual(drawing.positions(p,c,0).map(n=>n.at),drawing.positions(p,c,100).map(n=>n.at));
 p.relations[0].modality='asserted';const dist=t=>{const [a,b]=drawing.positions(p,c,t);return Math.hypot(a.at[0]-b.at[0],a.at[1]-b.at[1]);};assert(dist(50)<dist(0));assert(dist(50)>0);
 p.relations[0].kind='separate';assert(dist(50)>dist(0));
 p.relations=[];p.processes=[{subject:p.nodes[0].id,kind:'fade',temporal:'ongoing',modality:'negated'}];assert.equal(drawing.positions(p,c,100)[0].alpha,1);
});
test('already and not-yet processes differ from a repeating playback loop',()=>{
 const p=buildAbstractPlan(first),id=p.nodes[0].id;p.relations=[];const c=drawing.compose(p,{seed:2});
 p.processes=[{subject:id,kind:'fade',temporal:'already',modality:'asserted'}];assert.equal(drawing.positions(p,c,0)[0].alpha,drawing.positions(p,c,100)[0].alpha);
 p.processes[0]={subject:id,kind:'emerge',temporal:'not_yet',modality:'asserted'};assert.equal(drawing.positions(p,c,0)[0].alpha,drawing.positions(p,c,100)[0].alpha);
 p.processes[0]={subject:id,kind:'emerge',temporal:'ongoing',modality:'asserted'};assert(drawing.positions(p,c,100)[0].alpha>drawing.positions(p,c,0)[0].alpha);
});
test('abstract API uses the separate contract, stores raw output and keeps landscape latest separate',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'poem-abstract-'));try{
  const file=join(folder,'config');await writeFile(file,'https://example.invalid/v1\ndummy-abstract-secret\nmodel\n');let calls=0;
  const service=createGenerationService({credentialsPath:file,runsDir:join(folder,'runs'),fetcher:async(_url,opts)=>{calls++;const req=JSON.parse(opts.body);assert(req.messages[0].content.includes('abstract-1.0'));assert.deepEqual(JSON.parse(req.messages[1].content),{poem:first.poem});return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(first)}}]}));}});
  const r=await service.analyze({poem:first.poem,mode:'abstract'});assert(r.validation.valid);assert(r.plan.nodes);assert.equal(await service.latest(),null);assert((await service.latest({abstract:true})).plan.nodes);assert((await service.analyze({poem:first.poem,mode:'abstract'})).cached);assert.equal(calls,1);assert.equal(await readFile(join(folder,'runs',r.id,'response.txt'),'utf8'),JSON.stringify(first));
 }finally{await rm(folder,{recursive:true,force:true});}
});
test('new first requests preserve raw semantics, figurative water and conditional time boundaries',async()=>{
 const capture=JSON.parse(await readFile(new URL('../../poem-flow/verification/abstract/extension-capture.json',import.meta.url),'utf8'));
 assert.equal(capture.calls.length,3);assert(capture.calls.every(r=>r.valid&&!r.cached));assert(capture.noAutomaticRetry);
 const water=cases.find(c=>c.id==='a05').record.plan;assert.equal(water.concretePlan,null);assert(water.nodes.some(n=>n.kind==='concrete'&&n.mode==='reference'));
 const condition=cases.find(c=>c.id==='a06').record.plan;assert(condition.nodes.some(n=>n.mode==='gap'));assert(condition.nodes.some(n=>n.mode==='candidate'));assert(condition.processes.some(p=>p.modality==='conditional'));const c=drawing.compose(condition,{seed:16});assert.deepEqual(drawing.positions(condition,c,0),drawing.positions(condition,c,90));
 assert(cases.find(c=>c.id==='a07').reviewWarnings.some(w=>w.includes('逆行')));
});
test('missing and uncertain references retain presence priority over borrowing a shape',()=>{
 const a=structuredClone(first);a.subjects[0].role='reference';a.subjects[0].presence='absent';assert.equal(buildAbstractPlan(a).nodes[0].mode,'gap');a.subjects[0].presence='unclear';assert.equal(buildAbstractPlan(a).nodes[0].mode,'candidate');
});
test('viewer disturbance is finite, local, reproducible and independent of semantic geometry',()=>{
 const pulse={at:[.45,.5],time:3},p=buildAbstractPlan(first),c=drawing.compose(p,{seed:9}),before=structuredClone(c),ps=[pulse];
 const near=drawing.response([.52,.5],3.3,ps,.8),far=drawing.response([1,1],3.3,ps,.8);assert(near.offset.some(v=>Math.abs(v)>.001));assert(Math.hypot(...near.offset)>Math.hypot(...far.offset));assert.deepEqual(near,drawing.response([.52,.5],3.3,ps,.8));
 for(const [time,strength] of [[2,1],[12,1],[3.3,0]])assert.deepEqual(drawing.response([.52,.5],time,ps,strength),{offset:[0,0],twist:0});
 const many=Array.from({length:1000},()=>pulse);const bounded=drawing.response([.52,.5],3.3,many,1);assert(Math.abs(bounded.offset[0])<=65/960);assert(Math.abs(bounded.twist)<=.22);assert.deepEqual(c,before);assert.deepEqual(ps,[pulse]);
});
test('historical auto presets retain their original brush pool while new seeds can use all thirteen',()=>{
 const p=buildAbstractPlan(first),classic=new Set(),expanded=new Set();p.relations=[];
 for(let seed=1;seed<=120;seed++){for(const n of drawing.compose(p,{seed,vocabulary:'classic'}).nodes)classic.add(n.form);for(const n of drawing.compose(p,{seed}).nodes)expanded.add(n.form);}
 assert.equal(classic.size,9);assert.equal(expanded.size,13);for(const id of ['vortex','bloom','fissures','fibers']){assert(!classic.has(id));assert(expanded.has(id));}
});
