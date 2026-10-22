// Six bounded real calls; no hidden repairs, retries or failure replacement.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createGenerationService} from './service.mjs';
const dir=dirname(fileURLToPath(import.meta.url)),out=resolve(dir,'../../poem-flow/verification/organization');
if(!process.argv.includes('--live'))throw new Error('Use --live for the six preselected model calls.');
const sample=JSON.parse(await readFile(resolve(dir,'organization-live-cases.json'),'utf8'));
let previous;try{previous=JSON.parse(await readFile(resolve(out,'live-capture.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(previous?.finishedAt){console.log(JSON.stringify({alreadyCompleted:true,modelCalls:0,note:'Original capture is preserved. Use verify-organization.mjs for current local replay.'}));process.exit(0);}
const files=['organization-live-cases.json','scene-organization.mjs','planner.mjs','scene-contract.mjs','scene-layout.mjs','scene-regions.mjs','composition.mjs','imagery-lexicon.js','../imagery-library/drawing/tools/landscape.js'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(resolve(dir,f))).digest('hex')])));
await mkdir(out,{recursive:true});const frozen=previous?.frozenHashes||await hashes(),service=createGenerationService(),manifest=previous||{startedAt:new Date().toISOString(),frozenHashes:frozen,calls:[],noAutomaticRetry:true};
manifest.calls=[];
for(const c of sample.cases){
 if(JSON.stringify(await hashes())!==JSON.stringify(frozen))throw new Error('Rules changed during evaluation; stop instead of reporting a fixed-policy test.');
 const path=resolve(out,c.id+'-record.json');let r;
 try{r=JSON.parse(await readFile(path,'utf8'));if(r.poem!==c.poem)throw new Error('Saved poem mismatch');}
 catch(e){if(e.code!=='ENOENT')throw e;r=await service.analyze({poem:c.poem,source:{provider:'场景组织层·新诗实测',author:c.author,title:c.title,dynasty:c.dynasty}});await writeFile(path,JSON.stringify(r,null,2)+'\n');}
 const row={case:c.id,record:r.id,valid:!!r.validation?.valid,errors:r.validation?.errors,seconds:r.elapsed_seconds,tokens:r.usage?.total_tokens,geometryErrors:r.plan?.scene.organization.audit.errors,geometryReview:r.plan?.scene.organization.audit.review};manifest.calls.push(row);await writeFile(resolve(out,'live-capture.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(row));
}
manifest.finishedAt=new Date().toISOString();manifest.rulesUnchanged=JSON.stringify(await hashes())===JSON.stringify(frozen);manifest.totalTokens=manifest.calls.reduce((n,c)=>n+(c.tokens||0),0);await writeFile(resolve(out,'live-capture.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({finished:true,valid:manifest.calls.filter(c=>c.valid).length,total:manifest.calls.length,tokens:manifest.totalTokens,rulesUnchanged:manifest.rulesUnchanged}));
