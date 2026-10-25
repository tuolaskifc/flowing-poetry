import {readFile,writeFile} from 'node:fs/promises';
import {collectBatch,evaluateRecord} from './batch-audit.mjs';
import {judgeBatch} from './batch-expectations.mjs';
const out=new URL('../../poem-flow/verification/batch/',import.meta.url),before=JSON.parse(await readFile(new URL('before.json',out),'utf8')),current=await collectBatch(),cases=[];
let visual={};try{visual=JSON.parse(await readFile(new URL('visual-review.json',out),'utf8'));}catch{}
for(const original of before.cases){
 const now=current.cases.find(c=>c.key===original.key),versions=now.versions.map(record=>({record,result:evaluateRecord(record)}));
 const real=versions.filter(v=>v.record.basis==='real-request'&&v.record.sources.some(p=>p.startsWith('experiments/poem-generation/runs/'))).sort((a,b)=>a.record.id.localeCompare(b.record.id));
 const chosen=real.at(-1)||versions.filter(v=>v.result.plan).at(-1)||versions.at(-1),judgment=judgeBatch(original,chosen.result);
 const sight=visual.cases?.[original.id];if(sight?.recordId===chosen.record.id){if(sight.grade)judgment.grade=sight.grade;judgment.visualIssues=sight.issues||[];judgment.visualReviewed=sight.reviewed;}
 const beforeJudgment=judgeBatch(original,{...original.result,plan:original.plan,analysis:original.analysis});
 const {plan,analysis,...result}=chosen.result;
 let record=null;
 if(plan){const r=chosen.record;record={id:r.id,poem:r.poem,mode:r.mode,analysis:r.analysis,effectiveAnalysis:analysis,validation:chosen.result.validation||{valid:true,errors:[],warnings:[],review_required:true},rawValidation:r.originalValidation,recovery:result.recovery,plan,cached:true,auditNote:'全量检查：'+({basic:'本轮基本检查可用',limited:'基础画面可用，含已知缺口','below-floor':'存在未守住下限的问题',unavailable:'目前不能可靠生成'}[judgment.grade]||'待复核')+'。'+[...judgment.issues,...(judgment.limitations||[]),...(judgment.visualIssues||[]),judgment.note].join('；'),delivery:{status:plan.renderability?.status==='unavailable'?'failed':judgment.grade==='basic'?'complete':'partial',reason:judgment.grade==='basic'?null:'drawing-gap',message:plan.renderability?.status==='unavailable'?'本句主要内容尚无可靠画法，未生成新画面。':judgment.grade==='basic'?'已重放当前基本画面。':'本句可查看基础画面，存在已列明的表达缺口。'}};}
 cases.push({id:original.id,poem:chosen.record.poem,key:original.key,exercise:original.exercise,record,result,judgment,beforeJudgment,beforeRecord:original.plan?{poem:original.poem,plan:original.plan,analysis:original.analysis}:null,versions:versions.map(v=>({id:v.record.id,basis:v.record.basis,sources:v.record.sources,originalValid:v.record.originalValidation?.valid,status:v.result.status,judgment:v.result.plan?judgeBatch(original,v.result):null,errors:v.result.errors,protocol:v.result.protocol})),source:chosen.record.sources});
}
const summary={records:current.records,poems:cases.filter(c=>!c.exercise).length,exercises:cases.filter(c=>c.exercise).length,grades:cases.filter(c=>!c.exercise).reduce((p,c)=>(p[c.judgment.grade]=(p[c.judgment.grade]||0)+1,p),{}),scope:'same-input-regression-not-new-generalization',aestheticAcceptance:'pending-user'};
await writeFile(new URL('after.json',out),JSON.stringify({summary,hashes:current.hashes,cases})+'\n');
await writeFile(new URL('../../poem-flow/batch-audit-studies.json',import.meta.url),JSON.stringify({scope:summary.scope,cases:cases.map(c=>({id:c.id,poem:c.poem,judgment:c.judgment,record:c.record}))})+'\n');
console.log(JSON.stringify(summary));for(const c of cases.filter(c=>['below-floor','unavailable'].includes(c.judgment.grade)))console.log(JSON.stringify({id:c.id,poem:c.poem,...c.judgment}));
