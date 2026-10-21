// One explicit request per preselected case. Existing records are never retried
// or rewritten; failed records remain evidence, not automatically repaired.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import lib from './curated-library.js';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../..');
const samples=JSON.parse(await readFile(resolve(dir,'generalization-cases.json'),'utf8'));
const out=resolve(root,'poem-flow/verification/generalization');await mkdir(out,{recursive:true});
const control=process.argv.includes('--quantity-control'),revision=process.argv.includes('--evidence-revision'),suffix=control?'-quantity-control':revision?'-r1':'',selected=control?samples.cases.filter(c=>c.id==='g12'):revision?samples.cases.filter(c=>['g02','g11','g12'].includes(c.id)):samples.cases;
if(!process.argv.includes('--live'))throw new Error('Actual model calls require --live.');
const manifest={baseline:samples.baseline_commit,casesHash:createHash('sha256').update(await readFile(resolve(dir,'generalization-cases.json'))).digest('hex'),cases:[]};
for(const sample of selected){
 const path=resolve(out,sample.id+suffix+'-record.json');let record;
 try{record=JSON.parse(await readFile(path,'utf8'));if(record.poem!==sample.poem)throw new Error('Stored poem changed');}
 catch(error){
  if(error.code!=='ENOENT')throw error;
  const response=await fetch('http://127.0.0.1:4173/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({poem:sample.poem,...(control?{mode:'quantity'}:{}),source:{...lib.sourceFor(sample),provider:control?'泛化新句试验·数量模式对照':revision?'泛化新句试验·证据修订':'泛化新句试验'}}),signal:AbortSignal.timeout(110000)});
  const body=await response.json();record=body.record||{poem:sample.poem,http_status:response.status,error:body.error,validation:{valid:false,errors:[body.error||'No record']}};
  await writeFile(path,JSON.stringify(record,null,2)+'\n');
 }
 const row={case:sample.id,record:record.id,valid:!!record.validation?.valid,error:record.error,errors:record.validation?.errors,seconds:record.elapsed_seconds,tokens:record.usage?.total_tokens};manifest.cases.push(row);
 await writeFile(resolve(out,control?'capture-quantity-control.json':revision?'capture-r1.json':'capture.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(row));
}
console.log(JSON.stringify({finished:true,cases:manifest.cases.length,valid:manifest.cases.filter(c=>c.valid).length,tokens:manifest.cases.reduce((n,c)=>n+(c.tokens||0),0)}));
