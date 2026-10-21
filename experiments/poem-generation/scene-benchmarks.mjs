// Fixed, explicitly authored semantic fixtures, not API output. Poem strings
// and attribution remain in the curated library. Gaps are never removed.
import {readFileSync} from 'node:fs';
import {fixture,quantity} from './quantity-fixtures.mjs';
const catalog=JSON.parse(readFileSync(new URL('./curated-poems.json',import.meta.url),'utf8'));
const sets=[
 ['明月','松','清泉','石'],['朝雨','轻尘','客舍','柳'],['春潮','雨','野渡','舟'],['莲叶','荷花','日'],['疏影','水','暗香','月'],
 ['花','浅草','马蹄'],['黄鹂','柳','白鹭','天'],['竹','桃花','春江','鸭'],['返景','深林','青苔'],['曲径','禅房','花','木'],
 ['野','天','树','江','月','人'],['孤舟','蓑笠翁','寒江','雪'],['小楼','春雨','深巷','杏花'],['野径','云','江船','火'],['飞流','银河','九天'],
 ['泉眼','细流','树阴','水'],['江','鸟','山','花'],['星','平野','月','大江'],['荷风','香气','竹','露'],['水田','白鹭','夏木','黄鹂']
];
const places=new Set(['清泉','石','春潮','野渡','水','春江','深林','曲径','野','江','寒江','深巷','野径','山','平野','大江','水田']);
const organisms=new Set(['松','柳','莲叶','荷花','花','浅草','黄鹂','白鹭','竹','桃花','鸭','深林','木','树','鸟','青苔','夏木']);
const abstracts=new Set(['暗香','香气']);
const plural=new Set(['深林','夏木','莲叶','荷花','花','浅草','竹']);
const relation=(type,source,target,evidence,basis='explicit')=>({type,source,target,modality:'asserted',basis,evidence:[evidence]});
export const benchmarks=catalog.poems.map((entry,i)=>{
  const analysis={...fixture(entry.poem,sets[i].map(text=>({text,concept:text==='野'?'原野':text,kind:places.has(text)?'place':organisms.has(text)?'organism':['人','蓑笠翁'].includes(text)?'person':abstracts.has(text)?'abstract':'environment',role:text==='银河'?'reference':'scene',presence:text==='银河'?'unclear':'present',quantity:text==='孤舟'?quantity({mode:'exact',min:1,max:1,scope:'individual',extent:'local',evidence:['孤舟']}):plural.has(text)?quantity({mode:'many',extent:'spread',evidence:[entry.poem]}):quantity()}))),schema_version:'3.2',spatial:[]};
  if(i===6){analysis.entities[0].quantity=quantity({mode:'exact',min:2,max:2,unit:'个',scope:'individual',evidence:['两个黄鹂']});analysis.entities[2].quantity=quantity({mode:'exact',min:1,max:1,unit:'行',scope:'group',evidence:['一行白鹭']});}
  if(i===7)analysis.entities[1].quantity=quantity({mode:'range',min:2,max:3,unit:'枝',scope:'part',evidence:['竹外桃花三两枝']});
  const id=text=>analysis.entities.find(e=>e.mentions.includes(text)).id;
  if(i===0)analysis.spatial=[relation('among',id('明月'),id('松'),'明月松间照'),relation('on',id('清泉'),id('石'),'清泉石上流')];
  if(i===2)analysis.spatial=[relation('on',id('舟'),id('春潮'),entry.poem,'inferred')];
  if(i===7)analysis.spatial=[relation('outside',id('桃花'),id('竹'),'竹外桃花三两枝')];
  if(i===11)analysis.spatial=[relation('on',id('孤舟'),id('寒江'),entry.poem,'inferred')];
  return {id:entry.id,poem:entry.poem,analysis,basis:'authored-semantic-fixture',source:{author:entry.author,title:entry.title}};
});
