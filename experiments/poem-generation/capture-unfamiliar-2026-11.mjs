// Fixed batch; one request per poem, no automatic retry. Isolated records.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createGenerationService} from './service.mjs';
const cases=JSON.parse(await readFile('experiments/poem-generation/unfamiliar-2026-11-cases.json','utf8'));
const out=resolve('output/unfamiliar-2026-11-08');await mkdir(out,{recursive:true});
let next=0;const rows=[];
await Promise.all(Array.from({length:3},async()=>{const service=createGenerationService({runsDir:resolve(out,'runs')});while(next<cases.length){const n=next++,c=cases[n];try{const record=await service.analyze({poem:c.poem,mode:'expression',source:{provider:'陌生诗句试验',author:c.author,title:c.title}});rows[n]={...c,record};}catch(e){rows[n]={...c,error:e.message};}await writeFile(resolve(out,c.id+'.json'),JSON.stringify(rows[n],null,2)+'\n');console.log(JSON.stringify({id:c.id,record:rows[n].record?.id,cached:rows[n].record?.cached,status:rows[n].record?.delivery?.status,error:rows[n].error}));}}));
await writeFile(resolve(out,'capture.json'),JSON.stringify({scope:'one-attempt-per-fixed-real-poem',cases:cases.length,rows:rows.map(({record,...c})=>({...c,id:c.id,recordId:record?.id,cached:record?.cached,delivery:record?.delivery,validation:record?.validation,usage:record?.usage}))},null,2)+'\n');
