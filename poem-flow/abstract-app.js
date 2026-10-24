(()=>{
 'use strict';
 const $=id=>document.getElementById(id),feedback=window.PoemGenerationFeedback;let data,current,busy=false,presets=[],vocabulary='expanded';
 const engine=window.PoemAbstract.mount($('art'),{background:()=>$('scene')});window.abstractExperiment=engine;
 const words={connect:'连接',approach:'趋近',separate:'分离',echo:'呼应',contrast:'对照',interweave:'交织',surround:'包围',block:'阻隔',converge:'汇聚',disperse:'分散',occlude:'遮蔽',reveal:'显露',persist:'延续',emerge:'显现',fade:'消退',accumulate:'积累',recur:'重现',unclear:'未明',asserted:'成立',negated:'被否定',possible:'可能',conditional:'有条件',ongoing:'正在',already:'已经',not_yet:'尚未',again:'再次',repeated:'反复',unspecified:'未指定'};
 function option(select,id,name){const o=document.createElement('option');o.value=id;o.textContent=name;select.append(o);}
 for(const [id,name] of window.PoemAbstract.styles)option($('style'),id,name);
 option($('palette'),'auto','随种子试色');for(const p of window.PoemAbstract.palettes)option($('palette'),p.id,p.name);
 const status=s=>{$('status').textContent=s;};
 function item(id,text){const li=document.createElement('li');li.textContent=text;$(id).append(li);}
 const settings=()=>({vocabulary,style:$('style').value,palette:$('palette').value,motion:Number($('motion').value),trace:Number($('trace').value),response:Number($('response').value),expanse:Number($('expanse').value),density:Number($('density').value),hybrid:$('hybrid').checked});
 function sync(){const s=engine.inspect();$('seed-label').textContent='画法种子 '+s.seed;$('pause').textContent=s.paused?'继续':'暂停';$('pause').setAttribute('aria-pressed',String(s.paused));$('palette-name').textContent=window.PoemAbstract.palettes.find(p=>p.id===s.palette)?.name||'';if($('hybrid').checked&&window.PoemTrialScene.inspect().ready)window.PoemTrialScene.update({palette:window.PoemAbstract.backgroundPalette(s.palette)});}
 async function background(){
  if(current?.plan.concretePlan&&$('hybrid').checked){await window.PoemTrialScene.render(current.plan.concretePlan);if(engine.inspect().paused)window.PoemTrialScene.pause(true);window.PoemTrialScene.update({motion:Number($('motion').value)});}
  else window.PoemTrialScene.dispose();
 }
 async function show(record,meta){
  if(!record.validation?.valid){$('generate').textContent='重试本句';status(feedback.failure(record,!!current));return;}
  current=record;replay.remember(record);$('generate').textContent='分析新句 · 开始绘画';vocabulary='expanded';$('poem').value=record.poem;$('reading').textContent=record.analysis.reading;$('poem-title').textContent=record.poem;
  for(const id of ['relations','processes','uncertainties','choices'])$(id).replaceChildren();
  const source=meta||data.cases.find(c=>c.poem===record.poem);const a=record.effectiveAnalysis||record.analysis,by=id=>a.subjects.find(s=>s.id===id)?.mentions.join('／')||'';
  for(const r of a.relations)item('relations',by(r.source)+' → '+(r.target?by(r.target):'未指定参照')+'：'+words[r.kind]+'，'+words[r.modality]+(r.basis==='inferred'?'（解读推断）':'')+'；依据：'+r.evidence.join('／'));
  for(const p of a.processes)item('processes',by(p.subject)+'：'+words[p.kind]+'，'+words[p.temporal]+'，'+words[p.modality]+'；依据：'+p.evidence.join('／'));
  for(const u of [...a.uncertainties,...feedback.notes(record),...(record.validation.warnings||[]),...(source?.reviewWarnings||[])])item('uncertainties',u);
  for(const n of record.plan.notes)item('choices',n);for(const n of record.plan.omitted)item('choices',n.label+'：'+n.reason);
  $('review-note').hidden=!record.localRevalidation&&!source?.reviewWarnings?.length;$('review-note').textContent=record.localRevalidation?'这份回答首次校验未通过，原记录保留；修正“消退已发生、结果缺席”的检查边界后，仅作本地重放，未重新请求模型。':(source?.reviewWarnings||[]).join(' ');
  $('source').replaceChildren();if(source){const link=document.createElement('a');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=source.author+'《'+source.title+'》· 原文来源';$('source').append(link);if(source.note)$('source').append(document.createTextNode(' · '+source.note));if(source.reviewSource){const reference=document.createElement('a');reference.href=source.reviewSource;reference.textContent=' · 词义核对';reference.target='_blank';reference.rel='noopener noreferrer';$('source').append(reference);}}
  $('hybrid').disabled=!record.plan.concretePlan;$('hybrid').checked=!!record.plan.concretePlan;
  engine.render(record.plan,{...settings(),seed:record.plan.seed});engine.pause(matchMedia('(prefers-reduced-motion: reduce)').matches);await background();sync();
  status(feedback.success(record,'换画法、种子、配色与交互均在本地完成。'));
  presets=data.variants.filter(v=>v.case===source?.id);$('variants').replaceChildren();
  for(const v of presets){const button=document.createElement('button');button.className='variant';const im=document.createElement('img');im.src='verification/abstract/'+v.file;im.alt=v.label;const caption=document.createElement('span');caption.textContent=v.label;button.append(im,caption);button.addEventListener('click',async()=>{vocabulary=v.vocabulary||'expanded';$('expanse').value=v.expanse??0;$('style').value=v.style;$('palette').value=v.palette||'auto';$('hybrid').checked=v.hybrid;await background();engine.render(current.plan,{...settings(),seed:v.seed});sync();status('已使用这张画面的种子与画法，可继续拖动或重放。');});$('variants').append(button);}
 }
 $('sample').addEventListener('change',async()=>{const sample=data.cases.find(c=>c.id===$('sample').value);if(!sample)return;$('poem').value=sample.poem;if(sample.record)await show(sample.record,sample);else status('这份首次回答未通过检查，失败已保留；可查看其他样本，或主动发起新分析。');});
 const replay=feedback.installReplay({mode:'abstract',show,isBusy:()=>busy||!data});
 $('generate').addEventListener('click',async()=>{
  const poem=$('poem').value.trim();if(!poem||[...poem].length>200){status('请输入 1–200 字诗句。');return;}if(busy)return;busy=true;$('generate').disabled=true;$('sample').disabled=true;status('正在分析诗句的关系、变化与不确定性……');
  try{const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({poem,mode:'abstract'})});const body=await response.json();if(!response.ok&&!body.record)throw new Error(body.error||'分析暂未完成');await show(body.record);}catch(e){$('generate').textContent='重试本句';status(feedback.failure({delivery:{message:'分析服务暂时未能返回本句画面。'}},!!current));}finally{busy=false;$('generate').disabled=false;$('sample').disabled=false;}
 });
 for(const id of ['style','palette'])$(id).addEventListener('change',()=>{if(current){if(id==='style')vocabulary='expanded';engine.configure({[id]:$(id).value,vocabulary});sync();}});
 for(const id of ['motion','trace','density','response','expanse'])$(id).addEventListener('input',()=>{if(current){engine.configure({[id]:Number($(id).value)});if(id==='motion')window.PoemTrialScene.update({motion:Number($(id).value)});sync();}});
 $('reseed').addEventListener('click',()=>{if(current){engine.reseed();sync();}});
 $('stir').addEventListener('click',()=>{if(current)engine.impulse([.5,.5]);});$('restart').addEventListener('click',()=>engine.restart());$('pause').addEventListener('click',()=>{const pause=!engine.inspect().paused;engine.pause(pause);if(current?.plan.concretePlan&&$('hybrid').checked)window.PoemTrialScene.pause(pause);sync();});
 $('save').addEventListener('click',()=>{if(current)engine.save();});
 $('hybrid').addEventListener('change',async()=>{if(current){await background();engine.configure({hybrid:$('hybrid').checked});sync();}});
 fetch('/poem-flow/abstract-studies.json').then(r=>{if(!r.ok)throw new Error('试看数据暂未准备好');return r.json();}).then(async d=>{data=d;for(const c of data.cases)option($('sample'),c.id,c.author+' · '+c.poem);const q=new URLSearchParams(location.search),sample=data.cases.find(c=>c.id===q.get('case'))||data.cases.find(c=>c.id==='a03'&&c.record)||data.cases.find(c=>c.record);if(!sample)throw new Error('还没有可重放的有效解读');$('sample').value=sample.id;await show(sample.record,sample);if(q.has('seed')){const seed=Number(q.get('seed'));if(Number.isInteger(seed)&&seed>=0&&seed<=0xffffffff){if(window.PoemAbstract.styles.some(s=>s[0]===q.get('style')))$('style').value=q.get('style');if(window.PoemAbstract.palettes.some(p=>p.id===q.get('palette')))$('palette').value=q.get('palette');if(q.has('hybrid'))$('hybrid').checked=q.get('hybrid')==='1'&&!!current.plan.concretePlan;const preset=data.variants.find(v=>v.case===sample.id&&v.seed===seed&&v.style===$('style').value);vocabulary=preset?.vocabulary||'expanded';$('expanse').value=q.has('expanse')?Math.max(0,Math.min(1,+q.get('expanse')||0)):(preset?.expanse??.9);await background();engine.render(current.plan,{...settings(),seed});sync();}}$('generate').disabled=false;if(q.has('latest')){await replay.load();await replay.open();}}).catch(e=>status(e.message));
})();
