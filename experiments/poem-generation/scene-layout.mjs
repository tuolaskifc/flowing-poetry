// Code-owned composition. Shared ground, water planes and relative placements
// are artistic choices; only supplied spatial statements are model semantics.
const clamp=(n,a=.08,b=.92)=>Math.max(a,Math.min(b,n));
export function arrangeScene(analysis,layers){
  const notes=[],water=layers.find(l=>l.tool==='water'),trees=layers.filter(l=>l.tool==='tree'),land=layers.filter(l=>l.tool==='landscape');
  const scene={kind:water?'waterside':trees.length?'woodland':land.length?'landscape':'study',notes,waterline:water?.46:null};
  const move=(layer,x,y,scale=1)=>{const [ox,oy]=layer.placement.at;for(const inst of layer.instances){inst.placement.at=[inst.placement.at[0]+x-ox,inst.placement.at[1]+y-oy];inst.placement.scale*=scale;}layer.placement={...layer.placement,at:[x,y]};};
  const center=l=>l.instances.length===1?l.instances[0].placement.at:l.placement.at;
  const groupWidth=(layer,x,width)=>{const xs=layer.instances.map(v=>v.placement.at[0]),lo=Math.min(...xs),hi=Math.max(...xs);for(const v of layer.instances)v.placement.at[0]=hi===lo?x:x-width/2+(v.placement.at[0]-lo)/(hi-lo)*width;};
  for(const layer of layers){
    if(layer.tool==='landscape'){
      const f=layer.options.form;layer.animate=f==='waterfall';layer.instances[0].placement={anchor:[320,194],at:[.5,f==='mountain'?.4:['sky','stars','sun'].includes(f)?.5:.57],scale:1.6};
      layer.z=f==='sky'?-45:f==='stars'||f==='sun'?-40:f==='mountain'?-30:water?5:-20;
      if(f==='glow'){const boat=layers.find(l=>l.tool==='boat');layer.instances[0].placement={anchor:[320,210],at:boat?[.62,.72]:[.7,.6],scale:1.2};layer.z=30;}
    }
    if(layer.tool==='dwelling'){move(layer,.66,.73,1.1);layer.z=5;layer.grounding=true;notes.push('房舍下方的淡墨承托是本地构图，不把它当作诗句额外明说的地面或投影。');}
    if(layer.tool==='horse')layer.grounding=true;
    if(layer.tool==='bird'){layer.z=25;if(layer.options.pose==='waterbird'){const surface=water||land.some(l=>l.options.form==='field');for(const v of layer.instances){v.placement.at[1]=surface?.68+(v.depth||0)*.15:.76;}notes.push('水鸟以通用轮廓概括，水域或田面中的分布是本地构图选择。');}
      if(land.some(l=>l.options.form==='field')&&layer.options.pose==='flying'){for(const [i,v] of layer.instances.entries()){const t=(i+.5)/layer.instances.length;v.placement.at=[layer.options.tone==='light'?.12+t*.5:.70+t*.22,layer.options.tone==='light'?.20+Math.sin(t*5)*.06:.34+Math.sin(t*5)*.07];}}
    }
    if(layer.tool==='water'){
      layer.z=-10;layer.surface={top:.46,bottom:1};
      layer.instances[0].placement={anchor:[320,135],at:[.5,.46],scale:1.6};
      notes.push('水面以连续色层和水纹构成空间；水面的范围、视点与水平线是本地构图选择，不自动增加岸或陆地。');
    }
    if(layer.tool==='tree'){
      layer.z=8;
      if(layer.instances.length===1)move(layer,.18,.98,1.25);
      else if(water){for(const [i,v] of layer.instances.entries()){v.placement.at[0]=i%2?.84+(i%3)*.045:.04+(i%4)*.055;v.placement.at[1]=.67+(i/layer.instances.length)*.3;v.placement.scale*=.82;}}
      else if(land.some(l=>l.options.form==='field')){for(const [i,v] of layer.instances.entries()){const t=(i+.5)/layer.instances.length;v.placement.at=[.76+((i*.618)%1)*.36,.64+t*.33];v.placement.scale=.42+t*.8;}}
    }
    if(water&&['boat','fish'].includes(layer.tool)){
      move(layer,layer.tool==='boat'?.62:.48,layer.tool==='boat'?.76:.85,.95);
      notes.push(`${layer.names.join('、')}与水同场时先按水面区域组织；此项是本地试画安排，不宣称已识别承载关系。`);
    }
    if(water&&layer.tool==='willow')move(layer,.07,.92,.92);
    if(water&&layer.tool==='rock')move(layer,.23,.91,1.13);
  }
  const spatial=(analysis.spatial||[]).map(r=>{
    const source=layers.find(l=>l.entities.includes(r.source)),target=layers.find(l=>l.entities.includes(r.target));
    const view={...r,visualized:false,reason:''};
    if(r.modality!=='asserted'){view.reason='非确定关系仅保留解读';return view;}
    if(!source||!target||source===target){view.reason='关系的一端缺少独立画法';return view;}
    const [tx,ty]=center(target);
    if(r.type==='on'&&target.tool==='water'&&['boat','fish','bird'].includes(source.tool)){
      move(source,clamp(center(source)[0]),source.tool==='boat'?.76:source.tool==='bird'?.72:.85);source.z=26;view.visualized=true;view.reason='在水面区域定位，尚非物理承载';
    }else if(r.type==='on'&&['tree','willow','bamboo'].includes(target.tool)&&['bird','oriole'].includes(source.tool)){
      const branch=target.instances[Math.floor(target.instances.length/2)].placement;move(source,clamp(branch.at[0]),clamp(branch.at[1]-.4*branch.scale,.18,.6));groupWidth(source,clamp(branch.at[0]),.17);source.z=(target.z??10)+1;view.visualized=true;view.reason='在树冠或枝叶区域停鸟试画，不作精确爪枝贴合';
    }else if(['behind','in_front_of'].includes(r.type)&&!['water','landscape'].includes(source.tool)){
      const back=r.type==='behind';source.z=(target.z??10)+(back?-1:1);move(source,clamp(center(source)[0]),clamp(ty+(back?-.13:.1),.2,.98),back?.8:1.1);view.visualized=true;view.reason='以相对层次、大小和高低试画';
    }else if(['outside','beside'].includes(r.type)&&!['water','landscape'].includes(source.tool)){
      const sx=clamp(tx>.5?tx-.37:tx+.37);move(source,sx,clamp(ty,.4,.96));groupWidth(target,tx,.22);groupWidth(source,sx,.22);source.z=(target.z??10)+1;view.visualized=true;view.reason='表现邻接或外侧；左右方向为本地选择';
    }else if(r.type==='among'&&['tree','bamboo','willow'].includes(target.tool)&&source.tool==='moon'){
      move(source,.67,.22);view.visualized=true;view.reason='组织月体与树隙，不模拟穿枝照明';
    }else if(r.type==='reflects_on'&&target.tool==='water'&&source.tool==='moon'){
      source.reflection={target:target.entities[0],waterline:.46};view.visualized=true;view.reason='水面裁切的倒置淡影，尚非光学反射模拟';
    }else view.reason='该空间关系与形态组合尚未适配';
    return view;
  });
  if(spatial.length)notes.push('空间关系只在两端有画法且关系成立时应用；相对关系之外的距离、方向和尺度仍由本地构图选择。');
  return {layers,spatial,scene};
}
