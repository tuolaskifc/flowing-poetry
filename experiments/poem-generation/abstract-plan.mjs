// Semantic interpretation -> local expression plan. Numeric/artistic choices are code owned.
import {createHash} from 'node:crypto';
import {buildPlan} from './planner.mjs';
export const abstractPolicyVersion='abstract-expression-1.1';
export function buildAbstractPlan(a){
 const visible=a.subjects.filter(s=>!s.mentions.every(m=>/^(当时|彼时|从此|此时|已经|尚未)$/.test(m)));
 const nodes=visible.map(s=>({id:s.id,label:s.mentions.join('／'),meaning:s.meaning,kind:s.kind,mode:s.presence==='absent'?'gap':s.presence==='unclear'?'candidate':s.role==='reference'?'reference':'present'}));
 const ids=new Set(nodes.map(n=>n.id)),relations=a.relations.filter(r=>ids.has(r.source)&&(!r.target||ids.has(r.target))),processes=a.processes.filter(p=>ids.has(p.subject));
 const omitted=a.subjects.filter(s=>!ids.has(s.id)).map(s=>({id:s.id,label:s.mentions.join('／'),reason:'纯时间线索保留在解读，不独立造形'}));
 const seed=parseInt(createHash('sha256').update(a.poem).digest('hex').slice(0,8),16);
 const concrete=a.subjects.filter(s=>ids.has(s.id)&&s.kind==='concrete'&&s.role==='scene'&&s.presence==='present');
 let concretePlan=null;
 if(concrete.length){
  // Local adapter reuses brush mapping; these fields are not an extra model reply.
  const projected={poem:a.poem,reading:a.reading,entities:concrete.map(s=>({id:s.id,mentions:s.mentions,concept:s.meaning,kind:'object',role:'scene',presence:'present',evidence:s.evidence})),relations:[],atmosphere:{labels:a.atmosphere.labels,valence:a.atmosphere.valence,energy:'low',tension:'unclear',openness:a.atmosphere.openness,evidence:a.atmosphere.evidence},time:{markers:[],note:null},uncertainties:a.uncertainties};
  const p=buildPlan(projected);if(p.layers.length){p.provenance={basis:'local-semantic-adapter',source:'abstract-1.0 concrete subjects only'};p.settings.palette=a.atmosphere.illumination==='night'?'indigo':'mineral';concretePlan=p;}
 }
 return {version:abstractPolicyVersion,poem:a.poem,seed,nodes,relations,processes,omitted,atmosphere:a.atmosphere,concretePlan,notes:['形态、笔触数量、配色变体、布局与观看节奏为本地艺术选择，不表示原文物体数或发生概率。','非确定关系只作候选或边界提示；未完成不固定为永久无法完成。','一次性过程在播放时段内演化，不自动循环成诗句的事实；可手动重放。',...(concretePlan?['景物叠加借用原文中已有景物的画笔；景物本身保持原画笔，关系与时间由抽象层提示；精确数量、景物下移与复杂遮挡尚未接入此试验。']:[])],aestheticAcceptance:'pending-user'};
}
