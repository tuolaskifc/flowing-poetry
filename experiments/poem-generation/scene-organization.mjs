// Code-owned scene graph, candidate layouts and bounded geometric supervision.
// These checks measure implemented constraints, never literary truth or beauty.
import {applySemanticSupports,applySemanticLayout} from './semantic-policy.mjs';
import {worldLayout,compositionScore} from './world-layout.mjs';
const frac=n=>n-Math.floor(n);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const plants=new Set(['tree','willow','bamboo','grass','flower','orchid']);
const grounded=new Set([...plants,'dwelling','building','pavilion','horse','figure','rock','weapon','flag']);
const subjects=new Set(['weapon','flag','dwelling','building','pavilion','horse','figure','boat']);
const dimensions={weapon:[.06,.34],flag:[.22,.24],tree:[.34,.59],willow:[.43,.50],bamboo:[.24,.51],grass:[.23,.20],flower:[.17,.39],orchid:[.20,.34],dwelling:[.32,.28],building:[.34,.44],pavilion:[.30,.32],horse:[.27,.20],figure:[.08,.19],boat:[.25,.10],bird:[.12,.08],oriole:[.12,.10],rock:[.23,.14],lotus:[.24,.24]};
const polygonArea=p=>Math.abs(p.reduce((a,v,i)=>{const n=p[(i+1)%p.length];return a+v[0]*n[1]-n[0]*v[1];},0))/2;
export function inRegion([x,y],polygon){
 if(!polygon?.length)return false;let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const [ax,ay]=polygon[i],[bx,by]=polygon[j];
  const cross=(x-ax)*(by-ay)-(y-ay)*(bx-ax);
  if(Math.abs(cross)<1e-7&&x>=Math.min(ax,bx)-1e-7&&x<=Math.max(ax,bx)+1e-7&&y>=Math.min(ay,by)-1e-7&&y<=Math.max(ay,by)+1e-7)return true;
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
 }return inside;
}
function pointIn(polygon,x,y){
 if(inRegion([x,y],polygon))return [x,y];
 let best=null,distance=Infinity;
 for(let j=0;j<24;j++)for(let i=0;i<36;i++){
  const p=[.025+i*.95/35,.46+j*.54/23];if(!inRegion(p,polygon))continue;
  const d=(p[0]-x)**2+(p[1]-y)**2;if(d<distance){best=p;distance=d;}
 }
 return best||[x,y];
}
function center(l){return l.instances.reduce((p,v)=>[p[0]+v.placement.at[0]/l.instances.length,p[1]+v.placement.at[1]/l.instances.length],[0,0]);}
function move(l,x,y){const [ox,oy]=center(l);for(const v of l.instances)v.placement.at=[v.placement.at[0]+x-ox,v.placement.at[1]+y-oy];l.placement.at=[x,y];}
function sync(l){if(l.instances.length)l.placement={...l.placement,at:[...center(l)]};}
function attachSmoke(layers){
 const house=layers.find(l=>['dwelling','building'].includes(l.tool));if(!house)return;
 const roof=house.instances[Math.floor(house.instances.length/2)].placement;
 for(const l of layers.filter(l=>l.tool==='mist'&&l.options.form==='plume')){
  for(const v of l.instances){v.placement={anchor:[320,320],at:[roof.at[0]+.02,roof.at[1]-.19*roof.scale],scale:.80};}
  l.z=(house.z??10)+2;l.attachment={target:house.entities[0],anchor:'roof',basis:'local-context'};sync(l);
 }
}
function physical(l){
 if(l.tool==='landscape')return ['mountain','waterfall','ground','shore','field','path'].includes(l.options.form)?'terrain':['sun','stars','sky'].includes(l.options.form)?'sky':'detail';
 if(l.tool==='water')return 'water';if(plants.has(l.tool))return 'vegetation';
 if(subjects.has(l.tool))return 'subject';if(['bird','oriole','fish'].includes(l.tool))return 'fauna';
 if(l.tool==='lotus')return 'aquatic-vegetation';if(l.tool==='moon')return 'sky';
 return ['cloud','mist','rain','snow','falling-petals','catkins','leaves'].includes(l.tool)?'atmosphere':'detail';
}
function waterVeto(analysis){return analysis.entities.some(e=>(e.presence!=='present'||e.role!=='scene')&&e.mentions.some(m=>/^(?:寒|春|秋|野|碧|清)?(?:江|河|水|溪|湖|池|海|泉|潮)(?:水|面|流)?$/.test(m)));}
function supportVeto(analysis,form){
 if(form==='water')return waterVeto(analysis);
 const words=form==='ground'?/^(?:地|地面|陆地|原野|草地|平野|高原)$/:form==='mountain'?/^(?:远|青|群|千|万)?山(?:峰|体|势)?$/:null;
 return !!words&&analysis.entities.some(e=>(e.presence!=='present'||e.role!=='scene')&&e.mentions.some(m=>words.test(m)));
}
function addSupport(layers,form,reason){
 const tool=form==='water'?'water':'landscape',placement={anchor:form==='water'?[320,135]:[320,194],at:[.5,.46],scale:1.6};
 if(form==='mountain')Object.assign(placement,{at:[.5,.4],scale:1.7});
 const l={tool,entities:[],projectedEntities:[],names:[form==='water'?'构图依托·水域':form==='mountain'?'构图依托·山势':'构图依托·地面'],options:{form:form==='water'?'plane':form,...(form==='ground'?{edge:'soft'}:{})},animate:false,placement:structuredClone(placement),instances:[{placement:structuredClone(placement),variant:0,depth:0,opacity:1}],singleUnit:false,inferred:true,provenance:{basis:'local-context',reason},quantity:{rendered:1,exact:false,items:[]},quantityLabel:'本地环境依托，不计入原文意象覆盖',z:form==='water'?-10:form==='mountain'?-32:-18};
 layers.push(l);return l;
}
function graphFor(analysis,layers,scene){
 const water=layers.find(l=>l.tool==='water'),land=layers.find(l=>l.tool==='landscape'&&['ground','shore','field'].includes(l.options.form));
 const nodes=layers.map((l,i)=>{
  const relation=analysis.spatial?.find(r=>r.source&&l.entities.includes(r.source)&&r.type==='on'&&r.modality==='asserted');
  const target=relation&&layers.find(t=>t.entities.includes(relation.target));
  let habitat=grounded.has(l.tool)?'land':l.tool==='boat'||l.tool==='fish'||l.tool==='lotus'||l.tool==='bird'&&l.options.pose==='waterbird'?'water':['bird','oriole','moon','cloud'].includes(l.tool)?'air':null;
  if(target?.tool==='water'&&!['bird','oriole','moon'].includes(l.tool))habitat='water';if(target&&['tree','willow','bamboo'].includes(target.tool)&&['bird','oriole'].includes(l.tool))habitat='canopy';
  if(l.attachment&&l.tool==='figure')habitat='deck';
  return {id:'l'+i,entities:[...l.entities],tool:l.tool,role:physical(l),habitat,inferred:!!l.inferred,support:target?'l'+layers.indexOf(target):habitat==='water'&&water?'l'+layers.indexOf(water):habitat==='land'&&land?'l'+layers.indexOf(land):null};
 });
 const edges=nodes.filter(n=>n.habitat).map(n=>({type:'supported-by',source:n.id,target:n.support,basis:'local-composition',habitat:n.habitat}));
 for(const r of analysis.spatial||[])edges.push({type:r.type,source:nodes.find(n=>n.entities.includes(r.source))?.id,target:nodes.find(n=>n.entities.includes(r.target))?.id,basis:r.basis,modality:r.modality,evidence:r.evidence});
 return {nodes,edges,setting:scene.kind};
}
function waterRegion(l,scene){return l?.clip||scene.organization?.regions?.water||[[0,l?.surface?.top??.46],[1,l?.surface?.top??.46],[1,1.04],[0,1.04]];}
function applyRelations(analysis,layers,spatial,regions){
 const by=id=>layers.find(l=>l.entities.includes(id));
 for(const r of spatial){
  const source=by(r.source),target=by(r.target);if(r.modality!=='asserted'||!source||!target||source===target)continue;
  const [tx,ty]=center(target);let applied=false;
  if(r.type==='on'&&target.tool==='water'&&(['boat','fish'].includes(source.tool)||source.tool==='bird'&&source.options.pose==='waterbird')){
   for(const v of source.instances)v.placement.at=pointIn(target.clip||regions.water,v.placement.at[0],Math.max(.59,v.placement.at[1]));applied=true;
  }else if(r.type==='on'&&plants.has(target.tool)&&['bird','oriole'].includes(source.tool)){
   const branch=target.instances[Math.floor(target.instances.length/2)].placement;
   for(const [i,v] of source.instances.entries()){v.placement.at=[branch.at[0]+(i-(source.instances.length-1)/2)*.055,branch.at[1]-.32*branch.scale];v.placement.scale=.37;}
   source.z=(target.z??10)+2;applied=true;
  }else if(['beside','outside'].includes(r.type)&&!['water','landscape'].includes(source.tool)&&!['water','landscape'].includes(target.tool)){
   const x=tx>.5?tx-.34:tx+.34;move(source,clamp(x,.16,.84),ty);applied=true;
  }else if(['behind','in_front_of'].includes(r.type)&&dimensions[source.tool]&&dimensions[target.tool]){
   const back=r.type==='behind';move(source,clamp(tx+(tx>.5?-.16:.16),.1,.9),clamp(ty+(back?-.12:.12),.53,.96));source.z=(target.z??10)+(back?-2:2);
   for(const v of source.instances)v.placement.scale=Math.min(v.placement.scale,back?.65:1);applied=true;
  }else if(r.type==='among'&&plants.has(target.tool)&&['moon','bird','oriole'].includes(source.tool)){
   const canopy=target.instances[Math.floor(target.instances.length/2)].placement;move(source,canopy.at[0],Math.max(.18,canopy.at[1]-.38*canopy.scale));applied=true;
  }else if(r.type==='reflects_on'&&target.tool==='water'&&source.tool==='moon'){
   source.reflection={target:target.entities[0],waterline:target.surface?.top??.46};applied=true;
  }
  if(applied){sync(source);r.visualized=true;r.reason='由通用场景约束组织；具体方向、距离与尺度属于本地构图';}
 }
}
function candidate(analysis,base,index){
 const result=structuredClone(base),{layers,scene,spatial}=result;
 const water=layers.find(l=>l.tool==='water'),ground=layers.find(l=>l.tool==='landscape'&&l.options.form==='ground'),field=layers.find(l=>l.tool==='landscape'&&l.options.form==='field');
 const landNeeded=layers.some(l=>grounded.has(l.tool)&&!(l.tool==='figure'&&l.attachment)||l.tool==='landscape'&&['shore','ground','field'].includes(l.options.form));
 const left=index!==1,flip=x=>left?x:1-x;
 const regions={};
 if(water){
  regions.water=landNeeded?[[flip(.38),.45],[flip(1.04),.45],[flip(1.04),1.04],[flip(.28),1.04],[flip(.47),.79],[flip(.35),.62]]:[[0,.45],[1,.45],[1,1.04],[0,1.04]];
  if(landNeeded)regions.land=[[flip(-.04),.48],[flip(.34),.48],[flip(.35),.62],[flip(.47),.79],[flip(.28),1.04],[flip(-.04),1.04]];
  water.clip=regions.water;water.surface={top:.45,bottom:1};water.instances[0].placement={anchor:[320,135],at:[.5,.45],scale:1.65};water.z=-10;
  if(scene.semanticSetting?.kind==='mountain_stream'){
   regions.water=[[.54,.45],[.66,.45],[.62,.64],[.76,.84],[1.04,1.04],[.72,1.04],[.43,.72],[.46,.59]];
   regions.land=[[0,.48],[.43,.48],[.40,.68],[.45,.81],[.60,1.04],[0,1.04]];water.clip=regions.water;
  }
 }else if(landNeeded)regions.land=[[0,.50],[1,.50],[1,1.04],[0,1.04]];
 if(analysis.schema_version==='3.3'){
  const world=worldLayout(analysis,layers,index,landNeeded);Object.assign(regions,{land:world.land,water:world.water});scene.organization.topology=world.name;
  if(water){water.clip=regions.water;water.surface.top=Math.min(...regions.water.map(p=>p[1]));}
 }
 if(ground){ground.clip=regions.land;if(/环池|池深/.test(scene.organization.topology||''))ground.clipRule='polygon';ground.options.edge='soft';ground.z=-18;ground.instances[0].placement={anchor:[320,265],at:[.5,.54],scale:2.5};}
 for(const l of layers.filter(l=>l.tool==='landscape'&&l.options.form==='shore')){l.clip=regions.land;l.options.edge='soft';}
 if(field&&regions.land){field.clip=regions.land;field.z=-12;}
 const plantLayers=layers.filter(l=>plants.has(l.tool)),subjectLayers=layers.filter(l=>subjects.has(l.tool)),offset=(analysis.poem.length%13)*.017;
 let plantIndex=0;
 for(const l of layers){
  const n=l.instances.length,node=physical(l),total=plantLayers.reduce((s,v)=>s+v.instances.length,0);
  for(const [i,v] of l.instances.entries()){
   const t=(i+.5)/n,u=frac((i+1)*.61803398875+offset+index*.073);
   if(plants.has(l.tool)){
    const global=(plantIndex+i+.5)/Math.max(1,total),far=global<.58;
    const cluster=analysis.schema_version==='3.3'?.055+u*.89:water?flip(.035+u*.27):scene.semanticSetting?.kind==='woodland'?.03+u*.94:global<.52?.04+u*.28:.73+u*.24;
    const y=far?.61+frac(global*1.7)*.15:.81+frac(global*1.3)*.18;
    v.placement.at=regions.land?pointIn(regions.land,cluster,y):[cluster,y];
    v.placement.scale=['grass','flower'].includes(l.tool)?(far?.21:.32)+u*.13:l.tool==='orchid'?(far?.30:.43)+u*.15:(far?.43:.67)+u*.23;
    v.opacity=far?.58+u*.20:.82+u*.18;v.depth=global;
    if(l.tool==='tree')v.placement.anchor=[320,388];
    l.z=plants.has(l.tool)&&['grass','flower','orchid'].includes(l.tool)?14:8;
   }else if(subjects.has(l.tool)){
    if(l.tool==='figure'&&l.attachment)continue;
    const slot=subjectLayers.indexOf(l),x=analysis.schema_version==='3.3'?.15+u*.70:l.tool==='boat'?(n>3?flip(.52+u*.41):(index===2?.72:.61)+((i%3)-1)*.09):water?flip(.10+t*.21):n>4?.07+u*.86:.43+(slot%2)*.22+(t-.5)*.22;
    const y=n>4?.61+t*.34:l.tool==='boat'?.72+(i%3)*.07:.73+slot*.065+(i%2)*.045;
    const region=l.tool==='boat'?regions.water:regions.land;
    v.placement.at=region?pointIn(region,x,Math.min(.94,y)):[x,y];
    v.placement.scale=n>4?Math.min(.38,1.4/Math.sqrt(n))*(.75+t*.25):l.tool==='figure'?.48:l.tool==='boat'?.72:n>1?.48+u*.13:.78;
    l.z=l.tool==='boat'?22:12;v.depth=t*.3;
   }else if(l.tool==='lotus'){
    const leaf=l.options.form==='leaf',x=n>4?.03+frac(u+(leaf?0:.31))*.94:clamp(.06+u*.88+(leaf?-.13:.10),.05,.95),y=(leaf?.62:.51)+t*.33;
    v.placement.at=regions.water?pointIn(regions.water,x,y):[x,y];v.placement.scale=.3+t*.66;l.z=leaf?18:19;v.depth=t;
   }else if(l.tool==='bird'||l.tool==='oriole'){
    const aquatic=l.options.pose==='waterbird',rest=l.options.pose==='resting';
    const x=aquatic?.53+u*.38:rest?flip(.09+u*.18):.20+t*.62;
    const y=aquatic?.66+frac(i*.38)*.22:rest?.79:.23+Math.sin(t*3.4+index)*.11;
    v.placement.at=aquatic&&regions.water?pointIn(regions.water,x,y):[x,y];v.placement.scale=aquatic?.44+t*.18:.36+t*.15;l.z=24;
   }else if(l.tool==='fish'&&regions.water){v.placement.at=pointIn(regions.water,.39+u*.53,.69+t*.24);v.placement.scale=.55;l.z=19;}
   else if(l.tool==='rock'&&regions.land){v.placement.at=pointIn(regions.land,flip(.1+u*.27),.77+t*.2);v.placement.scale=.43+u*.18;l.z=13;}
   else if(l.tool==='moon'){v.placement.at=[index===1?.29:.72,.22];v.placement.scale=.64;l.z=-5;}
   else if(l.tool==='landscape'&&l.options.form==='sun'){
    v.placement.anchor=[320,95];v.placement.at=[index===1?.35:.65,l.names.some(s=>/落日|夕阳|残阳|斜日|朝阳/.test(s))?.39:.23];v.placement.scale=.8;
   }
   else if(node==='terrain'&&l.options.form==='mountain'){v.placement.scale=Math.min(v.placement.scale,1.65);}
  }
  if(plants.has(l.tool))plantIndex+=n;sync(l);
 }
 scene.organization.regions=regions;scene.organization.layout=index;scene.organization.orientation=scene.organization.topology|| (water&&landNeeded?(left?'left-bank':'right-bank'):'open');
 applySemanticLayout(analysis,result,{pointIn,sync});
 applyRelations(analysis,layers,spatial,regions);
 // Reproject roots after relative moves; this may expose an unsatisfied relation
 // in the audit instead of silently treating impossible constraints as solved.
 for(const l of layers){
  if(l.tool==='figure'&&l.attachment){const b=layers.find(t=>t.entities.includes(l.attachment.target));if(b){const p=b.instances[0].placement;for(const v of l.instances){v.placement.at=[p.at[0]-.018,p.at[1]-.012];v.placement.scale=p.scale*.72;}}}
  if(grounded.has(l.tool)&&!l.attachment&&regions.land){for(const v of l.instances)v.placement.at=pointIn(regions.land,...v.placement.at);sync(l);}
 }
 attachSmoke(layers);
 return result;
}
function bounds(l,v){const [w,h]=dimensions[l.tool]||[.2,.2],s=v.placement.scale,[x,y]=v.placement.at,root=grounded.has(l.tool);return [x-w*s/2,y-h*s*(root?1:.5),x+w*s/2,y+h*s*(root?0:.5)];}
export function inspectOrganization(analysis,{layers,scene,spatial=[]}){
 const issues=[],add=(code,severity,message,layer)=>issues.push({code,severity,message,...(layer?{layer:layers.indexOf(layer)}:{})});
 const generic=scene.organization?.strategy==='general-constraints',regions=scene.organization?.regions||{},water=layers.find(l=>l.tool==='water');
 const ground=layers.find(l=>l.tool==='landscape'&&['ground','shore','field'].includes(l.options.form));
 if(generic&&!ground&&layers.some(l=>grounded.has(l.tool)&&!l.attachment))add('missing-ground','review','陆上主体缺少可画地表；保留原文的缺席或不确定状态');
 let overlaps=0,footprint=0,mass=0,moment=0;
 const silhouettes=[];
 for(const l of layers){
  if(l.inferred&&(l.entities.length||!l.provenance?.reason))add('support-provenance','error','环境依托缺少来源区分',l);
  if(l.quantity?.rendered!==undefined&&l.instances.length!==l.quantity.rendered)add('display-count','error','绘制单元数与构图记录不符',l);
  if(l.quantity?.exact){
   const items=l.quantity.items.filter(q=>!l.projectedEntities?.includes(q.entity));
   const expected=items.reduce((n,q)=>n+(q.scope==='group'&&['双','对'].includes(q.unit)?q.min*2:q.min),0);
   if(items.length&&items.every(q=>q.mode==='exact')&&expected!==l.instances.length)add('exact-count','error','明确数量与绘制个体数不符',l);
  }
  for(const id of l.entities){const e=analysis.entities.find(e=>e.id===id);if(!e||e.role!=='scene'||e.presence!=='present')add('presence','error','缺席、参照或未知实体进入画面',l);}
  for(const v of l.instances){
   const p=v.placement;if(!Array.isArray(p?.at)||p.at.length!==2||!p.at.every(Number.isFinite)||!Array.isArray(p.anchor)||p.anchor.length!==2||!p.anchor.every(Number.isFinite)||!Number.isFinite(p.scale)||p.scale<=0){add('finite','error','出现无效位置或尺度',l);continue;}
   if(generic&&dimensions[l.tool]&&(p.at[0]<-.03||p.at[0]>1.03||p.at[1]<.03||p.at[1]>1.05))add('offscreen-anchor','error','主体锚点落出可见区域',l);
   const attachment=v.attachment||l.attachment;
   if(attachment){const parent=layers.find(x=>x.entities.includes(attachment.target));if(!parent||attachment.instance&&!parent.instances.some(x=>x.id===attachment.instance))add('attachment-target','error','依附的具体对象未找到',l);}
   if(generic&&grounded.has(l.tool)&&!attachment&&regions.land&&!inRegion(p.at,regions.land))add('land-support','error','树根、建筑或人物没有落在地面区域',l);
   if(['boat','fish'].includes(l.tool)||l.tool==='bird'&&l.options.pose==='waterbird'){
    if(!water){if(generic)add('missing-water','review','水上主体缺少可用水域；未擅自覆盖原文的缺席信息',l);}
    else if(!inRegion(p.at,waterRegion(water,scene)))add('water-support','error','水上主体落在水域之外',l);
   }
   if(l.tool==='landscape'&&l.options.form==='waterfall'&&!layers.some(t=>t.tool==='landscape'&&t.options.form==='mountain'))add('missing-cliff','error','瀑布缺少山体依托',l);
   if(generic&&['willow','tree','dwelling','building'].includes(l.tool)&&p.scale>1.25)add('oversize','error','近景物尺度过大，挤压主体空间',l);
   if(dimensions[l.tool]){
    const box=bounds(l,v),a=(box[2]-box[0])*(box[3]-box[1]);footprint+=a;moment+=p.at[0]*a;mass+=a;silhouettes.push({l,box,area:a,attached:!!attachment});
   }
  }
  if(plants.has(l.tool)&&l.quantity?.collective&&l.instances.length>3){
   const xs=l.instances.map(v=>v.placement.at[0]),ys=l.instances.map(v=>v.placement.at[1]);
   if(Math.max(...xs)-Math.min(...xs)<.16&&Math.max(...ys)-Math.min(...ys)<.15)add('crowded-grove','review','群落挤在一个小点，尚未充分展开',l);
  }
 }
 // Approximate silhouette overlap is only a soft signal; forests need overlap.
 for(let i=0;i<silhouettes.length;i++)for(let j=i+1;j<silhouettes.length;j++){
  const a=silhouettes[i],b=silhouettes[j];if(a.l===b.l&&!subjects.has(a.l.tool)||plants.has(a.l.tool)&&plants.has(b.l.tool)||a.attached||b.attached)continue;
  const overlap=Math.max(0,Math.min(a.box[2],b.box[2])-Math.max(a.box[0],b.box[0]))*Math.max(0,Math.min(a.box[3],b.box[3])-Math.max(a.box[1],b.box[1]));
  overlaps+=overlap/Math.max(.001,Math.min(a.area,b.area));
 }
 for(const r of spatial){
  if(r.modality!=='asserted')continue;const s=layers.find(l=>l.entities.includes(r.source)),t=layers.find(l=>l.entities.includes(r.target));
  if(!s||!t||!r.visualized){add('unresolved-relation','review','有空间关系尚无对应布局画法');continue;}
  if(generic&&s!==t){
   if(['outside','beside'].includes(r.type)&&Math.abs(center(s)[0]-center(t)[0])<.12)add('relative-position','error','相邻或外侧关系仍挤在同一处',s);
   if(r.type==='behind'&&(s.z??0)>=(t.z??0)||r.type==='in_front_of'&&(s.z??0)<=(t.z??0))add('depth-order','error','前后遮挡次序与提取关系不一致',s);
  }
 }
 const present=analysis.entities.filter(e=>e.role==='scene'&&e.presence==='present');
 const represented=new Set(layers.flatMap(l=>l.entities)),parameters=present.filter(e=>e.kind==='environment'&&e.mentions.some(m=>m.includes('风')));
 const missing=present.filter(e=>!represented.has(e.id)&&!parameters.includes(e));
 if(missing.length)add('drawing-gaps','review',`还有 ${missing.length} 项已提取线索尚未转成画面：${missing.map(e=>e.mentions.join('／')).join('、')}`);
 const coverage={scope:'extracted-entities-only',present:present.length,mapped:present.filter(e=>represented.has(e.id)).length,parameters:parameters.map(e=>e.id),missing:missing.map(e=>({id:e.id,name:e.mentions.join('／')}))};
 const errors=issues.filter(i=>i.severity==='error').length,review=issues.filter(i=>i.severity==='review').length;
 const balance=mass?Math.abs(moment/mass-.5):0;
 const environmentArea=regions.land?polygonArea(regions.land):0;
 // No reward for simply filling blank space. Sparse subjects may need silence.
 return {scope:'implemented-geometry-and-drawing-gaps',coverage,checks:generic?['presence','count','finite','support','scale','relative-position','depth','grove-spread','drawing-gaps']:['presence','count','finite','water-support','cliff-support','grove-spread','drawing-gaps'],status:errors?'needs-repair':review?'needs-review':'checks-passed',errors,review,issues,metrics:{overlapPenalty:+overlaps.toFixed(3),balancePenalty:+balance.toFixed(3),motifFootprint:+footprint.toFixed(3),landArea:+environmentArea.toFixed(3)},cost:+(errors*1000+review*30+overlaps*12+balance*8).toFixed(3),aestheticAcceptance:'pending-user'};
}
export function repairOrganization(analysis,input,{maxPasses=2}={}){
 let plan=structuredClone(input),audit=inspectOrganization(analysis,plan);
 const history=[];
 for(let pass=0;pass<Math.min(2,maxPasses)&&audit.errors;pass++){
  const next=structuredClone(plan),water=next.layers.find(l=>l.tool==='water'),regions=next.scene.organization?.regions||{};
  const changed=[];
  for(const issue of audit.issues){
   const l=next.layers[issue.layer];if(!l||issue.severity!=='error')continue;
   if(!['land-support','water-support','oversize','offscreen-anchor'].includes(issue.code))continue;
   const before=l.instances.map(v=>structuredClone(v.placement));
   for(const v of l.instances){
    if(issue.code==='land-support'&&regions.land)v.placement.at=pointIn(regions.land,...v.placement.at);
    if(issue.code==='water-support'&&water)v.placement.at=pointIn(waterRegion(water,next.scene),...v.placement.at);
    if(issue.code==='oversize')v.placement.scale=Math.min(v.placement.scale,.95);
    if(issue.code==='offscreen-anchor')v.placement.at=[clamp(v.placement.at[0],.04,.96),clamp(v.placement.at[1],.08,.98)];
   }
   sync(l);changed.push({code:issue.code,layer:issue.layer,before,after:l.instances.map(v=>structuredClone(v.placement))});
  }
  if(!changed.length)break;
  const after=inspectOrganization(analysis,next),accepted=after.errors<audit.errors;
  history.push({pass:pass+1,beforeErrors:audit.errors,afterErrors:after.errors,accepted,changes:changed});
  if(!accepted)break;plan=next;audit=after;
 }
 plan.scene.organization.repairs.push(...history);plan.scene.organization.audit=audit;return plan;
}
export function organizeScene(analysis,arranged){
 const base=structuredClone(arranged),{layers,scene}=base;
 for(let i=layers.length-1;i>=0;i--){const l=layers[i],form=l.tool==='water'?'water':l.options.form;if(l.inferred&&supportVeto(analysis,form)){layers.splice(i,1);scene.notes.push('原文有缺席、参照或不确定的环境线索，未额外补画'+l.names.join('、'));}}
 applySemanticSupports(analysis,layers,scene,{addSupport:(form,reason)=>addSupport(layers,form,reason),veto:form=>supportVeto(analysis,form)});
 // Preserve established regional compositions as reusable proposals. They still
 // receive the same audit, but are not restyled just to improve a scalar score.
 const needsWater=layers.some(l=>['boat','fish','lotus'].includes(l.tool)||l.tool==='bird'&&l.options.pose==='waterbird'||l.tool==='landscape'&&l.options.form==='shore');
 const established=scene.basis==='local-context'&&!(needsWater&&!layers.some(l=>l.tool==='water')&&!waterVeto(analysis));
 const sceneLayers=layers.filter(l=>!l.inferred&&physical(l)!=='detail'&&physical(l)!=='atmosphere');
 const contextual=sceneLayers.length>=2||sceneLayers.some(l=>['tree','bamboo','willow'].includes(l.tool)&&l.quantity.collective)||analysis.schema_version==='3.3'&&sceneLayers.length>0;
 scene.organization={version:'1.0',strategy:established?'regional-proposal':contextual?'general-constraints':'isolated-study',regions:structuredClone(scene.regions||{}),candidates:[],repairs:[],limitations:['几何检查不判定诗意理解或审美合格','动作时序与整首诗的场景切换尚未编排']};
 if(!established&&contextual){
  if(layers.some(l=>grounded.has(l.tool)&&!l.attachment)&&!layers.some(l=>l.tool==='landscape'&&['ground','shore','field'].includes(l.options.form))&&!supportVeto(analysis,'ground'))addSupport(layers,'ground','生长物、房舍和陆上主体需要共同地表；这是本地构图依托');
  if(!layers.some(l=>l.tool==='water')&&needsWater&&!waterVeto(analysis))addSupport(layers,'water','舟、游鱼、水生植物或渡口水岸需要水域；水形和范围是本地选择');
  const proposals=[0,1,2].map(i=>repairOrganization(analysis,candidate(analysis,base,i)));
  for(const p of proposals){p.scene.organization.graph=graphFor(analysis,p.layers,p.scene);p.scene.organization.audit=inspectOrganization(analysis,p);}
  proposals.sort((a,b)=>compositionScore(a)-compositionScore(b)||a.scene.organization.layout-b.scene.organization.layout);
  const chosen=proposals[0];
  chosen.scene.organization.candidates=proposals.map(p=>({layout:p.scene.organization.layout,orientation:p.scene.organization.orientation,errors:p.scene.organization.audit.errors,cost:p.scene.organization.audit.cost,score:compositionScore(p),metrics:p.scene.organization.audit.metrics}));
  if(analysis.schema_version==='3.3'){
   chosen.compositions=proposals.filter(p=>!p.scene.organization.audit.errors).map(p=>({id:'space-'+p.scene.organization.layout,label:p.scene.organization.topology,description:'先安排连续水域与地表，再按主次与远近安放景物',layers:p.layers,scene:p.scene,spatial:p.spatial}));
   chosen.composition=chosen.compositions[0]?.id;
  }
  chosen.scene.organization.repairs.push(...chosen.layers.filter(l=>l.inferred&&!arranged.layers.some(old=>old.tool===l.tool&&old.options.form===l.options.form)).map(l=>({type:'support-added',reason:l.provenance.reason})));
  chosen.scene.notes.push('通用场景层先组织地面、水域、群落和主体，再比较三个布局的依托、相对位置、尺度与遮挡；检查通过不代表审美已通过。');
  return chosen;
 }
 if(established&&analysis.schema_version==='3.3'){
  const regions=scene.organization.regions,water=layers.find(l=>l.tool==='water');
  if(water&&!regions.water)regions.water=water.clip||waterRegion(water,scene);
  applySemanticLayout(analysis,base,{pointIn,sync});
  for(const l of layers.filter(l=>l.tool==='figure'&&l.attachment)){
   const parent=layers.find(p=>p.entities.includes(l.attachment.target));if(!parent)continue;
   const p=parent.instances[0].placement;for(const v of l.instances){v.placement.at=[p.at[0]-.018,p.at[1]-.012];v.placement.scale=p.scale*.72;}sync(l);
  }
 }
 attachSmoke(layers);scene.organization.graph=graphFor(analysis,layers,scene);scene.organization.audit=inspectOrganization(analysis,base);
 scene.organization.candidates=[{layout:'existing',errors:scene.organization.audit.errors,cost:scene.organization.audit.cost}];
 return base;
}
