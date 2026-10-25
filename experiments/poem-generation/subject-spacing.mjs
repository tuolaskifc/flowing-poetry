// Bounded local placement of discrete actors. Terrain, counts and semantics stay fixed.
import{inRegion}from'./scene-organization.mjs';
// Conservative source-pixel bounds relative to the 640 x 388 tool's anchor,
// transformed exactly as scene.js does into the 960 x 600 composed canvas.
const bounds={boat:[-155,-17,155,32],horse:[-160,-265,165,8],figure:[-45,-190,45,4],weapon:[-30,-220,65,5],wine:[-125,-70,125,3]};
const extent=l=>l.tool==='wine'&&l.options.form==='cup'?[-90,-115,90,4]:l.tool==='wine'&&l.options.form==='jar'?[-110,-200,145,4]:bounds[l.tool];
const box=(l,v,at=v.placement.at)=>extent(l).map((x,j)=>at[j%2]+x*v.placement.scale/(j%2?600:960)+(j<2?-.006:.006));
const overlap=(a,b)=>Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]))/Math.max(.00001,Math.min((a[2]-a[0])*(a[3]-a[1]),(b[2]-b[0])*(b[3]-b[1])));
export function spaceSubjects(a,p){
 const land=p.scene?.organization?.regions.land,water=p.layers.find(l=>l.tool==='water'),wet=water?.clip||p.scene?.organization?.regions.water;
 const items=p.layers.flatMap(l=>bounds[l.tool]?l.instances.map(v=>({l,v})):[]).filter(({l,v})=>!l.attachment&&!v.attachment).sort((a,b)=>(a.l.semanticGroup?.role==='subject'?0:1)-(b.l.semanticGroup?.role==='subject'?0:1));
 const compatible=(l,t)=>!(a.spatial||[]).some(r=>r.modality==='asserted'&&['on','among','behind','in_front_of'].includes(r.type)&&(l.entities.includes(r.source)&&t.entities.includes(r.target)||l.entities.includes(r.target)&&t.entities.includes(r.source)));
 const occupied=[],repairs=[];
 const move=(l,v,delta,seen=new Set())=>{
  if(seen.has(v.id))return;seen.add(v.id);v.placement.at=v.placement.at.map((x,j)=>x+delta[j]);
  for(const child of p.layers)for(const cv of child.instances){const attach=cv.attachment||child.attachment;if(attach&&l.entities.includes(attach.target)&&(!attach.instance||attach.instance===v.id))move(child,cv,delta,seen);}
 };
 for(const {l,v}of items){
  const original=[...v.placement.at],s=v.placement.scale;
  const valid=at=>{const b=box(l,v,at);if(b[0]<.01||b[2]>.99||at[1]<.52||at[1]>.96)return false;
   if(l.tool==='boat')return !wet||inRegion(at,wet);
   if(['horse','figure','weapon'].includes(l.tool)&&land){const e=extent(l),foot=(e[2]-e[0])/960*s*.3;return [at,[at[0]-foot,at[1]],[at[0]+foot,at[1]]].every(q=>inRegion(q,land)&&(!wet||!inRegion(q,wet)));}return true;};
  const collision=at=>occupied.filter(o=>compatible(l,o.l)).reduce((n,o)=>n+overlap(box(l,v,at),box(o.l,o.v)),0);
  if(valid(original)&&collision(original)<.02){occupied.push({l,v});continue;}
  let best=null,score=Infinity;
  const candidates=[original];for(let y=.58;y<=.96;y+=.035)for(let x=.045;x<.96;x+=.035)candidates.push([x,y]);
  for(const at of candidates){if(!valid(at))continue;const cost=collision(at)*4+Math.hypot(at[0]-original[0],(at[1]-original[1])*1.3);if(cost<score){score=cost;best=at;}}
  if(best){const delta=best.map((x,j)=>x-original[j]);if(delta.some(x=>Math.abs(x)>.002)){move(l,v,delta);repairs.push({instance:v.id,from:original,to:[...v.placement.at],basis:'local-habitat-and-actor-separation'});}}
  occupied.push({l,v});
 }
 for(const l of p.layers)l.placement.at=l.instances.reduce((p,v)=>p.map((x,j)=>x+v.placement.at[j]/l.instances.length),[0,0]);
 let residualOverlap=0;for(let i=0;i<occupied.length;i++)for(let j=i+1;j<occupied.length;j++)if(compatible(occupied[i].l,occupied[j].l))residualOverlap+=overlap(box(occupied[i].l,occupied[i].v),box(occupied[j].l,occupied[j].v));
 if(p.scene?.organization)p.scene.organization.actorSpacing={version:'1.0',repairs,residualOverlap,scope:'discrete-actors-not-intentional-occlusion'};
}
