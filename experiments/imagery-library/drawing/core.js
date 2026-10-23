/* Shared, local-only drawing lifecycle. Registered code is authored in this
 * repository; registry ids never resolve to downloaded or model-generated code.
 */
window.PoemDrawing = (() => {
  'use strict';
  const width=640,height=388;
  const registry=new Map();
  const palettes=Object.freeze({
    clear:Object.freeze({bg:'#EEF0E8',main:'#A3B7B0',ink:'#425E59',accent:'#CEBF8A'}),
    tender:Object.freeze({bg:'#F6EAE1',main:'#CFA2A0',ink:'#9E91AB',accent:'#D8B77F'}),
    twilight:Object.freeze({bg:'#EEE6D9',main:'#9BA69B',ink:'#485553',accent:'#C49668'}),
    night:Object.freeze({bg:'#E3E9EC',main:'#849AA2',ink:'#314C58',accent:'#C6C4A7'}),
    pastoral:Object.freeze({bg:'#F1EBDD',main:'#9DAF91',ink:'#817565',accent:'#D6BD79'}),
    joy:Object.freeze({bg:'#FAF0D8',main:'#9BBE7C',ink:'#80B5C0',accent:'#E2A05D'}),
    longing:Object.freeze({bg:'#E7EBED',main:'#8B9FB2',ink:'#706D89',accent:'#D3AD69'}),
    farewell:Object.freeze({bg:'#ECE6DC',main:'#9DA998',ink:'#8F899C',accent:'#BC9272'}),
    solitude:Object.freeze({bg:'#202D3B',main:'#5F778C',ink:'#DCE4E3',accent:'#B69C68'}),
    melancholy:Object.freeze({bg:'#E1DDE2',main:'#A193A5',ink:'#707F91',accent:'#B88E8D'}),
    autumn:Object.freeze({bg:'#D9D1C1',main:'#9D8D75',ink:'#64696B',accent:'#B39A59'}),
    mourning:Object.freeze({bg:'#292E34',main:'#747B82',ink:'#CFD1CE',accent:'#76677D'}),
    concern:Object.freeze({bg:'#302E2D',main:'#81776B',ink:'#C6C0B5',accent:'#91584A'}),
    defiance:Object.freeze({bg:'#241F24',main:'#9F4B42',ink:'#6C707A',accent:'#D3A14E'}),
    heroic:Object.freeze({bg:'#E8F0EB',main:'#65A6B6',ink:'#294F6B',accent:'#D5AF55'}),
    tense:Object.freeze({bg:'#232A2F',main:'#697B84',ink:'#CBD5D4',accent:'#8D5147'}),
    steadfast:Object.freeze({bg:'#EDEDE5',main:'#526F61',ink:'#283F3B',accent:'#A7B1A3'}),
    release:Object.freeze({bg:'#F0EBDD',main:'#A7C0B7',ink:'#C6B589',accent:'#748E9C'}),
    mineral:Object.freeze({bg:'#E8E6D1',main:'#2C9A82',ink:'#184E68',accent:'#DEA742'}),
    cinnabar:Object.freeze({bg:'#FFE5BD',main:'#D36544',ink:'#69395D',accent:'#E2B74E'}),
    gilded:Object.freeze({bg:'#132B38',main:'#2C8C91',ink:'#E8C77A',accent:'#F6DE9F'}),
    indigo:Object.freeze({bg:'#18294B',main:'#496EAE',ink:'#D2E4E9',accent:'#E8B569'})
  });
  // The sixteen named schemes follow docs/设计规范.md; vivid variants are local
  // landscape choices, not an automatic diagnosis of a poem's emotion.
  const paletteGroups=[['鲜明山色',[['mineral','青绿山水'],['cinnabar','朱砂晚照'],['gilded','金碧夜游'],['indigo','靛蓝月色']]],['情感配色',[['clear','清寂澄明'],['pastoral','闲适恬淡'],['joy','明快欣悦'],['tender','温柔缱绻'],['longing','思念牵挂'],['farewell','依依惜别'],['solitude','孤独清冷'],['melancholy','惆怅失落'],['autumn','苍凉迟暮'],['mourning','哀伤悼念'],['concern','沉痛忧愤'],['defiance','激愤抗争'],['heroic','豪迈昂扬'],['tense','紧张肃杀'],['steadfast','坚贞清峻'],['release','旷达释然']]],['暮夜淡彩',[['twilight','暮色微暖'],['night','夜色淡墨']]]];
  const paletteOptions=()=>paletteGroups.flatMap(([group,items])=>items.map(([id,label])=>({id,label,group,colors:{...palettes[id]}})));
  const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
  const number=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
  const tonalCache=new Map();
  const mix=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('').toUpperCase();
  function paletteFor(name,visual){
    const base=palettes[name]||palettes.clear;if(!visual?.role)return base;
    const {role,depth='middle'}=visual,key=name+':'+role+':'+depth;if(tonalCache.has(key))return tonalCache.get(key);
    const local=name==='mineral'?{mountain:{main:'#7C9EA9',ink:'#476E89',accent:'#BED1BF'},vegetation:{main:'#3D8D66',ink:'#284F49',accent:'#CBAC63'},water:{main:'#8BBDB5',ink:'#3D8492',accent:'#DADAB3'},ground:{main:'#BCC9A2',ink:'#718A69',accent:'#CBBE89'},architecture:{main:'#BBAE8A',ink:'#48605C',accent:'#D5AB64'},rock:{main:'#8DAF9F',ink:'#4A7777',accent:'#B4C2A5'}}[role]:null;
    const p={...base,...local};
    if(!local){
      if(role==='mountain')Object.assign(p,{main:mix(base.ink,base.bg,.64),ink:mix(base.ink,base.main,.35)});
      if(role==='water')Object.assign(p,{main:mix(base.main,base.bg,.36),ink:mix(base.ink,base.main,.38)});
      if(role==='ground')Object.assign(p,{main:mix(base.main,base.accent,.28),ink:mix(base.ink,base.main,.2)});
      if(role==='architecture')p.main=mix(base.main,base.accent,.38);
      if(role==='blossom')Object.assign(p,{main:mix(base.main,base.accent,.58),flower:base.accent});
    }
    if(role==='blossom')p.flower=base.accent;
    if(role==='figure')p.light=mix('#FFFBEF',base.bg,.08);
    if(role==='snow'){p.light=mix('#F6F8FF',base.bg,.12);p.ink=mix('#EAF1F6',base.bg,.18);}
    const fade=depth==='far'?.22:depth==='middle'?.06:0;
    p.main=mix(p.main,base.bg,fade);p.ink=mix(p.ink,base.bg,fade*.8);
    tonalCache.set(key,Object.freeze(p));return tonalCache.get(key);
  }
  function settings(input={}) {
    return {wind:clamp(number(input.wind,.35)),density:clamp(number(input.density,.45)),motion:clamp(number(input.motion,1),0,2),palette:Object.hasOwn(palettes,input.palette)?input.palette:'clear'};
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
    const timeScale=clamp(number(renderOptions.timeScale,1),0,2);
    const safeSettings=settings(shared);
    const options=Object.fromEntries((definition.controls||[]).map(c=>[c.id,c.default]));
    let palette=paletteFor(safeSettings.palette,renderOptions.visual);
    const windAmplitude=clamp(number(renderOptions.performance?.amplitude,1),0,2),windPhase=number(renderOptions.performance?.phase,0);
    function sync(){Object.assign(safeSettings,settings(shared));palette=paletteFor(safeSettings.palette,renderOptions.visual);}
    const sketch=p=>{
      const colors=new Map();
      function alpha(_p,color,value){
        const a=Math.round(clamp(number(value,255),0,255)),key=`${color}:${a}`;
        if(!colors.has(key)){const c=p.color(color);c.setAlpha(a);colors.set(key,c);}
        return colors.get(key);
      }
      ctx={p,width,height,settings:safeSettings,options,alpha,fingerprint,singleUnit:renderOptions.singleUnit===true,
        get time(){return time;},get palette(){return palette;},
        wind:{
          offset(phase=0,amplitude=1,frequency=.7){const m=safeSettings.motion,gain=m<=1?m:1+(m-1)*2,gust=renderOptions.performance?.rhythm==='gust'?.8+.2*Math.sin(time*.24+windPhase):1;return Math.sin(time*frequency+phase)*safeSettings.wind*amplitude*gain*windAmplitude*gust;},
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
        sync();const dt=paused?0:clamp(p.deltaTime/1000,0,.1)*timeScale*safeSettings.motion;time+=dt;ticks++;
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
      inspect(){return {id,seed,time,timeScale,ticks,paused,disposed,ready:Boolean(tool),visual:renderOptions.visual&&{...renderOptions.visual},performance:renderOptions.performance&&{...renderOptions.performance},palette:{...palette},options:{...options},sources:[...definition.sources],...tool?.inspect?.()};},
      anchors(){return disposed?[]:tool?.anchors?.()||[];},
      dispose(){if(!disposed){disposed=true;tool?.dispose?.();instance.remove();host.dataset.ready='false';}}
    };
  }
  return Object.freeze({register,definitions,mount,settings,paletteOptions,width,height,paletteFor});
})();
