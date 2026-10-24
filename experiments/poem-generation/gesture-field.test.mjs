import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {prepareExpressionStudies} from './expression-cases.mjs';
import {buildExpressionPlan} from './expression-plan.mjs';
import {asComposition} from './composition-fixtures.mjs';
import {fixture,quantity} from './quantity-fixtures.mjs';
const require=createRequire(import.meta.url),drawing=require('./abstract-scene.js'),gestures=require('./gesture-field.js');
const data=await prepareExpressionStudies(),plan=id=>data.cases.find(c=>c.id===id).record.plan;

test('full-frame gestures vary with seed but preserve all semantic entities, quantities and scene anchors',()=>{
 for(const {record} of data.cases){const p=record.plan,original=structuredClone(p);
  for(const [style] of drawing.styles.slice(1)){
   const local=drawing.compose(p,{expression:'abstract',style,seed:9,expanse:0}),wide=drawing.compose(p,{expression:'abstract',style,seed:9,expanse:1});
   assert(wide.frame);assert.equal(wide.frame.physicalScenery,false);assert.equal(wide.frame.basis,'local-artistic-choice');
   assert.deepEqual(wide.nodes,local.nodes);assert.deepEqual(wide.expression,local.expression);
   assert.deepEqual(wide,drawing.compose(p,{expression:'abstract',style,seed:9,expanse:1}));
   assert.notDeepEqual(wide.frame,drawing.compose(p,{expression:'abstract',style,seed:10,expanse:1}).frame);
  }
  assert.deepEqual(p,original);
 }
});

test('viewing modes control free gesture strength independently from physical scene placement',()=>{
 const p=plan('u02'),c=mode=>drawing.compose(p,{expression:mode,seed:1,expanse:1});
 assert(!c('scenery').frame);assert.equal(c('balanced').frame.strength,.5);assert.equal(c('abstract').frame.strength,1);
 for(const expanse of [0,-1,NaN])assert(!drawing.compose(p,{expression:'abstract',expanse}).frame);
 assert.equal(drawing.compose(p,{expression:'abstract',expanse:20}).frame.strength,1);
 assert(!drawing.compose(p,{expanse:0}).frame);
});

test('missing, contextual and unavailable subjects never gain a free painted field',()=>{
 const base=drawing.compose(plan('u03'),{expanse:0}),source=base.nodes[0];
 for(const patch of [{mode:'gap'},{contextOnly:true},{unavailable:true},{expressionGain:0}]){
  assert.equal(gestures.build(null,{...base,nodes:[{...source,...patch}]},1),null);
 }
 const missing=buildExpressionPlan(asComposition(fixture('长安',[{text:'长安',concept:'高楼',kind:'place'}])));
 assert(!drawing.compose(missing,{expression:'abstract',expanse:1}).frame);
 const candidate=gestures.build(null,{...base,nodes:[{...source,mode:'candidate'}]},1);
 assert(candidate);assert.equal(candidate.fields.length,1);assert.equal(candidate.fields[0].source,source.id);
});

test('free field density never adds to explicitly counted physical birds',()=>{
 const p=buildExpressionPlan(asComposition(fixture('两只白鸟',[{text:'白鸟',quantity:quantity({mode:'exact',min:2,max:2,unit:'只',scope:'individual',evidence:['两只白鸟']})}])));
 for(const expanse of [0,.5,1])for(const density of [0,1]){
  const c=drawing.compose(p,{expression:'abstract',expanse,density});
  assert.equal(c.expression.marks.filter(m=>m.subject==='i1').length,2);
  assert.equal(c.nodes.length,1);if(c.frame)assert(c.frame.fields.every(f=>f.source==='i1'));
 }
});
