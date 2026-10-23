// Local landscape grammar. No semantic entities/counts are inserted or removed.
import {inspectOrganization,inRegion} from './scene-organization.mjs';
const frac=x=>x-Math.floor(x),clamp=(x,a=.025,b=.975)=>Math.max(a,Math.min(b,x));
const plants=new Set(['tree','willow','bamboo','grass','flower','orchid']);
const families={
 'mountain-stream':'stream','wooded-creek':'stream',
 'forest-light':'forest','woodland-retreat':'forest','mixed-woodland':'forest',
 village:'village',settlement:'village','winter-fishing':'snow',
 'paddy-woodland':'field','field-river':'field'
};
const names={stream:['曲水穿林','溪向远山','近石留隙'],forest:['林隙返照','幽径深处','疏密相生'],village:['临水聚落','岸曲屋深','疏村远照'],snow:['远岸孤舟','阔江留白','近舟远山'],field:['田阔林深','林岸绕田','平畴远树']};
const descriptions={stream:'水路贯穿远近，树根落在两岸，溪石与水纹相接',forest:'前后树群错落，透光与苔意共用林间空隙',village:'房舍成组落地，烟意有源点，水岸承接聚落',snow:'舟与写意人影共用锚点，远岸和雪面保留空间',field:'田面连续展开，林带分远近，鸟群分布在田面和树冠'};
const sync=l=>{const n=l.instances.length;l.placement={...l.placement,at:l.instances.reduce((p,v)=>p.map((x,i)=>x+v.placement.at[i]/n),[0,0])};};
function place(l,fn,z){if(!l)return;for(const [i,v] of l.instances.entries()){const patch=fn(i,l.instances.length,v);Object.assign(v.placement,patch);if(patch.tier){v.tier=patch.tier;delete v.placement.tier;}}if(z!==undefined)l.z=z;sync(l);}
function track(points,y){for(let i=1;i<points.length;i++)if(y<=points[i][1]){const [x0,y0]=points[i-1],[x1,y1]=points[i];return x0+(x1-x0)*clamp((y-y0)/(y1-y0),0,1);}return points.at(-1)[0];}
const across=(points,x)=>track(points.map(([a,b])=>[b,a]),x);
function band(points,near=.17){const side=sign=>points.map(([x,y])=>[x+sign*(.035+(y-points[0][1])*near),y]);return [...side(-1),...side(1).reverse()];}
function role(l){
 if(l.tool==='landscape')return ['sun','glow','lightwash','stars'].includes(l.options.form)?'light':l.options.form==='mountain'?'mountain':l.options.form==='waterfall'?'water':['ground','shore','path','field'].includes(l.options.form)?'ground':l.options.form==='moss'?'vegetation':'atmosphere';
 return l.tool==='water'?'water':l.tool==='snow'?'snow':l.tool==='tree'&&l.options.form==='blossom'||['flower','plum-branch','flower-forms'].includes(l.tool)?'blossom':plants.has(l.tool)||l.tool==='lotus'?'vegetation':['dwelling','building','pavilion','boat'].includes(l.tool)?'architecture':['moon'].includes(l.tool)?'light':['cloud','mist','rain','catkins'].includes(l.tool)?'atmosphere':['bird','oriole','fish','horse','figure'].includes(l.tool)?'figure':l.tool==='rock'?'rock':'vegetation';
}
function style(plan){
 for(const [index,l] of plan.layers.entries()){
  const r=role(l);l.visual={role:r};
  const profile=l.tool==='water'?['continuous',.9,.9]:l.tool==='cloud'?['slow-drift',.28,.85]:l.tool==='mist'?['slow-drift',.38,.8]:plants.has(l.tool)||l.tool==='lotus'?['gust',.62,.65]:['bird','oriole'].includes(l.tool)?['passing',1.05,1.1]:l.tool==='snow'?['falling',.7,.65]:l.tool==='rain'?['falling',1,.8]:['steady',1,1];
  l.performance={rhythm:profile[0],rate:profile[1],amplitude:profile[2],phase:frac(index*.618)*Math.PI*2};
  for(const [i,v] of l.instances.entries()){
   const y=v.placement.at[1],tier=v.tier||l.semanticGroup?.depth;
   v.tone=['near','middle','far'].includes(tier)?tier:['mountain','atmosphere'].includes(r)?'far':y<.64?'far':y<.83?'middle':'near';
   // At most three source canvases per layer: tonal depth also selects a seeded
   // glyph variation. Counts, poses and source references stay unchanged.
   v.variant={far:0,middle:1,near:2}[v.tone];
   if(plants.has(l.tool)||['rock','dwelling','building'].includes(l.tool))v.depth={far:0,middle:10,near:20}[v.tone]+i*.01;
  }
 }
 plan.landscapeStyle={version:'1.0',color:'role-and-distance',motion:'layer-rhythms',aestheticAcceptance:'pending-user'};
 return plan;
}
function attachments(layers){
 const boat=layers.find(l=>l.tool==='boat'),house=layers.find(l=>['dwelling','building'].includes(l.tool));
 for(const l of layers){
  if(l.tool==='figure'&&l.attachment&&boat){const p=boat.instances[0].placement;place(l,()=>({at:[p.at[0]-.018,p.at[1]-.012],scale:p.scale*.72,tier:'near'}),(boat.z??20)+2);}
  if(l.tool==='mist'&&l.options.form==='plume'&&house){const p=house.instances[Math.floor(house.instances.length/2)].placement;place(l,()=>({anchor:[320,320],at:[p.at[0]+.02,p.at[1]-.19*p.scale],scale:.68,tier:'middle'}),(house.z??10)+21);l.attachment={target:house.entities[0],anchor:'roof',basis:'local-landscape'};}
  if(l.semanticSupport?.surface==='vegetation'&&l.semanticSupport.target&&['bird','oriole'].includes(l.tool)){
   const tree=layers.find(p=>p.entities.includes(l.semanticSupport.target));if(!tree)continue;
   place(l,(i)=>{const p=tree.instances[(i*3+Math.floor(tree.instances.length/2))%tree.instances.length].placement;return {at:[p.at[0]+(i%2?-.02:.025),p.at[1]-.34*p.scale],scale:.34+(i%2)*.055,tier:p.at[1]>.83?'near':'middle'};},38);
  }
 }
}
function composeFamily(analysis,base,family,variant){
 const p=structuredClone(base),ls=p.layers,get=(t,f)=>ls.find(l=>l.tool===t&&(!f||l.options.form===f)),water=get('water'),mountain=get('landscape','mountain'),ground=get('landscape','ground'),field=get('landscape','field'),moon=get('moon'),sun=get('landscape','sun');
 const trees=ls.filter(l=>plants.has(l.tool)),houses=ls.filter(l=>['dwelling','building','pavilion'].includes(l.tool)),zones={};
 p.scene.landscape={family,variant,label:names[family][variant],description:descriptions[family],basis:'local-artistic-choice'};
 if(family==='stream'&&water){
  const paths=[[[.60,.46],[.55,.62],[.68,.82],[.88,1.08]],[[.65,.44],[.61,.60],[.46,.81],[.23,1.08]],[[.33,.47],[.42,.65],[.50,.81],[.67,1.08]]],path=paths[variant];
  water.clip=band(path);water.surface={top:path[0][1],bottom:1};zones.water=water.clip;zones.corridor=path;
  place(water,()=>({anchor:[320,135],at:[.5,path[0][1]],scale:1.7}),-10);
  place(mountain,()=>({at:[variant===1?.58:.46,.35],scale:1.8,tier:'far'}),-32);
  place(ground,()=>({anchor:[320,265],at:[.5,.51],scale:2.6,tier:'middle'}),-18);
  for(const l of trees)place(l,(i,n)=>{
   const t=(i+.5)/n,y=.64+t*.35,edge=track(path,y),half=.035+(y-path[0][1])*.17,side=i%2?-1:1,u=frac(i*.618+.13),x=side<0?edge-half-.12-u*.17:edge+half+.12+u*.08;
   return {anchor:l.tool==='tree'?[320,388]:l.instances[i].placement.anchor,at:[clamp(x),y],scale:.56+t*.58+(variant===2&&i===n-1?.14:0),tier:t<.38?'far':t>.76?'near':'middle'};
  },8);
  place(get('rock'),(i,n)=>{const t=(i+.7)/(n+1),y=.67+t*.34,x=track(path,y)+(i%2?-.06:.075);return {at:[clamp(x),y],scale:.33+t*.42,tier:t>.6?'near':'middle'};},12);
  place(moon,()=>({at:[[.67,.20],[.78,.23],[.31,.21]][variant],scale:.58,tier:'far'}),-5);
 }
 if(family==='forest'){
  const opening=[.59,.36,.67][variant],wide=[.15,.13,.18][variant];zones.opening={x:opening,width:wide};
  place(ground,()=>({anchor:[320,265],at:[.5,.52],scale:2.6,tier:'middle'}),-18);
  for(const l of trees)place(l,(i,n)=>{
   const u=frac(i*.618+.17),t=(i+.5)/n,far=t<.42,near=t>.78,side=i%2?-1:1;
   const leftMax=opening-wide,rightMin=opening+wide,x=near?(side<0?.02+u*.12:.89+u*.1):side<0?.015+u*Math.max(.05,leftMax-.02):rightMin+u*(.99-rightMin);
   return {anchor:l.tool==='tree'?[320,388]:l.instances[i].placement.anchor,at:[clamp(x),far?.62+u*.12:near?.94+u*.05:.79+u*.15],scale:far?.67+u*.25:near?1.58+u*.30:1.02+u*.29,tier:far?'far':near?'near':'middle'};
  },8);
  place(get('landscape','lightwash'),()=>({anchor:[320,275],at:[opening,.80],scale:1.12,tier:'middle'}),22);
  place(get('landscape','moss'),()=>({anchor:[320,290],at:[opening,.89],scale:1.16,tier:'near'}),21);
  for(const l of houses)place(l,(i,n)=>({at:[opening+(i-(n-1)/2)*.09,.67+(i%2)*.04],scale:.45,tier:'far'}),6);
 }
 if(family==='village'){
  const shoreline=[[[0,.84],[.35,.89],[.64,.82],[1,.75]],[[0,.76],[.34,.83],[.72,.91],[1,.86]],[[0,.88],[.42,.78],[.75,.83],[1,.91]]][variant];zones.shoreline=shoreline;
  if(water){water.clip=[...shoreline,[1,1.08],[0,1.08]];water.surface={top:.72,bottom:1};zones.water=water.clip;place(water,()=>({anchor:[320,135],at:[.5,.72],scale:2}),-10);}
  place(ground,()=>({anchor:[320,265],at:[.5,.51],scale:2.6,tier:'middle'}),-18);
  for(const l of ls.filter(l=>l.tool==='landscape'&&l.options.form==='shore')){l.options.edge='soft';l.clip=[[0,.48],[1,.48],...shoreline.toReversed()];l.z=-16;}
  const center=[.55,.68,.34][variant];
  for(const l of houses)place(l,(i,n)=>{const u=frac(i*.618+.15),x=center+(i-(n-1)/2)*.12,y=.66+u*.10;return {at:[clamp(x),y],scale:.55+u*.22,tier:y<.7?'far':'middle'};},9);
  for(const l of trees)place(l,(i,n)=>{const u=frac(i*.618+.16),x=i%2?.03+u*.22:.79+u*.2,y=across(shoreline,x);return {anchor:l.tool==='tree'?[320,388]:l.instances[i].placement.anchor,at:[x,clamp(Math.min(.95,y-.04-u*.1),.58,.97)],scale:.58+u*.37,tier:i%3===0?'near':'middle'};},10);
  place(sun,()=>({anchor:[320,95],at:[[.73,.29],[.31,.32],[.64,.27]][variant],scale:.74,tier:'far'}),-25);
 }
 if(family==='snow'&&water){
  const h=[.48,.45,.50][variant];water.clip=[[0,h],[1,h],[1,1.08],[0,1.08]];water.surface={top:h,bottom:1};zones.water=water.clip;
  place(water,()=>({anchor:[320,135],at:[.5,h],scale:1.7}),-10);
  place(mountain,()=>({at:[[.47,.23],[.62,.26],[.30,.26]][variant],scale:1.75,tier:'far'}),-32);
  const spots=[[.65,.8],[.32,.71],[.72,.85]],spot=spots[variant];
  place(get('boat'),(i,n)=>({at:[clamp(spot[0]+(i-(n-1)/2)*.11),spot[1]+(i%2)*.03],scale:[.94,.76,1.02][variant],tier:variant===1?'middle':'near'}),22);
  if(mountain)for(const v of mountain.instances)v.opacity=Math.min(v.opacity??1,.36);
  const snow=get('snow');if(snow)snow.z=48;
 }
 if(family==='field'&&field){
  const polygons=[[[0,.47],[.77,.47],[.88,.67],[.82,1.08],[0,1.08]],[[.23,.46],[1,.46],[1,1.08],[.10,1.08],[.17,.71]],[[0,.56],[1,.56],[1,1.08],[0,1.08]]];
  field.clip=polygons[variant];zones.field=field.clip;place(field,()=>({anchor:[320,152],at:[.5,variant===2?.56:.47],scale:1.85,tier:'middle'}),-12);
  for(const l of trees)place(l,(i,n)=>{
   const split=Math.ceil(n*.74),far=i<split,t=far?(i+.4)/split:(i-split+.5)/Math.max(1,n-split),u=frac(i*.618+.2),x=far?(variant===1?.27+t*.7:.02+t*.73):variant===1?.025+u*.12:.87+u*.11,y=far?(variant===2?.57:.51)+Math.sin(i*1.7)*.024:.77+t*.22;
   return {anchor:l.tool==='tree'?[320,388]:l.instances[i].placement.anchor,at:[x,y],scale:far?.39+u*.20:.80+t*.33,tier:far?'far':'near'};
  },8);
  for(const l of ls.filter(l=>l.tool==='bird'))place(l,(i,n)=>({at:[variant===1?.32+(i+.5)/n*.54:.12+(i+.5)/n*.54,.59+Math.sin(i*1.9+variant)*.10],scale:.52+(i%3)*.06,tier:'middle'}),32);
  if(water){water.clip=band([[.74,.46],[.69,.65],[.9,1.08]],.10);water.surface={top:.46,bottom:1};zones.water=water.clip;}
 }
 attachments(ls);
 for(const r of p.spatial){
  if(r.modality!=='asserted')continue;const source=ls.find(l=>l.entities.includes(r.source)),target=ls.find(l=>l.entities.includes(r.target));if(!source||!target)continue;
  if(r.type==='on'&&source.attachment?.target===r.target){r.visualized=true;r.reason='使用本地屋顶或舟身锚点承接依附关系；并非物理模拟';}
  if(['among','on'].includes(r.type)&&source.semanticSupport?.target===r.target&&plants.has(target.tool)&&['bird','oriole'].includes(source.tool)){r.visualized=true;r.reason='鸟意分布在已有树冠附近，不作精细爪枝贴合';}
  if(r.type==='on'&&source.tool==='bird'&&target.options.form==='field'&&source.instances.every(v=>inRegion(v.placement.at,target.clip))){r.visualized=true;r.reason='鸟意安排在田面上方；飞鸟不因此改为落地站姿';}
 }
 for(const l of ls){
  if(l.tool==='landscape'&&l.options.form==='ground')l.options.edge='soft';
  if(l.reflection)l.reflection.waterline=water?.surface?.top??l.reflection.waterline;
  for(const v of l.instances){
   v.placement.at=v.placement.at.map(x=>clamp(x,.015,.99));
   if(plants.has(l.tool)||['dwelling','building','bird','oriole'].includes(l.tool)){
    const visible=['hazy','dark'].includes(analysis.scene.atmosphere.visibility)?.86:1,emphasis=l.semanticGroup?.role==='accent'?.86:1,groupFar=l.semanticGroup?.depth==='far'?.82:1;
    v.opacity=({far:.63,middle:.84,near:.98}[v.tier]??.84)*visible*emphasis*groupFar;
    v.placement.scale*=(l.semanticGroup?.depth==='far'?.82:l.semanticGroup?.depth==='near'?1.08:1)*(l.semanticGroup?.role==='accent'?.9:l.semanticGroup?.role==='subject'?1.06:1);
   }
  }
  sync(l);
 }
 p.scene.landscape.zones=zones;
 // Recompute supported checks instead of reusing the old layout's result.
 p.scene.organization.regions={...p.scene.organization.regions,...(water?{water:water.clip}:{})};
 p.scene.organization.audit=inspectOrganization(analysis,p);
 p.scene.landscape.audit=inspectLandscape(analysis,p);
 return style(p);
}
export function inspectLandscape(analysis,plan){
 const issues=[],water=plan.layers.find(l=>l.tool==='water');
 const add=(code,detail)=>issues.push({code,detail});
 for(const l of plan.layers){
  if(l.quantity.rendered!==l.instances.length)add('count','显示数量改变');
  for(const id of l.entities){const e=analysis.entities.find(e=>e.id===id);if(!e||e.presence!=='present'||e.role!=='scene')add('presence','不在场实体进入画面');}
  if(l.inferred&&(l.entities.length||!l.provenance?.reason))add('provenance','推断背景缺少来源区分');
  for(const v of l.instances){const p=v.placement;if(!p.at.every(Number.isFinite)||!Number.isFinite(p.scale)||p.scale<=0)add('finite','无效位置或尺度');
   if(['boat','fish','lotus'].includes(l.tool)||l.tool==='bird'&&l.options.pose==='waterbird')if(water&&!inRegion(p.at,water.clip))add('water','水上主体离开水域');
  }
 }
 for(const l of plan.layers.filter(l=>l.attachment&&l.tool==='figure')){const boat=plan.layers.find(p=>p.entities.includes(l.attachment.target));if(boat){const a=l.instances[0].placement.at,b=boat.instances[0].placement.at;if(Math.hypot(a[0]-b[0],a[1]-b[1])>.06)add('attachment','人物离开船体锚点');}}
 return {scope:'implemented-landscape-constraints',errors:issues.length,issues,aestheticAcceptance:'pending-user'};
}
export function developLandscape(analysis,input){
 if(analysis.schema_version!=='3.3')return input;
 const family=families[input.scene.kind];
 if(!family)return style(input);
 const variants=[0,1,2].map(i=>composeFamily(analysis,input,family,i));
 const usable=variants.filter(p=>!p.scene.landscape.audit.errors&&!p.scene.organization.audit.errors);
 const candidates=variants.map(p=>({label:p.scene.landscape.label,variant:p.scene.landscape.variant,errors:p.scene.landscape.audit.errors+p.scene.organization.audit.errors,issues:[...p.scene.landscape.audit.issues,...p.scene.organization.audit.issues.filter(i=>i.severity==='error')]}));
 if(!usable.length){input.notes.push('风景构图候选未通过已实现约束，保留原有布局');const kept=style(input);kept.landscapeStyle.candidates=candidates;return kept;}
 const chosen=usable[0];
 chosen.landscapeStyle.candidates=candidates;
 chosen.compositions=usable.map(p=>({id:family+'-'+p.scene.landscape.variant,label:p.scene.landscape.label,description:p.scene.landscape.description,layers:p.layers,scene:p.scene,spatial:p.spatial}));
 chosen.composition=chosen.compositions[0].id;
 chosen.notes.push('本地构图候选使用同一份语义；显示数量、原文实体与依据不变。未通过约束的候选保留检查记录；默认第一份可用布局，不把检查结果当作审美排名。');
 return chosen;
}
