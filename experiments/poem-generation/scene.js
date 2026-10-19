/* Composes transparent layers from the existing registered tools. No code from
 * the language model is evaluated. Placements are local planner choices.
 */
window.PoemTrialScene=(()=>{
  let controllers=[],hosts=[],plan,shared,paused=false,raf,seed=0,ready=false,drag=null,initialPlacements=[];
  const canvas=()=>document.getElementById('scene'),W=960,H=600;
  function frame(){
    if(!plan)return;
    const c=canvas().getContext('2d');c.clearRect(0,0,W,H);c.fillStyle=window.PoemDrawing.paletteFor(shared.palette).bg;c.fillRect(0,0,W,H);
    for(let i=0;i<hosts.length;i++){
      const source=hosts[i].querySelector('canvas');if(!source)continue;
      const {anchor,at,scale}=plan.layers[i].placement;
      c.drawImage(source,at[0]*W-anchor[0]*scale,at[1]*H-anchor[1]*scale,640*scale,388*scale);
    }
  }
  function loop(){frame();raf=requestAnimationFrame(loop);}
  function dispose(){ready=false;drag=null;cancelAnimationFrame(raf);controllers.forEach(c=>c.dispose());hosts.forEach(h=>h.remove());controllers=[];hosts=[];plan=null;}
  function bindDrag(){
    const el=canvas();if(el.dataset.draggable)return;el.dataset.draggable='true';
    const point=e=>{const b=el.getBoundingClientRect();return [(e.clientX-b.left)*W/b.width,(e.clientY-b.top)*H/b.height];};
    el.addEventListener('pointerdown',e=>{
      if(!ready||e.button!==0)return;const pos=point(e);
      for(let i=hosts.length-1;i>=0;i--){
        const p=plan.layers[i].placement,source=hosts[i].querySelector('canvas');
        const x=Math.floor((pos[0]-p.at[0]*W)/p.scale+p.anchor[0]),y=Math.floor((pos[1]-p.at[1]*H)/p.scale+p.anchor[1]);
        if(!source)continue;
        // Fine ink strokes need a small pointer tolerance, especially on phones.
        const radius=Math.min(8,Math.ceil(4*W/el.getBoundingClientRect().width/p.scale));
        const left=Math.max(0,x-radius),top=Math.max(0,y-radius),right=Math.min(source.width,x+radius+1),bottom=Math.min(source.height,y+radius+1);
        if(right<=left||bottom<=top)continue;
        const pixels=source.getContext('2d').getImageData(left,top,right-left,bottom-top).data;
        let hit=false;for(let j=3;j<pixels.length;j+=4)if(pixels[j]>8){hit=true;break;}
        if(hit){drag={i,id:e.pointerId,start:pos,at:[...p.at]};el.setPointerCapture(e.pointerId);e.preventDefault();break;}
      }
    });
    el.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const pos=point(e),p=plan.layers[drag.i].placement;p.at=[Math.max(0,Math.min(1,drag.at[0]+(pos[0]-drag.start[0])/W)),Math.max(0,Math.min(1,drag.at[1]+(pos[1]-drag.start[1])/H))];frame();});
    const end=e=>{if(drag?.id===e.pointerId)drag=null;};for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,end);
  }
  async function render(next){
    dispose();plan=structuredClone(next);initialPlacements=plan.layers.map(l=>structuredClone(l.placement));seed=next.seed;shared={...next.settings};paused=false;bindDrag();
    for(const [i,layer] of plan.layers.entries()){
      if(!window.PoemDrawing.definitions().some(d=>d.id===layer.tool))throw new Error('未知绘画工具。');
      const host=document.createElement('div');host.hidden=true;document.getElementById('layer-hosts').append(host);hosts.push(host);
      const controller=window.PoemDrawing.mount(layer.tool,host,shared,seed+i*97,{transparent:true});controller.configure(layer.options);controllers.push(controller);
    }
    const start=Date.now();while(controllers.some(c=>!c.inspect().ready)){if(Date.now()-start>15000)throw new Error('画面工具加载超时。');await new Promise(r=>setTimeout(r,20));}
    controllers.forEach((c,i)=>{if(!plan.layers[i].animate)c.pause(true);});
    ready=true;frame();loop();return inspect();
  }
  function inspect(){return {ready,paused,layers:controllers.map(c=>c.inspect()),placements:plan?.layers.map(l=>structuredClone(l.placement)),settings:shared&&{...shared}};}
  return Object.freeze({render,dispose,inspect,
    pause(value){paused=Boolean(value);controllers.forEach((c,i)=>c.pause(paused||!plan.layers[i].animate));if(paused){cancelAnimationFrame(raf);frame();}else{cancelAnimationFrame(raf);loop();}},
    update(patch){if(!shared)return;Object.assign(shared,patch);controllers.forEach(c=>c.refresh());setTimeout(frame,40);},
    moon(shape){if(!plan)return;controllers.forEach((c,i)=>{if(plan.layers[i].tool==='moon')c.configure({shape});});setTimeout(frame,40);},
    reseed(){if(!plan)return;seed++;controllers.forEach((c,i)=>c.reset(seed+i*97));setTimeout(frame,40);},
    resetLayout(){if(!plan)return;plan.layers.forEach((l,i)=>{l.placement=structuredClone(initialPlacements[i]);});frame();},
    save(){frame();const a=document.createElement('a');a.download='流动诗-生成试画.png';a.href=canvas().toDataURL('image/png');a.click();}
  });
})();
