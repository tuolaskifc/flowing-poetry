import test from 'node:test';import assert from 'node:assert/strict';
import {sourceDrawing} from './source-drawing.mjs';import {buildExpressionPlan} from './expression-plan.mjs';import {fixture} from './quantity-fixtures.mjs';import {asComposition} from './composition-fixtures.mjs';
test('江枫 follows the interpreted maple sense without turning 江 into water',()=>{
 const poem='月落乌啼霜满天，江枫渔火对愁眠。';const a=asComposition(fixture(poem,[{text:'江枫',concept:'江边枫树',kind:'place'}]));const p=buildExpressionPlan(a);
 assert(p.concretePlan.layers.some(l=>l.tool==='tree'&&l.names.includes('江枫')));assert(!p.concretePlan.layers.some(l=>l.tool==='water'&&l.names.includes('江枫')));
 assert.equal(sourceDrawing({mentions:['江枫'],concept:'地名'},poem),null);
});
test('残菊和枝条 remain explicit drawing gaps, not blooming chrysanthemums or frost marks',()=>{
 const poem='荷尽已无擎雨盖，菊残犹有傲霜枝。';const a=asComposition(fixture(poem,[{text:'菊',concept:'菊花'},{text:'傲霜枝',concept:'菊的枝条'}]));const p=buildExpressionPlan(a);
 assert(p.expression.gaps.some(g=>g.label==='菊'));assert(p.expression.gaps.some(g=>g.label==='傲霜枝'));assert(!p.concretePlan?.layers.some(l=>l.entities.includes('i1')||l.entities.includes('i2')));
});
