import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {schema,validateExpression,sceneProjection} from './expression-contract.mjs';
import {validateCompositionContract} from './composition-contract.mjs';
import {buildExpressionPlan} from './expression-plan.mjs';
import {prepareExpressionStudies} from './expression-cases.mjs';
import {createGenerationService} from './service.mjs';
import {asComposition} from './composition-fixtures.mjs';
import {fixture,quantity} from './quantity-fixtures.mjs';
const require=createRequire(import.meta.url),drawing=require('./abstract-scene.js'),layout=require('./expression-layout.js');
const data=await prepareExpressionStudies(),by=id=>data.cases.find(c=>c.id===id),first=by('u01').record.analysis;
test('three unified first responses retain one shared entity set, raw provenance and poem-only requests',async()=>{
 const capture=JSON.parse(await readFile(new URL('../../poem-flow/verification/expression/capture.json',import.meta.url),'utf8'));assert.equal(capture.calls.length,3);assert(capture.noAutomaticRetry);assert(capture.calls.every(c=>c.valid&&!c.cached));
 for(const id of ['u01','u02','u03']){const c=by(id);assert(validateExpression(c.record.analysis,c.poem).valid);const raw=JSON.parse(await readFile(new URL('../../poem-flow/verification/expression/'+id+'-record.json',import.meta.url),'utf8'));assert.deepEqual(raw.analysis,c.record.analysis);const request=JSON.parse(await readFile(new URL('../../poem-flow/verification/expression/'+id+'-request.json',import.meta.url),'utf8'));assert.deepEqual(JSON.parse(request.messages.at(-1).content),{poem:c.poem});for(const r of c.record.plan.relations)assert(c.record.analysis.entities.some(e=>e.id===r.source));}
 assert.equal(schema.properties.schema_version.const,'expression-1.0');assert(validateCompositionContract(sceneProjection(first),first.poem).valid);
});
test('unified validation rejects rendering instructions, missing objects and fabricated evidence',()=>{
 for(const mutate of [a=>a.x=1,a=>a.expression.x=1,a=>delete a.expression,a=>a.expression.relations[0].source='i99',a=>a.expression.relations[0].evidence=['编造'],a=>a.expression.processes[0].speed=3,a=>a.expression.relations[0].target=null,a=>a.expression.relations[0].target=a.expression.relations[0].source,a=>a.schema_version='3.3']){const a=structuredClone(first);mutate(a);assert(!validateExpression(a,first.poem).valid);}
 for(const a of [null,[],false])assert(!validateExpression(a,first.poem).valid);
 const pure=structuredClone(by('u03').record.analysis);pure.scene.groups=[{members:['i1'],role:'subject',pattern:'single',depth:'unspecified',basis:'inferred',evidence:[pure.poem]}];assert(!validateExpression(pure,pure.poem).valid);
});
test('conditional and absent abstract endpoints cannot become asserted actions',()=>{
 const a=structuredClone(by('u03').record.analysis);a.entities[0].presence='unclear';a.expression.processes[0].modality='conditional';assert(validateExpression(a,a.poem).valid);a.expression.processes[0].modality='asserted';assert(!validateExpression(a,a.poem).valid);a.entities[0].presence='absent';Object.assign(a.expression.processes[0],{kind:'fade',temporal:'already'});assert(validateExpression(a,a.poem).valid);a.expression.processes[0].temporal='ongoing';assert(!validateExpression(a,a.poem).valid);
});
test('recommendations distinguish scenery, mixed expression and metaphor without adding scenery',()=>{
 assert.equal(by('u01').record.plan.expression.recommendation,'scenery');assert.equal(by('u02').record.plan.expression.recommendation,'balanced');assert.equal(by('u03').record.plan.expression.recommendation,'abstract');
 for(const id of ['u03','h03'])for(const [mode] of layout.modes){const p=by(id).record.plan,c=drawing.compose(p,{seed:1,expression:mode});assert.equal(p.concretePlan,null);assert.equal(c.expression.marks.length,0);assert(!c.expression.hasScenery);}
});
test('directional buildings use the existing brush, while night context and unknown places remain distinct',()=>{
 const p=by('u02').record.plan;assert(p.concretePlan.layers.some(l=>l.tool==='building'&&l.names.includes('西楼')));assert(p.nodes.find(n=>n.label==='良夜').contextOnly);assert(!p.expression.gaps.length);
 const a=asComposition(fixture('长安',[{text:'长安',concept:'高楼',kind:'place'}])),missing=buildExpressionPlan(a);assert.equal(missing.concretePlan,null);assert.equal(missing.expression.gaps.length,1);for(const mode of ['scenery','balanced','abstract'])assert.equal(drawing.compose(missing,{expression:mode}).nodes[0].expressionGain,0);
});
test('all modes and seeds preserve exact scene instances, anchors, supports and source semantics',()=>{
 const cases=data.cases.filter(c=>c.record.plan.concretePlan);
 for(const c of cases){const raw=JSON.stringify(c.record.analysis),p=c.record.plan,original=structuredClone(p.concretePlan),anchors=[];
  for(let seed=1;seed<=12;seed++)for(const mode of ['scenery','balanced','abstract']){const composed=drawing.compose(p,{seed,expression:mode}),marks=composed.expression.marks;assert(marks.length);assert(marks.every(m=>m.root.every(Number.isFinite)&&m.radius>0));anchors.push(marks.map(m=>[m.subject,m.instance,m.root]));assert.deepEqual(p.concretePlan,original);assert.equal(JSON.stringify(c.record.analysis),raw);}
  for(const a of anchors)assert.deepEqual(a,anchors[0]);
 }
 const a=asComposition(fixture('两只白鸟',[{text:'白鸟',quantity:quantity({mode:'exact',min:2,max:2,unit:'只',scope:'individual',evidence:['两只白鸟']})}])),p=buildExpressionPlan(a);for(const mode of ['scenery','balanced','abstract'])assert.equal(drawing.compose(p,{expression:mode}).expression.marks.filter(m=>m.subject==='i1').length,2);
});
test('mode changes affect brush families and density as well as native contour retention',()=>{
 const p=by('u01').record.plan,a=drawing.compose(p,{seed:3,expression:'scenery'}),b=drawing.compose(p,{seed:3,expression:'abstract'});assert.notDeepEqual(a.expression.marks.map(m=>m.form),b.expression.marks.map(m=>m.form));assert(a.expression.literal>b.expression.literal);assert(a.expression.density<b.expression.density);assert.notEqual(a.geometryKey,b.geometryKey);
});
test('shared geometry stays reproducible and scene-bound nodes cannot drift off their supports',()=>{
 const p=by('u01').record.plan;for(const mode of ['scenery','balanced','abstract']){const a=drawing.compose(p,{expression:mode,seed:8});assert.deepEqual(a,drawing.compose(p,{expression:mode,seed:8}));assert.deepEqual(drawing.positions(p,a,0,{},true).map(n=>n.at),drawing.positions(p,a,80,{},true).map(n=>n.at));}
});
test('night palettes and user overrides survive all expression modes',()=>{
 for(const id of ['u01','u02'])for(let seed=0;seed<30;seed++)for(const mode of ['scenery','balanced','abstract'])assert(drawing.compose(by(id).record.plan,{seed,expression:mode}).palette.dark);assert.equal(drawing.compose(by('u02').record.plan,{expression:'balanced',palette:'paper'}).palette.id,'paper');
});
test('historical adapters retain source-contract limits and never fabricate abstract relations',()=>{
 for(const id of ['h01','h02']){const p=by(id).record.plan;assert.equal(p.expression.sourceContract,'3.3');assert(!p.relations.length);assert(!p.processes.length);assert(p.expression.limitations.some(s=>s.includes('3.3')));}
 assert(by('h03').record.plan.expression.limitations.some(s=>s.includes('精确数量')));assert(!by('h01').rawValid);assert(by('h01').record.rawValidation);assert(by('h02').record.sourceContext);
});
test('one new API call serves every expression mode and keeps all three latest families separate',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'poem-expression-'));try{const file=join(folder,'config');await writeFile(file,'https://example.invalid/v1\ndummy-expression-secret\nmodel\n');let calls=0;
  const service=createGenerationService({credentialsPath:file,runsDir:join(folder,'runs'),fetcher:async(_url,opts)=>{calls++;const body=JSON.parse(opts.body);assert.deepEqual(JSON.parse(body.messages[1].content),{poem:first.poem});return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(body.messages[0].content.includes('expression-1.0')?first:sceneProjection(first))}}]}));}});
  const r=await service.analyze({poem:first.poem,mode:'expression'});assert(r.validation.valid);assert.equal(await service.latest(),null);assert.equal(await service.latest({abstract:true}),null);assert((await service.latest({expression:true})).plan.expression);assert((await service.analyze({poem:first.poem,mode:'expression'})).cached);assert.equal(calls,1);
  const normal=await service.analyze({poem:first.poem});assert(normal.validation.valid);assert.equal(calls,2);assert.equal((await service.latest()).mode,'composition');assert.equal((await service.latest({expression:true})).mode,'expression');
  assert.equal(await readFile(join(folder,'runs',r.id,'response.txt'),'utf8'),JSON.stringify(first));
 }finally{assert(folder.startsWith(join(tmpdir(),'poem-expression-')));await rm(folder,{recursive:true,force:true});}
});
