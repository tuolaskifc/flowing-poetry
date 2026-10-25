import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {recoverInterpretation,parseModelJSON,constrainRecoveredPlan} from './generation-recovery.mjs';
import {validateExpression} from './expression-contract.mjs';
import {validateAbstract} from './abstract-contract.mjs';
import {buildExpressionPlan} from './expression-plan.mjs';
import {createGenerationService} from './service.mjs';
import {slowScene} from './composition-fixtures.mjs';
const cases=JSON.parse(await readFile(new URL('reliability-cases.json',import.meta.url),'utf8')).cases;
const flower=cases.find(c=>c.id.endsWith('7c58cd33'));
const withAction=()=>({...slowScene(),schema_version:'expression-1.0',expression:{relations:[],processes:[]}});
test('eleven captured failures recover locally without rewriting subjects, quantities, roles or raw records',async()=>{
 assert.equal(cases.length,11);
 const meanings=a=>a.entities.map(e=>[e.id,e.mentions,e.concept,e.kind,e.role,e.presence,e.quantity]);
 for(const c of cases){
  const before=JSON.stringify(c.analysis),r=recoverInterpretation(c.analysis,c.poem,c.mode),effective=r.effectiveAnalysis||c.analysis;
  assert(r.validation.valid,c.id+': '+r.validation.errors.join(' '));assert.equal(JSON.stringify(c.analysis),before);assert.deepEqual(meanings(effective),meanings(c.analysis));assert(!r.recovery?.omitted.length);
  assert(buildExpressionPlan(effective).nodes.length);
  const file=await readFile(new URL('runs/'+c.id+'/result.json',import.meta.url));assert.equal(createHash('sha256').update(file).digest('hex'),c.originalResultHash);
 }
});
test('comparison references may echo or contrast but cannot act as present physical subjects',()=>{
 const a=structuredClone(flower.analysis);assert(validateExpression(a,a.poem).valid);
 a.expression.relations[0].kind='contrast';assert(validateExpression(a,a.poem).valid);
 a.expression.relations[0].kind='interweave';assert(!validateExpression(a,a.poem).valid);
 a.expression.relations[0].kind='echo';a.entities[1].role='scene';assert(!validateExpression(a,a.poem).valid);
 a.entities[1].presence='absent';assert(!validateExpression(a,a.poem).valid);
 const raw=JSON.parse(JSON.stringify(flower.analysis));raw.expression.processes.push({subject:'i2',kind:'persist',temporal:'ongoing',modality:'asserted',basis:'explicit',evidence:[raw.poem]});assert(!validateExpression(raw,raw.poem).valid);
});
test('abstract comparison shares the same reference boundary without changing process validity',()=>{
 const a={schema_version:'abstract-1.0',poem:'月如霜。',reading:'月光如霜。',subjects:[{id:'a1',mentions:['月'],meaning:'月光',kind:'concrete',role:'scene',presence:'present',evidence:['月如霜']},{id:'a2',mentions:['霜'],meaning:'比喻参照',kind:'concrete',role:'reference',presence:'unclear',evidence:['月如霜']}],relations:[{source:'a1',target:'a2',kind:'echo',modality:'asserted',basis:'explicit',evidence:['月如霜']}],processes:[],atmosphere:{labels:[],valence:'neutral',openness:'unclear',illumination:'night',evidence:['月如霜']},uncertainties:[]};
 assert(validateAbstract(a,a.poem).valid);a.relations[0].kind='approach';assert(!validateAbstract(a,a.poem).valid);
});
test('only unambiguous known enum wrappers are flattened, preserving all source evidence',()=>{
 const c=cases.find(c=>c.id.endsWith('fa6aac63')),r=recoverInterpretation(c.analysis,c.poem,'expression');
 assert.equal(r.effectiveAnalysis.scene.atmosphere.visibility,'hazy');assert.equal(r.recovery.changes[0].kind,'enum-wrapper');assert(r.effectiveAnalysis.scene.atmosphere.evidence.every(q=>c.poem.includes(q)));
 for(const mutate of [a=>a.scene.atmosphere.visibility.value=['hazy','clear'],a=>a.scene.atmosphere.visibility.enum='hazy',a=>a.scene.atmosphere.visibility.code='draw()',a=>a.scene.atmosphere.visibility.basis='explicit',a=>a.scene.atmosphere.visibility.evidence=['编造']]){const a=structuredClone(c.analysis);mutate(a);assert(!recoverInterpretation(a,a.poem,'expression').validation.valid);}
});
test('local source anchoring broadens only to actual neighboring clauses and records the change',()=>{
 const c=cases.find(c=>c.id.endsWith('ab3bca15')),r=recoverInterpretation(c.analysis,c.poem,'expression');assert(r.validation.valid);assert(r.recovery.changes.every(c=>c.kind==='source-range-only'));assert(r.effectiveAnalysis.expression.relations[0].evidence.includes('日出江花红胜火，'));
 const a=structuredClone(c.analysis);a.expression.relations[0].evidence=['不是原文'];const p=recoverInterpretation(a,a.poem,'expression');assert.equal(p.recovery.status,'partial');assert(!p.effectiveAnalysis.expression.relations.some(r=>r.evidence.includes('不是原文')));
});
test('quarantine preserves good claims and never changes absent, conditional or negated meanings',()=>{
 const a=structuredClone(flower.analysis);a.expression.processes.push({subject:'i2',kind:'persist',temporal:'ongoing',modality:'asserted',basis:'inferred',evidence:[a.poem]});
 const r=recoverInterpretation(a,a.poem,'expression');assert.equal(r.recovery.status,'partial');assert.equal(r.recovery.omitted.length,1);assert.deepEqual(r.effectiveAnalysis.entities,a.entities);assert.deepEqual(r.effectiveAnalysis.expression.relations,a.expression.relations);assert.deepEqual(r.effectiveAnalysis.expression.processes,a.expression.processes.slice(0,-1));assert(!r.rawValidation.valid);
 for(const modality of ['negated','conditional','possible']){const b=structuredClone(flower.analysis);b.expression.processes[0].modality=modality;const x=recoverInterpretation(b,b.poem,'expression');assert(x.validation.valid);assert.equal((x.effectiveAnalysis||b).expression.processes[0].modality,modality);}
});
test('conflicting duplicate processes are both withheld rather than picking a winner',()=>{
 const a=structuredClone(flower.analysis);a.expression.processes.push({...a.expression.processes[0],kind:'fade'});const r=recoverInterpretation(a,a.poem,'expression');assert.equal(r.recovery.status,'partial');assert.equal(r.recovery.omitted.length,2);assert(!r.effectiveAnalysis.expression.processes.some(p=>p.subject==='i1'));assert(r.effectiveAnalysis.expression.processes.some(p=>p.subject==='i3'));
});
test('missing optional expression components yield an explicitly partial view while missing core data still fails',()=>{
 const a=structuredClone(flower.analysis);delete a.expression;const r=recoverInterpretation(a,a.poem,'expression');assert(r.validation.valid);assert.equal(r.recovery.status,'partial');assert.equal(r.recovery.omitted.length,2);assert.deepEqual(r.effectiveAnalysis.entities,a.entities);assert.deepEqual(r.effectiveAnalysis.expression,{relations:[],processes:[]});assert(!validateExpression(a,a.poem).valid);
 const b=structuredClone(a);delete b.entities;assert(!recoverInterpretation(b,b.poem,'expression').validation.valid);
});
test('missing scene extensions retain validated subjects as a partial still view without invented layout claims',()=>{
 const a=withAction();delete a.scene;delete a.spatial;delete a.expression;const before=JSON.stringify(a),r=recoverInterpretation(a,a.poem,'expression');
 assert(r.validation.valid,r.validation.errors.join(' '));assert.equal(r.recovery.status,'partial');assert.equal(JSON.stringify(a),before);assert.deepEqual(r.effectiveAnalysis.entities,a.entities);
 assert.equal(r.effectiveAnalysis.scene.setting.kind,'unclear');assert.deepEqual(r.effectiveAnalysis.scene.groups,[]);assert.deepEqual(r.effectiveAnalysis.scene.actions,[]);
 const p=constrainRecoveredPlan(buildExpressionPlan(r.effectiveAnalysis),r.recovery);assert(p.concretePlan.layers.every(l=>!l.animate&&l.timeScale===0));
 const b=structuredClone(a);delete b.entities[0].quantity;assert(!recoverInterpretation(b,b.poem,'expression').validation.valid);
 const c=withAction();c.scene='omitted';assert(!recoverInterpretation(c,c.poem,'expression').validation.valid);
});
test('a quarantined physical action cannot reappear through default movement',()=>{
 const a=withAction();a.scene.actions[1].evidence=['捏造依据'];const r=recoverInterpretation(a,a.poem,'expression');assert(r.validation.valid);assert.equal(r.recovery.status,'partial');const p=constrainRecoveredPlan(buildExpressionPlan(r.effectiveAnalysis),r.recovery),bird=p.concretePlan.layers.find(l=>l.tool==='bird');assert(!bird.animate);assert.equal(bird.timeScale,0);assert(!bird.motion);
});
test('an unknown optional action enum is withheld without discarding valid subjects or guessing a replacement',()=>{
 const a=withAction();a.scene.actions[1].state='soar';const raw=JSON.stringify(a),r=recoverInterpretation(a,a.poem,'expression');
 assert(r.validation.valid);assert.equal(r.recovery.status,'partial');assert.deepEqual(r.effectiveAnalysis.entities,a.entities);assert.equal(JSON.stringify(a),raw);
 assert(r.recovery.omitted.some(o=>o.path==='scene.actions[1]'));assert(!r.effectiveAnalysis.scene.actions.some(v=>v.state==='soar'));
 const p=constrainRecoveredPlan(buildExpressionPlan(r.effectiveAnalysis),r.recovery),bird=p.concretePlan.layers.find(l=>l.tool==='bird');assert.equal(bird.timeScale,0);assert(!bird.motion);
 const b=withAction();b.scene.atmosphere.illumination='purple';assert(!recoverInterpretation(b,b.poem,'expression').validation.valid);
});
test('bad input, invented entities, changed exact quantities and executable extra fields stay hard failures',()=>{
 for(const mutate of [a=>a.poem='改写',a=>a.entities[0].mentions=['凭空添加'],a=>a.entities[0].quantity={...a.entities[0].quantity,mode:'exact',min:1,max:4},a=>delete a.reading,a=>a.expression.relations[0].code='fetch(secret)',a=>a.scene.atmosphere.illumination='purple']){const a=structuredClone(flower.analysis);mutate(a);assert(!recoverInterpretation(a,flower.poem,'expression').validation.valid);}
 for(const a of [null,[],false,{},'text'])assert(!recoverInterpretation(a,'月','expression').validation.valid);
});
test('JSON fences unwrap mechanically; truncated or surrounding prose is not guessed',()=>{
 assert.deepEqual(parseModelJSON('```json\n{"x":1}\n```'),{analysis:{x:1},wrapped:true});assert.deepEqual(parseModelJSON('{"x":1}'),{analysis:{x:1},wrapped:false});
 for(const text of ['说明：{"x":1}','{"x":','```json\n{"x":1}\n```extra'])assert.throws(()=>parseModelJSON(text));
});
async function sandbox(fn){const dir=await mkdtemp(join(tmpdir(),'poem-reliability-'));try{const credentials=join(dir,'config');await writeFile(credentials,'https://example.invalid/v1\ndummy-reliability-secret\nmodel\n');await fn({dir,credentials,runsDir:join(dir,'runs')});}finally{assert(dir.startsWith(join(tmpdir(),'poem-reliability-')));await rm(dir,{recursive:true,force:true});}}
const reply=(a,reason='stop')=>new Response(JSON.stringify({choices:[{finish_reason:reason,message:{content:JSON.stringify(a)}}]}));
test('service saves raw failure and effective partial result separately, and caches across intervening poems',async()=>sandbox(async env=>{
 let calls=0;const a=structuredClone(flower.analysis);a.expression.processes.push({subject:'i2',kind:'persist',temporal:'ongoing',modality:'asserted',basis:'inferred',evidence:[a.poem]});
 const wrapped='```json\n'+JSON.stringify(a)+'\n```';
 const service=createGenerationService({...env,credentialsPath:env.credentials,fetcher:async(_url,opts)=>{calls++;const req=JSON.parse(opts.body),poem=JSON.parse(req.messages[1].content).poem;return poem===a.poem?new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:wrapped}}]})):reply(withAction());}});
 const r=await service.analyze({poem:a.poem,mode:'expression'});assert(r.validation.valid);assert(!r.rawValidation.valid);assert(r.rawValidation.errors.some(e=>e.includes('Markdown')));assert.equal(r.delivery.status,'partial');assert.equal(await readFile(join(env.runsDir,r.id,'response.txt'),'utf8'),wrapped);assert.deepEqual(JSON.parse(await readFile(join(env.runsDir,r.id,'effective-analysis.json'),'utf8')),r.effectiveAnalysis);
 await service.analyze({poem:withAction().poem,mode:'expression'});const cached=await service.analyze({poem:a.poem,mode:'expression'});assert(cached.cached);assert.equal(cached.delivery.status,'partial');assert.equal(calls,2);
}));
test('latest replays a previously rejected answer without editing its original record or calling a model',async()=>sandbox(async env=>{
 const {mkdir}=await import('node:fs/promises'),folder=join(env.runsDir,'2026-test');await mkdir(folder,{recursive:true});const saved={id:'2026-test',poem:flower.poem,mode:'expression',finish_reason:'stop',analysis:flower.analysis,validation:flower.originalValidation},text=JSON.stringify(saved);await writeFile(join(folder,'result.json'),text);
 const service=createGenerationService({...env,credentialsPath:env.credentials,fetcher:()=>{throw Error('Must not call');}}),r=await service.latest({expression:true});assert(r.cached&&r.validation.valid);assert(!r.rawValidation.valid);assert.equal(r.recovery.status,'revalidated');assert.equal(await readFile(join(folder,'result.json'),'utf8'),text);
}));
test('network, truncated and globally invalid replies make one request and keep an explicit failed state',async()=>sandbox(async env=>{
 for(const kind of ['network','length','invalid']){let calls=0;const service=createGenerationService({...env,runsDir:join(env.runsDir,kind),credentialsPath:env.credentials,fetcher:async()=>{calls++;if(kind==='network')throw Error('fetch failed');if(kind==='length')return reply(flower.analysis,'length');return reply({...flower.analysis,poem:'不是输入'});}});const r=await service.analyze({poem:flower.poem,mode:'expression'});assert.equal(calls,1);assert(!r.validation.valid);assert(!r.plan);assert.equal(r.delivery.status,'failed');assert(r.delivery.message.includes('本句画面'));}
}));
test('feedback makes partial output and retained old pictures distinguishable',async()=>{
 const context=vm.createContext({window:{}});vm.runInContext(await readFile(new URL('../../poem-flow/generation-feedback.js',import.meta.url),'utf8'),context);const f=context.window.PoemGenerationFeedback;
 assert(f.failure({delivery:{message:'未生成本句画面。'}},true).includes('上次画面'));assert(f.success({recovery:{message:'个别联系暂未采用。'}},'本地切换').includes('暂未采用'));assert.equal(f.notes({recovery:{message:'格式已整理',changes:[{kind:'source-range-only'}],omitted:[]}}).length,2);
});
