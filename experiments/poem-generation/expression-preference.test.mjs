import test from 'node:test';import assert from 'node:assert/strict';import {fixture} from './quantity-fixtures.mjs';import {asComposition} from './composition-fixtures.mjs';import {buildExpressionPlan} from './expression-plan.mjs';
test('automatic preference gives two drawable scene subjects a balanced start',()=>{
 const p=buildExpressionPlan(asComposition(fixture('明月照清泉。',[{text:'明月',kind:'environment'},{text:'清泉',kind:'environment'}])));assert.equal(p.expression.recommendation,'balanced');
});
