import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {buildPlan} from './planner.mjs';
import {fixture,quantity} from './quantity-fixtures.mjs';
import {asComposition,group,action,claim} from './composition-fixtures.mjs';
import {inRegion} from './scene-organization.mjs';
const data=JSON.parse(await readFile(new URL('display-cases.json',import.meta.url),'utf8'));
const cases=data.cases.map(c=>({...c,plan:buildPlan(c.analysis)})),by=id=>cases.find(c=>c.id===id);
test('ten user regression replays preserve source semantics, exact counts and reference exclusions',()=>{
 assert.equal(cases.length,10);
 for(const c of cases){
  const raw=JSON.stringify(c.analysis),p=buildPlan(c.analysis);assert.equal(JSON.stringify(c.analysis),raw);
  for(const v of [p,...p.compositions||[]]){
   assert.equal(v.scene.organization.audit.errors,0,c.id);assert.equal(v.scene.displayAudit.errors,0,c.id);
   for(const l of v.layers){assert.equal(l.instances.length,l.quantity.rendered);for(const id of l.entities){const e=c.analysis.entities.find(e=>e.id===id);assert.equal(e.role,'scene');assert.equal(e.presence,'present');}}
  }
 }
 assert(by('r10').plan.omitted.some(o=>o.name==='银河'));
});
test('a small tower tagged as place retains the existing building brush; proper names stay gaps',()=>{
 assert(by('r02').plan.layers.some(l=>l.tool==='building'&&l.entities.includes('i1')));assert(!by('r02').plan.omitted.length);
 for(const text of ['小楼','高楼','危楼','楼阁','小亭'])assert(buildPlan(fixture(text,[{text,kind:'place'}])).layers.some(l=>l.entities.includes('i1')));
 assert(!buildPlan(fixture('长安',[{text:'长安',kind:'place',concept:'一座高楼'}])).layers.length);
});
test('night interpretation selects a dark background, with readable moon and literal colors reaching palettes',async()=>{
 const context=vm.createContext({window:{}});vm.runInContext(await readFile(new URL('../imagery-library/drawing/core.js',import.meta.url),'utf8'),context);const drawing=context.window.PoemDrawing;
 for(const c of cases.filter(c=>c.analysis.scene.atmosphere.illumination==='night')){
  const bg=drawing.paletteFor(c.plan.settings.palette).bg;assert([1,3,5].map(i=>parseInt(bg.slice(i,i+2),16)).every(v=>v<85));
 }
 const moon=by('r07').plan.layers.find(l=>l.tool==='moon').instances[0];assert(moon.placement.scale>=.76&&moon.opacity>=.9);
 const p=by('r06').plan,water=p.layers.find(l=>l.tool==='water'),flower=p.layers.find(l=>l.tool==='flower');
 assert(water.colorCue.evidence.includes('江碧'));assert(flower.colorCue.evidence.includes('花欲燃'));
 assert.notEqual(drawing.paletteFor(p.settings.palette,water.visual).main,drawing.paletteFor(p.settings.palette,flower.visual).main);
});
test('four white birds remain distinct above water despite an inferred water dependency and uncertain flight',()=>{
 for(const p of [by('r06').plan,...by('r06').plan.compositions]){
  const bird=p.layers.find(l=>l.tool==='bird');assert.equal(bird.instances.length,4);assert.equal(bird.options.pose,'flying');assert(!bird.animate,'uncertain motion stays frozen');
  for(const i of bird.instances){assert(i.placement.at[1]<=.43);assert(i.placement.scale>=.5);assert(i.opacity>=.7);}
  assert.equal(new Set(bird.instances.map(i=>i.placement.at.join(','))).size,4);
 }
});
test('whole-surface alternatives include horizontal rivers, enclosed ponds and winding channels',()=>{
 assert.deepEqual(new Set(by('r07').plan.compositions.map(c=>c.label)),new Set(['横江远岸','曲岸开阔','斜江入远']));
 const pond=by('r04').plan.compositions.find(c=>c.label==='环池疏岸'),water=pond.layers.find(l=>l.tool==='water');
 assert(inRegion([.52,.66],water.clip));assert(!inRegion([.05,.66],water.clip));assert(!inRegion([.52,.66],pond.scene.organization.regions.land));
 const a=asComposition(fixture('溪水、松树与两舟。',[{text:'溪水',kind:'place'},{text:'松树'},{text:'舟',quantity:quantity({mode:'exact',min:2,max:2,scope:'individual'})}]),{setting:{kind:'mountain_stream',...claim('溪水、松树与两舟。')}}),p=buildPlan(a);
 assert(p.layers.some(l=>l.tool==='water'));assert.equal(p.layers.find(l=>l.tool==='boat').instances.length,2);
});
test('identity is stable across compositions and grouping depends on the object, not its brush type',()=>{
 for(const c of cases)for(const alt of c.plan.compositions||[]){assert.deepEqual(alt.layers.map(l=>l.instances.map(i=>i.id)),c.plan.layers.map(l=>l.instances.map(i=>i.id)));}
 assert.equal(by('r06').plan.layers.find(l=>l.tool==='bird').interaction.mode,'instance');assert.equal(by('r08').plan.layers.find(l=>l.tool==='bamboo').interaction.mode,'group');
 const lotus=by('r08').plan.layers.find(l=>l.tool==='lotus');assert(lotus.projectedEntities.includes('i1'));assert(by('r08').plan.notes.some(n=>n.includes('未明确给出可见荷叶')));
});
test('untuned combinations respect exact birds, habitat, night and absent entities',()=>{
 for(const water of ['江','池水','溪水'])for(const plant of ['柳','竹','松树']){
  const poem=`夜，${water}边${plant}，三鸟飞，无月。`,a=asComposition(fixture(poem,[{text:water,kind:'place'},{text:plant},{text:'鸟',quantity:quantity({mode:'exact',min:3,max:3,scope:'individual'})},{text:'月',presence:'absent'}]),{setting:{kind:'waterside',...claim(poem)},groups:[group(['i3'],'subject','flock','middle',poem)],actions:[action('i3','fly','normal','across',poem)],atmosphere:{visibility:'dark',illumination:'night',...claim(poem)}}),p=buildPlan(a);
  assert.equal(p.settings.palette,'indigo');assert.equal(p.layers.find(l=>l.tool==='bird').instances.length,3);assert(!p.layers.some(l=>l.tool==='moon'));assert.equal(p.scene.displayAudit.errors,0);assert.equal(p.scene.organization.audit.errors,0);
 }
});
