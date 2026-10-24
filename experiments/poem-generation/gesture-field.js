/* Project-authored, canvas-wide abstract gestures. These are artistic marks,
 * not additional scenery, physical objects, or assertions about poem events. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PoemGestures=api;})(globalThis,()=>{
 const W=960,H=600,TAU=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
 function random(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
 function build(plan,composition,amount){
  const strength=clamp(amount);if(!strength)return null;
  const eligible=composition.nodes.filter(n=>n.mode!=='gap'&&!n.contextOnly&&!n.unavailable&&(n.expressionGain!==0||composition.expression?.marks.some(m=>m.subject===n.id)));
  if(!eligible.length)return null;
  const emotions=eligible.filter(n=>n.kind==='abstract'&&n.mode==='present'),sources=emotions.length?emotions:eligible,rng=random(composition.seed^0x51EA7C),fields=[];
  for(let i=0;i<Math.min(3,sources.length);i++){const n=sources[i];fields.push({source:n.id,form:n.form,color:n.color,secondary:n.secondary,seed:(n.salt^Math.imul(i+1,7919))>>>0,phase:rng()*TAU,angle:(rng()-.5)*1.1,center:[W*(.1+rng()*.8),H*(.2+rng()*.6)],gain:i===0?1:i===1?.52:.32,basis:'local-artistic-choice'});}
  return {version:'canvas-gestures-1.0',strength,fields,bounds:[-.35*W,-.4*H,1.35*W,1.4*H],basis:'local-artistic-choice',physicalScenery:false};
 }
 function paint(c,frame,scheme,nodes,time,{density=.55,warp=null}={}){
  if(!frame)return;
  const spread=frame.strength,dense=clamp(density),size=.72+spread*.45;
  for(const f of frame.fields){const n=nodes.find(n=>n.id===f.source);if(!n||n.mode==='gap')continue;
   const rng=random(f.seed),gain=f.gain*spread*n.alpha,phase=f.phase,timePhase=time*.08,r=(a,b)=>a+(b-a)*rng();if(gain<.001)continue;
   c.save();c.lineCap='round';c.lineJoin='round';if(n.mode==='candidate')c.setLineDash([4,12]);
   const stroke=(color,alpha,width)=>{c.strokeStyle=color;c.globalAlpha=Math.min(1,gain*alpha);c.lineWidth=width;};
   const put=(x,y,k)=>{if(warp){const d=warp([x/W,y/H]);x+=d[0]*W;y+=d[1]*H;}k?c.lineTo(x,y):c.moveTo(x,y);};
   const rotated=(x,y)=>[W*.5+x*Math.cos(f.angle)-y*Math.sin(f.angle),H*.5+x*Math.sin(f.angle)+y*Math.cos(f.angle)];
   if(['ink','bloom'].includes(f.form)){
    c.globalCompositeOperation=scheme.dark?'screen':'multiply';
    for(let j=0;j<9;j++){const x=W*(-.17+j*.17),y=H*(.48+Math.sin(j*.59+phase)*.32),radius=r(230,430)*size,color=j%3?f.color:f.secondary,g=c.createRadialGradient(x,y,8,x,y,radius);
     g.addColorStop(0,color+'98');g.addColorStop(.48,color+'45');g.addColorStop(1,color+'00');c.fillStyle=g;c.globalAlpha=gain*.47;c.beginPath();
     for(let k=0;k<=120;k++){const a=k/120*TAU,edge=1+.16*Math.sin(a*3+phase+j)+.09*Math.sin(a*7+j*.8+timePhase)+.035*Math.cos(a*17);put(x+Math.cos(a)*radius*edge,y+Math.sin(a)*radius*edge*.72,k);}c.closePath();if(n.mode!=='candidate')c.fill();
     for(let vein=0;vein<3;vein++){c.beginPath();for(let k=0;k<=100;k++){const a=k/100*TAU,rr=radius*(.5+vein*.14)*(1+.14*Math.sin(a*3+j+phase));put(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.72,k);}stroke(color,.10,.6);c.stroke();}
    }
   }else if(['shards','fissures'].includes(f.form)){
    const cols=6+Math.round(dense*4),rows=5,grid=[];
    for(let y=0;y<=rows;y++){grid[y]=[];for(let x=0;x<=cols;x++)grid[y][x]=[(x/cols*1.35-.18)*W+r(-47,47),(y/rows*1.4-.2)*H+r(-45,45)];}
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const pts=[grid[y][x],grid[y][x+1],grid[y+1][x+1],grid[y+1][x]],cx=pts.reduce((s,p)=>s+p[0],0)/4,cy=pts.reduce((s,p)=>s+p[1],0)/4,gap=r(2,11),skip=rng()<.09;c.beginPath();
     pts.forEach(([px,py],k)=>{const dx=px-cx,dy=py-cy,len=Math.hypot(dx,dy)||1;put(px-dx/len*gap+Math.sin(timePhase+x+y)*2,py-dy/len*gap,k);});c.closePath();c.fillStyle=(x+y)%3?f.color:f.secondary;c.globalAlpha=gain*r(.12,.33);if(!skip&&n.mode!=='candidate')c.fill();stroke(f.color,.34,.75);c.stroke();
     if(f.form==='fissures'){c.beginPath();put(pts[0][0],pts[0][1],0);put(cx+r(-28,28),cy+r(-28,28),1);put(pts[2][0],pts[2][1],1);stroke(f.secondary,.3,.8);c.stroke();}
    }
   }else if(['vortex','ripples','contours','echoes'].includes(f.form)){
    const count=Math.round(30+dense*30),cx=f.center[0]-W*.16,cy=f.center[1],hand=rng()<.5?-1:1;
    for(let j=0;j<count;j++){c.beginPath();const offset=j/count,turns=f.form==='vortex'?1.6+rng()*1.6:.94,start=phase+j*.085;
     for(let k=0;k<=150;k++){const q=k/150,a=start+hand*q*TAU*turns+timePhase*(1-q)*.28,rr=f.form==='vortex'?(25+q*H*1.55)*(1+offset*.34):H*(.14+offset*1.5),rough=f.form==='contours'?1+.13*Math.sin(a*3+phase)+.05*Math.cos(a*7+j*.06):1+.05*Math.sin(a*3+timePhase);put(cx+Math.cos(a)*rr*rough*1.25,cy+Math.sin(a)*rr*rough*.83,k);}
     stroke(j%4?f.color:f.secondary,j%9===0?.54:.21,j%11===0?3.1:.8);c.stroke();
    }
   }else if(f.form==='dust'){
    for(let j=0;j<Math.round(650+dense*950);j++){const x=r(-W*.2,W*1.2),y=H*(.5+Math.sin(x*.005+phase)*.25)+r(-H*.43,H*.43)+Math.sin(time*.15+j)*6,color=j%4?f.color:f.secondary;let p=[x,y];if(warp){const d=warp([x/W,y/H]);p=[x+d[0]*W,y+d[1]*H];}c.fillStyle=color;c.globalAlpha=gain*r(.20,.75);c.beginPath();c.ellipse(p[0],p[1],r(.5,2.8),r(.5,2.8),0,0,TAU);if(n.mode!=='candidate')c.fill();if(j%17===0){c.beginPath();put(x,y,0);put(x+r(12,40),y+Math.sin(phase+x*.01)*12,1);stroke(color,.3,.6);c.stroke();}}
   }else if(f.form==='fibers'){
    const count=Math.round(55+dense*65);
    for(let j=0;j<count;j++){const startY=H*r(.1,.9),endY=H*r(-.35,1.35),bend=r(-H*.5,H*.5);c.beginPath();
     for(let k=0;k<=100;k++){const q=k/100,x=W*(-.23+q*1.5),y=startY+(endY-startY)*q+Math.sin(q*Math.PI)*bend+Math.sin(q*11+phase+timePhase)*H*.035*q;put(x,y,k);}stroke(j%5?f.color:f.secondary,j%9===0?.52:.24,j%13===0?2.1:.7);c.stroke();
     if(j%3===0){c.beginPath();const x=W*r(.1,.7),y=startY+(endY-startY)*(x/W);put(x,y,0);put(x+W*.28,y+Math.sin(phase+j)*H*.24,1);stroke(f.color,.16,.5);c.stroke();}
    }
   }else{
    const ribbon=f.form==='ribbons',woven=f.form==='weave',count=ribbon?18:Math.round(35+dense*31),families=woven?2:1;
    for(let family=0;family<families;family++)for(let j=0;j<count;j++){const y0=(j/(count-1)-.5)*H*1.6,points=[],width=r(8,35)*spread;c.beginPath();
     for(let k=0;k<=100;k++){const q=k/100,x=(q-.5)*W*1.75,y=y0+Math.sin(q*TAU*1.2+phase+family*2+timePhase)*H*.20+Math.sin(q*11+j*.14+phase)*H*.07,pt=rotated(x,y+family*Math.sin(x*.002)*H*.25);points.push(pt);put(pt[0],pt[1],k);}
     if(ribbon){for(let k=points.length-1;k>=0;k--)put(points[k][0],points[k][1]+Math.sin(k/100*Math.PI)*width,1);c.closePath();const gradient=c.createLinearGradient(0,0,W,H);gradient.addColorStop(0,f.color+'55');gradient.addColorStop(.55,f.secondary+'88');gradient.addColorStop(1,f.color+'22');c.fillStyle=gradient;c.globalAlpha=gain*.62;if(n.mode!=='candidate')c.fill();}
     stroke((j+family)%5?f.color:f.secondary,j%8===0?.58:ribbon?.32:.24,j%9===0?2.3:.7);c.stroke();
    }
   }
   c.restore();
  }
 }
 return Object.freeze({build,paint});
});
