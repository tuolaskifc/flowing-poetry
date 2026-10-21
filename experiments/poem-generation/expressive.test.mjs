import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,quantity} from './quantity-fixtures.mjs';
import {benchmarks} from './scene-benchmarks.mjs';
import {buildPlan} from './planner.mjs';
import recommendation from './recommendation.js';
test('lodging and named temples share dwelling symbols without materializing city names',()=>{
 const a=fixture('客舍禅房寒山寺，长安望燕京。',[{text:'客舍',kind:'place'},{text:'禅房',kind:'place'},{text:'寒山寺',kind:'place'},{text:'长安',kind:'place'},{text:'燕京',kind:'place'}]);
 const p=buildPlan(a);assert.deepEqual(p.layers.map(l=>[l.tool,l.options.kind]),[['dwelling','house'],['dwelling','temple']]);assert.deepEqual(p.omitted.map(e=>e.name),['长安','燕京']);assert(p.notes.some(n=>n.includes('写意借形')));
 const village=fixture('村舍成片。',[{text:'村舍',kind:'place',quantity:quantity({mode:'many',scope:'group',extent:'spread',evidence:['村舍成片']})}]);const houses=buildPlan(village).layers[0];assert(houses.instances.length>1);assert(!houses.quantity.exact);
});
test('species names share birds while original quantities and group units stay distinct',()=>{
 const p=buildPlan(benchmarks[6].analysis),orioles=p.layers.find(l=>l.names.includes('黄鹂')),egrets=p.layers.find(l=>l.names.includes('白鹭'));
 assert.equal(orioles.tool,'bird');assert.equal(orioles.instances.length,2);assert(orioles.quantity.exact);assert.equal(egrets.tool,'bird');assert(egrets.instances.length>1);assert(!egrets.quantity.exact);assert.equal(egrets.options.tone,'light');
 const xs=egrets.instances.map(v=>v.placement.at[0]);assert(Math.max(...xs)-Math.min(...xs)>.5);
});
test('unspecified birds are sparse individual gestures and ducks have a waterbird option',()=>{
 const a=fixture('鸭与鸦。',[{text:'鸭',kind:'organism'},{text:'鸦',kind:'organism'}]),p=buildPlan(a);assert(p.layers.every(l=>l.instances.length>=3&&l.instances.length<=6));assert(p.layers.some(l=>l.options.pose==='waterbird'));assert(p.layers.some(l=>l.options.pose==='flying'));
 const b=fixture('鸟未飞。',[{text:'鸟',kind:'organism',evidence:['鸟未飞']}]);assert.equal(buildPlan(b).layers[0].options.pose,'resting');
});
test('four hooves project one horse, and a separate whole-horse mention does not duplicate it',()=>{
 const q=quantity({mode:'exact',min:4,max:4,unit:'蹄',scope:'part',evidence:['四蹄']}),a=fixture('四蹄踏草，马来。',[{text:'蹄',kind:'organism',quantity:q}]);
 let p=buildPlan(a);assert.equal(p.layers[0].instances.length,1);assert(!p.layers[0].quantity.exact);assert(p.layers[0].quantityLabel.includes('马匹数未明'));
 a.entities.push({id:'i2',mentions:['马'],concept:'马',kind:'organism',role:'scene',presence:'present',evidence:['马'],quantity:quantity({mode:'exact',min:1,max:1,scope:'individual',evidence:['马来']})});p=buildPlan(a);assert.equal(p.layers[0].instances.length,1);assert.equal(p.layers[0].entities.length,2);
});
test('literal sound cues may inspire bodies but absence, comparison and named people remain excluded',()=>{
 const a=fixture('鸟声马蹄声，司马望燕京。',[{text:'鸟声',kind:'abstract'},{text:'马蹄声',kind:'abstract'},{text:'司马',kind:'person'},{text:'燕京',kind:'place'}]);assert.deepEqual(buildPlan(a).layers.map(l=>l.tool),['horse','bird']);
 a.entities[0].presence='absent';a.entities[1].role='reference';assert.equal(buildPlan(a).layers.length,0);
});
test('compound plants and ambiguous cuckoos are not blindly mapped to animals',()=>{
 const a=fixture('马蹄莲，杜鹃花，杜鹃。',[{text:'马蹄莲',kind:'organism'},{text:'杜鹃花',kind:'organism'},{text:'杜鹃',concept:'杜鹃花灌木',kind:'organism'}]);const p=buildPlan(a);assert(p.layers.every(l=>l.tool==='flower'));assert(!p.layers.some(l=>['bird','horse'].includes(l.tool)));
 const b=fixture('杜鹃啼。',[{text:'杜鹃',concept:'啼叫的鸟',kind:'organism',evidence:['杜鹃啼']}]);assert.equal(buildPlan(b).layers[0].tool,'bird');
 const c=fixture('木兰舟，柏舟，桂花酒。',[{text:'木兰舟',kind:'object'},{text:'柏舟',kind:'object'},{text:'桂花酒',kind:'object'}]);assert.deepEqual(buildPlan(c).layers.map(l=>l.tool),['boat','wine']);
});
test('paddy, waterfall, stars and shadow cues use their own scene forms instead of generic river waves',()=>{
 for(const [i,form] of [[19,'field'],[14,'waterfall'],[17,'stars'],[15,'shadow']])assert(buildPlan(benchmarks[i].analysis).layers.some(l=>l.tool==='landscape'&&l.options.form===form));
 const waterfall=buildPlan(benchmarks[14].analysis);assert(!waterfall.layers.some(l=>l.tool==='water'));assert(waterfall.layers.find(l=>l.options.form==='waterfall').animate);assert(waterfall.omitted.some(e=>e.name==='银河'));
});
test('screening recognizes new pictorial families while blocking names and unrelated compounds',()=>{
 assert.equal(recommendation.scorePoem('客舍黄鹂马蹄').toolCount,3);
 for(const text of ['司马','燕京','鸿儒','房玄龄','星期'])assert.equal(recommendation.scorePoem(text).toolCount,0,text);
});
