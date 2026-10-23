/* Project-authored generative vocabulary. Semantic relations constrain seeded variation.
 * Pure Canvas 2D; no downloaded drawing code, model code or external runtime.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PoemAbstract=api;})(globalThis,()=>{
 const W=960,H=600,TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const styles=[['auto','交融'],['flow','流线'],['ink','墨晕'],['shards','碎片'],['ribbons','丝带'],['ripples','涟漪'],['dust','微粒'],['contours','等高纹'],['echoes','叠影'],['weave','网织'],['vortex','涡流'],['bloom','浸染'],['fissures','裂隙'],['fibers','游丝']];
 const palettes=[
  {id:'lapis',name:'青金与胭脂',dark:true,bg:'#101F36',colors:['#67B6C4','#DA9DAB','#C5BCE7','#E4B96A','#DBE8E1']},
  {id:'ember',name:'炽色余温',dark:true,bg:'#251D2F',colors:['#ED9271','#D7B582','#947CBF','#5CB4A5','#E5CED6']},
  {id:'tide',name:'深海回声',dark:true,bg:'#102D36',colors:['#64C7B5','#85ADDA','#E3AD78','#B7D7BF','#D0ACD5']},
  {id:'violet',name:'紫夜微光',dark:true,bg:'#211B3B',colors:['#AA9CDF','#72B0D5','#EA9DAF','#D7C88E','#C6DBDB']},
  {id:'paper',name:'纸上暖影',dark:false,bg:'#F1E6D3',colors:['#317C87','#B64C63','#B98C35','#698E72','#555B9F']},
  {id:'mineral',name:'青绿丹砂',dark:false,bg:'#E9E7D7',colors:['#287C72','#CE664F','#4C7196','#9F7CA4','#AA913F']},
  {id:'rose',name:'玫灰与流金',dark:false,bg:'#EEE1DF',colors:['#95648E','#C87B55','#458E9B','#6E799D','#9A854E']},
  {id:'mist',name:'雾白远蓝',dark:false,bg:'#E8EEF0',colors:['#547EAE','#BA6581','#3E938C','#B08C48','#8478A5']}
 ];
 function random(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
 const hash=s=>{let h=2166136261;for(const c of JSON.stringify(s))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(16);};
 const expressionLayout=typeof module==='object'&&module.exports?require('./expression-layout.js'):globalThis.PoemExpression;
 function compose(plan,{seed=plan.seed,style='auto',palette='auto',density=.55,vocabulary='expanded',expression=null}={}){
  const rng=random(seed),rand=(a,b)=>a+rng()*(b-a),night=plan.atmosphere.illumination==='night';
  const available=night?palettes.filter(p=>p.dark):palettes;
  const scheme=palettes.find(p=>p.id===palette)||(available[Math.floor(rng()*available.length)]);
  const layout=Math.floor(rng()*5),rotation=rand(-.28,.28),n=plan.nodes.length;
  const nodes=plan.nodes.map((node,i)=>{
   const t=(i+.5)/Math.max(n,1),angle=TAU*t+rotation;
   const at=n===1?[.5,.52]:layout===0?[.18+t*.64,.40+Math.sin(t*6+rotation)*.18]:layout===1?[.5+Math.cos(angle)*.26,.5+Math.sin(angle)*.22]:layout===2?[.24+t*.52,.24+t*.53]:layout===3?[.5+Math.sin(angle)*.28,.28+(i%2)*.35]:[.22+((i*1.618)%1)*.57,.3+((i*.414)%1)*.43];
   const related=plan.relations.filter(r=>[r.source,r.target].includes(node.id));
   const pool=vocabulary==='classic'?styles.slice(1,10):styles.slice(1);
   let form=style==='auto'?pool[Math.floor(rng()*pool.length)][0]:style;
   if(style==='auto'&&related.some(r=>r.kind==='interweave'))form=rng()<.5?'weave':'ribbons';
   if(style==='auto'&&related.some(r=>r.kind==='surround'&&r.source===node.id))form='contours';
   return {...node,at,form,radius:(n<3?143:109)*rand(.83,1.28),color:scheme.colors[(i+Math.floor(rng()*2))%scheme.colors.length],secondary:scheme.colors[(i+2)%scheme.colors.length],phase:rand(0,TAU),angle:rand(-1,1),frequency:rand(1.2,3.6),stretch:rand(.68,1.6),count:Math.round(rand(22,44)*(.55+clamp(density)*1.1)),salt:Math.floor(rand(1,1e8))};
  });
  const result={seed:seed>>>0,style,palette:scheme,layout,nodes,geometryKey:hash({seed,style,scheme,nodes}),variationBasis:'local-artistic-choice'};
  return expression&&plan.expression?expressionLayout.arrange(plan,result,expression):result;
 }
 function positions(plan,composition,time,offsets={},hybrid=false){
  const state=composition.nodes.map(n=>{
   let at=[...n.at];if(hybrid&&n.kind==='concrete'&&!n.binding){
    const layer=plan.concretePlan?.layers.find(l=>l.entities.includes(n.id));if(layer)at=[...layer.placement.at];
   }
   const shift=offsets[n.id]||[0,0];return {...n,at:at.map((v,i)=>v+shift[i]),alpha:n.mode==='candidate'?.28:n.mode==='gap'?0:n.mode==='reference'?.70:1};
  });
  const by=id=>state.find(n=>n.id===id),progress=1-Math.exp(-time/14);
  for(const r of plan.relations){
   const a=by(r.source),b=by(r.target);if(!a||r.modality!=='asserted')continue;
   if(!b){if(r.kind==='reveal')a.alpha*=.25+.75*progress;if(r.kind==='occlude')a.alpha*=.4+.2*Math.exp(-time/12);continue;}
   if((r.kind==='approach'||r.kind==='separate')&&!a.binding&&(!hybrid||a.kind!=='concrete')){
    const k=(r.kind==='approach'?.25:-.20)*progress;a.at=a.at.map((v,i)=>clamp(v+(b.at[i]-v)*k,.1,.9));
   }
   if(r.kind==='converge'&&!a.binding&&(!hybrid||a.kind!=='concrete'))a.at=a.at.map((v,i)=>v+(b.at[i]-v)*progress*.38);
   if(r.kind==='echo'){Object.assign(b,{form:a.form,salt:a.salt,count:a.count,frequency:a.frequency,phase:a.phase,echoDelay:2.4});}
   if(r.kind==='contrast'){a.radius*=1.18;b.radius*=.82;}
   if(r.kind==='surround'&&!a.binding&&(!hybrid||a.kind!=='concrete')){a.at=[...b.at];a.radius=Math.max(a.radius,b.radius*1.5);}
   if(r.kind==='occlude')b.alpha*=.4+.2*Math.exp(-time/12);
   if(r.kind==='reveal')a.alpha*=.25+.75*progress;
  }
  for(const r of plan.relations.filter(r=>r.kind==='disperse'&&r.modality==='asserted')){const a=by(r.source);if(a)a.radius*=1+progress*.34;}
  for(const p of plan.processes){
   const n=by(p.subject);if(!n||p.modality!=='asserted'||p.temporal==='not_yet')continue;
   if(p.kind==='emerge')n.alpha*=p.temporal==='already'?1:.1+.9*progress;
   if(p.kind==='fade')n.alpha*=p.temporal==='already'?.38:1-.75*progress;
   if(p.kind==='recur'&&p.temporal==='repeated')n.alpha*=.35+.65*(.5+.5*Math.sin(time*.5+n.phase));
   if(p.kind==='recur'&&p.temporal==='again')n.alpha*=time<3?.2:.2+.8*Math.sin(Math.min(1,(time-3)/10)*Math.PI/2);
  }
  return state;
 }
 // Viewer input deforms the drawing only; it never changes semantic positions or modalities.
 function response(at,time,pulses,strength=1){
  let x=0,y=0,twist=0;for(const p of pulses){const age=time-p.time;if(age<0||age>8)continue;
   const dx=(at[0]-p.at[0])*W,dy=(at[1]-p.at[1])*H,d=Math.hypot(dx,dy),front=28+age*150;
   const envelope=Math.exp(-(((d-front)/105)**2))*Math.exp(-age*.38),wave=Math.cos((d-front)*.019)*envelope*clamp(strength)*38;
   x+=(dx/(d||1)*.8-dy/(d||1)*.45)*wave;y+=(dy/(d||1)*.8+dx/(d||1)*.45)*wave;twist+=wave*.002;
  }return {offset:[clamp(x,-65,65)/W,clamp(y,-65,65)/H],twist:clamp(twist,-.22,.22)};
 }
 function mount(canvas,{background=()=>null,mask=()=>null,foreground=()=>null}={}){
  let c=canvas.getContext('2d');let plan,composition,options={style:'auto',palette:'auto',motion:1,trace:.45,response:.65,hybrid:false},time=0,paused=false,last=null,raf,drag=null,gesture=null,offsets={},history=[],pulses=[],paper=null,disposed=false;const maskCache=new Map();let paint;
  const stroke=(color,alpha,width=1)=>{c.strokeStyle=color;c.globalAlpha=alpha;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';};
  function field(x,y,t,n,k=0){const f=n.frequency;return Math.sin(x*.009*f+t*.17+n.phase+k)*Math.cos(y*.008-t*.11+k)*14+Math.sin(y*.019+x*.011+n.phase)*7;}
  function glyph(n,t,alpha=1){
   if(n.mode==='gap')return;
   const rng=random(n.salt),r=n.radius,color=n.color;
   c.save();if(options.expression&&n.clip){c.beginPath();n.clip.forEach(([x,y],i)=>i?c.lineTo(x*W,y*H):c.moveTo(x*W,y*H));c.closePath();c.clip();}c.translate(n.at[0]*W,n.at[1]*H);c.rotate(n.angle*.35+(n.twist||0));c.scale(n.stretch,1/n.stretch**.3);
   const power=n.alpha*alpha*(n.mode==='candidate'?.65:1)*(n.expressionGain??1);
   const ghost=n.mode==='candidate';if(ghost)c.setLineDash([3,7]);
   if(n.form==='ink'){
    for(let j=0;j<18;j++){
     const x=(rng()-.5)*r*.95,y=(rng()-.5)*r*.65,rr=r*(.42+rng()*.62),g=c.createRadialGradient(x,y,0,x,y,rr);g.addColorStop(0,color+'3A');g.addColorStop(.5,color+'16');g.addColorStop(1,color+'00');c.fillStyle=g;c.globalAlpha=power;c.beginPath();
     for(let k=0;k<58;k++){const a=k/57*TAU,dist=rr*(.82+.1*Math.sin(a*5+n.phase+j)+.07*Math.sin(a*9+t*.1));const px=x+Math.cos(a)*dist,py=y+Math.sin(a)*dist*.72;k?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();if(!ghost)c.fill();else{stroke(color,power*.2);c.stroke();}
    }
   }else if(n.form==='vortex'){
    const arms=Math.round(n.count*1.15),hand=rng()<.5?-1:1;
    for(let j=0;j<arms;j++){const start=rng()*TAU,turn=1.1+rng()*1.5,reach=r*(.65+rng()*.7);c.beginPath();
     for(let k=0;k<=100;k++){const q=k/100,rr=reach*(.06+q*.94),a=start+hand*q*TAU*turn+t*.10*(1-q),x=Math.cos(a)*rr+Math.sin(q*7+n.phase)*r*.13,y=Math.sin(a)*rr*.73;k?c.lineTo(x,y):c.moveTo(x,y);}stroke(j%4?color:n.secondary,power*(j%6===0?.58:.23),j%9===0?1.7:.65);c.stroke();}
   }else if(n.form==='bloom'){
    // Procedural pigment edges and branching veins; not a fluid solver.
    const lobes=7+Math.floor(rng()*5),phase=rng()*TAU;
    for(let layer=17;layer>=0;layer--){const size=r*(.38+layer*.048),drift=layer*2.1,points=[];c.beginPath();
     for(let k=0;k<=144;k++){const a=k/144*TAU,edge=1+.19*Math.sin(a*lobes+phase)+.09*Math.sin(a*17+n.phase)+.035*Math.sin(a*39+layer*.4+t*.12),rr=size*edge,x=Math.cos(a)*rr+drift*Math.sin(phase),y=Math.sin(a)*rr*.73;points.push([x,y]);k?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fillStyle=layer%5?color:n.secondary;c.globalAlpha=power*.025;if(!ghost)c.fill();stroke(layer%5?color:n.secondary,power*(layer%4===0?.15:.045),.7);c.stroke();
    }
    for(let j=0;j<n.count;j++){const a=rng()*TAU,length=r*(.5+rng()*.73);let x=0,y=0;c.beginPath();c.moveTo(x,y);
     for(let k=1;k<=18;k++){const q=k/18;x=Math.cos(a)*length*q+Math.sin(q*8+j)*q*9;y=Math.sin(a)*length*q*.73+Math.sin(q*11+n.phase)*q*7;c.lineTo(x,y);if(k>9&&k%3===0){c.moveTo(x,y);c.lineTo(x+Math.cos(a+.7)*12*q,y+Math.sin(a+.7)*12*q);c.moveTo(x,y);}}stroke(color,power*.14,.45);c.stroke();}
   }else if(n.form==='fissures'){
    const size=Math.round(clamp(Math.sqrt(n.count)*.85,4,7)),vertices=[];for(let y=0;y<=size;y++){vertices[y]=[];for(let x=0;x<=size;x++)vertices[y][x]=[(x/size-.5)*r*2.6+(rng()-.5)*r*.33,(y/size-.5)*r*1.8+(rng()-.5)*r*.29];}
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const pts=[vertices[y][x],vertices[y][x+1],vertices[y+1][x+1],vertices[y+1][x]],cx=pts.reduce((s,p)=>s+p[0],0)/4,cy=pts.reduce((s,p)=>s+p[1],0)/4;
     const edge=Math.hypot(cx/(r*1.4),cy/r),alphaEdge=clamp(1.4-edge),gap=3+7*rng(),sway=Math.sin(t*.12+n.phase+x+y)*2;c.beginPath();pts.forEach(([px,py],k)=>{const vx=px-cx,vy=py-cy,len=Math.hypot(vx,vy)||1,xx=px-vx/len*gap+sway,yy=py-vy/len*gap;k?c.lineTo(xx,yy):c.moveTo(xx,yy);});c.closePath();c.fillStyle=(x+y)%4?color:n.secondary;c.globalAlpha=power*alphaEdge*(.10+rng()*.22);if(!ghost)c.fill();stroke(color,power*alphaEdge*.46,.65);c.stroke();
     c.beginPath();c.moveTo(cx,cy);const end=pts[Math.floor(rng()*4)];c.lineTo((cx+end[0])*.5+7,(cy+end[1])*.5-5);c.lineTo(end[0],end[1]);stroke(n.secondary,power*alphaEdge*.24,.5);c.stroke();}
   }else if(n.form==='fibers'){
    for(let j=0;j<n.count*2;j++){const rootX=-r*(.4+rng()*.5),rootY=(rng()-.5)*r*.22,length=r*(1.25+rng()),spread=(rng()-.5)*r*1.7,phase=rng()*TAU,pts=[];c.beginPath();
     for(let k=0;k<=65;k++){const q=k/65,x=rootX+q*length,y=rootY+q*q*spread+Math.sin(q*7+phase+t*.18)*q*r*.12;pts.push([x,y]);k?c.lineTo(x,y):c.moveTo(x,y);}stroke(j%5?color:n.secondary,power*(.15+rng()*.27),j%13===0?1.5:.55);c.stroke();
     for(let branch=0;branch<3;branch++){const index=22+Math.floor(rng()*29),[x,y]=pts[index],dir=spread<0?-1:1;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+r*.13,y+dir*r*.06,x+r*.22,y+dir*r*.27,x+r*(.2+rng()*.25),y+dir*r*(.25+rng()*.23));stroke(color,power*.16,.4);c.stroke();}}
   }else if(n.form==='shards'){
    for(let j=0;j<n.count;j++){const a=rng()*TAU,rr=Math.sqrt(rng())*r*1.1,x=Math.cos(a)*rr,y=Math.sin(a)*rr*.78,side=3+Math.floor(rng()*4),size=8+rng()*35;c.beginPath();for(let k=0;k<side;k++){const b=k/side*TAU+n.phase+Math.sin(t*.1+j)*.08,px=x+Math.cos(b)*size,py=y+Math.sin(b)*size;k?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();c.fillStyle=j%3?color:n.secondary;c.globalAlpha=power*(.1+rng()*.25);if(!ghost)c.fill();stroke(color,power*.25,.6);c.stroke();}
   }else if(n.form==='dust'){
    for(let j=0;j<n.count*5;j++){const a=rng()*TAU,rr=Math.sqrt(rng())*r*1.15,baseX=Math.cos(a)*rr,baseY=Math.sin(a)*rr*.73,x=baseX+field(baseX,baseY,t,n)*.6,y=baseY+Math.sin(t*.35+j)*4; c.fillStyle=j%5?color:n.secondary;c.globalAlpha=power*(.2+rng()*.55);c.beginPath();c.ellipse(x,y,.5+rng()*2,.5+rng()*2,0,0,TAU);if(!ghost)c.fill();else c.stroke();if(j%5===0){stroke(color,power*.12,.45);c.beginPath();c.moveTo(x,y);c.lineTo(x-field(x,y,t,n)*1.2,y+4);c.stroke();}}
   }else if(['contours','ripples','echoes'].includes(n.form)){
    const lines=n.form==='echoes'?18:26;
    for(let j=0;j<lines;j++){const q=(j+1)/lines,rr=r*(.13+q*.94),ox=n.form==='echoes'?Math.sin(j*.23+n.phase)*r*.18:0,oy=n.form==='ripples'?Math.sin(t*.15+j*.17)*9:j*1.4;c.beginPath();
     for(let k=0;k<=100;k++){const a=k/100*TAU,rough=n.form==='contours'?Math.sin(a*3+n.phase)*.14+Math.sin(a*7+j*.08)*.05:Math.sin(a*2+n.phase+t*.12)*.06,x=ox+Math.cos(a)*rr*(1+rough),y=oy+Math.sin(a)*rr*(n.form==='ripples'?.36:.70);if(n.form==='echoes'&&k>68)break;k?c.lineTo(x,y):c.moveTo(x,y);}stroke(j%6===0?n.secondary:color,power*(.12+.4*(1-q)),j%7===0?1.8:.65);c.stroke();}
   }else if(n.form==='ribbons'){
    for(let j=0;j<11;j++){const phase=n.phase+j*.48,width=3+rng()*12,y0=(j-5)*r*.11,points=[];for(let k=0;k<=60;k++){const x=(k/60-.5)*r*2.35,y=y0+Math.sin(k/60*5+phase+t*.12)*r*.3+field(x,y0,t,n,j)*.4;points.push([x,y]);}c.beginPath();points.forEach(([x,y],k)=>k?c.lineTo(x,y):c.moveTo(x,y));for(let k=points.length-1;k>=0;k--){const [x,y]=points[k];c.lineTo(x,y+Math.sin(k/60*Math.PI)*width);}c.closePath();c.fillStyle=j%3?color:n.secondary;c.globalAlpha=power*.16;if(!ghost)c.fill();stroke(color,power*.35,.6);c.stroke();}
   }else{
    const weave=n.form==='weave',families=weave?2:1;
    for(let f=0;f<families;f++){c.save();if(f)c.rotate(Math.PI*.40);for(let j=0;j<n.count;j++){const y0=(j/n.count-.5)*r*1.8,taper=weave?1:.32+.68*Math.sqrt(Math.max(0,1-(j/n.count*2-1)**2));c.beginPath();for(let k=0;k<=55;k++){const x=(k/55-.5)*r*2.5*taper,env=Math.sin(k/55*Math.PI),y=y0+field(x,y0,t,n,f*3)*env+(weave?Math.sin(x*.02+j*.18+t*.12)*r*.12:Math.sin(x*.01+n.phase+t*.12)*r*.22);k?c.lineTo(x,y):c.moveTo(x,y);}stroke(f?n.secondary:color,power*(j%5===0?.54:.29),j%9===0?1.8:.7);c.stroke();}c.restore();}
   }
   c.restore();
  }
  function links(nodes){
   const by=id=>nodes.find(n=>n.id===id);
   for(const r of plan.relations){
    const a=by(r.source),b=by(r.target);if(!a||!b)continue;
    const asserted=r.modality==='asserted',solid=asserted&&a.mode!=='candidate'&&b.mode!=='candidate'&&a.mode!=='gap'&&b.mode!=='gap';
    c.save();c.setLineDash(solid?[]:[3,9]);const ax=a.at[0]*W,ay=a.at[1]*H,bx=b.at[0]*W,byy=b.at[1]*H,dx=bx-ax,dy=byy-ay,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
    if(solid&&r.kind==='interweave'){
     for(let j=0;j<34;j++){
      const lane=(j/33-.5)*Math.min(135,len*.37),phase=a.phase+j*.19;c.beginPath();
      for(let k=0;k<=90;k++){const t=k/90,envelope=Math.sin(t*Math.PI),off=lane+Math.sin(t*TAU*1.4+phase+time*.12)*envelope*Math.min(100,len*.30),x=ax+dx*t+nx*off,y=ay+dy*t+ny*off;k?c.lineTo(x,y):c.moveTo(x,y);}
      stroke(j%3?a.color:b.color,.19+(j%8===0?.13:0),j%8===0?1.6:.65);c.stroke();
     }
    }
    if(r.kind==='block'&&asserted){stroke(a.secondary,.35,2);c.beginPath();c.moveTo((ax+bx)/2+nx*55,(ay+byy)/2+ny*55);c.lineTo((ax+bx)/2-nx*55,(ay+byy)/2-ny*55);c.stroke();}
    const count=solid&&['interweave','echo','connect','approach'].includes(r.kind)?9:3;
    for(let j=0;j<count;j++){const bend=(j-(count-1)/2)*9+Math.sin(time*.19+a.phase)*16;
     stroke(j%3?a.color:a.secondary,solid?.12:.10,.65);c.beginPath();c.moveTo(ax,ay);
     if(r.modality==='negated'&&r.kind==='connect'||r.kind==='block'&&asserted){c.lineTo(ax+dx*.36,ay+dy*.36);c.moveTo(ax+dx*.64,ay+dy*.64);c.lineTo(bx,byy);}
     else c.bezierCurveTo(ax+dx*.32+nx*bend,ay+dy*.32+ny*bend,bx-dx*.32-nx*bend,byy-dy*.32-ny*bend,bx,byy);c.stroke();
    }c.restore();
   }
  }
  function expressionMarks(nodes){
   const recipe=composition.expression;if(!recipe?.hasScenery)return;
   if(!paint){paint=document.createElement('canvas');paint.width=W;paint.height=H;}
   const main=c;
   for(const layer of new Set(recipe.marks.map(m=>m.layer))){
    const ctx=paint.getContext('2d');ctx.clearRect(0,0,W,H);c=ctx;
    try{for(const mark of recipe.marks.filter(m=>m.layer===layer)){
     const n=nodes.find(n=>n.id===mark.subject);if(!n||n.mode==='gap')continue;
     const d=response(mark.at,time,pulses,options.response),shift=offsets[n.id]||[0,0];
     glyph({...n,...mark,at:mark.at.map((v,i)=>v+d.offset[i]+shift[i]),salt:n.salt+mark.layer*97,angle:n.angle*.2,expressionGain:1,count:Math.min(65,Math.round(n.count*recipe.density)),twist:d.twist},time,recipe.mark);
    }}finally{c=main;}
    if(!maskCache.has(layer))maskCache.set(layer,mask(layer));const silhouette=maskCache.get(layer);
    if(silhouette){
     const key=layer+'-'+recipe.mode;if(!maskCache.has(key)){const soft=document.createElement('canvas');soft.width=W;soft.height=H;const s=soft.getContext('2d');s.drawImage(silhouette,0,0);const pixels=s.getImageData(0,0,W,H),boost=recipe.mode==='abstract'?4:recipe.mode==='balanced'?2:1;for(let i=3;i<pixels.data.length;i+=4)pixels.data[i]=Math.min(255,pixels.data[i]*boost);s.putImageData(pixels,0,0);maskCache.set(key,soft);}
     ctx.save();ctx.globalCompositeOperation='destination-in';ctx.filter=recipe.mode==='abstract'?'blur(7px)':recipe.mode==='balanced'?'blur(1.5px)':'none';ctx.drawImage(maskCache.get(key),0,0);ctx.restore();
    }
    c.globalAlpha=1;c.drawImage(paint,0,0);
   }
  }
  function draw(){
   if(!plan||disposed)return;const scheme=composition.palette,bg=background();c.save();c.globalAlpha=1;c.clearRect(0,0,W,H);c.fillStyle=scheme.bg;c.fillRect(0,0,W,H);
   if((options.hybrid||options.expression)&&bg){c.globalAlpha=composition.expression?.literal??1;c.drawImage(bg,0,0,W,H);c.globalAlpha=1;}
   const nodes=positions(plan,composition,time,offsets,options.hybrid||!!options.expression).map(n=>{if(n.mode==='gap'||n.binding||options.hybrid&&n.kind==='concrete')return n;const d=response(n.at,time,pulses,options.response);return {...n,at:n.at.map((v,i)=>v+d.offset[i]),twist:d.twist};});
   if(!options.expression)for(const n of nodes){if(n.mode==='gap'||options.hybrid&&n.kind==='concrete')continue;const r=n.radius*2.25,g=c.createRadialGradient(n.at[0]*W,n.at[1]*H,0,n.at[0]*W,n.at[1]*H,r);g.addColorStop(0,n.color+(scheme.dark?'14':'0B'));g.addColorStop(1,n.color+'00');c.fillStyle=g;c.fillRect(0,0,W,H);}
   if(paper){c.globalAlpha=options.hybrid?.09:.22;c.drawImage(paper,0,0);}
   for(const h of history){const age=time-h.time;if(age>=0&&age<18*options.trace){const base=nodes.find(n=>n.id===h.id);if(base)glyph({...base,at:h.at},h.time,(1-age/(18*options.trace))*.18*options.trace);}}
   if(!options.expression||!plan.concretePlan)links(nodes);expressionMarks(nodes);
   for(const n of nodes){if(options.hybrid&&n.kind==='concrete'||options.expression&&n.expressionGain===0)continue;
    const p=plan.processes.find(p=>p.subject===n.id&&p.modality==='asserted'&&p.kind==='accumulate'&&p.temporal!=='not_yet');
    if(p)for(let j=1;j<=Math.min(5,Math.floor(time/3));j++)glyph({...n,at:[n.at[0]-j*.014,n.at[1]+j*.009]},time-j*2,.09*options.trace);
    glyph(n,Math.max(0,time-(n.echoDelay||0)));
   }
   if(options.expression&&composition.expression?.hasScenery){const accents=foreground();if(accents){c.globalAlpha=composition.expression.foreground;c.drawImage(accents,0,0);c.globalAlpha=1;}}
   // A quiet wavefront makes a click visible even in an empty part of the canvas.
   for(const p of pulses){const age=time-p.time;if(age<0||age>8||!options.response)continue;const radius=28+age*150;c.save();c.translate(p.at[0]*W,p.at[1]*H);c.rotate(p.at[0]*2);c.beginPath();c.ellipse(0,0,radius,radius*.86,0,.3,Math.PI*1.8);stroke(composition.palette.colors[0],options.response*.25*Math.exp(-age*.65),1);c.stroke();c.restore();}
   c.restore();
  }
  function texture(){paper=document.createElement('canvas');paper.width=W;paper.height=H;const ctx=paper.getContext('2d'),rng=random(composition.seed^0xAF53);for(let i=0;i<5800;i++){ctx.fillStyle=i%2?'#FFFFFF25':'#00000018';ctx.fillRect(rng()*W,rng()*H,rng()<.9?.6:1.1,.6);}}
  function loop(now){if(disposed)return;raf=requestAnimationFrame(loop);if(paused||options.motion===0){last=null;return;}if(last!==null&&now-last<1000/30)return;if(last!==null)time+=Math.min(.08,(now-last)/1000)*options.motion;last=now;draw();}
  const point=e=>{const b=canvas.getBoundingClientRect();return [(e.clientX-b.left)/b.width,(e.clientY-b.top)/b.height];};
  function impulse(at){if(!plan||disposed||options.response<=0||!Array.isArray(at)||at.length!==2||!at.every(Number.isFinite))return;const p=at.map(v=>clamp(v));pulses=pulses.filter(p=>time-p.time<=8);pulses.push({at:p,time});if(pulses.length>12)pulses.shift();draw();}
  function down(e){if(!plan||e.button!==0||gesture)return;const p=point(e),nodes=positions(plan,composition,time,offsets,options.hybrid||!!options.expression);gesture={p,id:e.pointerId,moved:false};canvas.setPointerCapture(e.pointerId);e.preventDefault();let best=null,dist=Infinity;for(const n of nodes){if(n.mode==='gap'||n.binding||options.hybrid&&n.kind==='concrete')continue;const d=Math.hypot((n.at[0]-p[0])*W,(n.at[1]-p[1])*H);if(d<dist&&d<n.radius*1.25){best=n;dist=d;}}
   if(best){const surround=plan.relations.find(r=>r.kind==='surround'&&r.modality==='asserted'&&r.source===best.id),id=surround?.target||best.id,target=nodes.find(n=>n.id===id)||best;drag={id,p,offset:[...(offsets[id]||[0,0])],at:[...target.at]};}
  }
  function move(e){if(!gesture||gesture.id!==e.pointerId)return;const p=point(e);if(Math.hypot((p[0]-gesture.p[0])*W,(p[1]-gesture.p[1])*H)>5)gesture.moved=true;if(!drag||!gesture.moved)return;if(options.trace>0){history.push({id:drag.id,at:drag.at,time});if(history.length>80)history.shift();}offsets[drag.id]=p.map((v,i)=>clamp(drag.offset[i]+v-drag.p[i],-.65,.65));drag.at=positions(plan,composition,time,offsets,options.hybrid).find(n=>n.id===drag.id).at;draw();}
  const up=e=>{if(!gesture||gesture.id!==e.pointerId)return;const tap=e.type==='pointerup'&&!gesture.moved,p=gesture.p;gesture=null;drag=null;if(tap)impulse(p);};canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,up);
  return {
   render(next,settings={}){plan=structuredClone(next);options={...options,...settings};composition=compose(plan,options);time=0;last=null;history=[];pulses=[];maskCache.clear();gesture=null;drag=null;offsets={};texture();cancelAnimationFrame(raf);draw();raf=requestAnimationFrame(loop);return this.inspect();},
   configure(patch){options={...options,...patch};if(['style','palette','seed','density','vocabulary','expression'].some(k=>Object.hasOwn(patch,k))){composition=compose(plan,options);texture();history=[];pulses=[];gesture=null;drag=null;offsets={};}draw();return this.inspect();},
   reseed(){options.seed=((composition.seed>>>0)+0x9E3779B9)>>>0;return this.render(plan,options);},
   pause(value){paused=!!value;last=null;draw();},
   restart(){time=0;last=null;history=[];pulses=[];gesture=null;drag=null;offsets={};draw();},
   impulse,
   at(value){time=Math.max(0,Number(value)||0);draw();return this.inspect();},
   inspect(){return {ready:!!plan,time,paused,seed:composition?.seed,geometryKey:composition?.geometryKey,palette:composition?.palette.id,style:options.style,options:{...options},expression:composition?.expression&&structuredClone(composition.expression),masks:[...maskCache.keys()],nodes:plan?positions(plan,composition,time,offsets,options.hybrid||!!options.expression):[],history:history.length,pulses:pulses.filter(p=>time>=p.time&&time-p.time<=8).map(p=>({...p,at:[...p.at]})),relations:plan?.relations,processes:plan?.processes};},
   save(){draw();const a=document.createElement('a');a.download='流动诗-抽象表达-'+composition.seed+'.png';a.href=canvas.toDataURL('image/png');a.click();},
   dispose(){disposed=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.removeEventListener(event,up);}
  };
 }
 const backgroundPalette=id=>({lapis:'indigo',ember:'defiance',tide:'gilded',violet:'indigo',paper:'clear',mineral:'mineral',rose:'tender',mist:'clear'})[id]||'indigo';
 return Object.freeze({styles,palettes,backgroundPalette,compose,positions,response,mount});
});
