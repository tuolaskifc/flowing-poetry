import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {collectBatch,evaluateRecord} from './batch-audit.mjs';
import {buildExpressionPlan} from './expression-plan.mjs';
import {createRequire} from 'node:module';
const art=createRequire(import.meta.url)('./abstract-scene.js');
const captured=JSON.parse(await readFile(new URL('../../poem-flow/verification/batch/after.json',import.meta.url),'utf8'));
const sample=id=>captured.cases.find(c=>c.id===id).record.effectiveAnalysis;
const layers=id=>buildExpressionPlan(sample(id)).concretePlan?.layers||[];
test('source words retain their subjects instead of borrowing objects from explanatory prose',()=>{
 for(const [id,tool,form]of [['b005','willow'],['b007','water'],['b039','pavilion'],['b045','tree','blossom'],['b054','flower'],['b059','falling-petals'],['b060','landscape','lightwash']])assert(layers(id).some(l=>l.tool===tool&&(!form||l.options.form===form)),id);
 for(const id of ['b020','b058'])for(const l of layers(id))assert(!l.names.some(n=>/^(人眼|眼|泪|眼泪|心)$/.test(n)));
 assert(!layers('b056').some(l=>l.options.form==='sun'));
 assert(!layers('b060').some(l=>l.options.form==='sun'));
 assert(!layers('b062').some(l=>l.tool==='landscape'));
});
test('bird calls do not become exact bird counts and a canopy dependency stays in the canopy',()=>{
 const a=sample('b040'),p=buildExpressionPlan(a),bird=p.concretePlan.layers.find(l=>['bird','oriole'].includes(l.tool));
 assert.equal(a.entities.find(e=>e.mentions.includes('黄鹂')).quantity.mode,'unspecified');
 assert.equal(bird.options.pose,'resting');assert.equal(p.concretePlan.scene.displayAudit.errors,0);assert.equal(p.concretePlan.scene.organization.audit.errors,0);
 const exact=layers('b021').find(l=>l.entities.some(id=>sample('b021').entities.find(e=>e.id===id).quantity.mode==='exact'));assert.equal(exact.instances.length,2);
 assert(layers('b046').find(l=>l.tool==='horse').instances.length>1);
});
test('all saved replies replay without modifying meanings or drawing nonpresent references',async()=>{
 const data=await collectBatch();assert(data.records>=184);assert.equal(data.cases.filter(c=>!c.exercise).length,71);
 for(const c of data.cases)for(const r of c.versions){
  const before=JSON.stringify(r),result=evaluateRecord(r);assert.equal(JSON.stringify(r),before);
  if(!result.plan)continue;
  const a=result.analysis;for(const l of result.plan.concretePlan?.layers||[])for(const id of l.entities){const e=(a.entities||a.subjects).find(e=>e.id===id);assert(e);assert.equal(e.role,'scene',r.id);assert.equal(e.presence,'present',r.id);}
 }
});
test('a missing concrete subject cannot pass as an abstract pattern or a filled background',()=>{
 const a=JSON.parse(JSON.stringify(sample('b066')).replaceAll('戈鋋','计算器'));a.entities.find(e=>e.mentions.includes('计算器')).concept='计算器';
 const p=buildExpressionPlan(a);assert.equal(p.renderability.status,'unavailable');assert(!p.renderability.visibleScenery);assert(!p.renderability.visibleAbstract);assert(p.expression.gaps.some(g=>g.label==='计算器'));
});
test('automatic unified colors respect day and night across seeds while manual colors remain selectable',()=>{
 for(const [id,dark]of [['b012',false],['b002',true]])for(let seed=0;seed<32;seed++){
  const p=buildExpressionPlan(sample(id)),c=art.compose(p,{seed,expression:'balanced'});assert.equal(c.palette.dark,dark,id+' seed '+seed);
 }
 const day=buildExpressionPlan(sample('b012'));assert(art.compose(day,{expression:'balanced',palette:'lapis'}).palette.dark);
});
test('an inferred mountain-stream setting does not manufacture water under clouds and mist',()=>{
 const p=buildExpressionPlan(sample('b057'));assert(!p.concretePlan.layers.some(l=>l.tool==='water'));assert(!p.concretePlan.layers.some(l=>l.inferred&&l.options.form==='mountain'));
});
