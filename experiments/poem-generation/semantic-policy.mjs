// Semantic enums enter here; every numeric/artistic choice stays code-owned.
// No reading-text parsing, model coordinates, executable code or hidden calls.
const plants=new Set(['tree','willow','bamboo','grass','flower','orchid']);
const rooted=new Set([...plants,'dwelling','building','pavilion','horse','figure','rock']);
const terrain=l=>l.tool==='water'||l.tool==='landscape'&&['mountain','ground','shore','field','sky','stars'].includes(l.options.form);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rate={slow:.35,normal:.8,fast:1.35};
const energyRate={low:.45,medium:.8,high:1.2,unclear:.8};
const active=a=>a.schema_version==='3.3'&&a.scene;
const record=(l,path,consumer,effect,status='applied')=>{l.semanticEffects??=[];l.semanticEffects.push({path,consumer,effect,status});};
export function semanticGroupKey(analysis,entity){return active(analysis)?analysis.scene.groups.findIndex(g=>g.members.includes(entity.id)):-1;}
export function prepareSemanticLayers(analysis,layers){
 if(!active(analysis))return;
 for(const l of layers){
  const index=analysis.scene.groups.findIndex(g=>g.members.some(id=>l.entities.includes(id)));
  if(index>=0)l.semanticGroup={...structuredClone(analysis.scene.groups[index]),index};
  l.semanticEffects=[];
  l.semanticEnergy=Boolean(l.animate);
  if(l.animate)l.timeScale=energyRate[analysis.atmosphere.energy]??.8;
  const action=analysis.scene.actions.find(a=>l.entities.includes(a.entity));if(!action)continue;
  l.semanticAction=structuredClone(action);const path='scene.actions['+analysis.scene.actions.indexOf(action)+']';
  if(action.modality!=='asserted'){
   l.animate=false;l.timeScale=0;l.semanticEnergy=false;
   if(l.tool==='bird')l.options.pose='resting';if(l.tool==='oriole')Object.assign(l.options,{pose:'folded',motion:'still'});
   if(action.modality==='negated'){
    l.animate=false;if(l.tool==='bird')l.options.pose='resting';if(l.tool==='oriole')Object.assign(l.options,{pose:'folded',motion:'still'});
    record(l,path+'.state','形态与绘画时钟','否定动作保持静止，未执行该动作');
   }else record(l,path+'.state','动作边界','可能、假设或未明动作不执行','skipped');
   continue;
  }
  const state=action.state;
  if(state==='unclear'){l.animate=false;l.timeScale=0;l.semanticEnergy=false;record(l,path+'.state','动作边界','动作未明，保留静态形态','skipped');continue;}
  const supported=state==='still'||state==='fly'&&['bird','oriole'].includes(l.tool)||state==='flow'&&(l.tool==='water'||l.options.form==='waterfall')||state==='float'&&['boat','bird','lotus','fish'].includes(l.tool)||state==='sway'&&[...plants,'plum-branch','lotus'].includes(l.tool)||state==='fall'&&['falling-petals','leaves','rain','snow','catkins'].includes(l.tool)||state==='rise'&&l.tool==='mist';
  if(!supported){l.animate=false;l.timeScale=0;l.semanticEnergy=false;record(l,path+'.state','动作画法',state==='walk'?'行走步态尚无画法，保持原有静态形态':'当前工具尚无对应动作状态','unsupported');continue;}
  if(state==='still'){
   l.animate=false;l.timeScale=0;l.semanticEnergy=false;
   if(l.tool==='bird')l.options.pose='resting';
   if(l.tool==='oriole')Object.assign(l.options,{pose:'folded',motion:'still'});
  }else{
   l.animate=true;l.timeScale=rate[action.pace]??energyRate[analysis.atmosphere.energy]??.8;
   l.semanticEnergy=!Object.hasOwn(rate,action.pace);
   if(state==='fly'){
    if(l.tool==='bird')l.options.pose='flying';else Object.assign(l.options,{pose:'spread',motion:'flap'});
   }
   if(state==='float'&&l.tool==='bird')l.options.pose='waterbird';
   if(state==='rise'&&l.tool==='mist')l.options.form='plume';
   // Bounded viewing motions. No literal left/right is inferred from 来/去.
   if(['fly','float'].includes(state))l.motion={kind:['approach','recede'].includes(action.direction)?'depth':'drift',direction:['up','down'].includes(action.direction)?'unspecified':action.direction,rate:l.timeScale,state};
  }
  record(l,path+'.state','形态与绘画时钟',state==='still'?'静止姿态并停止该图层时钟':'启用工具支持的 '+state+' 状态');
  if(state!=='still')record(l,path+'.pace','绘画时钟',`定性节奏映射为语义基准时钟倍率 ${l.timeScale}；观看动态与景物节奏另行调节`);
  if(l.motion)record(l,path+'.direction','画布合成',['up','down'].includes(action.direction)?'该工具尚无向上／向下位移，只保留本地微动':action.direction==='unspecified'?'方向未明，仅用本地小幅微动':'按定性方向作有限观看动画；不表示完整动作过程',['up','down'].includes(action.direction)?'unsupported':'applied');
  else if(state==='rise'&&action.direction==='up'||state==='fall'&&action.direction==='down')record(l,path+'.direction','工具原生运动','使用原生向上／向下运动，不平移依托锚点');
 }
}

export function semanticSupportRequests(analysis){
 if(!active(analysis))return [];
 const requests=analysis.scene.supports.map((s,i)=>({...s,path:'scene.supports['+i+']',reason:'模型解释的必要依托，依据：'+s.evidence.join('／')}));
 const setting=analysis.scene.setting;
 const surfaces={mountain_stream:['mountain','water','ground'],waterside:['water'],woodland:['ground'],settlement:['ground'],field:['ground'],open_land:['ground']}[setting.kind]||[];
 for(const surface of surfaces)if(!requests.some(s=>s.surface===surface))requests.push({entity:null,target:null,surface,basis:setting.basis,evidence:setting.evidence,path:'scene.setting',reason:'整体场景解释为 '+setting.kind+'，本地补充必要 '+surface+' 依托'});
 return requests;
}
export function applySemanticSupports(analysis,layers,scene,{addSupport,veto}){
 if(!active(analysis))return;
 scene.semanticSetting=structuredClone(analysis.scene.setting);scene.semanticEffects=[];
 const matches=(l,s)=>s==='water'?l.tool==='water'||l.tool==='landscape'&&l.options.form==='field':s==='ground'?l.tool==='rock'||l.tool==='landscape'&&['ground','shore','field'].includes(l.options.form):s==='mountain'?l.tool==='landscape'&&l.options.form==='mountain':s==='boat'?l.tool==='boat':plants.has(l.tool);
 for(const request of semanticSupportRequests(analysis)){
  const source=request.entity&&layers.find(l=>l.entities.includes(request.entity));
  let target=request.target?layers.find(l=>l.entities.includes(request.target)):layers.find(l=>matches(l,request.surface));
  const write=(status,effect)=>scene.semanticEffects.push({path:request.path,consumer:'场景依托',status,effect});
  if(request.entity&&!source){write('unsupported','依托主体尚无可绘制形态');continue;}
  if(source&&request.surface==='ground'&&(source.tool==='moon'||source.tool==='landscape'&&source.options.form==='sun')){write('unsupported','光源不作地面上的实体，未执行该依托判断');continue;}
  if(source&&request.surface==='ground'&&source.tool==='mist'){
   const house=layers.find(l=>['dwelling','building'].includes(l.tool));
   write(house?'partial':'unsupported',house?'烟与已有屋舍建立屋顶锚点；未把烟当作落地实体':'烟的地面依托尚无对应锚点');continue;
  }
  if(request.target&&(!target||!matches(target,request.surface))){write('unsupported','承托对象的现有画法不匹配该依托');continue;}
  if(veto(request.surface)){write('skipped','原文缺席、参照或不确定的环境优先，未补依托');continue;}
  if(!target&&['water','ground','mountain'].includes(request.surface)&&layers.some(l=>l.entities.length)){
   target=addSupport(request.surface,request.reason);
   target.provenance.semanticPath=request.path;
  }
  if(!target){write('unsupported','尚无必要承托画法；未凭空补植物或船');continue;}
  if(source&&request.surface==='water'&&!['boat','fish','lotus','bird'].includes(source.tool)){write('unsupported','该主体尚无水上姿态，未凭空添加船只');continue;}
  if(source){
   source.semanticSupport={surface:request.surface,target:target.entities[0]||null,path:request.path};
   if(request.surface==='boat'&&source.tool==='figure')source.attachment={target:target.entities[0],anchor:'deck',basis:'semantic-'+request.basis};
  }
  if(source?.tool==='water'&&target.tool==='rock'){write('partial','溪水与石共用空间依托；尚未模拟水流越过石面的流体形变');continue;}
  write('applied',target.inferred?'必要环境以独立推断背景表示，不新增原文实体':'使用已提取主体的现有承托画法');
 }
}

export function applySemanticLayout(analysis,result,{pointIn,sync}){
 if(!active(analysis))return;
 const regions=result.scene.organization.regions,water=result.layers.find(l=>l.tool==='water');
 const openness=analysis.atmosphere.openness;
 for(const l of result.layers){
  const g=l.semanticGroup;if(!g)continue;
  const path='scene.groups['+g.index+']',n=l.instances.length;
  const average=l.instances.reduce((p,v)=>[p[0]+v.placement.at[0]/n,p[1]+v.placement.at[1]/n],[0,0]);
  const surface=l.semanticSupport?.surface;
  const aquatic=surface==='water'||['boat','fish','lotus'].includes(l.tool)||l.tool==='bird'&&l.options.pose==='waterbird';
  const region=aquatic?water?.clip||regions.water:rooted.has(l.tool)?regions.land:null;
  const multiple=n>1;
  for(const [i,v] of l.instances.entries()){
   const p=v.placement,t=(i+.5)/n;
   if(!terrain(l)){
    const prominence=g.role==='subject'?1.12:g.role==='accent'?.76:1;
    p.scale*=prominence;v.opacity=(v.opacity??1)*(g.role==='accent'?.78:1);
    if(g.depth!=='unspecified'){
     const shift=g.depth==='far'?-.11:g.depth==='near'?.08:0;
     if(rooted.has(l.tool)||aquatic)p.at[1]=clamp(p.at[1]+shift,.55,1);
     p.scale*=g.depth==='far'?.65:g.depth==='near'?1.13:.9;
     v.opacity*=g.depth==='far'?.60:g.depth==='middle'?.84:1;
    }
    if(multiple){
     const factor=['cluster','flock'].includes(g.pattern)?.64:['grove','field','scattered'].includes(g.pattern)?1.15:1;
     p.at[0]=average[0]+(p.at[0]-average[0])*factor*(openness==='high'?1.08:openness==='low'?.85:1);
     if(g.pattern==='cluster')p.at[1]=average[1]+(p.at[1]-average[1])*.72;
    }
    p.at=[clamp(p.at[0],.035,.965),clamp(p.at[1],.08,1)];
    p.scale=Math.min(p.scale,['tree','willow','dwelling','building'].includes(l.tool)?1.22:2);
    if(region)p.at=pointIn(region,...p.at);
   }else if(g.depth==='far'&&l.options.form==='mountain')v.opacity=(v.opacity??1)*.6;
   v.depth=(g.depth==='far'?-.25:g.depth==='near'?.25:0)+t*.1;
  }
  sync(l);
  record(l,path+'.role','主次布局',terrain(l)?'保留环境画布范围，主次不改变地形边界':g.role==='subject'?'主体相对突出':g.role==='accent'?'点景缩小淡化':'保留环境群落层次');
  record(l,path+'.pattern','群落布局',g.pattern==='unspecified'?'群落形式未明，保持本地默认':'按 '+g.pattern+' 组织显示单元；不覆盖明确数量',g.pattern==='unspecified'?'skipped':'applied');
  record(l,path+'.depth','远近布局',g.depth==='unspecified'?'远近未明，保持本地默认':'将 '+g.depth+' 转为相对大小、透明度与允许区域内的落点',g.depth==='unspecified'?'skipped':'applied');
 }
 for(const l of result.layers){
  const support=l.semanticSupport;if(!support)continue;
  if(support.surface==='water'&&l.tool==='bird'&&l.semanticAction?.state!=='fly')l.options.pose='waterbird';
  if(support.surface==='vegetation'&&support.target&&['bird','oriole'].includes(l.tool)){
   const parent=result.layers.find(p=>p.entities.includes(support.target));if(!parent)continue;
   const anchor=parent.instances[Math.floor(parent.instances.length/2)].placement;
   for(const [i,v] of l.instances.entries())v.placement.at=[anchor.at[0]+(i-(l.instances.length-1)/2)*.045,anchor.at[1]-.32*anchor.scale];
   l.z=(parent.z??10)+2;sync(l);
  }
 }
}

export function finishSemanticPlan(analysis,plan){
 if(!active(analysis))return plan;
 const items=[],s=analysis.scene;
 const add=(path,status,consumer,effect,claim)=>items.push({path,status,consumer,effect,...(claim?{basis:claim.basis,evidence:claim.evidence}: {})});
 const effects=[...(plan.scene.semanticEffects||[]),...plan.layers.flatMap(l=>l.semanticEffects||[])];
 function field(path,claim,otherwise='skipped',reason='没有可绘制对象或该项未确定'){
  const found=effects.filter(e=>e.path===path);
  if(!found.length){add(path,otherwise,'本地视觉策略',reason,claim);return;}
  const status=found.every(e=>e.status==='applied')?'applied':found.some(e=>e.status==='applied')?'partial':found[0].status;
  add(path,status,[...new Set(found.map(e=>e.consumer))].join('、'),[...new Set(found.map(e=>e.effect))].join('；'),claim);
 }
 field('scene.setting',s.setting,s.setting.kind==='unclear'?'skipped':'applied',s.setting.kind==='unclear'?'整体环境未明':'整体环境进入场景提案选择');
 s.groups.forEach((g,i)=>{for(const k of ['role','pattern','depth'])field('scene.groups['+i+'].'+k,g,'unsupported','分组成员目前缺少基础画法');});
 s.supports.forEach((c,i)=>field('scene.supports['+i+']',c,'unsupported','依托尚未应用'));
 s.actions.forEach((a,i)=>{for(const k of ['state','pace','direction'])field('scene.actions['+i+'].'+k,a,'skipped',k==='state'?'主体无画法':a.modality!=='asserted'?'非确定动作不执行':a.state==='still'?'静止状态不推进时钟或位置':'该工具尚不支持此动作分量');});
 const light=s.atmosphere.illumination,visibility=s.atmosphere.visibility;
 plan.settings.motion=1.4;
 const windAbsent=analysis.entities.some(e=>e.presence==='absent'&&e.mentions.some(m=>m.includes('风')));
 if(!windAbsent)plan.settings.wind=Math.max(plan.settings.wind,.3);
 for(const l of plan.layers)if(l.inferred&&l.tool==='water')l.animate=true;
 if(!windAbsent&&s.actions.some(a=>a.modality==='asserted'&&a.state==='sway'))plan.settings.wind=Math.max(plan.settings.wind,.25);
 const palette=light==='night'?'night':light==='twilight'?'twilight':analysis.atmosphere.valence==='positive'?'tender':'clear';
 plan.settings.palette=palette;
 plan.settings.density={high:.35,medium:.45,low:.6,unclear:.45}[analysis.atmosphere.openness]??.45;
 if(visibility==='hazy'||visibility==='dark')for(const l of plan.layers){
  if(l.tool==='moon'||l.options.form==='sun'||l.options.form==='glow')continue;
  const distant=l.semanticGroup?.depth==='far';for(const v of l.instances)v.opacity=(v.opacity??1)*(distant?.62:.84);
 }
 add('scene.atmosphere.visibility',visibility==='unclear'?'skipped':'applied','画布色层与远景','可见度 '+visibility+'；迷蒙或昏暗时淡化非光源图层',s.atmosphere);
 add('scene.atmosphere.illumination',light==='unclear'?'skipped':'applied','有限配色','照明 '+light+' 映射为本地 '+palette+' 配色；用户仍可手动覆盖',s.atmosphere);
 add('atmosphere.energy',plan.layers.some(l=>l.semanticEnergy)?'applied':'skipped','绘画时钟','没有明确动作节奏时，气息强弱控制已有微动的默认时钟');
 add('atmosphere.openness',plan.layers.length?'applied':'skipped','群落分布与笔触密度','开阔度转换为本地间距与工具笔触密度，不等于原文数量');
 add('atmosphere.valence',['night','twilight'].includes(light)?'skipped':'applied','有限配色',['night','twilight'].includes(light)?'照明策略优先，本次不另套情绪配色':'正向感受暂用 tender，其余用 clear；尚非完整情感色谱');
 add('time.markers','retained','原始记录与解读','保留原文时间标记；本版照明由 scene.atmosphere 转换，多阶段时间逻辑未执行');
 plan.semanticConsumption={version:'3.3',items,summary:{applied:items.filter(i=>i.status==='applied').length,partial:items.filter(i=>i.status==='partial').length,unsupported:items.filter(i=>i.status==='unsupported').length,skipped:items.filter(i=>i.status==='skipped').length,retained:items.filter(i=>i.status==='retained').length},aestheticAcceptance:'pending-user'};
 const unsupported=items.filter(i=>i.status==='unsupported'||i.status==='partial');
 for(const item of unsupported)plan.notes.push('语义保留：'+item.path+'，'+item.effect);
 plan.notes.push('整体场景、主次、远近、依托和支持的动作状态来自本次模型解释；具体布局、颜色和时钟倍率由本地视觉策略选择。');
 plan.notes.push('动作动画表现受支持的主导状态与有限观看运动；先后事件与完整因果尚未编排。');
 plan.notes.push('动态程度与默认轻风是可调整的观看选择；不改变数量、主次或原文动作判断。人物保持点景写意，不新增人物步态。');
 return plan;
}
