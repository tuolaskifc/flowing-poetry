import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPlan} from './planner.mjs';
import {inspectOrganization,inRegion,repairOrganization} from './scene-organization.mjs';
import {fixture,quantity} from './quantity-fixtures.mjs';
import {readFile} from 'node:fs/promises';
import {validateSceneContract} from './scene-contract.mjs';

const exact=n=>quantity({mode:'exact',min:n,max:n,scope:'individual'});
const river=()=>({...fixture('柳树临水，两舟相望。',[{text:'柳树'},{text:'水',kind:'place'},{text:'舟',kind:'object',quantity:exact(2)}]),schema_version:'3.2',spatial:[]});
test('unmatched scenery uses shared surfaces and three deterministic candidates, preserving exact boats',()=>{
 const a=river(),p=buildPlan(a),o=p.scene.organization;assert.equal(o.strategy,'general-constraints');assert.equal(o.candidates.length,3);assert.equal(o.audit.errors,0);assert.equal(o.audit.aestheticAcceptance,'pending-user');
 const water=p.layers.find(l=>l.tool==='water'),boat=p.layers.find(l=>l.tool==='boat');assert.equal(boat.instances.length,2);assert(boat.quantity.exact);assert(boat.instances.every(v=>inRegion(v.placement.at,water.clip)));
 assert(p.layers.find(l=>l.tool==='willow').instances.every(v=>inRegion(v.placement.at,o.regions.land)&&v.placement.scale<1));
 assert.deepEqual(buildPlan(a),p);assert(o.candidates.every(c=>c.cost>=o.candidates[0].cost));
 for(const l of p.layers.filter(l=>l.inferred)){assert.deepEqual(l.entities,[]);assert(l.provenance.reason);}
});
test('water inference supports fish and boats but explicit absence and references veto it',()=>{
 const a=fixture('鱼出，燕斜。',[{text:'鱼'},{text:'燕'}]);let p=buildPlan(a);assert(p.layers.some(l=>l.tool==='water'&&l.inferred));assert.equal(p.scene.organization.audit.errors,0);
 const b=fixture('舟与柳，水不见。',[{text:'舟',kind:'object'},{text:'柳'},{text:'水',presence:'absent',kind:'environment'}]);p=buildPlan(b);assert(!p.layers.some(l=>l.tool==='water'));assert(p.scene.organization.audit.issues.some(i=>i.code==='missing-water'));assert(p.omitted.some(e=>e.id==='i3'));
 b.entities[2].presence='present';b.entities[2].role='reference';assert(!buildPlan(b).layers.some(l=>l.tool==='water'));
});
test('single-object studies and dew avoid automatic scenery; a deep forest is an environment',()=>{
 for(const text of ['月','露','酒','舟'])assert.equal(buildPlan(fixture(text,[{text}])).scene.organization.strategy,'isolated-study');
 const p=buildPlan(fixture('深林。',[{text:'深林',kind:'place',quantity:quantity({mode:'many',extent:'spread'})}]));assert.equal(p.scene.organization.strategy,'general-constraints');assert(p.layers.some(l=>l.inferred&&l.options.form==='ground'));assert.equal(p.scene.organization.audit.errors,0);
});
test('supervision detects seeded faults rather than always approving its own output',()=>{
 const a=river(),p=buildPlan(a),boat=p.layers.find(l=>l.tool==='boat'),willow=p.layers.find(l=>l.tool==='willow');
 boat.instances[0].placement.at=[.5,.1];willow.instances[0].placement.at=[.98,.98];willow.instances[0].placement.scale=2;
 const codes=inspectOrganization(a,p).issues.map(i=>i.code);assert(codes.includes('water-support'));assert(codes.includes('land-support'));assert(codes.includes('oversize'));
 boat.instances.pop();assert(inspectOrganization(a,p).issues.some(i=>i.code==='exact-count'));
 boat.entities=['i99'];assert(inspectOrganization(a,p).issues.some(i=>i.code==='presence'));
 willow.instances[0].placement.at[0]=NaN;assert(inspectOrganization(a,p).issues.some(i=>i.code==='finite'));
});
test('constraints compose across many unseen tool combinations without changing counts or introducing entities',()=>{
 for(const plant of ['柳','树','竹','草','兰'])for(const animal of ['马','舟','鸭','鱼']){
  const a=fixture(`${plant}与${animal}。`,[{text:plant},{text:animal,quantity:exact(2)}]),p=buildPlan(a);
  assert.equal(p.scene.organization.audit.errors,0,`${plant}+${animal}: `+JSON.stringify(p.scene.organization.audit.issues));
  const l=p.layers.find(l=>l.entities.includes('i2'));assert.equal(l.instances.length,2);assert(l.quantity.exact);assert.deepEqual(p.layers.filter(l=>!l.inferred).flatMap(l=>l.entities).sort(),['i1','i2']);
 }
});
test('asserted canopy and relative relations are applied; possible relations remain uninterpreted',()=>{
 const a={...fixture('树上双鸟，柳在树外。',[{text:'树'},{text:'鸟',quantity:exact(2)},{text:'柳'}]),schema_version:'3.2',spatial:[{type:'on',source:'i2',target:'i1',modality:'asserted',basis:'explicit',evidence:['树上双鸟']},{type:'outside',source:'i3',target:'i1',modality:'asserted',basis:'explicit',evidence:['柳在树外']}]};
 const p=buildPlan(a);assert(p.spatial.every(r=>r.visualized));assert.equal(p.scene.organization.graph.nodes.find(n=>n.entities.includes('i2')).habitat,'canopy');assert.equal(p.scene.organization.audit.errors,0);
 a.spatial.forEach(r=>r.modality='possible');const q=buildPlan(a);assert(q.spatial.every(r=>!r.visualized));assert.equal(q.scene.organization.graph.nodes.find(n=>n.entities.includes('i2')).habitat,'air');
});
test('separate lotus flower and leaf retain distinct centers instead of hiding at the same location',()=>{
 const p=buildPlan(fixture('荷叶、莲花与月。',[{text:'荷叶',quantity:exact(1)},{text:'莲花',quantity:exact(1)},{text:'月',kind:'environment'}]));
 const [a,b]=p.layers.filter(l=>l.tool==='lotus').map(l=>l.instances[0].placement.at);assert(Math.hypot(a[0]-b[0],a[1]-b[1])>.15);assert.equal(p.scene.organization.audit.errors,0);
});
test('bounded repair corrects geometric faults and leaves semantic/count faults visible',()=>{
 const a=river(),p=buildPlan(a),boat=p.layers.find(l=>l.tool==='boat'),willow=p.layers.find(l=>l.tool==='willow');
 boat.instances[0].placement.at=[.5,.1];willow.instances[0].placement.scale=2;
 const repaired=repairOrganization(a,p);assert.equal(repaired.scene.organization.audit.errors,0);assert(repaired.scene.organization.repairs.some(r=>r.accepted));assert(boat.instances[0].placement.at[1]===.1,'input must stay unchanged');
 repaired.layers.find(l=>l.tool==='boat').instances.pop();const unresolved=repairOrganization(a,repaired);assert(unresolved.scene.organization.audit.errors>0);assert(unresolved.scene.organization.audit.issues.some(i=>i.code==='exact-count'));assert.equal(unresolved.layers.find(l=>l.tool==='boat').instances.length,1);
});
test('ordinary place aliases map from original mentions while unknown names stay declared gaps',()=>{
 for(const text of ['渡头','墟里','远村','近村','高原']){
  const p=buildPlan(fixture(text,[{text,kind:'place'}]));assert(p.layers.some(l=>l.entities.includes('i1')),text);
 }
 const p=buildPlan(fixture('长安。',[{text:'长安',kind:'place',concept:'有房屋的村落'}]));assert.equal(p.layers.length,0);assert(p.scene.organization.audit.coverage.missing.some(e=>e.id==='i1'));assert(p.scene.organization.audit.issues.some(i=>i.code==='drawing-gaps'));
});
test('support inference cannot override explicitly missing land or mountains',()=>{
 const a=fixture('树与马，地面不见。',[{text:'树'},{text:'马'},{text:'地面',kind:'place',presence:'absent'}]),p=buildPlan(a);assert(!p.layers.some(l=>l.inferred&&l.options.form==='ground'));assert(p.scene.organization.audit.issues.some(i=>i.code==='missing-ground'));
 const b=fixture('瀑布，山不见。',[{text:'瀑布',kind:'place'},{text:'山',kind:'place',presence:'absent'}]),q=buildPlan(b);assert(!q.layers.some(l=>l.inferred&&l.options.form==='mountain'));assert(q.scene.organization.audit.issues.some(i=>i.code==='missing-cliff'));
});
test('larger exact groups keep distinct anchors rather than repeating three subject slots',()=>{
 const p=buildPlan(fixture('八舟临柳。',[{text:'舟',quantity:exact(8)},{text:'柳'}])),boats=p.layers.find(l=>l.tool==='boat');assert.equal(boats.instances.length,8);assert.equal(new Set(boats.instances.map(v=>v.placement.at.join(','))).size,8);assert.equal(p.scene.organization.audit.errors,0);
});
test('six real requests retain network and evidence failures; replay improves gaps without rewriting responses',async()=>{
 const source=new URL('../../poem-flow/verification/organization/',import.meta.url),cases=JSON.parse(await readFile(new URL('organization-live-cases.json',import.meta.url),'utf8')).cases;
 let valid=0;
 for(const c of cases){
  const r=JSON.parse(await readFile(new URL(c.id+'-record.json',source),'utf8'));
  if(r.analysis)assert.equal(validateSceneContract(r.analysis,c.poem).valid,r.validation.valid);
  const request=JSON.parse(await readFile(new URL('runs/'+r.id+'/request.json',import.meta.url),'utf8'));assert.deepEqual(JSON.parse(request.messages.at(-1).content),{poem:c.poem});
  if(r.validation.valid){valid++;const raw=JSON.stringify(r.analysis),p=buildPlan(r.analysis);assert.equal(JSON.stringify(r.analysis),raw);assert.equal(p.scene.organization.audit.errors,0,c.id);
   if(['n01','n03'].includes(c.id)){assert.equal(p.omitted.length,0);const smoke=p.layers.find(l=>l.tool==='mist');assert.equal(smoke.options.form,'plume');assert.equal(smoke.attachment.anchor,'roof');}
  }else assert.equal(r.plan,undefined);
 }
 assert.equal(valid,4);const capture=JSON.parse(await readFile(new URL('live-capture.json',source),'utf8'));assert(capture.rulesUnchanged);assert.equal(capture.calls.length,6);assert(capture.noAutomaticRetry);
});
