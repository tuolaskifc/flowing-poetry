// Isolated second-stage experiment on five preserved analyses; no retries.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {resolve} from 'node:path';
import {parseCredentials} from './service.mjs';import {toolCatalog,advicePrompt,validateAdvice} from './tool-guidance.mjs';
const revision=process.argv.includes('--revision');const out=resolve(revision?'output/tool-guidance-2026-11-08/revision':'output/tool-guidance-2026-11-08');await mkdir(out,{recursive:true});
const config=parseCredentials(await readFile('llm api.txt','utf8'));const redact=s=>String(s).split(config.key).join('[REDACTED]').replace(/\bsk-[a-zA-Z0-9_-]+/g,'[REDACTED]');
const cases=revision?['n03','n04','n05']:['n02','n03','n04','n05','n06'],rows=[];let next=0;
await writeFile(resolve(out,'catalog.json'),JSON.stringify(toolCatalog,null,2)+'\n');
await writeFile(resolve(out,'prompt.txt'),advicePrompt+'\n');
await Promise.all(Array.from({length:2},async()=>{while(next<cases.length){const i=next++,id=cases[i],old=JSON.parse(await readFile(resolve('output/unfamiliar-2026-11-08',id+'.json'),'utf8')),r=old.record,a=r.effectiveAnalysis||r.analysis;
 const input={poem:old.poem,analysis:a,tools:toolCatalog},request={model:config.model,temperature:.2,max_tokens:4096,stream:false,thinking:{type:'disabled'},response_format:{type:'json_object'},messages:[{role:'system',content:advicePrompt},{role:'user',content:JSON.stringify(input)}]};let row={id,poem:old.poem,originalRecord:r.id,baseline:(r.plan.concretePlan?.layers||[]).filter(l=>!l.inferred).map(l=>({names:l.names,tool:l.tool,entities:l.entities})),baselineGaps:r.plan.expression.gaps};
 try{const response=await fetch(config.endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(90000),headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify(request)});if(!response.ok)throw Error('接口返回 HTTP '+response.status);const body=await response.json(),raw=body.choices?.[0]?.message?.content;row.usage=body.usage;row.finish=body.choices?.[0]?.finish_reason;if(typeof raw!=='string')throw Error('接口没有返回文本');row.raw=redact(raw);if(row.finish!=='stop')throw Error('回答未完整结束');row.advice=JSON.parse(raw);row.validation=validateAdvice(row.advice,a);
 }catch(e){row.error=redact(e.message);}
 rows[i]=row;await writeFile(resolve(out,id+'.json'),redact(JSON.stringify(row,null,2))+'\n');console.log(JSON.stringify({id,valid:row.validation?.valid,error:row.error,errors:row.validation?.errors?.length}));
}}));
await writeFile(resolve(out,'summary.json'),redact(JSON.stringify({scope:'same-five-existing-analyses-tool-advice-only',calls:cases.length,noAutomaticRetry:true,rows},null,2))+'\n');
