import {readFile,writeFile} from 'node:fs/promises';
import {validateAbstract} from './abstract-contract.mjs';
import {buildAbstractPlan,abstractPolicyVersion} from './abstract-plan.mjs';
export async function loadAbstractCases(){
 const catalog=JSON.parse(await readFile(new URL('abstract-poems.json',import.meta.url),'utf8'));
 const cases=[];
 for(const c of catalog.cases){
  const original=JSON.parse(await readFile(new URL('../../poem-flow/verification/abstract/'+c.id+'-record.json',import.meta.url),'utf8'));
  const validation=validateAbstract(original.analysis,c.poem);let record=null;
  if(validation.valid){
   record={id:original.id,poem:c.poem,source:original.source,mode:'abstract',analysis:original.analysis,validation,plan:buildAbstractPlan(original.analysis),cached:true};
   if(!original.validation.valid)record.localRevalidation={revision:'absence-result-1.1',rawValid:false,changedSemanticFields:0,modelCalls:0,reason:'已消退的结果缺席可保留为缺口；受阻目标可缺席，但不能变成在场形态'};
  }
  cases.push({...c,rawValid:original.validation.valid,rawRecord:original.id,record,failure:record?null:original.validation});
 }
 return cases;
}
export async function prepareAbstractStudies(){
 const cases=await loadAbstractCases(),forms=['auto','flow','ink','shards','ribbons','ripples','dust','contours','echoes','weave'],variants=[];
 // Keep the original 32 filenames and settings for comparison; new images have new filenames.
 for(const [ci,c] of cases.filter(c=>c.batch!=='extension').entries())if(c.record)for(let i=0;i<8;i++){
  const style=forms[(i+ci*2)%forms.length],seed=(c.record.plan.seed+Math.imul(i+1,0x9E3779B9))>>>0;
  variants.push({case:c.id,style,seed,palette:'auto',vocabulary:'classic',hybrid:!!c.record.plan.concretePlan&&i<4,file:c.id+'-'+i+'.png',label:({auto:'交融',flow:'流线',ink:'墨晕',shards:'碎片',ribbons:'丝带',ripples:'涟漪',dust:'微粒',contours:'等高纹',echoes:'叠影',weave:'网织'})[style]+(c.record.plan.concretePlan&&i<4?' · 景物叠加':' · 抽象表达')});
 }
 const names={vortex:'涡流',bloom:'浸染',fissures:'裂隙',fibers:'游丝',auto:'交融',flow:'流线',ribbons:'丝带',dust:'微粒'};
 for(const c of cases)if(c.record){const extensionForms=c.batch==='extension'?['vortex','bloom','fissures','fibers','auto','flow','ribbons','dust']:['vortex','bloom','fissures','fibers'];for(const [i,style] of extensionForms.entries())variants.push({case:c.id,style,seed:(c.record.plan.seed+Math.imul(i+11,0x9E3779B9))>>>0,palette:'auto',hybrid:false,file:c.id+'-extension-'+i+'.png',label:names[style]+' · 新画法',extension:true});}
 for(const v of variants)v.expanse=0;
 const data={schema:'abstract-1.0',policy:abstractPolicyVersion,scope:'four-original-and-three-new-first-requests',generationModelCalls:0,cases,variants};
 await writeFile(new URL('../../poem-flow/abstract-studies.json',import.meta.url),JSON.stringify(data,null,2)+'\n');return data;
}
