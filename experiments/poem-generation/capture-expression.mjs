// Three first requests for the new contract; same poems are protocol trials, not new generalization evidence.
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createGenerationService} from './service.mjs';
const out=new URL('../../poem-flow/verification/expression/',import.meta.url);await mkdir(out,{recursive:true});
const capture=new URL('capture.json',out);try{await access(capture);throw Error('Capture exists; refusing automatic repeat');}catch(e){if(e.code!=='ENOENT')throw e;}
const entries=[{id:'u01',poem:'明月松间照，清泉石上流。',author:'王维',title:'山居秋暝'},{id:'u02',poem:'从此无心爱良夜，任他明月下西楼。',author:'李益',title:'写情'},{id:'u03',poem:'剪不断，理还乱，是离愁。',author:'李煜',title:'相见欢·无言独上西楼'}];
const service=createGenerationService(),calls=[];
for(const c of entries){const record=await service.analyze({poem:c.poem,mode:'expression',source:{author:c.author,title:c.title,provider:'统一表达首次协议试验'}});await writeFile(new URL(c.id+'-record.json',out),JSON.stringify(record,null,2)+'\n');
 for(const f of ['request.json','response.txt','prompt.txt','schema.json'])try{await writeFile(new URL(c.id+'-'+f,out),await readFile(new URL('runs/'+record.id+'/'+f,import.meta.url)));}catch(e){if(e.code!=='ENOENT')throw e;}
 calls.push({...c,run:record.id,valid:record.validation.valid,errors:record.validation.errors,cached:record.cached,usage:record.usage});await writeFile(capture,JSON.stringify({contract:'expression-1.0',noAutomaticRetry:true,calls},null,2)+'\n');console.log(JSON.stringify(calls.at(-1)));}
