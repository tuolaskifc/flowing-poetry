import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {loadLandscapeStudies} from './landscape-cases.mjs';
import {buildPlan} from './planner.mjs';
import {asComposition,claim,group} from './composition-fixtures.mjs';
import {fixture,quantity} from './quantity-fixtures.mjs';
import {inRegion} from './scene-organization.mjs';
const cases=await loadLandscapeStudies();
test('five fixed landscapes each offer three distinct, checked, source-preserving compositions',()=>{
 assert.equal(cases.length,5);
 for(const c of cases){
  const {plan}=c.record;assert.equal(plan.compositions.length,3,c.id);
  const identity=p=>p.layers.map(l=>({tool:l.tool,entities:l.entities,quantity:l.quantity,options:l.options,provenance:l.provenance}));
  const geometries=new Set();for(const v of plan.compositions){assert.deepEqual(identity(v),identity(plan));assert.equal(v.scene.landscape.audit.errors,0);assert.equal(v.scene.organization.audit.errors,0);geometries.add(JSON.stringify(v.layers.map(l=>[l.instances,l.clip])));}
  assert.equal(geometries.size,3,c.id);
 }
});
test('stream tree roots stay on banks and village buildings remain above the shoreline',()=>{
 for(const c of cases.filter(c=>['s02','s05'].includes(c.id)))for(const v of c.record.plan.compositions){
  const water=v.layers.find(l=>l.tool==='water');for(const l of v.layers.filter(l=>c.id==='s02'?l.tool==='tree':['dwelling','building'].includes(l.tool)))for(const i of l.instances)assert(!inRegion(i.placement.at,water.clip),c.id+' '+v.label);
 }
});
test('exact singleton trees and absent entities survive landscape alternatives without density repair',()=>{
 const poem='独树，孤村，无鸟。',a=asComposition(fixture(poem,[{text:'树',quantity:quantity({mode:'exact',min:1,max:1,scope:'individual',evidence:['独树']})},{text:'孤村',kind:'object'},{text:'鸟',presence:'absent'}]),{setting:{kind:'settlement',...claim(poem)},groups:[group(['i1','i2'],'subject','single','middle',poem)]});
 const original=JSON.stringify(a),p=buildPlan(a);assert.equal(JSON.stringify(a),original);assert.equal(p.compositions.length,3);for(const v of p.compositions){assert(!v.layers.some(l=>l.entities.includes('i3')));assert.equal(v.layers.find(l=>l.tool==='tree').instances.length,1);}
});
test('layer palettes keep the global background and original colors while separating roles and distances',async()=>{
 const context=vm.createContext({window:{}});vm.runInContext(await readFile(new URL('../imagery-library/drawing/core.js',import.meta.url),'utf8'),context);const d=context.window.PoemDrawing;
 for(const scheme of d.paletteOptions()){
  const raw=JSON.stringify(d.paletteFor(scheme.id)),p=['mountain','vegetation','water','ground','blossom','figure'].map(role=>d.paletteFor(scheme.id,{role,depth:'middle'}));
  for(const palette of p){assert.equal(palette.bg,scheme.colors.bg);assert(Object.values(palette).every(c=>/^#[A-Fa-f0-9]{6}$/.test(c)));}
  assert.equal(JSON.stringify(d.paletteFor(scheme.id)),raw);assert.notEqual(d.paletteFor(scheme.id,{role:'vegetation',depth:'far'}).ink,d.paletteFor(scheme.id,{role:'vegetation',depth:'near'}).ink);
 }
 assert.notEqual(d.paletteFor('mineral',{role:'mountain'}).main,d.paletteFor('mineral',{role:'vegetation'}).main);
});
test('depth buckets stay within three seeded sources and different landscape elements have distinct rhythms',()=>{
 for(const c of cases)for(const l of c.record.plan.layers){assert(new Set(l.instances.map(i=>i.variant)).size<=3);assert(l.instances.every(i=>['near','middle','far'].includes(i.tone)));assert(l.performance.rate>0&&l.performance.rate<=1.5);}
 const p=cases.find(c=>c.id==='s02').record.plan;assert.notEqual(p.layers.find(l=>l.tool==='tree').performance.rate,p.layers.find(l=>l.tool==='water').performance.rate);
});
test('semantic group depth still affects scale after local landscape reorganization',()=>{
 const r=cases.find(c=>c.id==='s06').record,a=structuredClone(r.effectiveAnalysis||r.analysis),bird=buildPlan(a).layers.find(l=>l.tool==='bird'),g=a.scene.groups.find(g=>g.members.includes(bird.entities[0]));
 g.depth='far';const far=buildPlan(a);g.depth='near';const near=buildPlan(a);const l=p=>p.layers.find(l=>l.entities.includes(bird.entities[0]));assert(l(near).instances[0].placement.scale>l(far).instances[0].placement.scale);assert.equal(l(near).instances.length,l(far).instances.length);
});
