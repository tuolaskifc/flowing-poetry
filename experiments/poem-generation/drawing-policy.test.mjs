import test from'node:test';
import assert from'node:assert/strict';
import{buildPlan}from'./planner.mjs';
import{buildExpressionPlan}from'./expression-plan.mjs';
import{buildAbstractPlan}from'./abstract-plan.mjs';
import{validateCompositionContract}from'./composition-contract.mjs';
import{resolveSource,sourceInteger}from'./source-resolution.mjs';
import{ruleFixtures}from'./rule-fixtures.mjs';
import{mkdtemp,writeFile,rm}from'node:fs/promises';
import{join,resolve,sep}from'node:path';
import{tmpdir}from'node:os';
import{createGenerationService}from'./service.mjs';
import{spaceSubjects}from'./subject-spacing.mjs';
const get=id=>structuredClone(ruleFixtures.find(c=>c.id===id).analysis);
test('unseen calibrations validate and native generation shares the exact depiction pipeline',()=>{
 for(const f of ruleFixtures){const a=structuredClone(f.analysis),raw=JSON.stringify(a),v=validateCompositionContract(a,a.poem);assert(v.valid,f.id+': '+v.errors.join(';'));
  const native=buildPlan(a),shared=buildExpressionPlan(a).concretePlan;assert(native.drawingPolicy);assert(shared.drawingPolicy);assert.deepEqual(native.layers,shared.layers,f.id);assert.equal(JSON.stringify(a),raw);
 }
});
test('count rules generalize to pairs, Chinese integers, vessels and horses without treating branches as trees',()=>{
 assert.equal(buildPlan(get('g01')).layers.find(l=>l.tool==='bird').instances.length,4);
 assert.equal(buildPlan(get('g02')).layers.find(l=>l.tool==='bird').instances.length,23);
 const p=buildPlan(get('g03'));assert.equal(p.layers.find(l=>l.tool==='boat').instances.length,3);assert.equal(p.layers.find(l=>l.tool==='horse').instances.length,2);
 const flowers=buildPlan(get('g12'));assert.equal(flowers.layers.find(l=>l.tool==='tree').instances.length,1);assert.equal(flowers.sourceResolution.changes.length,0);
 for(const [text,n]of [['二十三',23],['23',23],['一百零二',102],['十',10],['三两',null]])assert.equal(sourceInteger(text),n);
});
test('identity chains merge transitively while co-present and absent people retain their boundaries',()=>{
 const a=get('g04'),p=buildPlan(a),fig=p.layers.filter(l=>l.tool==='figure');assert.equal(fig.length,1);assert.equal(fig[0].entities.length,3);assert.equal(fig[0].instances.length,1);
 assert.equal(buildPlan(get('g05')).layers.filter(l=>l.tool==='figure').length,2);assert.equal(resolveSource(get('g05')).identities.length,0);
});
test('multiple flags have distinct parent-instance anchors and unrelated holding verbs never attach a sword',()=>{
 const p=buildPlan(get('g06')),flags=p.layers.find(l=>l.tool==='flag');assert.equal(flags.instances.length,2);assert.equal(new Set(flags.instances.map(v=>v.attachment.instance)).size,2);assert.equal(p.layers.filter(l=>l.tool==='wine').length,0);
 const sword=buildPlan(get('g07')).layers.find(l=>l.tool==='weapon');assert(!sword.attachment);assert(sword.instances.every(v=>!v.attachment));
 const native=p.compositions||[];for(const alt of native)assert(alt.layers.find(l=>l.tool==='flag').instances.every(v=>v.attachment));
});
test('source colors belong to their own nouns and absence or comparison cannot create props',()=>{
 const p=buildPlan(get('g08'));assert.equal(p.layers.find(l=>l.names.includes('梅')).colorCue.color,'#D95860');assert.equal(p.layers.find(l=>l.names.includes('菊')).colorCue.color,'#F8F7EB');
 for(const id of['g10','g11'])assert(!buildPlan(get(id)).layers.some(l=>['flag','weapon'].includes(l.tool)));
});

test('actor separation preserves counts and carries an attached rider with its own boat',()=>{
 const p=buildPlan(get('g03'));assert.equal(p.layers.find(l=>l.tool==='boat').instances.length,3);assert.equal(p.layers.find(l=>l.tool==='horse').instances.length,2);assert(p.scene.organization.actorSpacing.repairs.length);assert.equal(p.scene.organization.audit.errors,0);
 const placement=at=>({at,scale:1,anchor:[320,230]}),boat={entities:['b'],tool:'boat',instances:[{id:'boat',placement:placement([.5,.8])}],placement:placement([.5,.8])},rider={entities:['r'],tool:'figure',instances:[{id:'rider',placement:placement([.5,.78]),attachment:{target:'b',instance:'boat'}}],placement:placement([.5,.78])},obstacle={entities:['o'],tool:'boat',instances:[{id:'obstacle',placement:placement([.5,.8])}],placement:placement([.5,.8]),semanticGroup:{role:'subject'}};
 const plan={layers:[obstacle,boat,rider]};spaceSubjects({spatial:[]},plan);assert.notDeepEqual(boat.instances[0].placement.at,[.5,.8]);assert(Math.abs(rider.instances[0].placement.at[0]-boat.instances[0].placement.at[0])<1e-9);assert(Math.abs(rider.instances[0].placement.at[1]-boat.instances[0].placement.at[1]+.02)<1e-9);
 const intentional=structuredClone(plan);intentional.layers[1].instances[0].placement.at=[.5,.8];intentional.layers[2].instances[0].placement.at=[.5,.78];spaceSubjects({spatial:[{source:'o',target:'b',type:'behind',modality:'asserted'}]},intentional);assert.deepEqual(intentional.layers[1].instances[0].placement.at,[.5,.8]);
});
test('live abstract adapters share drawing rules while explicit historical plans retain legacy rendering',()=>{
 const a={schema_version:'abstract-1.0',poem:'两对白鹭临水。',reading:'手工抽象协议适配校准',subjects:[{id:'a1',mentions:['白鹭'],meaning:'白鹭',kind:'concrete',role:'scene',presence:'present',evidence:['两对白鹭临水']},{id:'a2',mentions:['水'],meaning:'水',kind:'concrete',role:'scene',presence:'present',evidence:['两对白鹭临水']}],relations:[],processes:[],atmosphere:{labels:[],valence:'neutral',openness:'high',illumination:'day',evidence:['两对白鹭临水']},uncertainties:[]};
 const live=buildAbstractPlan(a,{sourceBound:true});assert(live.concretePlan.drawingPolicy);assert.equal(live.concretePlan.layers.find(l=>l.tool==='bird').instances.length,4);
 assert(!buildAbstractPlan(a).concretePlan.drawingPolicy);
});
test('all live service modes and cache replays carry the shared policy with provider requests fully simulated',async()=>{
 const base=tmpdir(),dir=await mkdtemp(join(base,'poem-shared-policy-')),credentialsPath=join(dir,'config');let calls=0;
 try{
  await writeFile(credentialsPath,'https://example.invalid/v1\nlocal-test-placeholder\nmodel\n');
  const a=get('g06'),abstract={schema_version:'abstract-1.0',poem:a.poem,reading:a.reading,subjects:a.entities.map((e,i)=>({id:'a'+(i+1),mentions:e.mentions,meaning:e.concept,kind:'concrete',role:e.role,presence:e.presence,evidence:e.evidence})),relations:[],processes:[],atmosphere:{labels:[],valence:'neutral',openness:'high',illumination:'day',evidence:[a.poem]},uncertainties:[]};
  const variants=[a,{...structuredClone(a),schema_version:'expression-1.0',expression:{relations:[],processes:[]}},abstract];
  const service=createGenerationService({runsDir:join(dir,'runs'),credentialsPath,fetcher:async()=>{const answer=variants[calls++];return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(answer)}}]}));}});
  for(const mode of['composition','expression','abstract']){const r=await service.analyze({poem:a.poem,mode});assert(r.validation.valid,r.validation.errors.join(';'));const p=r.plan.concretePlan||r.plan;assert(p.drawingPolicy);assert.equal(p.layers.find(l=>l.tool==='flag').instances.length,2);assert.equal(p.layers.filter(l=>l.tool==='wine').length,0);assert((await service.analyze({poem:a.poem,mode})).cached);}
  assert.equal(calls,3);
 }finally{assert(resolve(dir).startsWith(resolve(base)+sep));await rm(dir,{recursive:true,force:true});}
});
