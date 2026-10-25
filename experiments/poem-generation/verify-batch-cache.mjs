// Replay exact captured responses under current recovery rules; network forbidden.
import{readFile,writeFile,mkdtemp,mkdir,copyFile,rm}from'node:fs/promises';
import{resolve,sep}from'node:path';
import assert from'node:assert/strict';
import{createGenerationService}from'./service.mjs';
const dir=resolve('experiments/poem-generation/.qa');await mkdir(dir,{recursive:true});
const temp=await mkdtemp(resolve(dir,'cache-audit-')),runs=resolve(temp,'runs');await mkdir(runs);
const out=resolve('poem-flow/verification/batch'),sweep=JSON.parse(await readFile(resolve(out,'current-api-sweep.json'),'utf8')),rows=[];let calls=0;
try{
 for(const c of sweep.rows){const folder=resolve(runs,c.id);await mkdir(folder);await copyFile(resolve('experiments/poem-generation/runs',c.id,'result.json'),resolve(folder,'result.json'));}
 const service=createGenerationService({runsDir:runs,fetcher:async()=>{calls++;throw Error('This verification forbids model requests');}});
 for(const c of sweep.rows){const r=await service.analyze({poem:c.poem,mode:'expression'});assert.equal(r.cached,true,c.case+' cache miss');assert.equal(r.id,c.id);assert(r.validation.valid,c.case+' core failure');rows.push({case:c.case,id:r.id,rawValid:(r.rawValidation||r.validation).valid,effectiveValid:r.validation.valid,delivery:r.delivery,recovery:r.recovery?.status||null,renderability:r.plan.renderability?.status});}
 assert.equal(calls,0);const summary={inputs:rows.length,modelCalls:calls,cacheHits:rows.length,rawValid:rows.filter(v=>v.rawValid).length,effectiveValid:rows.filter(v=>v.effectiveValid).length,delivery:rows.reduce((p,v)=>(p[v.delivery.status]=(p[v.delivery.status]||0)+1,p),{})};
 await writeFile(resolve(out,'current-replay.json'),JSON.stringify({scope:'same-response-local-revalidation-after-audit',summary,rows},null,2)+'\n');console.log(JSON.stringify(summary));
}finally{assert(temp.startsWith(dir+sep));await rm(temp,{recursive:true,force:true});}
