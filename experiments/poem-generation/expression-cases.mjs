import {readFile,writeFile} from 'node:fs/promises';
import {buildExpressionPlan} from './expression-plan.mjs';
import {validateExpression} from './expression-contract.mjs';
import {loadAbstractCases} from './abstract-cases.mjs';
export async function prepareExpressionStudies(){
 const abstract=await loadAbstractCases(),landscape=JSON.parse(await readFile(new URL('../../poem-flow/landscape-studies.json',import.meta.url),'utf8')),cases=[];
 const sources={u01:{author:'王维',title:'山居秋暝',url:'https://www.edb.gov.hk/attachment/tc/curriculum-development/kla/chi-edu/recommended-passages/ks4_16a_text.pdf'},u02:abstract.find(c=>c.id==='a04'),u03:abstract.find(c=>c.id==='a03')};
 for(const id of ['u01','u02','u03']){const raw=JSON.parse(await readFile(new URL('../../poem-flow/verification/expression/'+id+'-record.json',import.meta.url),'utf8')),validation=validateExpression(raw.analysis,raw.poem),meta=sources[id];cases.push({id,poem:raw.poem,author:meta.author,title:meta.title,url:meta.url,sourceContract:'expression-1.0',rawValid:raw.validation.valid,record:validation.valid?{...raw,plan:buildExpressionPlan(raw.analysis),cached:true}:null,failure:validation.valid?null:validation});}
 for(const [id,sourceId] of [['h01','s03'],['h02','s04']]){const c=landscape.cases.find(c=>c.id===sourceId),a=c.record.effectiveAnalysis||c.record.analysis;cases.push({id,poem:c.record.poem,author:sourceId==='s03'?'王维':'柳宗元',title:sourceId==='s03'?'鹿柴':'江雪',url:c.source.url,sourceContract:'3.3',rawValid:(c.record.rawValidation||c.record.validation).valid,record:{...c.record,plan:buildExpressionPlan(a),cached:true},note:c.record.sourceContext?'历史回答经原文引用范围展开后重放，原失败保留；没有新增模型请求。':'历史3.3回答，仅作本地表达对照。'});}
 const metaphor=abstract.find(c=>c.id==='a05');cases.push({id:'h03',poem:metaphor.poem,author:metaphor.author,title:metaphor.title,url:metaphor.url,sourceContract:'abstract-1.0',rawValid:metaphor.rawValid,record:{...metaphor.record,plan:buildExpressionPlan(metaphor.record.analysis)},note:'历史比喻回答，只借春水的流动，不补江岸。'});
 const variants=cases.filter(c=>c.record).flatMap(c=>['scenery','balanced','abstract'].map(mode=>({case:c.id,mode,expanse:0,seed:c.record.plan.seed,file:c.id+'-'+mode+'.png'})));
 const data={version:'shared-expression-1.0',scope:'three-new-contract-requests-and-three-historical-replays',renderModelCalls:0,cases,variants};await writeFile(new URL('../../poem-flow/expression-studies.json',import.meta.url),JSON.stringify(data,null,2)+'\n');return data;
}
