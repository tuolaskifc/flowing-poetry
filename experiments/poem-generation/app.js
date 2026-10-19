(() => {
  'use strict';
  const $=id=>document.getElementById(id),poem=$('poem');let source=null,latest=null,sdkPromise,candidateBatch=[];
  const status=text=>{$('status').textContent=text;};
  const clearList=id=>{$(id).replaceChildren();};
  const clearCandidateSelection=()=>{for(const button of document.querySelectorAll('[data-candidate]'))button.setAttribute('aria-pressed','false');};
  function item(id,text){const li=document.createElement('li');li.textContent=text;$(id).append(li);return li;}
  function busy(value){for(const id of ['generate','fetch-poem','sample','replay','recommend'])if($(id))$(id).disabled=value;for(const button of document.querySelectorAll('[data-candidate]'))button.disabled=value||button.dataset.drawable==='false';poem.disabled=value;poem.setAttribute('aria-busy',String(value));}
  function chooseCandidate(candidate){
    poem.value=candidate.poem;source=candidate.source;
    $('source').textContent=[source.provider,source.dynasty,source.author,source.title&&'《'+source.title+'》'].filter(Boolean).join(' · ');
    for(const button of document.querySelectorAll('[data-candidate]'))button.setAttribute('aria-pressed',String(candidateBatch[Number(button.dataset.candidate)]===candidate));
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
    if(!record.validation?.valid){status('本次分析没有通过检查，未生成新画面；下方如有画面仍为上次结果。问题记录已保存，可以换一句或稍后再试。');return;}
    const {analysis:a,plan}=record;
    $('output').hidden=false;$('reading').textContent=a.reading;$('scene-title').textContent=record.poem;
    $('record-info').textContent=(record.cached?'回看已保存结果':'本次实际分析')+' · '+record.elapsed_seconds+' 秒';
    for(const id of ['entities','uncertainties','drawn','omitted','notes','relations','credits'])clearList(id);
    for(const e of a.entities)item('entities',e.mentions.join('／')+' → '+e.concept+'（'+(e.role==='reference'?'比喻参照':{present:'在场',absent:'缺席',unclear:'出现情况待定'}[e.presence])+'）');
    $('atmosphere').textContent='文字气息：'+(a.atmosphere.labels.join('、')||'未确定')+'。本轮配色由你选择，尚未自动映射全部情感类型。';
    for(const issue of a.uncertainties)item('uncertainties',issue);
    for(const layer of plan.layers){const def=window.PoemDrawing.definitions().find(d=>d.id===layer.tool);item('drawn',layer.names.join('、')+' → '+def.name+(layer.animate?'':'（静止）'));}
    if(!plan.layers.length)item('drawn','本句没有匹配到现有工具；当前仅有底色，请换一句或试试样句。');
    for(const missing of plan.omitted)item('omitted',missing.name+'：'+missing.reason);
    if(!plan.omitted.length)item('omitted','本次列出的场景意象均找到了基础工具；仍不代表全部关系已表现。');
    for(const note of plan.notes)item('notes',note);
    for(const r of plan.relations)item('relations',r.meaning+'：'+(r.visualized?'以风响应试作表现':'尚未在画面实现'));
    if(record.mode==='imagery-only')item('relations','本次为基础意象模式，未请求完整关系抽取。');
    const sourceIds=[...new Set(plan.layers.flatMap(l=>window.PoemDrawing.definitions().find(d=>d.id===l.tool).sources))];
    for(const id of sourceIds){const s=window.PoemDrawingSources[id],li=item('credits',s.author+(s.license?' · '+s.license:' · 本项目试作')+'。'+s.note);if(s.url){const link=document.createElement('a');link.href=s.url;link.textContent=' 原来源 ↗';link.target='_blank';link.rel='noopener noreferrer';li.append(link);}}
    $('usage').textContent='记录 '+record.id+'；模型 '+record.model+'；本次记录 token '+(record.usage?.total_tokens??'未返回')+'。'+(record.cached?'正在回看，没有新增模型调用。':'用量以本次接口返回为准。');
    $('palette').value=plan.settings.palette;$('pause').textContent='暂停';$('pause').setAttribute('aria-pressed','false');
    const moon=plan.layers.find(l=>l.tool==='moon');$('moon-control').hidden=!moon;if(moon)$('moon-shape').value=moon.options.shape;
    if($('wind'))$('wind').value=plan.settings.wind;
    await window.PoemTrialScene.render(plan);
    latest=record;$('replay').hidden=false;if($('welcome'))$('welcome').hidden=true;
    if($('empty-scene'))$('empty-scene').hidden=plan.layers.length>0;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){window.PoemTrialScene.pause(true);$('pause').textContent='继续';$('pause').setAttribute('aria-pressed','true');}
    status(plan.layers.length?'已生成画面。'+(plan.omitted.length?'有 '+plan.omitted.length+' 项尚未绘制，详见“保留的空缺”。':'可以调整风力、构图或保存画面。'):'分析已完成，但本句尚无可绘制的意象。请换一句或试试样句。');
  }
  $('fetch-poem').addEventListener('click',fetchPoem);
  const recommendations=[
    {poem:'渭城朝雨浥轻尘，客舍青青柳色新。',author:'王维',title:'送元二使安西',dynasty:'唐代'},
    {poem:'明月松间照，清泉石上流。',author:'王维',title:'山居秋暝',dynasty:'唐代'},
    {poem:'江南可采莲，莲叶何田田。',author:'汉乐府',title:'江南',dynasty:'两汉'}
  ];let recommendationIndex=0;
  $('recommend')?.addEventListener('click',()=>{clearCandidateSelection();let next=recommendations[recommendationIndex++%recommendations.length];if(next.poem===poem.value)next=recommendations[recommendationIndex++%recommendations.length];poem.value=next.poem;source={provider:'本地推荐',author:next.author,title:next.title,dynasty:next.dynasty};$('source').textContent='本地推荐 · '+next.author+'《'+next.title+'》';status('已选出适合现有画库的诗句，点击“生成画面”开始分析。');});
  $('sample').addEventListener('click',()=>{clearCandidateSelection();poem.value='风乍起，吹皱一池春水。';source={provider:'手动试画样句',author:'冯延巳',title:'谒金门·风乍起',dynasty:'五代'};$('source').textContent='手动试画样句 · 冯延巳《谒金门·风乍起》';status('已填入样句，点击“生成画面”开始分析。');});
  poem.addEventListener('input',()=>{source=null;$('source').textContent='手动输入';clearCandidateSelection();});
  $('generate').addEventListener('click',async()=>{
    if(!poem.value.trim()){status('请先取一句或输入诗句。');return;}
    busy(true);status('正在分析诗句，再由本地规则组织画面……');
    try{const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({poem:poem.value,source})}),data=await response.json();if(!data.record)throw new Error(data.error||'分析失败，请稍后手动再试。');await show(data.record);}catch(error){status(error.message);}finally{busy(false);}
  });
  $('replay').addEventListener('click',async()=>{if(latest){busy(true);clearCandidateSelection();try{poem.value=latest.poem;source=latest.source;$('source').textContent=source?[source.provider,source.author,source.title].filter(Boolean).join(' · '):'已保存的诗句';await show({...latest,cached:true});}catch(error){status(error.message);}finally{busy(false);}}});
  $('pause').addEventListener('click',()=>{const paused=$('pause').getAttribute('aria-pressed')!=='true';window.PoemTrialScene.pause(paused);$('pause').textContent=paused?'继续':'暂停';$('pause').setAttribute('aria-pressed',String(paused));});
  $('reseed').addEventListener('click',()=>window.PoemTrialScene.reseed());$('save').addEventListener('click',()=>window.PoemTrialScene.save());
  $('palette').addEventListener('change',e=>window.PoemTrialScene.update({palette:e.target.value}));$('moon-shape').addEventListener('change',e=>window.PoemTrialScene.moon(e.target.value));
  $('wind')?.addEventListener('input',e=>window.PoemTrialScene.update({wind:Number(e.target.value)}));
  $('reset-layout')?.addEventListener('click',()=>window.PoemTrialScene.resetLayout());
  function immersive(value){document.body.classList.toggle('immersive',value);$('immersive').setAttribute('aria-pressed',String(value));$('immersive').textContent=value?'返回诗句 ⤡':'沉浸观看 ⤢';}
  $('immersive')?.addEventListener('click',()=>immersive(!document.body.classList.contains('immersive')));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('immersive'))immersive(false);});
  busy(true);
  Promise.all([fetch('/api/status').then(r=>r.json()),fetch('/api/latest').then(r=>r.json())]).then(async([config,saved])=>{status(config.configured?'DeepSeek 接口已就绪，先取一句或输入诗句。':'分析接口尚未配置；可先取诗句。');if(saved.record){poem.value=saved.record.poem;source=saved.record.source;$('source').textContent=source?[source.provider,source.author,source.title].filter(Boolean).join(' · '):'已保存的诗句';await show({...saved.record,cached:true});}}).catch(()=>status('请通过本地服务打开本页：在 poem-flow 文件夹运行 npm start。')).finally(()=>busy(false));
})();
