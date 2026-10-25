import{readFile,writeFile,mkdir}from'node:fs/promises';
import{ruleFixtures}from'./rule-fixtures.mjs';
import{buildExpressionPlan}from'./expression-plan.mjs';
import{validateExpression}from'./expression-contract.mjs';
const root=new URL('../../poem-flow/',import.meta.url),notes=['两对白鹭按四个个体；成对单位与个体数量分开。','二十三只归鸟保留明确数量，不把连续汉字数词当成两三只。','三艘舟、两匹马分别核对，量词不串到旁边的景物。','三个称谓指向同一个人；肯定身份可以沿短句连接。','并列人物不合并；未见的人不补入画面。','两面旗幡各有依托，不重叠到同一间屋上。','持酒这个动作不让另一句中的长剑自动出现在手边。','红梅与白菊分别保色，不借同句另一朵花的颜色。','柳、云、山的颜色跟随各自原词。','缺席的旌旗不绘制；独舟仍在。','长剑是江水的比喻参照，不补成真实兵器。','三两枝保持局部范围，不复制两三棵桃树。'];
const cases=ruleFixtures.map((c,i)=>{const a={...structuredClone(c.analysis),schema_version:'expression-1.0',expression:{relations:[],processes:[]}},validation=validateExpression(a,a.poem);if(!validation.valid)throw Error(c.id+validation.errors.join(';'));const plan=buildExpressionPlan(a);return{id:c.id,poem:c.poem,author:'手工校准',note:notes[i],record:{id:'authored-'+c.id,poem:c.poem,analysis:a,validation,plan,cached:true,provenance:{kind:'authored-calibration'},auditNote:notes[i]+' 本例为手工语义校准，没有请求模型。',delivery:{status:'complete'}}};});
await mkdir(new URL('verification/rules/',root),{recursive:true});await writeFile(new URL('rule-studies.json',root),JSON.stringify({scope:'unseen-authored-local-policy-calibrations',providerCalls:0,cases})+'\n');console.log('Prepared '+cases.length+' explicitly authored calibrations');
