(() => {
  'use strict';
  const $=id=>document.getElementById(id),poem=$('poem');let source=null,latest=null,sdkPromise,candidateBatch=[],catalog=null,trials=[];
  const status=text=>{$('status').textContent=text;};
  function syncViewingControls(settings){
    $('palette').value=settings.palette;
    for(const button of document.querySelectorAll('[data-palette]'))button.setAttribute('aria-pressed',String(button.dataset.palette===settings.palette));
    const motion=settings.motion??1.4;
    if($('motion')){$('motion').value=motion;$('motion').setAttribute('aria-valuetext',motion===0?'静观':Math.round(motion*100)+'%');}
    if($('motion-value'))$('motion-value').textContent=(motion===0?'静观':motion<1?'轻柔':motion<=1.5?'流动':'鲜明')+(motion?' · '+Math.round(motion*100)+'%':'');
  }
  function choosePalette(value){window.PoemTrialScene.update({palette:value});syncViewingControls(window.PoemTrialScene.inspect().settings);}
  const options=window.PoemDrawing.paletteOptions();$('palette').replaceChildren();
  for(const group of [...new Set(options.map(o=>o.group))]){
    const el=document.createElement('optgroup');el.label=group;
    for(const item of options.filter(o=>o.group===group)){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;el.append(option);}$('palette').append(el);
  }
  for(const id of ['mineral','cinnabar','gilded','indigo','joy','clear']){
    if(!$('palette-swatches'))break;const scheme=options.find(o=>o.id===id),button=document.createElement('button');button.type='button';button.dataset.palette=id;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',scheme.label);button.title=scheme.label;
    const colors=document.createElement('span');colors.className='swatch-colors';colors.setAttribute('aria-hidden','true');for(const value of Object.values(scheme.colors)){const chip=document.createElement('i');chip.style.backgroundColor=value;colors.append(chip);}const name=document.createElement('span');name.textContent=scheme.label;button.append(colors,name);button.addEventListener('click',()=>choosePalette(id));$('palette-swatches').append(button);
  }
  const clearList=id=>{$(id).replaceChildren();};
  const clearCandidateSelection=()=>{for(const button of document.querySelectorAll('[data-candidate]'))button.setAttribute('aria-pressed','false');};
  function item(id,text){const li=document.createElement('li');li.textContent=text;$(id).append(li);return li;}
  function busy(value){for(const id of ['generate','fetch-poem','sample','replay','recommend','library-choice'])if($(id))$(id).disabled=value||(!catalog&&['recommend','library-choice'].includes(id));for(const button of document.querySelectorAll('[data-candidate]'))button.disabled=value||button.dataset.drawable==='false';poem.disabled=value;poem.setAttribute('aria-busy',String(value));}
  function librarySelection(entry){
    if($('library-choice'))$('library-choice').value=entry?.id||'';
    if(!$('library-goal'))return;$('library-goal').hidden=!entry;
    if(entry){$('library-goal-text').textContent=(entry.focus?'首批重点 · ':'')+entry.goal;$('library-gap').textContent='当前缺口：'+(entry.gaps||[]).join('；');$('library-entry').href='/poem-flow/library.html#'+entry.id;}
  }
  function chooseCurated(entry){
    if(!entry)return;clearCandidateSelection();poem.value=entry.poem;source=window.PoemCuratedLibrary.sourceFor(entry);librarySelection(entry);
    $('source').textContent='精选诗句库 · '+entry.dynasty+' · '+entry.author+'《'+entry.title+'》';
    status((entry.focus?'已选择首批改画样本。':'已选择精选诗句。')+'点击“生成画面”开始分析；选句本身不调用模型。');
  }
  function populateLibrary(){
    const select=$('library-choice');if(!select)return;
    for(const focus of [true,false]){const entries=catalog.poems.filter(p=>p.focus===focus),group=document.createElement('optgroup');group.label=focus?'首批改画 · '+entries.length+' 组':'其他精选';for(const entry of entries){const option=document.createElement('option');option.value=entry.id;option.textContent=entry.poem+' · '+entry.author;group.append(option);}select.append(group);}
  }
  function chooseCandidate(candidate){
    poem.value=candidate.poem;source=candidate.source;librarySelection(null);
    $('source').textContent=[source.provider,source.dynasty,source.author,source.title&&'《'+source.title+'》'].filter(Boolean).join(' · ');
    for(const button of document.querySelectorAll('[data-candidate]'))button.setAttribute('aria-pressed',String(candidateBatch[Number(button.dataset.candidate)]===candidate));
  }
  function chooseTrial(entry){
    chooseCurated(entry);source={...window.PoemCuratedLibrary.sourceFor(entry),provider:'泛化新句试验'};
    $('source').textContent='泛化新句试验 · '+entry.dynasty+' · '+entry.author+'《'+entry.title+'》';
    $('library-goal-text').textContent=entry.goal;$('library-gap').textContent='试验目标，不代表已通过；完整记录见新句试验页。';$('library-entry').href='/poem-flow/generalization-review.html#'+entry.id;
    status('已选择新句试验。点击“生成画面”才会调用模型，已有结果可到试验页查看。');
  }
  function renderCandidates(batch){
    candidateBatch=batch.candidates;const panel=$('candidate-panel');if(!panel)return;
    panel.hidden=false;$('candidate-summary').textContent='本轮候选 · '+candidateBatch.length+' 句'+(batch.duplicates?'（已去重 '+batch.duplicates+' 句）':'');$('candidates').replaceChildren();
    const definitions=window.PoemDrawing.definitions();
    candidateBatch.forEach((candidate,index)=>{
      const button=document.createElement('button');button.type='button';button.dataset.candidate=String(index);button.dataset.drawable=String(candidate.selection.toolCount>0);button.setAttribute('aria-pressed','false');
      const verse=document.createElement('span');verse.textContent=candidate.poem;
      const note=document.createElement('small'),names=[...new Set(candidate.selection.hits.map(h=>definitions.find(d=>d.id===h.tool)?.name||h.word))];
      note.textContent=names.length?'初筛 '+names.length+' 类：'+names.join('、')+(candidate.selection.wind?'；另有风线索':''):'未匹配到已有画法';
      button.append(verse,note);button.disabled=true;button.addEventListener('click',()=>{chooseCandidate(candidate);status('已选择候选诗句，点击“生成画面”进行语义分析。');});$('candidates').append(button);
    });
  }
  function sdk(){
    if(window.jinrishici)return Promise.resolve();if(sdkPromise)return sdkPromise;
    sdkPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://sdk.jinrishici.com/v2/browser/jinrishici.js';script.charset='utf-8';script.onload=resolve;script.onerror=()=>reject(new Error('今日诗词暂时连接不上，可以手动输入或使用样句。'));document.head.append(script);}).catch(error=>{sdkPromise=null;throw error;});return sdkPromise;
  }
  async function fetchPoem(){
    busy(true);status('正在向今日诗词取候选句……');
    try{
      let timer;try{await Promise.race([sdk(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('今日诗词连接超时，可以手动输入或使用样句。')),8000);})]);}finally{clearTimeout(timer);}
      const batch=await window.PoemRecommendation.collectCandidates(()=>new Promise((resolve,reject)=>window.jinrishici.load(resolve,error=>reject(new Error(error?.errMessage||'今日诗词暂时连接不上。')))),{onProgress:({attempts,limit})=>status('正在取候选 '+attempts+'／'+limit+'，随后在本地筛选……')});
      renderCandidates(batch);
      const best=candidateBatch.find(c=>c.selection.toolCount>0),prefix=batch.error?'本轮提前结束：'+batch.error+' ':'';
      if(best){chooseCandidate(best);status(prefix+'已取到 '+candidateBatch.length+' 句不同诗句，优先选择了 '+best.selection.toolCount+' 类可画线索。'+(best.selection.toolCount<2?'本轮匹配较少，可以换一批。':'')+'点击“生成画面”开始分析。');}
      else status(prefix+'本轮没有匹配到合适的可画意象，已保留原输入。可以手动换一批，或使用本地推荐。');
    }catch(error){status(error.message);}finally{busy(false);}
  }
  async function show(record){
    if(record.plan?.renderability?.status==='unavailable'){status('解读已完成，但本句主要内容尚无可靠画法，未生成新画面；如有画面仍为上次结果。可以换一句，或到景意交融页尝试抽象表达。');return;}
    if(!record.validation?.valid){status('本次分析没有通过检查，未生成新画面；下方如有画面仍为上次结果。问题记录已保存，可以换一句或稍后再试。');return;}
    const a=record.effectiveAnalysis||record.analysis,{plan}=record;
    $('output').hidden=false;$('reading').textContent=a.reading;$('scene-title').textContent=record.poem;
    $('record-info').textContent=(record.cached?'回看已保存结果':'本次实际分析')+' · '+record.elapsed_seconds+' 秒'+(record.sourceContext?.applied?' · 引用范围已展开，解读待复核':'');
    for(const id of ['entities','uncertainties','drawn','omitted','notes','relations','credits'])clearList(id);
    for(const e of a.entities){const q=plan.sourceResolution?.quantities?.[e.id]||e.quantity,scope=q&&{individual:'个体',part:'局部',group:'群体单位',extent:'范围单位',unspecified:'计数对象未明'}[q.scope],quantity=q?(q.mode==='exact'?q.min+(q.unit||'')+'，'+scope:q.mode==='range'?q.min+'–'+q.max+(q.unit||'')+'，'+scope:q.mode==='many'?'繁多／群体':q.mode==='few'?'少量，未精确':'数量未明'):'旧记录未提取数量';item('entities',e.mentions.join('／')+' → '+e.concept+'（'+(e.role==='reference'?'比喻参照':{present:'在场',absent:'缺席',unclear:'出现情况待定'}[e.presence])+'；'+quantity+(q?.extent==='spread'?'；铺展':'')+'）');}
    $('atmosphere').textContent='文字气息：'+(a.atmosphere.labels.join('、')||'未确定')+(plan.semanticConsumption?'。气息已参与有限配色、远景淡化和节奏；你仍可手动调整。':'。本轮配色由你选择，尚未自动映射全部情感类型。');
    for(const issue of a.uncertainties)item('uncertainties',issue);
    for(const layer of plan.layers){const def=window.PoemDrawing.definitions().find(d=>d.id===layer.tool);item('drawn',layer.names.join('、')+' → '+(layer.drawingLabel||def.name)+(layer.quantityLabel?' · '+layer.quantityLabel:'')+(layer.animate?'':'（静止）'));}
    if(!plan.layers.length)item('drawn','本句没有匹配到现有工具；当前仅有底色，请换一句或试试样句。');
    for(const missing of plan.omitted)item('omitted',missing.name+'：'+missing.reason);
    if(!plan.omitted.length)item('omitted','本次列出的场景意象均找到了基础工具；仍不代表全部关系已表现。');
    for(const note of plan.notes)item('notes',note);
    const organization=plan.scene?.organization;
    if($('semantic-summary')){
      const consumption=plan.semanticConsumption;
      clearList('semantic-applied');clearList('semantic-pending');
      $('semantic-summary').textContent=consumption?'本次有 '+consumption.summary.applied+' 项解释用于画面，'+(consumption.summary.unsupported+consumption.summary.partial)+' 项尚未充分表现。原文明示与推断保留区分。':'这条旧记录没有整体场景语义；回看仍使用已有的本地构图。';
      const label=path=>path==='scene.setting'?'整体环境':path.startsWith('scene.groups')?({role:'主次',pattern:'群落',depth:'远近'}[path.split('.').at(-1)]||'分组'):path.startsWith('scene.supports')?'依托':path.startsWith('scene.actions')?({state:'动作状态',pace:'节奏',direction:'趋向'}[path.split('.').at(-1)]||'动作'):path.includes('visibility')?'可见度':path.includes('illumination')?'照明':path==='atmosphere.energy'?'气息强度':path==='atmosphere.openness'?'开阔度':path==='atmosphere.valence'?'感受倾向':'时间线索';
      const words={fly:'飞行',flow:'水流',float:'浮动',sway:'摇曳',fall:'飘落',rise:'上升',still:'静止',single:'单体',cluster:'丛组',grove:'树丛',flock:'群体',field:'铺展',scattered:'分散',near:'近景',middle:'中景',far:'远景',hazy:'迷蒙',dark:'昏暗',clear:'清明',twilight:'暮色',night:'夜色',day:'白昼',unclear:'未明',tender:'暖柔'};
      const translate=text=>text.replace(/\b[a-z_]+\b/g,w=>words[w]||w);
      for(const entry of consumption?.items||[]){
        const target=entry.status==='applied'?'semantic-applied':'semantic-pending',li=item(target,label(entry.path)+'：'+translate(entry.effect)+(entry.basis==='inferred'?'（解读推断）':''));
        if(entry.evidence?.length){const evidence=document.createElement('small');evidence.textContent=' 依据：'+entry.evidence.join('／');li.append(evidence);}
      }
    }
    if($('organization-summary')){
      const audit=organization?.audit;
      $('organization-summary').textContent=organization?({
        'general-constraints':'已先划分环境与活动区域，并比较三种布局。',
        'regional-proposal':'沿用已有的场景构图，并检查数量与依托。',
        'isolated-study':'这次以局部意象练习呈现。'
      }[organization.strategy]||'')+(audit?.errors?'还有 '+audit.errors+' 项构图问题。':audit?.review?'还有 '+audit.review+' 项需要复核。':'已通过当前适用的构图检查。'):'这条旧记录尚无构图检查。';
      clearList('organization-issues');for(const issue of audit?.issues||[])item('organization-issues',issue.message);
    }
    for(const r of plan.spatial||[])item('relations',(a.entities.find(e=>e.id===r.source)?.mentions.join('／')||r.source)+' → '+(a.entities.find(e=>e.id===r.target)?.mentions.join('／')||r.target)+'：'+r.reason+(r.basis==='inferred'?'（语义推断）':''));
    for(const r of plan.relations)item('relations',r.meaning+'：'+(r.visualized?'以风响应试作表现':'尚未在画面实现'));
    if(record.mode!=='full')item('relations',record.mode==='composition'?'本次整体场景语义已参与分组、远近、依托、有限动作与气息；多阶段事件和完整因果仍待实现。':record.mode==='scene'?'本次提取意象、数量与有限空间关系；完整动作和时间关系仍待实现。':record.mode==='quantity'?'本次提取基础意象及数量范围，尚未请求完整关系抽取。':'本次为旧版基础意象模式，未请求完整关系抽取。');
    const sourceIds=[...new Set(plan.layers.flatMap(l=>window.PoemDrawing.definitions().find(d=>d.id===l.tool).sources))];
    for(const id of sourceIds){const s=window.PoemDrawingSources[id],li=item('credits',s.author+(s.license?' · '+s.license:' · 本项目试作')+'。'+s.note);if(s.url){const link=document.createElement('a');link.href=s.url;link.textContent=' 原来源 ↗';link.target='_blank';link.rel='noopener noreferrer';li.append(link);}}
    $('usage').textContent='记录 '+record.id+'；模型 '+record.model+'；本次记录 token '+(record.usage?.total_tokens??'未返回')+'。'+(record.cached?'正在回看，没有新增模型调用。':'用量以本次接口返回为准。');
    syncViewingControls(plan.settings);$('pause').textContent='暂停';$('pause').setAttribute('aria-pressed','false');
    if($('composition')){
      $('composition').replaceChildren();$('composition-control').hidden=!plan.compositions?.length;
      for(const c of plan.compositions||[]){const option=document.createElement('option');option.value=c.id;option.textContent=c.label;$('composition').append(option);}
      $('composition').value=plan.composition||'';
      $('composition-note').hidden=!plan.compositions?.length;
      $('composition-note').textContent=plan.scene.landscape?.description||'';
    }
    const moon=plan.layers.find(l=>l.tool==='moon');$('moon-control').hidden=!moon;if(moon)$('moon-shape').value=moon.options.shape;
    if($('wind'))$('wind').value=plan.settings.wind;
    await window.PoemTrialScene.render(plan);
    latest=record;$('replay').hidden=false;if($('welcome'))$('welcome').hidden=true;
    if($('empty-scene'))$('empty-scene').hidden=plan.layers.length>0;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){window.PoemTrialScene.pause(true);$('pause').textContent='继续';$('pause').setAttribute('aria-pressed','true');}
    status(plan.layers.length?(organization?.audit?.errors?'已生成试画，构图仍有问题，详见“画面组织与检查”。':'已生成画面。')+(plan.omitted.length?'有 '+plan.omitted.length+' 项尚未绘制，详见“保留的空缺”。':'可以调整风力、构图或保存画面。'):'分析已完成，但本句尚无可绘制的意象。请换一句或试试样句。');
  }
  $('fetch-poem').addEventListener('click',fetchPoem);
  $('recommend')?.addEventListener('click',()=>{if(catalog)chooseCurated(window.PoemCuratedLibrary.next(catalog,poem.value));});
  $('library-choice')?.addEventListener('change',e=>{const trial=trials.find(c=>c.id===e.target.value),entry=window.PoemCuratedLibrary.find(catalog,e.target.value);if(trial)chooseTrial(trial);else if(entry)chooseCurated(entry);});
  $('sample').addEventListener('click',()=>{clearCandidateSelection();librarySelection(null);poem.value='风乍起，吹皱一池春水。';source={provider:'手动试画样句',author:'冯延巳',title:'谒金门·风乍起',dynasty:'五代'};$('source').textContent='手动试画样句 · 冯延巳《谒金门·风乍起》';status('已填入样句，点击“生成画面”开始分析。');});
  poem.addEventListener('input',()=>{source=null;librarySelection(null);$('source').textContent='手动输入';clearCandidateSelection();});
  $('generate').addEventListener('click',async()=>{
    if(!poem.value.trim()){status('请先取一句或输入诗句。');return;}
    busy(true);status('正在分析诗句，再由本地规则组织画面……');
    try{const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({poem:poem.value,source})}),data=await response.json();if(!data.record)throw new Error(data.error||'分析失败，请稍后手动再试。');await show(data.record);}catch(error){status(error.message);}finally{busy(false);}
  });
  $('replay').addEventListener('click',async()=>{if(latest){busy(true);clearCandidateSelection();try{poem.value=latest.poem;source=latest.source;librarySelection(catalog?.poems.find(p=>p.poem===latest.poem));$('source').textContent=source?[source.provider,source.author,source.title].filter(Boolean).join(' · '):'已保存的诗句';await show({...latest,cached:true});}catch(error){status(error.message);}finally{busy(false);}}});
  $('pause').addEventListener('click',()=>{const paused=$('pause').getAttribute('aria-pressed')!=='true';window.PoemTrialScene.pause(paused);$('pause').textContent=paused?'继续':'暂停';$('pause').setAttribute('aria-pressed',String(paused));});
  $('reseed').addEventListener('click',()=>window.PoemTrialScene.reseed());$('save').addEventListener('click',()=>window.PoemTrialScene.save());
  $('palette').addEventListener('change',e=>choosePalette(e.target.value));$('moon-shape').addEventListener('change',e=>window.PoemTrialScene.moon(e.target.value));
  $('motion')?.addEventListener('input',e=>{window.PoemTrialScene.update({motion:Number(e.target.value)});syncViewingControls(window.PoemTrialScene.inspect().settings);});
  $('composition')?.addEventListener('change',async e=>{
    const select=e.target;select.disabled=true;
    try{const scene=await window.PoemTrialScene.composition(select.value);if(!$('moon-control').hidden)window.PoemTrialScene.moon($('moon-shape').value);$('composition-note').textContent=scene.landscape.description;status('已切换为“'+scene.landscape.label+'”，沿用同一份诗句解读，没有新增模型调用。');}catch(error){status(error.message);}finally{select.disabled=false;}
  });
  $('wind')?.addEventListener('input',e=>window.PoemTrialScene.update({wind:Number(e.target.value)}));
  $('reset-layout')?.addEventListener('click',()=>window.PoemTrialScene.resetLayout());
  function immersive(value){document.body.classList.toggle('immersive',value);$('immersive').setAttribute('aria-pressed',String(value));$('immersive').textContent=value?'返回诗句 ⤡':'沉浸观看 ⤢';}
  $('immersive')?.addEventListener('click',()=>immersive(!document.body.classList.contains('immersive')));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('immersive'))immersive(false);});
  busy(true);
  const loadLibrary=fetch('/experiments/poem-generation/curated-poems.json').then(r=>{if(!r.ok)throw new Error('library unavailable');return r.json();}).then(data=>window.PoemCuratedLibrary.validate(data)).catch(()=>null);
  const loadTrials=fetch('/experiments/poem-generation/generalization-cases.json').then(r=>r.ok?r.json():null).then(d=>d?.cases||[]).catch(()=>[]);
  const pageQuery=new URLSearchParams(location.search);
  const replayKey=pageQuery.has('review')?'review':'study';
  const loadStudy=pageQuery.has(replayKey)?fetch('/poem-flow/'+(replayKey==='review'?'composition-studies.json':'landscape-studies.json')).then(r=>r.ok?r.json():null).then(d=>d?.cases.find(c=>c.id===pageQuery.get(replayKey))).catch(()=>null):Promise.resolve(null);
  Promise.all([fetch('/api/status').then(r=>r.json()),fetch('/api/latest').then(r=>r.json()),loadLibrary,loadTrials,loadStudy]).then(async([config,saved,data,trialCases,study])=>{
    catalog=data;if(saved.record){latest=saved.record;$('replay').hidden=false;}
    trials=trialCases;if(catalog){populateLibrary();if(trials.length&&$('library-choice')){const group=document.createElement('optgroup');group.label='新句试验 · '+trials.length+' 组';for(const trial of trials){const option=document.createElement('option');option.value=trial.id;option.textContent=trial.poem+' · '+trial.author;group.append(option);}$('library-choice').append(group);}const query=new URLSearchParams(location.search),requested=query.get('poem'),trial=trials.find(c=>c.id===query.get('trial'));if(trial)chooseTrial(trial);else chooseCurated(window.PoemCuratedLibrary.find(catalog,requested)||window.PoemCuratedLibrary.ordered(catalog)[0]);if(!config.configured)status('精选诗句库已载入；分析接口尚未配置。');}
    else status('精选诗句库暂未载入，可以手动输入；'+(config.configured?'分析接口已就绪。':'分析接口尚未配置。'));
    if(study){
      const r=study.record;poem.value=r.poem;source=r.source;librarySelection(catalog?.poems.find(p=>p.poem===r.poem));$('source').textContent='风景构图试看 · '+[r.source?.author,r.source?.title].filter(Boolean).join(' · ');await show(r);
      const composition=pageQuery.get('composition');if(r.plan.compositions?.some(c=>c.id===composition)){await window.PoemTrialScene.composition(composition);if($('composition'))$('composition').value=composition;}
      const palette=pageQuery.get('palette');if(window.PoemDrawing.paletteOptions().some(p=>p.id===palette))choosePalette(palette);
      status('正在观看已有回答的本地风景构图；切换构图、配色与动态均不请求模型。');
    }
  }).catch(()=>status('请通过本地服务打开本页：在 poem-flow 文件夹运行 npm start。')).finally(()=>busy(false));
})();
