// Four bounded first requests. Preserve real failures; never retry or edit replies.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createGenerationService} from './service.mjs';
import {recoveryVersion} from './generation-recovery.mjs';
const out=new URL('../../poem-flow/verification/reliability/',import.meta.url);await mkdir(out,{recursive:true});
const files=['service.mjs','generation-recovery.mjs','expression-contract.mjs','abstract-contract.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(new URL(f,import.meta.url))).digest('hex')])));
const before=await hashes(),service=createGenerationService(),rows=[];
const poems=[['n01','我欲乘风归去，又恐琼楼玉宇，高处不胜寒。'],['n02','欲穷千里目，更上一层楼。'],['r01','日出江花红胜火，春来江水绿如蓝。'],['r02','自在飞花轻似梦，无边丝雨细如愁。']];
for(const [id,poem] of poems){
 const r=await service.analyze({poem,mode:'expression',source:{provider:'稳定性首次验证：两句新组合与两句既有失败诗'}});
 const row={id,poem,record:r.id,cached:r.cached,rawValid:(r.rawValidation||r.validation).valid,usable:r.validation.valid,status:r.delivery.status,recovery:r.recovery?.status||null,errors:r.validation.errors,usage:r.usage,elapsedSeconds:r.elapsed_seconds};
 rows.push(row);await writeFile(new URL('live-capture.json',out),JSON.stringify({recoveryVersion,scope:'two-untuned-poems-and-two-known-failure-poems',noAutomaticRetry:true,sourceHashes:before,calls:rows},null,2)+'\n');console.log(JSON.stringify(row));
}
const after=await hashes();await writeFile(new URL('live-capture.json',out),JSON.stringify({recoveryVersion,scope:'two-untuned-poems-and-two-known-failure-poems',noAutomaticRetry:true,sourceHashes:before,rulesUnchanged:JSON.stringify(before)===JSON.stringify(after),calls:rows},null,2)+'\n');
