// Bounded local recovery. Raw replies stay immutable; entities, quantities,
// presence, roles and modalities are never rewritten to pass validation.
import {validateExpression} from './expression-contract.mjs';
import {validateAbstract} from './abstract-contract.mjs';
export const recoveryVersion='generation-recovery-1.2';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const at=(v,path)=>path.split('.').reduce((p,k)=>p?.[k],v);
const validators={expression:validateExpression,abstract:validateAbstract};
export function parseModelJSON(text){
 try{return {analysis:JSON.parse(text),wrapped:false};}catch(error){
  const match=text.trim().match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
  if(!match)throw error;return {analysis:JSON.parse(match[1]),wrapped:true};
 }
}
function normalizeAtmosphere(value,poem,changes){
 const a=value.scene?.atmosphere;if(!object(a))return;
 const fields={visibility:['clear','hazy','dark','unclear'],illumination:['day','twilight','night','unclear']};
 const next=structuredClone(a),bases=[],quotes=[];let wrapped=false;
 if(a.basis!==undefined)bases.push(a.basis);if(a.evidence!==undefined){if(!Array.isArray(a.evidence))return;quotes.push(...a.evidence);}
 for(const [key,allowed] of Object.entries(fields)){
  const child=a[key];if(!object(child))continue;
  const scalar=['value','enum'].filter(k=>Object.hasOwn(child,k));
  if(scalar.length!==1||Object.keys(child).some(k=>![scalar[0],'basis','evidence'].includes(k))||!allowed.includes(child[scalar[0]]))return;
  if(child.basis!==undefined)bases.push(child.basis);
  if(child.evidence!==undefined){if(!Array.isArray(child.evidence))return;quotes.push(...child.evidence);}
  next[key]=child[scalar[0]];wrapped=true;
 }
 if(!wrapped||!bases.length||new Set(bases).size!==1||!['explicit','inferred'].includes(bases[0]))return;
 const evidence=[...new Set(quotes)];if(evidence.length>3||evidence.some(q=>typeof q!=='string'||!q||!poem.includes(q)))return;
 next.basis=bases[0];next.evidence=evidence;value.scene.atmosphere=next;
 changes.push({kind:'enum-wrapper',path:'scene.atmosphere',original:structuredClone(a),effective:structuredClone(next)});
}
function jobsFor(a,mode){
 const jobs=[],add=(path,ids)=>{const item=at(a,path);if(item)jobs.push({path,item,ids});};
 if(mode==='expression'){
  a.spatial?.forEach((r,i)=>add('spatial.'+i,[r.source,r.target]));
  a.scene?.groups?.forEach((g,i)=>add('scene.groups.'+i,g.members));
  a.scene?.supports?.forEach((s,i)=>add('scene.supports.'+i,[s.entity,...(s.target?[s.target]:[])]));
  a.scene?.actions?.forEach((s,i)=>add('scene.actions.'+i,[s.entity]));
  a.expression?.relations?.forEach((r,i)=>add('expression.relations.'+i,[r.source,...(r.target?[r.target]:[])]));
  a.expression?.processes?.forEach((p,i)=>add('expression.processes.'+i,[p.subject]));
 }else{
  a.relations?.forEach((r,i)=>add('relations.'+i,[r.source,...(r.target?[r.target]:[])]));
  a.processes?.forEach((p,i)=>add('processes.'+i,[p.subject]));
 }
 return jobs;
}
function expandEvidence(value,poem,mode,validation,changes){
 if(!validation.errors.length||!validation.errors.every(e=>/依据未关联/.test(e)))return;
 const entities=new Map((value.entities||value.subjects).map(e=>[e.id,e]));
 const clauses=[...poem.matchAll(/[^，。；！？,;!?\n]+[，。；！？,;!?\n]?/g)].map(m=>({start:m.index,end:m.index+m[0].length,text:m[0]}));
 for(const {path,item,ids} of jobsFor(value,mode)){
  const evidence=item.evidence,needed=ids.map(id=>entities.get(id));
  if(!Array.isArray(evidence)||!evidence.length||evidence.some(q=>typeof q!=='string'||!poem.includes(q))||needed.some(e=>!e))continue;
  if(needed.every(e=>evidence.some(q=>e.mentions.some(m=>q.includes(m)))))continue;
  let best=null;
  for(let i=0;i<clauses.length;i++)if(evidence.some(q=>clauses[i].text.includes(q)))for(const [lo,hi] of [[i,i],[i-1,i],[i,i+1]]){
   if(lo<0||hi>=clauses.length)continue;const quote=poem.slice(clauses[lo].start,clauses[hi].end);
   if(evidence.every(q=>quote.includes(q))&&needed.every(e=>e.mentions.some(m=>quote.includes(m)))&&(!best||quote.length<best.length))best=quote;
  }
  if(best){changes.push({kind:'source-range-only',path:path+'.evidence',original:[...evidence],effective:[best]});item.evidence=[best];}
 }
}
function quarantine(value,poem,mode,validation){
 const paths=mode==='expression'?['spatial','scene.groups','scene.supports','scene.actions','expression.relations','expression.processes']:['relations','processes'];
 const isClaimError=e=>paths.some(p=>e.startsWith(p+'[')||e.startsWith(p+' '))||mode==='expression'&&e.startsWith('scene 抽象概念');
 // A bad global contract, entity, quantity, extra field or invented input
 // stays a hard failure. Only independently checkable optional claims may go.
 if(!validation.errors.length||validation.errors.some(e=>!isClaimError(e)||/额外字段|字段不正确|类型|数量越界|文本或id|格式不正确/.test(e)))return null;
 const validate=validators[mode],candidate=structuredClone(value),originals=[];
 for(const path of paths){const array=at(candidate,path);if(!Array.isArray(array))return null;originals.push({path,array:structuredClone(array)});array.length=0;}
 if(!validate(candidate,poem).valid)return null;
 const omitted=[];
 for(const {path,array} of originals){
  // Conflicting duplicated processes/groups are all withheld, not arbitrarily
  // resolved by keeping the first claim.
  const key=p=>path.endsWith('processes')?[p.subject]:path.endsWith('actions')?[p.entity]:path.endsWith('groups')?p.members:[];
  const counts=new Map();for(const item of array)for(const id of key(item))counts.set(id,(counts.get(id)||0)+1);
  for(const [index,item] of array.entries()){
   const target=at(candidate,path),conflict=key(item).some(id=>counts.get(id)>1);target.push(item);
   const result=validate(candidate,poem);
   if(conflict||!result.valid){target.pop();omitted.push({path:path+'['+index+']',claim:item,errors:conflict?['同一主体有冲突的重复解释，均暂不执行']:result.errors});}
  }
 }
 return omitted.length?{analysis:candidate,validation:validate(candidate,poem),omitted}:null;
}
function missingComponents(value,mode){
 const omitted=[];
 if(mode==='expression'){
  const missing=path=>omitted.push({path,claim:{evidence:[],missing:true},errors:['这一部分场景解释未返回；使用未明或空视图，不作为模型已给出的语义断言']});
  if(value.spatial===undefined||value.spatial===null){value.spatial=[];missing('spatial');}
  if(value.scene===undefined||value.scene===null)value.scene={};
  if(object(value.scene)&&Object.keys(value.scene).every(k=>['setting','groups','supports','actions','atmosphere'].includes(k))){
   const defaults={setting:{kind:'unclear',basis:'inferred',evidence:[]},groups:[],supports:[],actions:[],atmosphere:{visibility:'unclear',illumination:'unclear',basis:'inferred',evidence:[]}};
   for(const [key,fallback]of Object.entries(defaults))if(value.scene[key]===undefined||value.scene[key]===null){value.scene[key]=fallback;missing('scene.'+key);}
  }
 }
 if(mode==='expression'&&(value.expression===undefined||value.expression===null))value.expression={};
 const holder=mode==='expression'?value.expression:value;
 if(!object(holder)||mode==='expression'&&Object.keys(holder).some(k=>!['relations','processes'].includes(k)))return omitted;
 for(const key of ['relations','processes'])if(holder[key]===undefined||holder[key]===null){
  holder[key]=[];omitted.push({path:(mode==='expression'?'expression.':'')+key,claim:{evidence:[]},errors:['这一部分解释未返回，暂不执行，不把空视图当作模型断言']});
 }
 return omitted;
}
export function recoverInterpretation(raw,poem,mode){
 const validate=validators[mode];if(!validate)throw Error('Unsupported recovery contract');
 const rawValidation=validate(raw,poem);if(rawValidation.valid)return {validation:rawValidation,rawValidation};
 if(!object(raw))return {validation:rawValidation,rawValidation};
 const value=structuredClone(raw),changes=[];
 if(mode==='expression')normalizeAtmosphere(value,poem,changes);
 const missing=missingComponents(value,mode);
 let validation=validate(value,poem);
 if(!validation.valid){expandEvidence(value,poem,mode,validation,changes);validation=validate(value,poem);}
 let effective=value,omitted=[...missing];
 if(!validation.valid){const local=quarantine(value,poem,mode,validation);if(local){effective=local.analysis;validation=local.validation;omitted.push(...local.omitted);}}
 if(!validation.valid)return {validation:rawValidation,rawValidation};
 const partial=omitted.length>0;
 validation.review_required=true;validation.warnings=[...new Set([...validation.warnings,partial?'部分联系或过程未通过核验，未执行；实体、数量和成立状态未改写':'格式或原文引用范围由本地处理，语义合理性仍需复核'])];
 return {validation,rawValidation,effectiveAnalysis:same(effective,raw)?undefined:effective,recovery:{version:recoveryVersion,status:partial?'partial':'normalized',reviewRequired:true,changes,omitted,message:partial?'已绘制核验通过的部分，个别联系或动作暂未采用。':'已完成格式或引用整理，解读仍可复核。'}};
}
export function constrainRecoveredPlan(plan,recovery){
 if(!recovery?.omitted.length)return plan;
 const paused=new Set(recovery.omitted.filter(o=>o.path.startsWith('scene.actions')).map(o=>o.claim.entity));
 const missingActions=recovery.omitted.some(o=>o.path==='scene.actions'&&o.claim.missing);
 const freeze=p=>{for(const l of p?.layers||[])if(missingActions||l.entities.some(id=>paused.has(id))){l.animate=false;l.timeScale=0;delete l.motion;}for(const c of p?.compositions||[])freeze(c);};
 freeze(plan.concretePlan);freeze(plan);
 plan.notes.push('本次部分联系或过程未采用；相关原始解释与检查原因均保留，未增加实体或改变明确数量。');return plan;
}
