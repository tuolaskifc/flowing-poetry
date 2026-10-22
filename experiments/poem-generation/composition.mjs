// Quantity semantics stop at counts/extent. Seeds, repetitions, depth and
// positions below are local artistic choices, never model coordinates.
const fieldTools=new Set(['dwelling','tree','flower','grass','bamboo','orchid','lotus','willow','plum-branch','flower-forms']);
const singleUnitTools=new Set(['figure','bird','dwelling','tree','lotus','willow','orchid','horse','oriole','fish','boat','moon','rock','building','pavilion','wine','plum-branch','flower-forms','flower','bamboo','grass','leaves']);
const defaults={figure:1,bird:4,oriole:3,dwelling:1,tree:3,flower:10,grass:15,bamboo:6,orchid:3,lotus:8,willow:4};
const many={dwelling:6,building:4,bird:9,oriole:7,tree:14,flower:26,grass:36,bamboo:18,orchid:12,lotus:16,willow:7,'plum-branch':4,'flower-forms':14,fish:9,rock:7,leaves:24};
function random(seed){let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
function legacyQuantity(entity,poem){
  // Old records have no model quantity. Only use a local, clearly labelled
  // collective hint inside a clause containing this entity's own mention.
  const clauses=poem.split(/[，。；！？,;!?]/).filter(c=>entity.mentions.some(m=>c.includes(m)));
  const spread=clauses.some(c=>/无穷|满地|满园|遍地|接天|成片|花海|花满|竹林|乱花/.test(c));
  return {mode:spread?'many':'unspecified',min:null,max:null,unit:null,scope:'unspecified',extent:spread?'spread':'unspecified',evidence:spread?clauses:[]};
}
export function compose(analysis,layers,seed){
  const notes=[],rng=random(seed),isLotusBed=layers.some(l=>l.tool==='lotus'&&l.options.form==='leaf')&&layers.some(l=>l.tool==='lotus'&&l.options.form==='flower');
  let budget=112;
  for(const [layerIndex,layer] of layers.entries()){
    const entities=layer.entities.map(id=>analysis.entities.find(e=>e.id===id));
    const quantities=entities.map(e=>({entity:e,q:e.quantity||legacyQuantity(e,analysis.poem),basis:e.quantity?'model':'local-legacy'}));
    const woodland=layer.tool==='tree'&&entities.some(e=>e.mentions.some(m=>/林/.test(m)));
    const leaf=layer.tool==='lotus'&&layer.options.form==='leaf';let count=0,exact=true,collective=false,partUnsupported=false;
    const projected=quantities.filter(v=>layer.projectedEntities?.includes(v.entity.id)),counting=quantities.filter(v=>!layer.projectedEntities?.includes(v.entity.id));
    if(projected.length&&!counting.length){count=1;exact=false;notes.push(layer.tool==='boat'?`${layer.names.join('、')}以一舟借形，尚未单画帆；多帆与船数不能机械等同。`:`${layer.names.join('、')}以一匹马借形；局部的蹄数不当作马匹数量。`);}
    for(const {q} of counting){
      if(layer.tool==='dwelling'&&entities.some(e=>e.mentions.some(m=>/^(?:(?:孤|荒|山|小|远|近)?村(?:庄|落)?|墟里)$/.test(m)))){count+=3;exact=false;collective=true;continue;}
      if(['bird','oriole'].includes(layer.tool)&&q.scope==='group'&&['双','对'].includes(q.unit)&&['exact','range'].includes(q.mode)){count+=Math.round((q.min+q.max)/2)*2;exact&&=q.mode==='exact';continue;}
      if(layer.options.form==='blossom'&&!(q.scope==='individual'&&['株','树','棵'].includes(q.unit))){const grove=q.scope!=='part'&&(q.mode==='many'||q.extent==='spread');count+=grove?7:1;collective||=grove;exact=false;continue;}
      if(woodland&&q.mode==='unspecified'){count+=14;collective=true;exact=false;continue;}
      const part=(q.scope==='part'&&!(layer.tool==='plum-branch'&&q.unit==='枝'))||(layer.tool==='plum-branch'&&/朵|瓣/.test(q.unit||''));
      if(part){partUnsupported=true;exact=false;count+=1;continue;}
      if(q.mode==='exact'&&q.scope==='individual'){count+=q.min;}
      else if(q.mode==='exact'&&layer.tool==='plum-branch'&&q.unit==='枝'){count+=q.min;}
      else if(q.mode==='range'&&(q.scope==='individual'||layer.tool==='plum-branch'&&q.unit==='枝')){count+=Math.round((q.min+q.max)/2);exact=false;}
      else if(q.mode==='few'){count+=3;exact=false;}
      else if(q.mode==='many'||['group','extent'].includes(q.scope)||q.extent==='spread'){
        count+=leaf?40:many[layer.tool]||1;collective=true;exact=false;
      }else{count+=leaf?18:defaults[layer.tool]||1;exact=false;}
    }
    const countable=singleUnitTools.has(layer.tool)||layer.tool==='landscape'&&layer.options.relief==='single';
    if(!countable){count=1;exact=false;}
    const requested=count;count=Math.max(1,Math.min(count,48,Math.max(1,budget-(layers.length-layerIndex-1))));budget-=count;
    if(count!==requested)notes.push(`${layer.names.join('、')}本地构图原拟画 ${requested} 个单元，受预算限制本次显示 ${count} 个；语义数量仍保留在解读中。`);
    if(!countable&&quantities.some(v=>v.q.mode!=='unspecified'))notes.push(`${layer.names.join('、')}的数量解释已保留，当前工具以整体图层表现，内部笔触尚未按数量逐个适配。`);
    if(partUnsupported)notes.push(`${layer.names.join('、')}的数量指局部，当前缺少对应局部计数画法，未按枝叶数量复制整株。`);
    const instances=[];
    for(let i=0;i<count;i++){
      const placement=structuredClone(layer.placement);let depth=i/count,opacity=1;
      if(['bird','oriole'].includes(layer.tool)){
        const aquatic=layer.options.pose==='waterbird',t=(i+.5)/count;depth=t;placement.anchor=[320,190];placement.at=[.16+((i*.61803398875+rng()*.13)%1)*.68,aquatic?.67+rng()*.19:.18+rng()*.32];placement.scale=(aquatic?.70:.5)+t*.35;opacity=.70+t*.3;
        if(quantities.some(v=>v.q.scope==='group'&&v.q.unit==='行')){placement.at=[.17+t*.68,.25+Math.sin(t*Math.PI)*.12];placement.scale=.55+t*.25;}
      }
      else if(layer.tool==='water')Object.assign(placement,{at:[.5,.46],scale:1.6});
      else if(layer.tool==='willow'&&count===1)Object.assign(placement,{at:[.14,.96],scale:1.7});
      else if(layer.tool==='lotus'){
        // A lotus field uses the glyph's leaf/flower center, not the empty
        // margins around the 640x388 source canvas. No water is invented.
        const t=count===1?.65:Math.min(.98,Math.max(.08,(i+.35+rng()*.45)/count));
        depth=t;const x=((i*.61803398875+.13+rng()*.13)%1)*1.12-.06;
        placement.anchor=leaf?[320,218]:[328,169];
        placement.at=[count===1?.52:x,leaf?.4+t*.58:.32+t*.48];
        placement.scale=(leaf?.32: .30)+t*(leaf?1.05:.82);
        if(!isLotusBed&&!collective&&count===1){placement.at=[.5,.6];placement.scale=1.4;}
        opacity=.48+t*.52;
      }else if(fieldTools.has(layer.tool)&&count>1){
        const t=(i+.5)/count;depth=t;
        placement.at=[.08+((i*.61803398875+rng()*.14)%1)*.84,.65+t*.32];
        placement.scale=.38+t*.68;opacity=.58+t*.42;
        if(layer.tool==='tree'){placement.anchor=[320,388];placement.at=[.03+((i*.61803398875+rng()*.1)%1)*.94,.60+t*.45];placement.scale=.45+t*1.4;opacity=.65+t*.35;}
        if(layer.tool==='flower')placement.anchor=[320,388];
        if(layer.tool==='grass')placement.anchor=[320,310];
        if(layer.tool==='bamboo')placement.anchor=[320,335];
        if(layer.tool==='orchid'&&layer.options.form==='flower')placement.anchor=[320,192];
      }else if(count>1){
        // Exact small counts remain distinct; avoid copies piled at one point.
        const columns=Math.min(count,5),row=Math.floor(i/columns),column=i%columns;
        placement.at=[.18+(column+.5)*.64/columns,Math.min(.88,layer.placement.at[1]+row*.12)];
        placement.scale=layer.placement.scale*(count<=3?.94:.65);depth=row*.1;
      }else if(['boat','horse','fish','rock'].includes(layer.tool))placement.scale*=1.22;
      if(layer.tool==='orchid'&&layer.options.form==='flower')placement.anchor=[320,192];
      instances.push({placement,depth,opacity,variant:i%Math.min(3,count)});
    }
    layer.instances=instances;layer.singleUnit=countable;layer.quantity={items:quantities.map(({entity,q,basis})=>({entity:entity.id,...q,basis})),rendered:count,exact:exact&&count===requested&&!partUnsupported,collective,partUnsupported};
    layer.quantityLabel=projected.length&&!counting.length?(layer.tool==='boat'?'由帆借形为一舟，帆面尚未绘制':'由马蹄借形为一匹马，马匹数未明'):partUnsupported?'局部数量尚未实现':!countable?'整体笔触图层；内部数量尚未适配':layer.quantity.exact?`按提取数量绘制 ${count} 个`:collective?`成片分布；本地试画 ${count} 个单元`:quantities.every(v=>v.q.mode==='exact')?`计数目标 ${requested}；受限显示 ${count} 个`:quantities.some(v=>v.q.mode==='range')?`原文为数量范围；本地试画 ${count} 个`:`数量未精确；本地试画 ${count} 个单元`;
  }
  notes.push('未明说的群落数量、疏密、近中远层次与变体均为本地构图选择；种类可按已声明的写意画法概括，不把铺展词换算成精确物体数量。');
  return {layers,notes};
}
