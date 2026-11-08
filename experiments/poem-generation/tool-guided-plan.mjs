// Offline, opt-in trial: accepts only validated suggestions already compatible
// with the local mapping. It does not execute model-supplied options or code.
import {validateAdvice} from './tool-guidance.mjs';
import {buildExpressionPlan} from './expression-plan.mjs';
import {constrainRecoveredPlan} from './generation-recovery.mjs';
export function buildGuidedTrial(record,advice){
 const analysis=record.effectiveAnalysis||record.analysis,validation=validateAdvice(advice,analysis);
 if(!record.validation?.valid||!validation.valid)throw Error('语义或工具建议未通过检查：'+validation.errors.join('；'));
 const baseline=constrainRecoveredPlan(buildExpressionPlan(analysis),record.recovery),layers=baseline.concretePlan?.layers||[],excluded=new Set(),audit=[];
 for(const c of advice.choices){
  const entity=analysis.entities.find(e=>e.id===c.entity),layer=layers.find(l=>l.entities.includes(c.entity)&&!l.inferred);
  const alreadyFaded=(analysis.expression?.processes||[]).some(p=>p.subject===c.entity&&p.kind==='fade'&&p.temporal==='already'&&p.modality==='asserted');
  let status,reason;
  if(!entity||entity.role!=='scene'||entity.presence!=='present'){status='not-applicable';reason='非在场主体不绘成实物';}
  else if(alreadyFaded&&layer){excluded.add(c.entity);status='withheld';reason='已消退过程尚不能由原生画笔表现，先保留缺口';}
  else if(!c.tool_id&&layer){excluded.add(c.entity);status='withheld';reason='建议无可靠画法，试验保留缺口';}
  else if(!c.tool_id){status='not-applicable';reason='原计划没有对应景物画笔';}
  else if(layer?.tool===c.tool_id){status='accepted';reason='与现有本地画法一致，沿用共用规则和数量';}
  else{status='withheld-suggestion';reason='建议与本地已验证映射不同，暂不自动替换画笔或推测变体';}
  audit.push({entity:c.entity,tool:c.tool_id,existing:layer?.tool||null,status,reason});
 }
 const plan=constrainRecoveredPlan(buildExpressionPlan(analysis,{experimentalExclude:[...excluded]}),record.recovery);
 return {plan,audit,excluded:[...excluded],validation};
}
