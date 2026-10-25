// One post-layout policy for native generation, shared expression and alternatives.
import{bindSourceDependencies}from'./source-dependencies.mjs';
import{sourceColorCue}from'./source-colors.mjs';
import{inspectOrganization}from'./scene-organization.mjs';
import{compositionScore}from'./world-layout.mjs';
import{spaceSubjects}from'./subject-spacing.mjs';
const recognizable=new Set(['moon','building','dwelling','pavilion','boat','figure','bird','oriole','horse','fish','flag','weapon']);
const broad=l=>l.tool==='water'||['rain','snow','mist','catkins','falling-petals','leaves'].includes(l.tool)||l.tool==='landscape'&&['sky','ground','field','path','lightwash','shadow','moss'].includes(l.options.form);
const preference=p=>compositionScore(p)+(p.scene.organization.actorSpacing?.residualOverlap||0)*2;
export function applyDrawingPolicy(a,plan){
 const seen=new Set(),applied=[];
 for(const p of [plan,...(plan.compositions||[])]){
  if(seen.has(p.layers))continue;seen.add(p.layers);
  p.notes??=[];
  for(const [index,l]of p.layers.entries()){
   l.id??=[l.entities.join('+')||'inferred',l.tool,l.options.form||'',index].join(':');
   for(const [i,v]of l.instances.entries())v.id??=l.id+':'+i;
   const cue=sourceColorCue(a,l);if(cue){l.colorCue=cue;l.visual={...l.visual,color:cue.color};}
   const reasons=[];if(recognizable.has(l.tool))reasons.push('recognizable-subject');
   if(l.colorCue&&!broad(l))reasons.push('literal-color');
   if(l.semanticGroup?.role==='subject'&&!broad(l))reasons.push('semantic-subject');
   if(l.options.form==='waterfall')reasons.push('dependent-landform');
   l.visibility={protect:reasons.length>0,reasons,basis:'local-drawing-policy'};
  }
  bindSourceDependencies(a,p);spaceSubjects(a,p);
  for(const r of a.spatial||[])if(r.modality==='asserted'&&r.type==='behind'){
   const source=p.layers.find(l=>l.entities.includes(r.source)),target=p.layers.find(l=>l.entities.includes(r.target));
   if(source?.visibility.protect&&target){target.visibility.protect=true;target.visibility.reasons.push('semantic-occluder');}
  }
  if(p.scene?.organization)p.scene.organization.audit=inspectOrganization(a,p);
  applied.push(...p.layers.filter(l=>l.attachment||l.colorCue||l.visibility.protect).map(l=>({composition:p.id||plan.composition||'primary',layer:l.id||l.entities.join('+'),entities:l.entities,color:l.colorCue?.word||null,visibility:[...new Set(l.visibility.reasons)],attachment:l.attachment?.anchor||l.instances.find(v=>v.attachment)?.attachment.anchor||null})));
 }
 if(plan.compositions?.length){
  const valid=plan.compositions.filter(p=>!p.scene.organization.audit.errors&&!p.scene.displayAudit?.errors).sort((a,b)=>preference(a)-preference(b)||a.id.localeCompare(b.id));
  if(valid.length){const p=valid[0];Object.assign(plan,{layers:p.layers,scene:p.scene,spatial:p.spatial,composition:p.id});}
  plan.compositionSelection={method:'shared-policy-final-audit-and-geometric-preference',candidates:plan.compositions.map(p=>({id:p.id,errors:p.scene.organization.audit.errors+(p.scene.displayAudit?.errors||0),score:preference(p),actorOverlap:p.scene.organization.actorSpacing?.residualOverlap||0})),aestheticAcceptance:'pending-user'};
 }
 plan.notes=[...new Set([...(plan.notes||[]),...(plan.compositions||[]).flatMap(p=>p.notes||[])])];
 plan.drawingPolicy={version:'shared-drawing-policy-1.0',scope:'source-bound-generation-and-composition-alternatives',selectedComposition:plan.composition||null,applied,quantityChanges:plan.sourceResolution?.changes.length||0,identityGroups:plan.sourceResolution?.identities.length||0,aestheticAcceptance:'pending-user'};
 return plan;
}
