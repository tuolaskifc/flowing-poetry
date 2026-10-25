// Read-only collection of used inputs. Saved replies and authored fixtures remain distinct.
import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {benchmarks} from './scene-benchmarks.mjs';
import {organizationFixtures} from './organization-fixtures.mjs';
import {validateContract} from '../poem-semantics/contract-v3/validate.mjs';
import {validateQuantityContract} from './quantity-contract.mjs';
import {validateSceneContract} from './scene-contract.mjs';
import {validateCompositionContract} from './composition-contract.mjs';
import {validateExpression} from './expression-contract.mjs';
import {validateAbstract} from './abstract-contract.mjs';
import {recoverInterpretation,constrainRecoveredPlan} from './generation-recovery.mjs';
import {expandSourceContext} from './source-context.mjs';
import {buildExpressionPlan} from './expression-plan.mjs';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
export const poemKey=p=>String(p).replace(/[\s，。？！；、,.;!?]/g,'');
const digest=x=>createHash('sha256').update(x).digest('hex');
async function walk(dir){try{return (await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(resolve(dir,e.name)):[resolve(dir,e.name)]))).flat();}catch{return [];}}
export async function collectBatch(){
 const records=[],seen=new Map(),hashes={};
 const add=(r,path,basis='real-request')=>{
  if(typeof r.poem!=='string'||!r.poem.trim())return;
  const signature=(r.id||r.case_id||path)+':'+digest(JSON.stringify(r.analysis||r.error||r.validation));
  const existing=seen.get(signature);if(existing){existing.sources.push(path);return;}
  const row={id:r.id||r.case_id||path,poem:r.poem,basis,mode:r.mode||r.analysis?.schema_version||'unknown',finish:r.finish_reason,analysis:r.analysis,effectiveAnalysis:r.effectiveAnalysis,sourceContext:r.sourceContext,originalRecovery:r.recovery,originalValidation:r.rawValidation||r.validation,error:r.error,source:r.source,sources:[path]};
  records.push(row);seen.set(signature,row);
 };
 const paths=[...(await walk(resolve(root,'experiments/poem-generation/runs'))).filter(p=>p.endsWith('result.json')),...(await walk(resolve(root,'poem-flow/verification'))).filter(p=>/-record\.json$/.test(p)),...(await walk(resolve(root,'experiments/poem-semantics/results'))).filter(p=>p.endsWith('.result.json'))];
 for(const p of paths.sort((a,b)=>Number(b.includes('poem-generation\\runs'))-Number(a.includes('poem-generation\\runs'))||a.localeCompare(b))){try{const bytes=await readFile(p),r=JSON.parse(bytes);const path=relative(root,p).replaceAll('\\','/');hashes[path]=digest(bytes);add(r,path);}catch{}}
 for(const b of benchmarks)add({id:'fixture-'+b.id,poem:b.analysis.poem,analysis:b.analysis},'experiments/poem-generation/scene-benchmarks.mjs','authored-poem-fixture');
 for(const b of organizationFixtures)add({id:'fixture-'+b.id,poem:b.poem,analysis:b.analysis},'experiments/poem-generation/organization-fixtures.mjs','authored-combination');
 const groups=new Map();for(const r of records){const key=poemKey(r.poem);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 const cases=[...groups].map(([key,versions],i)=>({id:'b'+String(i+1).padStart(3,'0'),key,poem:versions.at(-1).poem,exercise:versions.every(r=>r.basis==='authored-combination'),versions}));
 return {scope:'all-saved-generation-and-semantics-records-plus-established-fixtures',modelCalls:0,records:records.length,cases,hashes};
}
export function evaluateRecord(r){
 if(!r.analysis)return {status:'unavailable',errors:r.originalValidation?.errors||[r.error||'没有模型解读'],reason:'原始调用没有可用的语义对象'};
 const schema=r.analysis.schema_version,validate={'3.0':validateContract,'3.1':validateQuantityContract,'3.2':validateSceneContract,'3.3':validateCompositionContract,'expression-1.0':validateExpression,'abstract-1.0':validateAbstract}[schema];
 if(!validate)return {status:'legacy-only',errors:[],reason:'历史语义协议未接当前绘图通路，不伪造新协议回答'};
 if(r.basis?.startsWith('authored'))return {status:'authored',analysis:r.analysis,plan:buildExpressionPlan(r.analysis),protocol:schema,reason:'手工校准，仅检查画法，不冒充模型解读或协议通过'};
 if(r.finish&&r.finish!=='stop')return {status:'unavailable',errors:['原始回答未正常结束'],reason:'截断回答不用于出图'};
 let a=r.effectiveAnalysis||r.analysis,validation=validate(a,r.poem),recovery=r.originalRecovery||null;
 if(['expression-1.0','abstract-1.0'].includes(schema)){
  const result=recoverInterpretation(a,r.poem,schema==='expression-1.0'?'expression':'abstract');validation=result.validation;a=result.effectiveAnalysis||a;recovery=result.recovery||recovery;
 }else if(schema==='3.3'&&!validation.valid){const c=expandSourceContext(a,r.poem);if(c.applied){a=c.effectiveAnalysis;validation=c.validation;recovery={status:'normalized',changes:c.changes,omitted:[]};}}
 if(!validation.valid)return {status:'unavailable',errors:validation.errors,reason:'当前核心检查仍未通过'};
 try{
  const plan=constrainRecoveredPlan(buildExpressionPlan(a),recovery);
  return {status:recovery?.status==='partial'?'partial':recovery?'adjusted':'ready',validation,recovery,analysis:a,plan,protocol:schema,adapter:['3.0','3.1','3.2'].includes(schema)?'legacy-scenery-adapter':null};
 }catch(e){return {status:'unavailable',errors:[e.message],reason:'规划器不能可靠处理这份已保存解读'};}
}
export async function snapshotBatch(){
 const batch=await collectBatch(),out=resolve(root,'poem-flow/verification/batch');await mkdir(out,{recursive:true});
 const rows=[];
 for(const c of batch.cases){
  const versions=c.versions.map(r=>({record:r,result:evaluateRecord(r)}));
  const real=versions.filter(v=>v.record.basis==='real-request'&&v.record.sources.some(p=>p.startsWith('experiments/poem-generation/runs/'))).sort((a,b)=>a.record.id.localeCompare(b.record.id));
  const chosen=real.at(-1)||versions.filter(v=>v.result.plan).at(-1)||versions.filter(v=>v.result.status==='legacy-only').at(-1)||versions.at(-1);
  const {plan,analysis,...result}=chosen.result;
  rows.push({...c,versions:versions.map(v=>({id:v.record.id,basis:v.record.basis,mode:v.record.mode,sources:v.record.sources,originalValid:v.record.originalValidation?.valid,status:v.result.status,errors:v.result.errors,adapter:v.result.adapter})),record:chosen.record,result,analysis,plan});
 }
 const snapshot={...batch,cases:rows};await writeFile(resolve(out,'before.json'),JSON.stringify(snapshot)+'\n');
 console.log(JSON.stringify({records:batch.records,cases:rows.length,poems:rows.filter(c=>!c.exercise).length,exercises:rows.filter(c=>c.exercise).length,statuses:rows.reduce((p,c)=>(p[c.result.status]=(p[c.result.status]||0)+1,p),{}),rows:rows.map(c=>({id:c.id,poem:c.poem,status:c.result.status,tools:c.plan?.concretePlan?.layers.filter(l=>!l.inferred).map(l=>({ids:l.entities,n:l.instances.length,name:l.names.join('/'),tool:l.tool,form:l.options.form})),gaps:c.plan?.expression.gaps,errors:c.result.errors}))}));return snapshot;
}
if(process.argv.includes('--snapshot'))await snapshotBatch();
