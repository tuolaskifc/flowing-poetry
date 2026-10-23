// Explicit fixed-policy capture. Raw failures and original answers survive.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createGenerationService} from './service.mjs';
const dir=dirname(fileURLToPath(import.meta.url)),out=resolve(dir,'../../poem-flow/verification/semantics');
if(!process.argv.includes('--live'))throw new Error('Real calls require --live.');
let previous;try{previous=JSON.parse(await readFile(resolve(out,'capture.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(previous?.finishedAt){console.log(JSON.stringify({alreadyComplete:true,modelCalls:0}));process.exit(0);}
const cases=JSON.parse(await readFile(resolve(dir,'semantic-live-cases.json'),'utf8')).cases;
const files=['semantic-live-cases.json','composition-contract.mjs','scene-contract.mjs','quantity-contract.mjs','semantic-policy.mjs','scene-organization.mjs','planner.mjs','composition.mjs','service.mjs','scene.js','../imagery-library/drawing/core.js','../imagery-library/drawing/tools/mist.js'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(resolve(dir,f))).digest('hex')])));
await mkdir(out,{recursive:true});const frozen=previous?.frozenHashes||await hashes(),service=createGenerationService();
const capture=previous||{version:'3.3',startedAt:new Date().toISOString(),frozenHashes:frozen,noAutomaticRetry:true,calls:[]};capture.calls=[];
for(const c of cases){
 if(JSON.stringify(await hashes())!==JSON.stringify(frozen))throw new Error('Policy changed during capture; stop the fixed-policy run.');
 let record;const path=resolve(out,c.id+'-record.json');
 try{record=JSON.parse(await readFile(path,'utf8'));if(record.poem!==c.poem)throw new Error('Saved poem mismatch');}
 catch(e){if(e.code!=='ENOENT')throw e;record=await service.analyze({poem:c.poem,source:{provider:'整体场景语义3.3实测',author:c.author,title:c.title,dynasty:c.dynasty}});await writeFile(path,JSON.stringify(record,null,2)+'\n');}
 const row={case:c.id,record:record.id,valid:!!record.validation?.valid,errors:record.validation?.errors,tokens:record.usage?.total_tokens,seconds:record.elapsed_seconds,applied:record.plan?.semanticConsumption.summary.applied,unsupported:record.plan?.semanticConsumption.summary.unsupported,geometryErrors:record.plan?.scene.organization.audit.errors};capture.calls.push(row);await writeFile(resolve(out,'capture.json'),JSON.stringify(capture,null,2)+'\n');console.log(JSON.stringify(row));
}
capture.finishedAt=new Date().toISOString();capture.rulesUnchanged=JSON.stringify(await hashes())===JSON.stringify(frozen);capture.totalTokens=capture.calls.reduce((n,c)=>n+(c.tokens||0),0);await writeFile(resolve(out,'capture.json'),JSON.stringify(capture,null,2)+'\n');console.log(JSON.stringify({finished:true,valid:capture.calls.filter(c=>c.valid).length,total:cases.length,tokens:capture.totalTokens,rulesUnchanged:capture.rulesUnchanged}));
