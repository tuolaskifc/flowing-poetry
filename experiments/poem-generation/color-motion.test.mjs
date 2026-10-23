import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {buildPlan} from './planner.mjs';
import {fixture} from './quantity-fixtures.mjs';
import {asComposition,group,action,claim} from './composition-fixtures.mjs';
const context=vm.createContext({window:{}});vm.runInContext(await readFile(new URL('../imagery-library/drawing/core.js',import.meta.url),'utf8'),context);
const drawing=context.window.PoemDrawing;
test('all sixteen documented schemes and six landscape variants are real distinct palettes',async()=>{
 const options=drawing.paletteOptions();assert.equal(options.length,22);assert.equal(new Set(options.map(p=>p.id)).size,22);assert.equal(new Set(options.map(p=>JSON.stringify(p.colors))).size,22);
 const doc=await readFile(new URL('../../docs/设计规范.md',import.meta.url),'utf8');
 const rows=[...doc.matchAll(/^\| ([^|]+) \|[^\n]*?`(#[A-Fa-f0-9]{6})`[^\n]*?`(#[A-Fa-f0-9]{6})`[^\n]*?`(#[A-Fa-f0-9]{6})`[^\n]*?`(#[A-Fa-f0-9]{6})`/gm)];assert.equal(rows.length,16);
 for(const row of rows){const p=options.find(p=>p.label===row[1].trim());assert(p,row[1]);assert.equal(JSON.stringify(Object.values(p.colors)),JSON.stringify(row.slice(2)));}
 const copy=drawing.paletteOptions();copy[0].colors.bg='#000000';assert.notEqual(drawing.paletteFor(copy[0].id).bg,'#000000');
});
test('motion controls have bounded finite values and do not rewrite palette selection',()=>{
 for(const [value,expected] of [[0,0],[-4,0],[8,2],[1.4,1.4],[NaN,1],[Infinity,1],[undefined,1]])assert.equal(drawing.settings({motion:value,palette:'gilded'}).motion,expected);
 assert.equal(drawing.settings({palette:'indigo'}).palette,'indigo');assert.equal(drawing.settings({palette:'unknown'}).palette,'clear');
});
test('viewing motion respects still subjects and explicitly absent wind',()=>{
 const poem='无风，鸟静。',a=asComposition(fixture(poem,[{text:'风',kind:'environment',presence:'absent'},{text:'鸟'}]),{setting:{kind:'open_land',...claim(poem)},groups:[group(['i2'],'subject','single','middle','鸟静')],actions:[action('i2','still','unspecified','unspecified','鸟静')]});
 const p=buildPlan(a);assert.equal(p.settings.motion,1.4);assert.equal(p.settings.wind,0);assert.equal(p.layers.find(l=>l.tool==='bird').animate,false);assert(!p.layers.find(l=>l.tool==='bird').motion);assert(!p.layers.some(l=>l.entities.includes('i1')));
 const swaying=asComposition(fixture('无风，柳动。',[{text:'风',kind:'environment',presence:'absent'},{text:'柳'}]),{actions:[action('i2','sway','normal','unspecified','柳动')]});assert.equal(buildPlan(swaying).settings.wind,0,'swaying does not prove a wind source');
});
