import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{createRequire}from'node:module';
import{buildExpressionPlan}from'./expression-plan.mjs';
import{resolveSource}from'./source-resolution.mjs';
const art=createRequire(import.meta.url)('./abstract-scene.js'),data=JSON.parse(await readFile(new URL('../../poem-flow/verification/refinement/before.json',import.meta.url),'utf8'));
const sample=id=>structuredClone(data.cases.find(c=>c.id===id).record.effectiveAnalysis||data.cases.find(c=>c.id===id).record.analysis);
test('paired-unit conflict resolves from the attached source numeral without changing raw quantities',()=>{
 const a=sample('b035'),raw=JSON.stringify(a),p=buildExpressionPlan(a),l=p.concretePlan.layers.find(l=>l.tool==='bird');assert.equal(l.instances.length,2);assert.equal(JSON.stringify(a),raw);
 const change=p.concretePlan.sourceResolution.changes[0];assert.equal(change.original.min,2);assert.equal(change.resolved.min,1);assert.equal(change.individuals,2);assert(a.poem.includes(change.evidence[0]));assert.equal(l.quantity.items[0].basis,'source-normalized');
 const e=a.entities.find(e=>e.id===change.entity);e.quantity={...e.quantity,min:2,max:2,scope:'individual',unit:null};assert.equal(resolveSource(a).changes.length,0);
 a.poem='并非白鸟一双临水立';assert.equal(resolveSource(a).changes.length,0);
});
test('explicit identity shares one figure but retains both subject IDs, quotations and quantities',()=>{
 const a=sample('b053'),raw=JSON.stringify(a),p=buildExpressionPlan(a),figures=p.concretePlan.layers.filter(l=>l.tool==='figure');assert.equal(figures.length,1);assert.equal(figures[0].instances.length,1);assert.equal(figures[0].entities.length,2);assert.equal(JSON.stringify(a),raw);
 for(const mode of['scenery','balanced','abstract'])assert.equal(art.compose(p,{expression:mode}).expression.marks.filter(m=>m.layer===p.concretePlan.layers.indexOf(figures[0])).length,1);
 for(const poem of['我不是行人','若我是行人','我与行人同行']){a.poem=poem;assert.equal(resolveSource(a).identities.length,0);}
});
test('whole words select flags, markets and weapons while metaphoric stars stay out of scenery',()=>{
 const flag=buildExpressionPlan(sample('b065')).concretePlan;assert(flag.layers.some(l=>l.tool==='flag'&&l.attachment?.anchor==='roof'));assert(flag.layers.some(l=>l.tool==='dwelling'));assert(!flag.layers.some(l=>l.tool==='wine'));
 const sword=buildExpressionPlan(sample('b004')).concretePlan.layers.find(l=>l.tool==='weapon');assert.equal(sword.options.kind,'sword');assert.equal(sword.attachment.anchor,'hand');
 const army=buildExpressionPlan(sample('b066'));assert(army.renderability.visibleScenery);assert(army.concretePlan.layers.find(l=>l.tool==='weapon').instances.length>1);assert(!army.concretePlan.layers.some(l=>l.options.form==='stars'));
});
test('literal colors survive every expression mode and scene marks share the same anchors',()=>{
 const p=buildExpressionPlan(sample('b012')),layers=p.concretePlan.layers,leaf=layers.findIndex(l=>l.tool==='lotus'&&l.options.form==='leaf'),flower=layers.findIndex(l=>l.tool==='lotus'&&l.options.form==='flower');
 for(const mode of['scenery','balanced','abstract']){const c=art.compose(p,{expression:mode});assert(c.expression.marks.filter(m=>m.layer===leaf).every(m=>m.color==='#328761'));assert(c.expression.marks.filter(m=>m.layer===flower).every(m=>m.color==='#D95860'));}
 const ground=buildExpressionPlan(sample('b067')).concretePlan.layers.find(l=>l.tool==='building');assert(ground.grounding);assert(ground.instances.every(v=>v.placement.at[1]>=.66));
});
