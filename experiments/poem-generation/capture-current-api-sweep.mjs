// Exactly one current-interface attempt per used poem. No automatic retries.
// Three independent service instances write separate immutable run folders.
import{readFile,writeFile}from'node:fs/promises';
import{createGenerationService}from'./service.mjs';
const out=new URL('../../poem-flow/verification/batch/',import.meta.url),before=JSON.parse(await readFile(new URL('before.json',out),'utf8')),cases=before.cases.filter(c=>!c.exercise),rows=[];
let index=0;
await Promise.all(Array.from({length:3},async()=>{
 const service=createGenerationService();
 while(index<cases.length){const c=cases[index++];let row;
  try{const r=await service.analyze({poem:c.poem,mode:'expression'});row={case:c.id,poem:c.poem,id:r.id,cached:!!r.cached,finish:r.finish_reason,rawValid:(r.rawValidation||r.validation)?.valid,effectiveValid:r.validation?.valid,delivery:r.delivery,errors:r.validation?.errors||[],recovery:r.recovery?{status:r.recovery.status,changes:r.recovery.changes,omitted:r.recovery.omitted}:null,usage:r.usage,elapsedSeconds:r.elapsed_seconds};}
  catch(e){row={case:c.id,poem:c.poem,failed:true,error:e.message};}
  rows.push(row);console.log(JSON.stringify({case:c.id,id:row.id,rawValid:row.rawValid,effectiveValid:row.effectiveValid,delivery:row.delivery?.status,error:row.error}));
 }
}));
rows.sort((a,b)=>a.case.localeCompare(b.case));
const summary={inputs:cases.length,modelCalls:rows.filter(r=>!r.cached).length,cacheHits:rows.filter(r=>r.cached).length,rawValid:rows.filter(r=>r.rawValid).length,effectiveValid:rows.filter(r=>r.effectiveValid).length,delivery:rows.reduce((p,r)=>(p[r.delivery?.status||'failed']=(p[r.delivery?.status||'failed']||0)+1,p),{}),tokens:rows.reduce((n,r)=>n+(r.usage?.total_tokens||0),0)};
await writeFile(new URL('current-api-sweep.json',out),JSON.stringify({scope:'one-current-interface-attempt-per-used-poem',noAutomaticRetry:true,concurrency:3,summary,rows},null,2)+'\n');console.log(JSON.stringify(summary));
