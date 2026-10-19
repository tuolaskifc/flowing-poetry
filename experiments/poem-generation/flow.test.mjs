import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import examples from '../poem-semantics/contract-v3/examples.mjs';
import {buildPlan} from './planner.mjs';
import {createGenerationService,parseCredentials} from './service.mjs';
const base=structuredClone(examples[0].analysis);
function fixture(poem,entities,relations=[]){return {...structuredClone(base),poem,entities,relations,reading:'测试解读',atmosphere:{...base.atmosphere,evidence:[poem]},time:{markers:[],note:null},uncertainties:[]};}
const entity=(id,text,extra={})=>({id,mentions:[text],concept:text,kind:'environment',role:'scene',presence:'present',evidence:[text],...extra});
test('absent, metaphor and uncertain objects do not become real layers',()=>{
  const value=fixture('月如霜，水不见',[entity('i1','月'),entity('i2','霜',{role:'reference',presence:'unclear'}),entity('i3','水',{presence:'absent'})]);
  const plan=buildPlan(value);assert.deepEqual(plan.layers.map(l=>l.tool),['moon']);assert.equal(plan.omitted.length,2);
});
test('specific unimplemented organisms do not fall through to generic drawings',()=>{
  const plan=buildPlan(fixture('松间桃花映梅子',[entity('i1','松'),entity('i2','桃花'),entity('i3','梅子')]));assert.equal(plan.layers.length,0);assert.equal(plan.omitted.length,3);
});
test('negated wind remains off; negated movement freezes a present fish',()=>{
  const v=fixture('风不起，鱼不游',[entity('i1','风'),entity('i2','鱼',{kind:'organism'})],[{type:'changes',source:'i1',target:null,meaning:'风未起',modality:'negated',basis:'explicit',evidence:['风不起']},{type:'moves',source:'i2',target:null,meaning:'鱼不游',modality:'negated',basis:'explicit',evidence:['鱼不游']}]);
  const plan=buildPlan(v);assert.equal(plan.settings.wind,0);assert.equal(plan.layers[0].animate,false);
});
test('co-reference keeps a single boat layer and does not invent passengers',()=>{
  const v=fixture('舟行，船行',[entity('i1','舟',{mentions:['舟','船'],concept:'同一条船',kind:'object'})]);
  const plan=buildPlan(v);assert.equal(plan.layers.length,1);assert.equal(plan.layers[0].tool,'boat');assert.equal(plan.omitted.length,0);
});
test('a plain moon is marked as a local shape choice; explicit full moon stays full',()=>{
  const normal=buildPlan(fixture('月',[entity('i1','月')])),full=buildPlan(fixture('满月',[entity('i1','满月')]));
  assert.equal(normal.layers[0].options.shape,'crescent');assert(normal.notes.some(n=>n.includes('未明确月形')));assert.equal(full.layers[0].options.shape,'full');
});
test('an explicit stone surface can use a rock tool without replacing named places',()=>{
  const plan=buildPlan(fixture('石上望长安',[entity('i1','石上',{kind:'place'}),entity('i2','长安',{kind:'place'})]));
  assert.deepEqual(plan.layers.map(l=>l.tool),['rock']);assert.equal(plan.omitted[0].name,'长安');
});

test('wine keeps an unspecified vessel absent and explicit cups use only the cup option',()=>{
  const plain=buildPlan(fixture('浊酒',[entity('i1','浊酒',{kind:'object'})]));
  assert.deepEqual(plain.layers.map(l=>[l.tool,l.options.form]),[['wine','liquid']]);
  assert(plain.notes.some(n=>n.includes('不补杯')));
  const cup=buildPlan(fixture('酒杯',[entity('i1','酒杯',{kind:'object'})]));
  assert.equal(cup.layers[0].options.form,'cup');
  const activity=buildPlan(fixture('饮酒',[entity('i1','饮酒',{kind:'object'})]));
  assert.equal(activity.layers.length,0);
  const overNormalized=buildPlan(fixture('酒',[entity('i1','酒',{kind:'object',concept:'杯中酒'})]));
  assert.equal(overNormalized.layers[0].options.form,'liquid');
  const activityAsCup=buildPlan(fixture('饮酒',[entity('i1','饮酒',{kind:'object',concept:'酒杯'})]));
  assert.equal(activityAsCup.layers.length,0);
});

test('building and flowering plum use their own units without turning place names or plum fruit into objects',()=>{
  const plan=buildPlan(fixture('楼前有梅枝',[entity('i1','楼前',{kind:'place'}),entity('i2','梅枝',{kind:'organism'}),entity('i3','金陵',{kind:'place'}),entity('i4','梅子',{kind:'organism'})]));
  assert.deepEqual(plan.layers.map(l=>l.tool),['building','plum-branch']);
  assert.deepEqual(plan.omitted.map(e=>e.name),['金陵','梅子']);
  const rain=buildPlan(fixture('梅雨',[entity('i1','梅雨')]));
  assert.deepEqual(rain.layers.map(l=>l.tool),['rain']);
});
test('credentials stay in request headers, successful replay uses no new call, failed JSON stays unrendered',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'poem-flow-test-')),path=join(dir,'config.txt'),key='dummy-private-test-value';
  await writeFile(path,'https://example.invalid/v1\n'+key+'\ntest-model\n');let calls=0;
  const analysis=fixture('月',[entity('i1','月')]);
  try{
    const service=createGenerationService({credentialsPath:path,runsDir:join(dir,'runs'),fetcher:async(url,options)=>{
      calls++;assert.equal(url,'https://example.invalid/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer '+key);assert(!options.body.includes(key));
      return new Response(JSON.stringify({model:'test-model',choices:[{finish_reason:'stop',message:{content:JSON.stringify(analysis)}}],usage:{total_tokens:42}}));
    }});
    const a=await service.analyze({poem:'月'}),b=await service.analyze({poem:'月'});assert(a.validation.valid);assert.equal(b.cached,true);assert.equal(calls,1);
    for(const folder of await readdir(join(dir,'runs')))for(const name of await readdir(join(dir,'runs',folder)))assert(!(await readFile(join(dir,'runs',folder,name),'utf8')).includes(key));
    const broken=createGenerationService({credentialsPath:path,runsDir:join(dir,'bad'),fetcher:async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'not json'}}]}))});
    const failure=await broken.analyze({poem:'月'});assert.equal(failure.validation.valid,false);assert.equal(failure.plan,undefined);assert.equal(await broken.latest(),null);
    await assert.rejects(()=>service.analyze({poem:' '.repeat(2)}),/1–200/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('credential endpoints cannot embed authentication or redirect parameters',()=>{
  assert.throws(()=>parseCredentials('http://example.invalid\nkey\nmodel'));
  assert.throws(()=>parseCredentials('https://user:pass@example.invalid\nkey\nmodel'));
  assert.throws(()=>parseCredentials('https://example.invalid?key=value\nkey\nmodel'));
});
