/* Shared, local-only drawing lifecycle. Registered code is authored in this
 * repository; registry ids never resolve to downloaded or model-generated code.
 */
window.PoemDrawing = (() => {
  'use strict';
  const width=640,height=388;
  const registry=new Map();
  const palettes=Object.freeze({
    clear:Object.freeze({bg:'#EEF0E8',main:'#A3B7B0',ink:'#425E59',accent:'#CEBF8A'}),
    tender:Object.freeze({bg:'#F6EAE1',main:'#CFA2A0',ink:'#9E91AB',accent:'#D8B77F'})
  });
  const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
  const number=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
  function settings(input={}) {
    return {wind:clamp(number(input.wind,.35)),density:clamp(number(input.density,.45)),palette:Object.hasOwn(palettes,input.palette)?input.palette:'clear'};
  }
  function register(definition) {
    if(!/^[a-z][a-z0-9-]*$/.test(definition.id)||registry.has(definition.id))throw new Error(`Invalid or duplicate drawing tool: ${definition.id}`);
    if(typeof definition.create!=='function'||!definition.sources?.length)throw new Error(`Incomplete tool: ${definition.id}`);
    const ids=new Set();
    for(const control of definition.controls||[]){
      if(ids.has(control.id)||!control.choices?.some(c=>c.value===control.default))throw new Error(`Invalid control: ${definition.id}/${control.id}`);
      ids.add(control.id);
    }
    for(const id of definition.sources)if(!Object.hasOwn(window.PoemDrawingSources,id))throw new Error(`Unknown source: ${id}`);
    registry.set(definition.id,Object.freeze({...definition,sources:Object.freeze([...definition.sources])}));
  }
  const definitions=()=>Array.from(registry.values(),({create,...metadata})=>({...metadata,sources:[...metadata.sources]}));
  function fingerprint(value){let hash=2166136261;for(const c of JSON.stringify(value)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);}
  function mount(id,host,shared={},initialSeed=42,renderOptions={}) {
    const definition=registry.get(id);
    if(!definition)throw new Error(`Unknown drawing tool: ${id}`);
    let instance,tool,ctx,time=0,ticks=0,paused=false,disposed=false,seed=number(initialSeed,42)>>>0;
    const safeSettings=settings(shared);
    const options=Object.fromEntries((definition.controls||[]).map(c=>[c.id,c.default]));
    let palette=palettes[safeSettings.palette];
    function sync(){Object.assign(safeSettings,settings(shared));palette=palettes[safeSettings.palette];}
    const sketch=p=>{
      const colors=new Map();
      function alpha(_p,color,value){
        const a=Math.round(clamp(number(value,255),0,255)),key=`${color}:${a}`;
        if(!colors.has(key)){const c=p.color(color);c.setAlpha(a);colors.set(key,c);}
        return colors.get(key);
      }
      ctx={p,width,height,settings:safeSettings,options,alpha,fingerprint,
        get time(){return time;},get palette(){return palette;},
        wind:{
          offset(phase=0,amplitude=1,frequency=.7){return Math.sin(time*frequency+phase)*safeSettings.wind*amplitude;},
          get strength(){return safeSettings.wind;}
        }
      };
      function rebuild(){sync();p.randomSeed(seed);p.noiseSeed(seed);time=0;ticks=0;tool.reset();}
      p.setup=()=>{
        if(disposed)return;
        p.createCanvas(width,height);p.pixelDensity(1);p.frameRate(30);
        tool=definition.create(ctx);
        if(!tool||typeof tool.reset!=='function'||typeof tool.draw!=='function')throw new Error(`Invalid lifecycle: ${id}`);
        rebuild();host.dataset.ready='true';
      };
      p.draw=()=>{
        if(disposed||!tool)return;
        sync();const dt=paused?0:clamp(p.deltaTime/1000,0,.1);time+=dt;ticks++;
        tool.update?.(dt);
        if(renderOptions.transparent)p.clear();else p.background(palette.bg);p.push();
        try{p.strokeCap(p.ROUND);p.strokeJoin(p.ROUND);tool.draw();}finally{p.pop();}
      };
    };
    instance=new p5(sketch,host);
    return {
      pause(value){if(disposed)return;paused=Boolean(value);if(paused)instance.noLoop();else instance.loop();},
      refresh(){if(!disposed&&paused)instance.redraw();},
      configure(patch){
        if(disposed)return;
        for(const [key,value] of Object.entries(patch)){
          const control=definition.controls?.find(c=>c.id===key);
          if(!control?.choices.some(c=>c.value===value))throw new Error(`Invalid option: ${id}/${key}`);
        }
        Object.assign(options,patch);if(paused)instance.redraw();
      },
      reset(next=seed){if(disposed)return;seed=number(next,seed)>>>0;sync();time=0;ticks=0;if(tool){instance.randomSeed(seed);instance.noiseSeed(seed);tool.reset();if(paused)instance.redraw();}},
      save(){if(!disposed)instance.saveCanvas(`流动诗-${id}-${seed}`,'png');},
      inspect(){return {id,seed,time,ticks,paused,disposed,ready:Boolean(tool),options:{...options},sources:[...definition.sources],...tool?.inspect?.()};},
      anchors(){return disposed?[]:tool?.anchors?.()||[];},
      dispose(){if(!disposed){disposed=true;tool?.dispose?.();instance.remove();host.dataset.ready='false';}}
    };
  }
  return Object.freeze({register,definitions,mount,settings,width,height,paletteFor:name=>palettes[name]||palettes.clear});
})();
