import test from 'node:test';import assert from 'node:assert/strict';import {fixture} from './quantity-fixtures.mjs';import {asComposition} from './composition-fixtures.mjs';import {buildExpressionPlan} from './expression-plan.mjs';
test('opt-in model tool can select a pavilion where normal mapping does not, without changing original plan',()=>{
 const a=asComposition(fixture('孤山寺北贾亭西。',[{text:'贾亭',kind:'place'}]));const before=JSON.stringify(buildExpressionPlan(a));const p=buildExpressionPlan(a,{experimentalTools:{i1:'pavilion'}});assert(p.concretePlan.layers.some(l=>l.tool==='pavilion'&&l.entities.includes('i1')));assert.equal(JSON.stringify(buildExpressionPlan(a)),before);
});
test('absent and comparison subjects cannot become scenery through experimental tool selection',()=>{
 const a=asComposition(fixture('不见贾亭。',[{text:'贾亭',kind:'place',presence:'absent'}]));const p=buildExpressionPlan(a,{experimentalTools:{i1:'pavilion'}});assert(!p.concretePlan?.layers.some(l=>l.entities.includes('i1')));
});
