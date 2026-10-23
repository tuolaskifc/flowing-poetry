/* Instance compositor: a few seeded source canvases are reused across many
 * locally placed motifs. Semantic entity count and p5 renderer count differ.
 */
window.PoemTrialScene=(()=>{
  let controllers=[],hosts=[],sources=[],plan,shared,paused=false,raf,seed=0,ready=false,drag=null,initialPlacements=[],elapsed=0,lastFrame=null;
  const canvas=()=>document.getElementById('scene'),W=960,H=600;
  function motion(layer,at,index=0){
    const flying=layer.tool==='bird'&&layer.options.pose==='flying'||layer.tool==='oriole'&&layer.options.pose==='spread';
    const m=layer.motion||(flying?{kind:'drift',state:'fly',rate:.8}:null);
    if(!m||!layer.animate)return {dx:0,dy:0,scale:1,alpha:1};
    const gain=shared.motion,phase=elapsed*m.rate*.65+index*.91;
    if(m.kind==='depth'){
      const t=(elapsed*m.rate/70)%1,recede=m.direction==='recede',toward=layer.tool==='boat'?[.67,.52]:[.5,.18],wing=flying?(Math.sin(phase)-Math.sin(index*.91))*.025*gain:0;
      return {dx:(recede?(toward[0]-at[0])*t*.45:(at[0]-.5)*t*.08)+wing,dy:recede?(toward[1]-at[1])*t*.45:.025*t,scale:recede?1-.45*t:1+.3*t,alpha:t>.88?(1-t)/.12:1};
    }
    return {dx:(Math.sin(phase)-Math.sin(index*.91))*(m.state==='float'?.009:.045)*gain,dy:(Math.sin(phase*.8)-Math.sin(index*.91*.8))*(m.state==='float'?.006:.015)*gain,scale:1,alpha:1};
  }
  function entries(){
    if(!plan)return [];
    return plan.layers.flatMap((l,i)=>(l.instances||[{placement:l.placement,variant:0,depth:0,opacity:1}]).map((instance,index)=>{
      const placement=structuredClone(instance.placement),initial=initialPlacements[i];
      placement.at=[placement.at[0]+l.placement.at[0]-initial.at[0],placement.at[1]+l.placement.at[1]-initial.at[1]];
      let parentOpacity=1;
      if(l.attachment){const parent=plan.layers.findIndex(v=>v.entities.includes(l.attachment.target));if(parent>=0){
        const p=plan.layers[parent],delta=[p.placement.at[0]-initialPlacements[parent].at[0],p.placement.at[1]-initialPlacements[parent].at[1]];
        placement.at[0]+=delta[0];placement.at[1]+=delta[1];
        const base=p.instances[0].placement.at.map((v,i)=>v+delta[i]),shift=motion(p,base);
        placement.at=[base[0]+shift.dx+(placement.at[0]-base[0])*shift.scale,base[1]+shift.dy+(placement.at[1]-base[1])*shift.scale];placement.scale*=shift.scale;parentOpacity=shift.alpha;
      }}
      const shift=motion(l,placement.at,index);placement.at=[placement.at[0]+shift.dx,placement.at[1]+shift.dy];placement.scale*=shift.scale;
      const sourceIndex=sources.findIndex(s=>s.layer===i&&s.variant===(instance.variant||0));
      return {tool:l.tool,layer:i,index,sourceIndex,placement,opacity:(instance.opacity??1)*shift.alpha*parentOpacity,z:(l.z??i)+(instance.depth||0)};
    })).sort((a,b)=>{
      if(plan.layers[a.layer].tool==='lotus'&&plan.layers[b.layer].tool==='lotus')return a.placement.at[1]-b.placement.at[1];
      return a.z-b.z;
    });
  }
  function frame(){
    if(!plan)return;const c=canvas().getContext('2d');c.clearRect(0,0,W,H);c.fillStyle=window.PoemDrawing.paletteFor(shared.palette).bg;c.fillRect(0,0,W,H);
    for(const entry of entries()){
      const source=hosts[entry.sourceIndex]?.querySelector('canvas');if(!source)continue;
      const {anchor,at,scale}=entry.placement;const layer=plan.layers[entry.layer];
      if(layer.grounding){c.save();c.translate(at[0]*W,at[1]*H+5);c.scale(scale*1.8,scale*.24);const g=c.createRadialGradient(0,0,4,0,0,95);g.addColorStop(0,window.PoemDrawing.paletteFor(shared.palette).main+'50');g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(-100,-100,200,200);c.restore();}
      c.save();if(layer.clip){
        const dx=layer.placement.at[0]-initialPlacements[entry.layer].at[0],dy=layer.placement.at[1]-initialPlacements[entry.layer].at[1];
        const points=layer.clip.map(([x,y])=>[(x+dx)*W,(y+dy)*H]);c.beginPath();
        const last=points.at(-1),first=points[0];c.moveTo((last[0]+first[0])/2,(last[1]+first[1])/2);
        points.forEach(([x,y],i)=>{const next=points[(i+1)%points.length];if(x<=0||x>=W||y<=0||y>=H){c.lineTo(x,y);c.lineTo((x+next[0])/2,(y+next[1])/2);}else c.quadraticCurveTo(x,y,(x+next[0])/2,(y+next[1])/2);});c.closePath();c.clip();
      }if(layer.surface){const y=layer.surface.top*H;c.beginPath();c.rect(0,y,W,H-y);c.clip();const wash=c.createLinearGradient(0,y,0,H);wash.addColorStop(0,'transparent');wash.addColorStop(1,window.PoemDrawing.paletteFor(shared.palette).main+'70');c.fillStyle=wash;c.fillRect(0,y,W,H-y);}
      c.globalAlpha=entry.opacity;c.drawImage(source,at[0]*W-anchor[0]*scale,at[1]*H-anchor[1]*scale,640*scale,388*scale);c.restore();
      if(layer.reflection){const line=layer.reflection.waterline*H;c.save();c.beginPath();for(let y=line;y<H;y+=7)c.rect(0,y,W,4);c.clip();c.globalAlpha=.15*entry.opacity;c.translate(0,2*line);c.scale(1,-1);c.drawImage(source,at[0]*W-anchor[0]*scale,at[1]*H-anchor[1]*scale,640*scale,388*scale);c.restore();}
    }c.globalAlpha=1;
  }
  function loop(timestamp){if(lastFrame!==null)elapsed+=Math.max(0,Math.min(.1,(timestamp-lastFrame)/1000))*shared.motion;lastFrame=timestamp;frame();raf=requestAnimationFrame(loop);}
  function dispose(){ready=false;drag=null;elapsed=0;lastFrame=null;cancelAnimationFrame(raf);controllers.forEach(c=>c.dispose());hosts.forEach(h=>h.remove());controllers=[];hosts=[];sources=[];plan=null;}
  function bindDrag(){
    const el=canvas();if(el.dataset.draggable)return;el.dataset.draggable='true';
    const point=e=>{const b=el.getBoundingClientRect();return [(e.clientX-b.left)*W/b.width,(e.clientY-b.top)*H/b.height];};
    el.addEventListener('pointerdown',e=>{
      if(!ready||e.button!==0)return;const pos=point(e);
      for(const entry of entries().reverse()){
        const p=entry.placement,source=hosts[entry.sourceIndex]?.querySelector('canvas');if(!source)continue;
        const x=Math.floor((pos[0]-p.at[0]*W)/p.scale+p.anchor[0]),y=Math.floor((pos[1]-p.at[1]*H)/p.scale+p.anchor[1]),radius=Math.min(8,Math.ceil(4*W/el.getBoundingClientRect().width/p.scale));
        const left=Math.max(0,x-radius),top=Math.max(0,y-radius),right=Math.min(source.width,x+radius+1),bottom=Math.min(source.height,y+radius+1);if(right<=left||bottom<=top)continue;
        if(plan.layers[entry.layer].inferred)continue;
        const pixels=source.getContext('2d').getImageData(left,top,right-left,bottom-top).data;
        if(pixels.some((v,j)=>j%4===3&&v>8)){drag={i:entry.layer,id:e.pointerId,start:pos,at:[...plan.layers[entry.layer].placement.at]};el.setPointerCapture(e.pointerId);e.preventDefault();break;}
      }
    });
    el.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const pos=point(e),p=plan.layers[drag.i].placement;p.at=[Math.max(0,Math.min(1,drag.at[0]+(pos[0]-drag.start[0])/W)),Math.max(0,Math.min(1,drag.at[1]+(pos[1]-drag.start[1])/H))];frame();});
    const end=e=>{if(drag?.id===e.pointerId)drag=null;};for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,end);
  }
  async function render(next){
    dispose();plan=structuredClone(next);initialPlacements=plan.layers.map(l=>structuredClone(l.placement));seed=next.seed;shared=window.PoemDrawing.settings({motion:1.4,...next.settings});paused=false;bindDrag();
    for(const [i,layer] of plan.layers.entries()){
      if(!window.PoemDrawing.definitions().some(d=>d.id===layer.tool))throw new Error('未找到对应绘画工具');
      const variants=Math.max(1,...(layer.instances||[]).map(v=>(v.variant||0)+1));
      for(let variant=0;variant<variants;variant++){
        const host=document.createElement('div');host.hidden=true;document.getElementById('layer-hosts').append(host);hosts.push(host);sources.push({layer:i,variant});
        const controller=window.PoemDrawing.mount(layer.tool,host,shared,seed+i*97+variant*1543,{transparent:true,singleUnit:layer.singleUnit,timeScale:layer.timeScale});controller.configure(layer.options);controllers.push(controller);
      }
    }
    const start=Date.now();while(controllers.some(c=>!c.inspect().ready)){if(Date.now()-start>15000)throw new Error('绘画工具加载超时');await new Promise(r=>setTimeout(r,20));}
    controllers.forEach((c,i)=>{if(!plan.layers[sources[i].layer].animate)c.pause(true);});ready=true;frame();raf=requestAnimationFrame(loop);return inspect();
  }
  function inspect(){return {ready,paused,elapsed,layers:controllers.map(c=>c.inspect()),placements:plan?.layers.map(l=>structuredClone(l.placement)),instances:entries(),settings:shared&&{...shared}};}
  return Object.freeze({render,dispose,inspect,
    pause(value){paused=Boolean(value);controllers.forEach((c,i)=>c.pause(paused||!plan.layers[sources[i].layer].animate));cancelAnimationFrame(raf);lastFrame=null;if(paused)frame();else raf=requestAnimationFrame(loop);},
    update(patch){if(!shared)return;Object.assign(shared,window.PoemDrawing.settings({...shared,...patch}));controllers.forEach(c=>c.refresh());setTimeout(frame,40);},
    moon(shape){controllers.forEach((c,i)=>{if(plan.layers[sources[i].layer].tool==='moon')c.configure({shape});});setTimeout(frame,40);},
    reseed(){if(!plan)return;seed++;elapsed=0;lastFrame=null;controllers.forEach((c,i)=>c.reset(seed+sources[i].layer*97+sources[i].variant*1543));setTimeout(frame,40);},
    resetLayout(){if(!plan)return;plan.layers.forEach((l,i)=>{l.placement=structuredClone(initialPlacements[i]);});frame();},
    save(){frame();const a=document.createElement('a');a.download='流动诗.png';a.href=canvas().toDataURL('image/png');a.click();}
  });
})();
