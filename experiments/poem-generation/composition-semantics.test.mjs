import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {schema,validateCompositionContract} from './composition-contract.mjs';
import {slowScene,fisherScene,forestScene,withoutScene,asComposition,group,action,claim} from './composition-fixtures.mjs';
import {buildPlan} from './planner.mjs';
import {fixture,quantity} from './quantity-fixtures.mjs';
import {createGenerationService} from './service.mjs';
import {expandSourceContext} from './source-context.mjs';
const valid=a=>assert(validateCompositionContract(a,a.poem).valid,validateCompositionContract(a,a.poem).errors.join(';'));
test('3.3 calibration examples validate and unknown structure or drawing instructions are rejected',()=>{
 for(const a of [slowScene(),fisherScene(),forestScene()])valid(a);
 for(const change of [a=>delete a.scene,a=>a.scene.setting.x=.2,a=>a.scene.groups[0].scale=2,a=>a.scene.actions[0].pace=2,a=>a.scene.atmosphere.visibility='foggy',a=>a.scene.groups=null,a=>a.scene.supports[0].target='i99',a=>a.scene.actions[0].evidence=['捏造原文'],a=>a.scene.groups[0].evidence=['鸟去迟'],a=>a.entities[0].presence='absent',a=>a.scene.actions.push(a.scene.actions[0])]){const a=slowScene();change(a);assert(!validateCompositionContract(a,a.poem).valid);}
 assert.equal(schema.properties.scene.additionalProperties,false);
});
test('the same extracted entities use scene semantics for atmosphere, groups, depth and motion',()=>{
 const a=slowScene(),original=JSON.stringify(a);valid(a);const p=buildPlan(a),baseline=buildPlan(withoutScene(a));
 assert.equal(JSON.stringify(a),original);assert.equal(p.settings.palette,'twilight');assert.equal(baseline.settings.palette,'clear');
 const bird=p.layers.find(l=>l.tool==='bird'),boat=p.layers.find(l=>l.tool==='boat');assert.equal(bird.options.pose,'flying');assert.equal(bird.timeScale,.35);assert.equal(bird.motion.direction,'recede');assert.equal(bird.instances.length,7);assert.equal(boat.instances.length,1);
 assert(bird.instances[0].opacity<baseline.layers.find(l=>l.tool==='bird').instances[0].opacity);assert(p.semanticConsumption.items.some(i=>i.path==='scene.atmosphere.illumination'&&i.status==='applied'));
 assert.equal(p.scene.organization.audit.errors,0);assert.equal(p.semanticConsumption.aestheticAcceptance,'pending-user');
});
test('counterfactual semantic changes produce different settings, geometry and tool clocks',()=>{
 const a=slowScene(),p=buildPlan(a);a.scene.actions[1].pace='fast';a.scene.groups[1].depth='near';a.scene.atmosphere={visibility:'clear',illumination:'day',...claim(a.poem)};const q=buildPlan(a);
 const find=p=>p.layers.find(l=>l.tool==='bird');assert(find(q).timeScale>find(p).timeScale);assert(find(q).instances[0].placement.scale>find(p).instances[0].placement.scale);assert.notEqual(q.settings.palette,p.settings.palette);
 assert(p.semanticConsumption.items.some(i=>i.path==='atmosphere.energy'&&i.status==='skipped'),'explicit pace overrides energy fallback');
 a.scene.actions[1].direction='up';const up=buildPlan(a);assert(up.semanticConsumption.items.some(i=>i.path==='scene.actions[1].direction'&&i.status==='unsupported'));assert.equal(find(up).motion.direction,'unspecified');
});
test('precise quantity outranks inferred flock density and unsupported walking remains visible',()=>{
 const poem='两只鸟，马行。',a=asComposition(fixture(poem,[{text:'鸟',quantity:quantity({mode:'exact',min:2,max:2,scope:'individual',evidence:['两只鸟']})},{text:'马'}]),{setting:{kind:'open_land',...claim(poem)},groups:[group(['i1'],'subject','flock','middle',poem),group(['i2'],'accent','single','middle',poem)],actions:[action('i2','walk','normal','across',poem)]});valid(a);const p=buildPlan(a);assert.equal(p.layers.find(l=>l.tool==='bird').instances.length,2);assert(p.semanticConsumption.items.some(i=>i.path==='scene.actions[0].state'&&i.status==='unsupported'));assert(!p.layers.find(l=>l.tool==='horse').motion);
});
test('hypothetical actions are not executed and a negated flight stays resting',()=>{
 const a=slowScene();a.scene.actions[1].modality='possible';let p=buildPlan(a);assert(!p.layers.find(l=>l.tool==='bird').motion);assert(p.semanticConsumption.items.some(i=>i.path==='scene.actions[1].state'&&i.status==='skipped'));
 a.scene.actions[1].modality='negated';p=buildPlan(a);assert.equal(p.layers.find(l=>l.tool==='bird').options.pose,'resting');assert.equal(p.layers.find(l=>l.tool==='bird').animate,false);
});
test('fisher support joins the existing boat and no source entities are added',()=>{
 const a=fisherScene();valid(a);const p=buildPlan(a),figure=p.layers.find(l=>l.tool==='figure'),boat=p.layers.find(l=>l.tool==='boat');assert.equal(figure.attachment.target,boat.entities[0]);assert.equal(figure.animate,false);assert(Math.abs(figure.instances[0].placement.at[1]-boat.instances[0].placement.at[1])<.03);assert.equal(p.scene.organization.audit.errors,0);
 for(const l of p.layers.filter(l=>l.inferred)){assert.deepEqual(l.entities,[]);assert(l.provenance.reason);}
});
test('default service sends 3.3 once, preserves raw response and replays without another call',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'poem-composition-'));try{
  const credentials=join(dir,'config');await writeFile(credentials,'https://example.invalid/v1\ndummy-composition-secret\nmodel\n');let calls=0;const a=slowScene();
  const service=createGenerationService({credentialsPath:credentials,runsDir:join(dir,'runs'),fetcher:async(_url,options)=>{calls++;const req=JSON.parse(options.body);assert(req.messages[0].content.includes('scene.actions'));assert(req.messages[0].content.includes('3.3'));assert.equal(req.max_tokens,6144);assert.deepEqual(JSON.parse(req.messages.at(-1).content),{poem:a.poem});return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(a)}}]}));}});
  const r=await service.analyze({poem:a.poem,source:{author:'测试',goal:'不应传入'}});assert(r.validation.valid);assert.equal(r.mode,'composition');assert.equal(r.analysis.schema_version,'3.3');assert(r.plan.semanticConsumption.summary.applied>0);assert.deepEqual(r.source,{author:'测试'});
  const saved=await readFile(join(dir,'runs',r.id,'response.txt'),'utf8');assert.equal(saved,JSON.stringify(a));assert((await service.analyze({poem:a.poem})).cached);assert.equal(calls,1);
 }finally{await rm(dir,{force:true,recursive:true});}
});

test('adjacent-clause source expansion keeps raw failures and never alters semantic claims',async()=>{
 for(const id of ['s03','s04']){
  const r=JSON.parse(await readFile(new URL('../../poem-flow/verification/semantics/'+id+'-record.json',import.meta.url),'utf8'));
  const original=JSON.stringify(r.analysis),c=expandSourceContext(r.analysis,r.poem);
  assert(!r.validation.valid);assert(c.applied);assert(c.validation.valid);assert(c.validation.review_required);assert.equal(JSON.stringify(r.analysis),original);
  for(const change of c.changes){assert(r.poem.includes(change.expanded[0]));assert(change.clauses.length<=2);}
  const semantic=a=>{const b=structuredClone(a);function strip(x){if(!x||typeof x!=='object')return;delete x.evidence;for(const v of Object.values(x))strip(v);}strip(b);return b;};
  assert.deepEqual(semantic(c.effectiveAnalysis),semantic(r.analysis));
  const fake=structuredClone(r.analysis);fake.scene.actions[0].evidence=['不存在的句子'];assert(!expandSourceContext(fake,r.poem).applied);
 }
 const poem='舟来，山高，水远，鸟去。',a=asComposition(fixture(poem,[{text:'舟',kind:'object'},{text:'鸟'}]));a.spatial=[{source:'i1',target:'i2',type:'beside',modality:'asserted',basis:'inferred',evidence:['舟来']}];
 assert(validateCompositionContract(a,poem).errors.length>0);assert(validateCompositionContract(a,poem).errors.every(e=>/依据未关联/.test(e)));assert(!expandSourceContext(a,poem).applied);
});

test('service records source-only normalization separately, without another model call',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'poem-source-context-'));try{
  const credentials=join(dir,'config');await writeFile(credentials,'https://example.invalid/v1\ndummy-source-secret\nmodel\n');let calls=0;
  const raw=JSON.parse(await readFile(new URL('../../poem-flow/verification/semantics/s04-record.json',import.meta.url),'utf8'));
  const service=createGenerationService({credentialsPath:credentials,runsDir:join(dir,'runs'),fetcher:async()=>{calls++;return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(raw.analysis)}}]}));}});
  const r=await service.analyze({poem:raw.poem});assert(r.validation.valid);assert(!r.rawValidation.valid);assert(r.sourceContext.reviewRequired);assert.deepEqual(r.analysis,raw.analysis);assert(r.effectiveAnalysis);assert.equal(await readFile(join(dir,'runs',r.id,'response.txt'),'utf8'),JSON.stringify(raw.analysis));assert((await service.latest()).plan);assert((await service.analyze({poem:raw.poem})).cached);assert.equal(calls,1);
 }finally{await rm(dir,{force:true,recursive:true});}
});

test('unspecified quantities do not become exact single birds and compatible field support is reused',async()=>{
 const r=JSON.parse(await readFile(new URL('../../poem-flow/verification/semantics/s06-record.json',import.meta.url),'utf8')),p=buildPlan(r.analysis);
 assert(p.layers.find(l=>l.tool==='bird').instances.length>1);assert(!p.layers.some(l=>l.tool==='water'));
 assert(p.semanticConsumption.items.some(i=>i.path==='scene.supports[0]'&&i.status==='applied'));assert.equal(p.scene.organization.strategy,'regional-proposal');
 assert(p.semanticConsumption.items.some(i=>i.path==='scene.actions[1].state'&&i.status==='skipped'));
});
