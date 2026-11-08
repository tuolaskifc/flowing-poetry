import test from 'node:test';import assert from 'node:assert/strict';import {fixture} from './quantity-fixtures.mjs';import {asComposition} from './composition-fixtures.mjs';import {buildExpressionPlan} from './expression-plan.mjs';import {buildGuidedTrial} from './tool-guided-plan.mjs';
test('guided experiment only excludes opted-in subjects; default plan remains stable',()=>{
 const poem='明月照清泉。',a={...asComposition(fixture(poem,[{text:'明月',kind:'environment'},{text:'清泉',kind:'environment'}])),schema_version:'expression-1.0',expression:{relations:[],processes:[]}};
 const r={poem,analysis:a,validation:{valid:true}},before=JSON.stringify(buildExpressionPlan(a));
 const advice={choices:[{entity:'i1',tool_id:null,fit:'unavailable',reason:'试验保留缺口',evidence:['明月']},{entity:'i2',tool_id:'water',fit:'direct',reason:'水',evidence:['清泉']}],composition:'月与泉',expected:'部分绘制',uncertainties:[]};
 const x=buildGuidedTrial(r,advice);assert.deepEqual(x.excluded,['i1']);assert(!x.plan.concretePlan.layers.some(l=>l.entities.includes('i1')));assert(x.plan.concretePlan.layers.some(l=>l.entities.includes('i2')));assert.equal(JSON.stringify(buildExpressionPlan(a)),before);
 advice.choices[1].tool_id='unregistered';assert.throws(()=>buildGuidedTrial(r,advice));
});
