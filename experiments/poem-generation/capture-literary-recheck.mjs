// Two specifically identified semantic errors get one current-protocol recheck.
// Never alter old replies or loop until a favorable answer appears.
import{readFile,writeFile}from'node:fs/promises';
import{createGenerationService}from'./service.mjs';
const out=new URL('../../poem-flow/verification/batch/',import.meta.url),data=JSON.parse(await readFile(new URL('after.json',out),'utf8')),service=createGenerationService(),rows=[];
for(const id of ['b052','b053']){
 const c=data.cases.find(c=>c.id===id),r=await service.analyze({poem:c.poem,mode:'expression'});
 rows.push({case:id,id:r.id,reason:id==='b052'?'不必相守被标为相守缺席':'逆旅被解释成逆行旅次',rawValid:r.rawValidation?.valid??r.validation.valid,delivery:r.delivery,usage:r.usage,cached:!!r.cached});
 console.log(JSON.stringify({case:id,id:r.id,rawValid:r.rawValidation?.valid??r.validation.valid,delivery:r.delivery?.status}));
}
await writeFile(new URL('literary-recheck.json',out),JSON.stringify({scope:'one-targeted-recheck-of-two-confirmed-semantic-errors',noAutomaticRetry:true,rows},null,2)+'\n');
