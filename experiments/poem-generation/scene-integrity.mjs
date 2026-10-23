// Final display constraints run after every layout pass, including alternatives.
// They preserve semantic entities and counts; unsupported meaning remains a gap.
import {inRegion,inspectOrganization} from './scene-organization.mjs';
import {compositionScore} from './world-layout.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const birds=l=>['bird','oriole'].includes(l.tool);
const sync=l=>{l.placement.at=l.instances.reduce((p,v)=>p.map((x,i)=>x+v.placement.at[i]/l.instances.length),[0,0]);};
function separate(l,region){
 const occupied=[];
 for(const [i,v] of l.instances.entries()){
  const original=v.placement.at,min=birds(l)?.07:.055;
  let best=original,score=-Infinity;
  for(let j=0;j<100;j++){
   const p=j===0?original:[clamp(original[0]+Math.cos(j*2.399+i)*(.025+Math.sqrt(j)*.024),.06,.94),clamp(original[1]+Math.sin(j*2.399+i)*(.02+Math.sqrt(j)*.018),.12,.96)];
   if(region&&!inRegion(p,region))continue;
   const clearance=occupied.length?Math.min(...occupied.map(q=>Math.hypot(p[0]-q[0],p[1]-q[1]))):1;
   const s=Math.min(clearance,min)-Math.hypot(p[0]-original[0],p[1]-original[1])*.035;
   if(s>score){score=s;best=p;}if(clearance>=min&&j===0)break;
  }
  v.placement.at=[...best];occupied.push(best);
 }
}
function colorCue(analysis,l){
 const entities=analysis.entities.filter(e=>l.entities.includes(e.id));
 const clauses=analysis.poem.split(/[，。；！？\n]/).filter(c=>entities.some(e=>e.mentions.some(m=>c.includes(m))));
 const text=clauses.join('，');
 if(l.tool==='bird'&&l.options.tone==='light')return {color:'#F8F7EB',evidence:text,basis:'source-literal'};
 if(l.tool==='water'&&/(?:江|水|溪|湖).{0,2}(?:碧|绿)|(?:碧|绿)(?:水|江|溪|湖)/.test(text))return {color:'#288F90',evidence:text,basis:'source-literal'};
 if(l.options.form==='mountain'&&/山.{0,2}青|青山/.test(text))return {color:'#427E73',evidence:text,basis:'source-literal'};
 if(['flower','lotus','plum-branch'].includes(l.tool)||l.tool==='tree'&&l.options.form==='blossom'){
  if(/(?:花|梅|荷).{0,4}红|红(?:花|梅|荷)/.test(text))return {color:'#D95860',evidence:text,basis:'source-literal'};
  if(/花欲燃/.test(text))return {color:'#D95049',evidence:text,basis:'local-color-interpretation'};
 }
 if(l.tool==='lotus'&&l.options.form==='leaf'&&/叶.{0,5}碧|碧.{0,3}叶/.test(text))return {color:'#328761',evidence:text,basis:'source-literal'};
 return null;
}
export function finalizeScene(analysis,plan){
 if(analysis.schema_version!=='3.3')return plan;
 const apply=p=>{
  const water=p.layers.find(l=>l.tool==='water'),land=p.scene.organization.regions.land;
  for(const [li,l] of p.layers.entries()){
   l.id=[l.entities.join('+')||'inferred',l.tool,l.options.form||'',li].join(':');
   l.interaction={mode:l.clip||l.surface||l.tool==='bamboo'&&l.instances.length>1?'group':'instance',groupId:l.id};
   for(const [i,v] of l.instances.entries()){
    v.id=l.id+':'+i;
    if(l.tool==='moon'){v.placement.scale=Math.max(v.placement.scale,.76);v.opacity=Math.max(v.opacity??1,.92);}
    if(l.tool==='flower'){
     const far=l.semanticGroup?.depth==='far',near=l.semanticGroup?.depth==='near';
     v.placement.scale=Math.max(v.placement.scale,(far?.26:near?.57:.36)+(i%4)*.035);
     v.opacity=Math.max(v.opacity??1,far?.48:.72);
    }
    if(birds(l)){
     const far=l.semanticGroup?.depth==='far',near=l.semanticGroup?.depth==='near';
     v.placement.scale=Math.max(v.placement.scale,far?.38:near?.62:.50);
     v.opacity=Math.max(v.opacity??1,far?.52:.72);
     if(l.options.pose==='flying'||l.options.pose==='spread')v.placement.at[1]=clamp(v.placement.at[1],.14,.43);
    }
   }
   if(birds(l)||['boat','dwelling','building'].includes(l.tool))separate(l,l.tool==='boat'||l.options.pose==='waterbird'?water?.clip:['dwelling','building'].includes(l.tool)?land:null);
   sync(l);
   const cue=colorCue(analysis,l);if(cue){l.colorCue=cue;l.visual={...l.visual,color:cue.color};}
   if(l.visual)l.visual.brushStrength=l.visual.role==='blossom'?1.65:l.visual.role==='vegetation'?1.2:l.visual.role==='water'?1.35:1.1;
  }
  // Bind attachment to a particular parent instance rather than its entire type.
  for(const l of p.layers.filter(l=>l.attachment)){
   const parent=p.layers.find(v=>v.entities.includes(l.attachment.target));if(!parent)continue;
   const child=l.instances[0].placement.at;
   const costs=parent.instances.map(v=>{const q=v.placement;return Math.hypot(q.at[0]-child[0],q.at[1]-(l.attachment.anchor==='roof'?.19*q.scale:0)-child[1]);});
   const index=costs.indexOf(Math.min(...costs));l.attachment.instance=parent.instances[index].id;
  }
  const checks=[];
  for(const l of p.layers){
   if(birds(l))for(const [i,v] of l.instances.entries()){
    if(l.options.pose==='flying'&&v.placement.at[1]>.45)checks.push({code:'air',id:v.id});
    if(l.instances.some((w,j)=>j<i&&Math.hypot(w.placement.at[0]-v.placement.at[0],w.placement.at[1]-v.placement.at[1])<.035))checks.push({code:'overlap',id:v.id});
   }
  }
  p.scene.displayAudit={scope:'display-scale-separation-and-habitat',issues:checks,errors:checks.length,aestheticAcceptance:'pending-user'};
  p.scene.organization.audit=inspectOrganization(analysis,p);
 };
 apply(plan);for(const v of plan.compositions||[])apply(v);
 if(plan.compositions?.length){
  plan.compositionSelection={method:'final-display-constraints-then-geometric-preference',candidates:plan.compositions.map(v=>({id:v.id,errors:v.scene.organization.audit.errors+v.scene.displayAudit.errors,score:compositionScore(v)})),aestheticAcceptance:'pending-user'};
  const usable=plan.compositions.filter(v=>!v.scene.organization.audit.errors&&!v.scene.displayAudit.errors).sort((a,b)=>compositionScore(a)-compositionScore(b)||a.id.localeCompare(b.id));
  if(usable.length){plan.compositions=usable;const selected=usable[0];Object.assign(plan,{layers:selected.layers,scene:selected.scene,spatial:selected.spatial,composition:selected.id});}
 }
 plan.imageryTrace=analysis.entities.map(e=>({id:e.id,mentions:e.mentions,role:e.role,presence:e.presence,parameter:e.role==='scene'&&e.presence==='present'&&e.kind==='environment'&&e.mentions.some(m=>m.includes('风'))?'wind':null,layers:plan.layers.filter(l=>l.entities.includes(e.id)).map(l=>({id:l.id,tool:l.tool,instances:l.instances.map(v=>v.id)})),omission:plan.omitted.find(o=>o.id===e.id)?.reason||null}));
 plan.notes.push('显示检查覆盖实例尺度、鸟群分离与空中落点；不保证笔触未被遮挡，也不代替实际观看。竹林默认成组拖动，其余单独拖动；Shift 可拖动同层整组。');
 return plan;
}
