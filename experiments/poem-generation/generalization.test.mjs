import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,resolve} from 'node:path';
import {buildPlan} from './planner.mjs';
import {benchmarks} from './scene-benchmarks.mjs';
import {fixture,quantity} from './quantity-fixtures.mjs';
import {validateSceneContract} from './scene-contract.mjs';
import {validateQuantityContract} from './quantity-contract.mjs';
import lib from './curated-library.js';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../..'),out=resolve(root,'poem-flow/verification/generalization');
const data=JSON.parse(await readFile(resolve(dir,'generalization-cases.json'),'utf8'));
const record=async name=>JSON.parse(await readFile(resolve(out,name+'-record.json'),'utf8'));

test('twelve new quotations have traceable sources and editorial goals stay out of requests',async()=>{
 assert.equal(data.cases.length,12);assert.equal(new Set(data.cases.map(c=>c.poem)).size,12);
 for(const c of data.cases){assert(!benchmarks.some(b=>b.poem===c.poem));assert(c.source.url.startsWith('https://'));assert(c.author&&c.title&&c.source.note);const r=await record(c.id),req=JSON.parse(await readFile(resolve(dir,'runs',r.id,'request.json'),'utf8'));assert.deepEqual(JSON.parse(req.messages.at(-1).content),{poem:c.poem});assert(!Object.hasOwn(lib.sourceFor(c),'goal'));}
});

test('the twenty basically accepted images and their quantity and geometry remain frozen',async()=>{
 const manifest=JSON.parse(await readFile(resolve(dir,'accepted-baseline.json'),'utf8'));assert.equal(manifest.images.length,20);assert.equal(manifest.finalArtworkApproval,false);
 for(const f of manifest.images)assert.equal(createHash('sha256').update(await readFile(resolve(root,f.path))).digest('hex'),f.sha256,f.path);
 const qa=resolve(dir,'.qa/generalization-baseline');await mkdir(qa,{recursive:true});
 for(const f of ['planner.mjs','composition.mjs','imagery-lexicon.js','physical-mapping.mjs','expressive-mapping.mjs','scene-layout.mjs','scene-regions.mjs'])await writeFile(resolve(qa,f),execFileSync('git',['show','a497b2a:experiments/poem-generation/'+f],{cwd:root}));
 const old=await import(pathToFileURL(resolve(qa,'planner.mjs')).href);
 const geometry=p=>p.layers.map(l=>({tool:l.tool,entities:l.entities,options:l.options,instances:l.instances,z:l.z,clip:l.clip,surface:l.surface,reflection:l.reflection,rendered:l.quantity.rendered,exact:l.quantity.exact}));
 for(const b of benchmarks){const a=old.buildPlan(b.analysis),p=buildPlan(b.analysis);assert.deepEqual(geometry(p),geometry(a),b.id);assert.deepEqual(p.settings,a.settings);}
});

test('real 3.2 failures remain rejected and the 3.1 white-bird control is separate',async()=>{
 let valid=0;for(const c of data.cases){const r=await record(c.id);assert.equal(validateSceneContract(r.analysis,c.poem).valid,r.validation.valid);valid+=r.validation.valid?1:0;}assert.equal(valid,9);
 for(const id of ['g02','g11']){const r=await record(id+'-r1');assert(validateSceneContract(r.analysis,r.poem).valid);}
 const bad=await record('g12-r1');assert(!validateSceneContract(bad.analysis,bad.poem).valid);assert(!bad.plan);
 const control=await record('g12-quantity-control');assert.equal(control.mode,'quantity');assert(validateQuantityContract(control.analysis,control.poem).valid);assert(!Object.hasOwn(control.analysis,'spatial'));
});

test('natural scenery modifiers match without materializing named cities or unseen people',()=>{
 const names=['野水','千山','山际','万径','两岸青山','涧','村','孤村','田'];
 for(const text of names){const p=buildPlan(fixture(text,[{text,kind:'place'}]));assert(p.layers.some(l=>l.entities.includes('i1')),text);}
 const p=buildPlan(fixture('长安松江燕京黄山柳州。',['长安','松江','燕京','黄山','柳州'].map(text=>({text,kind:'place'}))));assert.equal(p.layers.length,0);
});

test('paired birds count individuals while line units remain a flock and sails declare their borrowing',()=>{
 const p=buildPlan(fixture('一双白鸟。',[{text:'白鸟',quantity:quantity({mode:'exact',min:1,max:1,unit:'双',scope:'group',evidence:['一双白鸟']})}]));assert.equal(p.layers[0].instances.length,2);assert(p.layers[0].quantity.exact);
 const boat=buildPlan(fixture('孤帆一片。',[{text:'孤帆',kind:'object',quantity:quantity({mode:'exact',min:1,max:1,unit:'片',scope:'individual',evidence:['孤帆一片']})}]));assert.equal(boat.layers[0].tool,'boat');assert.equal(boat.layers[0].instances.length,1);assert(boat.layers[0].quantityLabel.includes('帆面尚未绘制'));assert(!boat.layers[0].quantityLabel.includes('马'));
});

test('absence and negated wind survive actual model replay without full-poem backfill',async()=>{
 const wind=buildPlan((await record('g04')).analysis);assert.equal(wind.settings.wind,0);assert(wind.omitted.some(e=>e.name==='虫'));assert(!wind.layers.some(l=>['bird','oriole'].includes(l.tool)));
 const snow=buildPlan((await record('g07')).analysis);assert(snow.layers.some(l=>l.options.form==='mountain'));assert(!snow.layers.some(l=>['snow','boat','figure','bird','oriole'].includes(l.tool)));
 const one=buildPlan((await record('g06')).analysis);assert(one.layers.some(l=>l.tool==='water'));assert.equal(one.layers.find(l=>l.tool==='boat').instances.length,1);
});

test('two mountains produce two single-mass render units and reeds use a habitat symbol',async()=>{
 const p=buildPlan((await record('g11-r1')).analysis),mountain=p.layers.find(l=>l.options.form==='mountain');assert.equal(mountain.instances.length,2);assert.equal(mountain.options.relief,'single');assert(mountain.quantity.exact);assert.equal(p.scene.kind,'field-river');assert(!p.layers.some(l=>l.tool==='figure'));
 const q=buildPlan((await record('g12-quantity-control')).analysis);assert.equal(q.layers.find(l=>l.tool==='bird').instances.length,2);assert(q.layers.some(l=>l.tool==='grass'&&l.options.form==='reed'));assert(!q.layers.some(l=>l.tool==='boat'));
});
