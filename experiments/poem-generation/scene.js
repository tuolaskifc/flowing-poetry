/* Composes transparent layers from the existing registered tools. No code from
 * the language model is evaluated. Placements are local planner choices.
 */
window.PoemTrialScene=(()=>{
  let controllers=[],hosts=[],plan,shared,paused=false,raf,seed=0;
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
  function dispose(){cancelAnimationFrame(raf);controllers.forEach(c=>c.dispose());hosts.forEach(h=>h.remove());controllers=[];hosts=[];plan=null;}
  async function render(next){
    dispose();plan=next;seed=next.seed;shared={...next.settings};paused=false;
    for(const [i,layer] of plan.layers.entries()){
      if(!window.PoemDrawing.definitions().some(d=>d.id===layer.tool))throw new Error('未知绘画工具。');
      const host=document.createElement('div');host.hidden=true;document.getElementById('layer-hosts').append(host);hosts.push(host);
      const controller=window.PoemDrawing.mount(layer.tool,host,shared,seed+i*97,{transparent:true});controller.configure(layer.options);controllers.push(controller);
    }
    const start=Date.now();while(controllers.some(c=>!c.inspect().ready)){if(Date.now()-start>15000)throw new Error('画面工具加载超时。');await new Promise(r=>setTimeout(r,20));}
    controllers.forEach((c,i)=>{if(!plan.layers[i].animate)c.pause(true);});
    frame();loop();return inspect();
  }
  function inspect(){return {ready:Boolean(plan),paused,layers:controllers.map(c=>c.inspect()),settings:shared&&{...shared}};}
  return Object.freeze({render,dispose,inspect,
    pause(value){paused=Boolean(value);controllers.forEach((c,i)=>c.pause(paused||!plan.layers[i].animate));if(paused){cancelAnimationFrame(raf);frame();}else{cancelAnimationFrame(raf);loop();}},
    update(patch){if(!shared)return;Object.assign(shared,patch);controllers.forEach(c=>c.refresh());setTimeout(frame,40);},
    moon(shape){if(!plan)return;controllers.forEach((c,i)=>{if(plan.layers[i].tool==='moon')c.configure({shape});});setTimeout(frame,40);},
    reseed(){if(!plan)return;seed++;controllers.forEach((c,i)=>c.reset(seed+i*97));setTimeout(frame,40);},
    save(){frame();const a=document.createElement('a');a.download='流动诗-生成试画.png';a.href=canvas().toDataURL('image/png');a.click();}
  });
})();
