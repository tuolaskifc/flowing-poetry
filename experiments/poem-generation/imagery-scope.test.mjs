import test from'node:test';import assert from'node:assert/strict';
import{buildPlan}from'./planner.mjs';import{fixture,quantity}from'./quantity-fixtures.mjs';import{asComposition}from'./composition-fixtures.mjs';
const plan=(word,extra={})=>buildPlan(asComposition(fixture(word,[{text:word,...extra}])));
test('synonyms share tools while places, unwanted insects and ambiguous meanings stay contextual',()=>{
 for(const [tool,words]of [['figure',['眉黛','蛾眉','佳人','女子','红袖']],['bird',['沙鸥','哀鸿','鸿雁']],['building',['秦楼']],['catkins',['杨花']],['boat',['兰桡','兰舟']],['instrument',['羌笛','古琴','琴瑟']]])for(const word of words){const p=plan(word,{kind:tool==='figure'?'person':'object'});assert(p.layers.some(l=>l.tool===tool),word);}
 for(const word of ['长安','南浦','潇湘','桃源','蝉','蟋蟀'])assert(!plan(word).layers.length,word);
 assert(!plan('杜鹃',{concept:'所指未明'}).layers.length);assert(plan('杜鹃',{concept:'鸟鸣'}).layers.some(l=>l.tool==='bird'));assert(plan('杜鹃',{concept:'花木'}).layers.some(l=>l.tool==='flower'));
 assert(!plan('佳人',{kind:'person',presence:'absent'}).layers.length);assert(!plan('哀鸿',{role:'reference'}).layers.length);
});
test('jar, chrysanthemum plant, thatched pavilion and illustrative pair respect explicit source choices',()=>{
 for(const [word,form]of [['酒','jar'],['酒杯','cup'],['酒液','liquid']])assert.equal(plan(word).layers.find(l=>l.tool==='wine').options.form,form);
 assert.equal(plan('菊花').layers.find(l=>l.tool==='flower-forms').options.form,'clump');assert.equal(plan('菊花',{quantity:quantity({mode:'exact',min:1,max:1,scope:'individual',unit:'朵',evidence:['菊花']})}).layers.find(l=>l.tool==='flower-forms').options.form,'crown');
 const pavilion=plan('长亭').layers.find(l=>l.tool==='pavilion');assert.equal(pavilion.options.roof,'thatched');assert.equal(pavilion.options.railing,'rail');
 const birds=plan('鸳鸯').layers.find(l=>l.tool==='bird');assert.equal(birds.instances.length,2);assert(!birds.quantity.exact);
 assert.equal(plan('鸳鸯',{quantity:quantity({mode:'exact',min:1,max:1,scope:'individual',unit:'只',evidence:['鸳鸯']})}).layers.find(l=>l.tool==='bird').instances.length,1);
});
