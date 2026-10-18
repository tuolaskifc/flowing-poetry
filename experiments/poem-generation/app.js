(() => {
  'use strict';
  const $=id=>document.getElementById(id),poem=$('poem');let source=null,latest=null,sdkPromise;
  const status=text=>{$('status').textContent=text;};
  const clearList=id=>{$(id).replaceChildren();};
  function item(id,text){const li=document.createElement('li');li.textContent=text;$(id).append(li);return li;}
  function busy(value){for(const id of ['generate','fetch-poem','sample','replay'])$(id).disabled=value;poem.disabled=value;}
  function sdk(){
    if(window.jinrishici)return Promise.resolve();if(sdkPromise)return sdkPromise;
    sdkPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://sdk.jinrishici.com/v2/browser/jinrishici.js';script.charset='utf-8';script.onload=resolve;script.onerror=()=>reject(new Error('今日诗词暂时连接不上，可以手动输入或使用样句。'));document.head.append(script);}).catch(error=>{sdkPromise=null;throw error;});return sdkPromise;
  }
  async function fetchPoem(){
    busy(true);status('正在向今日诗词取句……');
    try{
      const result=await Promise.race([(async()=>{await sdk();return new Promise(resolve=>window.jinrishici.load(resolve));})(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('今日诗词取句超时，可以手动输入或使用样句。')),15000))]);
      if(result.status!=='success'||typeof result.data?.content!=='string')throw new Error('今日诗词没有返回可用诗句。');
      if([...result.data.content].length>200)throw new Error('本次推荐超过 200 字，请手动选择节选。');
      poem.value=result.data.content;const origin=result.data.origin||{};
      source={provider:'今日诗词',author:origin.author||'',title:origin.title||'',dynasty:origin.dynasty||''};
      $('source').textContent=[source.provider,source.dynasty,source.author,source.title&&'《'+source.title+'》'].filter(Boolean).join(' · ');
      status('已取到诗句，点击“生成画面”开始分析。');
    }catch(error){status(error.message);}finally{busy(false);}
  }
  async function show(record){
    if(!record.validation?.valid){status('本次分析没有通过检查，未生成新画面；下方如有画面仍为上次结果。问题记录已保存，可以换一句或稍后再试。');return;}
    latest=record;$('replay').hidden=false;const {analysis:a,plan}=record;
    $('output').hidden=false;$('reading').textContent=a.reading;$('scene-title').textContent=record.poem;
    $('record-info').textContent=(record.cached?'回看已保存结果':'本次实际分析')+' · '+record.elapsed_seconds+' 秒';
    for(const id of ['entities','uncertainties','drawn','omitted','notes','relations','credits'])clearList(id);
    for(const e of a.entities)item('entities',e.mentions.join('／')+' → '+e.concept+'（'+(e.role==='reference'?'比喻参照':{present:'在场',absent:'缺席',unclear:'出现情况待定'}[e.presence])+'）');
    $('atmosphere').textContent='文字气息：'+(a.atmosphere.labels.join('、')||'未确定')+'。本轮配色由你选择，尚未自动映射全部情感类型。';
    for(const issue of a.uncertainties)item('uncertainties',issue);
    for(const layer of plan.layers){const def=window.PoemDrawing.definitions().find(d=>d.id===layer.tool);item('drawn',layer.names.join('、')+' → '+def.name+(layer.animate?'':'（静止）'));}
    if(!plan.layers.length)item('drawn','本句没有匹配到现有工具，保留空白画面。');
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
    await window.PoemTrialScene.render(plan);
    status('已生成试画。'+(plan.omitted.length?'有 '+plan.omitted.length+' 项尚未绘制，详见“保留的空缺”。':'可以暂停、换形态或保存画面。'));
  }
  $('fetch-poem').addEventListener('click',fetchPoem);
  $('sample').addEventListener('click',()=>{poem.value='明月松间照，清泉石上流。';source={provider:'手动试画样句',author:'王维',title:'山居秋暝',dynasty:'唐代'};$('source').textContent='手动试画样句 · 王维《山居秋暝》';status('已填入样句，点击“生成画面”开始分析。');});
  poem.addEventListener('input',()=>{source=null;$('source').textContent='手动输入';});
  $('generate').addEventListener('click',async()=>{
    if(!poem.value.trim()){status('请先取一句或输入诗句。');return;}
    busy(true);status('正在分析诗句，再由本地规则组织画面……');
    try{const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({poem:poem.value,source})}),data=await response.json();if(!data.record)throw new Error(data.error||'分析失败，请稍后手动再试。');await show(data.record);}catch(error){status(error.message);}finally{busy(false);}
  });
  $('replay').addEventListener('click',async()=>{if(latest){poem.value=latest.poem;await show({...latest,cached:true});}});
  $('pause').addEventListener('click',()=>{const paused=$('pause').getAttribute('aria-pressed')!=='true';window.PoemTrialScene.pause(paused);$('pause').textContent=paused?'继续':'暂停';$('pause').setAttribute('aria-pressed',String(paused));});
  $('reseed').addEventListener('click',()=>window.PoemTrialScene.reseed());$('save').addEventListener('click',()=>window.PoemTrialScene.save());
  $('palette').addEventListener('change',e=>window.PoemTrialScene.update({palette:e.target.value}));$('moon-shape').addEventListener('change',e=>window.PoemTrialScene.moon(e.target.value));
  Promise.all([fetch('/api/status').then(r=>r.json()),fetch('/api/latest').then(r=>r.json())]).then(async([config,saved])=>{status(config.configured?'分析接口已就绪，先取一句或输入诗句。':'分析接口尚未配置；可先取诗句。');if(saved.record){latest=saved.record;poem.value=latest.poem;source=latest.source;$('source').textContent=source?[source.provider,source.author,source.title].filter(Boolean).join(' · '):'已保存的诗句';await show({...latest,cached:true});}}).catch(()=>status('请通过本地生成服务打开本页。'));
})();
