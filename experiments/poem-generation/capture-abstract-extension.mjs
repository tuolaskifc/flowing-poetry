// Only new poems. Preserve the original four calls and never retry a rejected interpretation.
import {readFile,writeFile,access} from 'node:fs/promises';
import {createGenerationService} from './service.mjs';
const cases=JSON.parse(await readFile(new URL('abstract-poems.json',import.meta.url),'utf8')).cases.filter(c=>c.batch==='extension');
const out=new URL('../../poem-flow/verification/abstract/',import.meta.url),capture=new URL('extension-capture.json',out);
try{await access(capture);throw new Error('Extension capture already exists; refusing to overwrite or repeat calls');}catch(e){if(e.code!=='ENOENT')throw e;}
const service=createGenerationService(),rows=[];
for(const c of cases){
 const r=await service.analyze({poem:c.poem,mode:'abstract',source:{author:c.author,title:c.title,provider:'抽象扩展首次试验'}});
 await writeFile(new URL(c.id+'-record.json',out),JSON.stringify(r,null,2)+'\n');
 for(const f of ['request.json','response.txt','prompt.txt','schema.json'])await writeFile(new URL(c.id+'-'+f,out),await readFile(new URL('runs/'+r.id+'/'+f,import.meta.url)));
 rows.push({id:c.id,poem:c.poem,record:r.id,valid:r.validation.valid,errors:r.validation.errors,cached:r.cached,usage:r.usage,elapsed:r.elapsed_seconds});
 await writeFile(capture,JSON.stringify({schema:'abstract-1.0',noAutomaticRetry:true,calls:rows},null,2)+'\n');console.log(JSON.stringify(rows.at(-1)));
}
