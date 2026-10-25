// Shared by Node checks and browser. All geometry and brush choices are local.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PoemExpression=api;})(globalThis,()=>{
 const modes=[['auto','随诗意推荐'],['scenery','风景优先'],['balanced','景意交融'],['abstract','抽象优先']];
 const recipes={scenery:{literal:1,foreground:0,mark:.3,field:.16,density:.7},balanced:{literal:.84,foreground:.72,mark:.82,field:.34,density:1},abstract:{literal:.19,foreground:.85,mark:1.35,field:.62,density:1.25}};
 const families={water:['flow','ripples','ribbons'],vegetation:['fibers','weave','ink'],light:['ink','echoes'],architecture:['contours','shards'],rock:['fissures','contours'],mountain:['contours','ink'],ground:['contours','fissures'],atmosphere:['bloom','flow','dust'],snow:['dust','echoes'],figure:['echoes','flow']};
 const abstractFamilies={water:['vortex','weave','ribbons'],vegetation:['weave','fibers','vortex'],light:['echoes','ripples'],architecture:['shards','fissures'],rock:['shards','fissures'],mountain:['fissures','ink'],ground:['fissures','dust'],atmosphere:['bloom','ribbons'],snow:['dust','weave'],figure:['echoes','flow']};
 const all=[[0,0],[1,0],[1,1],[0,1]],sky=[[0,0],[1,0],[1,.52],[0,.52]];
 function role(l){return l.visual?.role||(l.tool==='water'?'water':l.tool==='moon'?'light':['tree','willow','bamboo','grass','flower','plum-branch','lotus'].includes(l.tool)?'vegetation':['building','dwelling','boat','pavilion'].includes(l.tool)?'architecture':l.tool==='rock'?'rock':l.tool==='landscape'?['mountain','ground'].includes(l.options.form)?l.options.form:'light':'atmosphere');}
 function policy(plan,mode='auto'){const effective=Object.hasOwn(recipes,mode)?mode:plan.expression.recommendation;return {mode:effective,...recipes[effective],hasScenery:!!plan.concretePlan,reason:plan.expression.reason};}
 function arrange(plan,composition,requested='auto'){
  const selected=policy(plan,requested),layers=plan.concretePlan?.layers||[],regions=plan.concretePlan?.scene.organization?.regions||{},marks=[];
  const nodes=composition.nodes.map(n=>{
   const layerIndices=layers.flatMap((l,i)=>l.entities.includes(n.id)?[i]:[]),layer=layers[layerIndices[0]];
   if(n.mode==='gap'||n.contextOnly)return {...n,expressionGain:0};
   if(n.mode==='candidate'||n.mode==='reference')return selected.hasScenery?{...n,at:[.5,.30],radius:280,stretch:1.5,clip:sky,binding:true,field:true,form:composition.style==='auto'?'flow':n.form,expressionGain:selected.field*.7}:{...n,expressionGain:n.mode==='reference'?.7:1};
   if(layer){
    for(const index of layerIndices){const l=layers[index],family=role(l),pool=(selected.mode==='abstract'?abstractFamilies:families)[family]||families.atmosphere;
     for(const [i,v] of (l.instances||[{placement:l.placement}]).entries()){
      if(marks.some(m=>m.layer===index&&m.instance===(v.id||index+':'+i)))continue;
      const p=v.placement,anchor=p.anchor||[320,194],at=[p.at[0]+(320-anchor[0])*p.scale/960,p.at[1]+(194-anchor[1])*p.scale/600];
      marks.push({subject:n.id,layer:index,instance:v.id||index+':'+i,at,root:[...p.at],radius:Math.max(45,180*p.scale),stretch:Math.max(.65,Math.min(2.2,1.2)),form:composition.style==='auto'?pool[(n.salt+i)%pool.length]:n.form,clip:l.clip||((family==='water'&&regions.water)||null),family,...(l.colorCue?.color?{color:l.colorCue.color,secondary:l.colorCue.color}: {})});
     }
    }
    return {...n,at:[...layer.placement.at],binding:true,expressionGain:0};
   }
   if(n.kind==='concrete')return {...n,expressionGain:0,unavailable:true};
   if(selected.hasScenery){
    const relation=plan.relations.find(r=>r.modality==='asserted'&&r.source===n.id&&layers.some(l=>l.entities.includes(r.target)&&role(l)==='water'));
    const water=relation&&regions.water,clip=water||sky;return {...n,at:[.5,water?.72:.30],radius:water?290:310,stretch:1.55,form:composition.style==='auto'?(n.salt%2?'flow':'ink'):n.form,binding:true,clip,expressionGain:selected.field,field:true};
   }
   const tangled=/纠缠|纠结|缠绕|烦乱/.test(plan.atmosphere.labels.join(' '));
   const form=composition.style==='auto'&&tangled?'weave':n.form;
   return {...n,form,radius:n.radius*(plan.nodes.length===1?1.85:1.12),stretch:plan.nodes.length===1?1.25:n.stretch,count:Math.round(n.count*selected.density),expressionGain:Math.max(.8,selected.mark)*(tangled?1.45:1)};
  });
  return {...composition,nodes,expression:{...selected,marks,regions},geometryKey:composition.geometryKey+'-'+selected.mode};
 }
 function pointIn(p,polygon){if(!polygon)return true;let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
 function protectedLayers(plan){const p=plan?.concretePlan||plan;if(!p?.layers)return [];return p.layers.flatMap((l,i)=>(p.drawingPolicy?l.visibility?.protect:(['moon','building','dwelling','pavilion','boat','figure','bird','oriole','horse','fish','flag','weapon'].includes(l.tool)||l.options.form==='waterfall'||l.colorCue&&l.tool!=='water'&&l.options.form!=='mountain'))?[i]:[]);}
 return Object.freeze({modes,recipes,families,policy,arrange,pointIn,all,protectedLayers});
});
