// Four authorized first trials, one request each, no automatic retries or repairs.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createGenerationService} from './service.mjs';
const cases=JSON.parse(await readFile(new URL('abstract-poems.json',import.meta.url),'utf8')).cases;
const out=new URL('../../poem-flow/verification/abstract/',import.meta.url);await mkdir(out,{recursive:true});
const service=createGenerationService(),rows=[];
for(const c of cases){
 const r=await service.analyze({poem:c.poem,mode:'abstract',source:{author:c.author,title:c.title,provider:'抽象诗句首次试验'}});
 await writeFile(new URL(c.id+'-record.json',out),JSON.stringify(r,null,2)+'\n');
 for(const file of ['request.json','response.txt','prompt.txt','schema.json'])await writeFile(new URL(c.id+'-'+file,out),await readFile(new URL('runs/'+r.id+'/'+file,import.meta.url)));
 rows.push({id:c.id,poem:c.poem,record:r.id,valid:r.validation.valid,errors:r.validation.errors,cached:r.cached,usage:r.usage,elapsed:r.elapsed_seconds});
 await writeFile(new URL('capture.json',out),JSON.stringify({schema:'abstract-1.0',noAutomaticRetry:true,calls:rows},null,2)+'\n');
 console.log(JSON.stringify(rows.at(-1)));
}
