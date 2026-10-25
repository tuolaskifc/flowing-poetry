// Each input with no usable current-protocol reply gets one fresh request.
// Older failures stay intact. No retry, no invented or edited provider answer.
import {readFile,writeFile} from 'node:fs/promises';
import {createGenerationService} from './service.mjs';
const out=new URL('../../poem-flow/verification/batch/',import.meta.url),before=JSON.parse(await readFile(new URL('before.json',out),'utf8'));
const inputs=before.cases.filter(c=>!c.exercise&&['unavailable','legacy-only'].includes(c.result.status)),service=createGenerationService(),rows=[];
for(const c of inputs){
 const r=await service.analyze({poem:c.poem,mode:'expression',source:{provider:'全量下限检查：无当前可重放回答的输入单次补测'}});
 rows.push({case:c.id,poem:c.poem,id:r.id,cached:r.cached,rawValid:(r.rawValidation||r.validation).valid,usable:r.validation.valid,status:r.delivery?.status,errors:r.validation.errors,usage:r.usage,elapsedSeconds:r.elapsed_seconds});
 await writeFile(new URL('gap-capture.json',out),JSON.stringify({scope:'one-new-request-per-unreplayable-input',noAutomaticRetry:true,rows},null,2)+'\n');console.log(JSON.stringify(rows.at(-1)));
}
