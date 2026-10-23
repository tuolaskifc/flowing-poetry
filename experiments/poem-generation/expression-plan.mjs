// Explicit local adapters, never a synthetic second model response.
import {createHash} from 'node:crypto';
import {buildPlan} from './planner.mjs';
import {buildAbstractPlan} from './abstract-plan.mjs';
import {sceneProjection} from './expression-contract.mjs';
export const expressionPolicyVersion='shared-expression-1.0';
export function buildExpressionPlan(a){
 const legacy=a.schema_version==='abstract-1.0',old=legacy?buildAbstractPlan(a):null;
 const concrete=legacy?old.concretePlan:buildPlan(a.schema_version==='expression-1.0'?sceneProjection(a):a);
 const concretePlan=concrete?.layers.length?concrete:null;
 const subjects=legacy?a.subjects:a.entities.map(e=>({id:e.id,mentions:e.mentions,meaning:e.concept,kind:e.kind==='abstract'?'abstract':'concrete',role:e.role,presence:e.presence,contextOnly:e.kind==='environment'&&a.scene?.atmosphere.illumination!=='unclear'&&e.mentions.every(m=>/^(良夜|夜|白昼|黄昏|清晨|暮色|夜色)$/.test(m))}));
 const nodes=subjects.filter(s=>!s.mentions.every(m=>/^(当时|彼时|从此|此时|已经|尚未)$/.test(m))).map(s=>({id:s.id,label:s.mentions.join('／'),meaning:s.meaning,kind:s.kind,contextOnly:!!s.contextOnly,mode:s.presence==='absent'?'gap':s.presence==='unclear'?'candidate':s.role==='reference'?'reference':'present'}));
 const ids=new Set(nodes.map(n=>n.id)),relations=(legacy?a.relations:a.expression?.relations||[]).filter(r=>ids.has(r.source)&&(!r.target||ids.has(r.target))),processes=(legacy?a.processes:a.expression?.processes||[]).filter(p=>ids.has(p.subject));
 const abstract=nodes.filter(n=>n.kind==='abstract'&&n.mode==='present'),literal=nodes.filter(n=>n.kind==='concrete'&&n.mode==='present');
 const recommendation=concretePlan?(abstract.length?'balanced':'scenery'):'abstract';
 const gaps=literal.filter(n=>!n.contextOnly&&!concretePlan?.layers.some(l=>l.entities.includes(n.id))).map(n=>({id:n.id,label:n.label,reason:'尚无实际画笔；不把缺失能力自动当作抽象表达'}));
 const illumination=legacy?a.atmosphere.illumination:a.scene?.atmosphere.illumination||'unclear';
 return {version:expressionPolicyVersion,seed:parseInt(createHash('sha256').update(a.poem).digest('hex').slice(0,8),16),poem:a.poem,nodes,relations,processes,omitted:old?.omitted||[],atmosphere:{...a.atmosphere,illumination},concretePlan,
  expression:{version:expressionPolicyVersion,sourceContract:a.schema_version,recommendation,reason:concretePlan?(abstract.length?'已有景物承托，同时有抽象主体，默认景意交融':'以明确景物及空间为主，默认风景优先'):gaps.length&&!abstract.length?'具体主体尚有画法缺口；不据此补造抽象主体':'没有可直接落成实景的主体，以抽象关系组织画面',gaps,limitations:[...(legacy?['历史抽象协议未提供精确数量与完整空间语义，沿用其已标注的景物适配边界']:[]),...(a.schema_version==='3.3'?['历史3.3回答没有抽象关系字段；不根据解读文本补造关系']:[]),'景物过程当前影响抽象纹理；原生景物动作沿用场景能力，未支持的月下楼位移等仍不执行。','纹理、色层和观看扰动属于本地艺术选择，不改变语义成立状态']},
  notes:['三个表达倾向共享景物数量、空间、依托与主体身份；抽象笔触优先服从原景物区域和轮廓。','纯抽象或比喻句不因切换风景优先而补山水。',...(old?.notes||[]),...(concretePlan?.notes||[])],aestheticAcceptance:'pending-user'};
}
