// Real answers are replayed locally. Browser QA never calls a language model.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {openBrowser,wait} from './browser-qa.mjs';
import {buildPlan} from './planner.mjs';
import {slowScene,fisherScene,forestScene,withoutScene} from './composition-fixtures.mjs';
import {expandSourceContext} from './source-context.mjs';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../..'),out=resolve(root,'poem-flow/verification/semantics');
await mkdir(out,{recursive:true});
const real=JSON.parse(await readFile(resolve(dir,'semantic-live-cases.json'),'utf8')).cases;
const cases=[...[[slowScene,'c01'],[forestScene,'c02'],[fisherScene,'c03']].map(([f,id])=>({id,poem:f().poem,analysis:f(),basis:'authored-calibration'}))];
for(const c of real){
 const record=JSON.parse(await readFile(resolve(out,c.id+'-record.json'),'utf8')),context=expandSourceContext(record.analysis,c.poem);
 cases.push({...c,record:record.id,analysis:context.effectiveAnalysis||record.analysis,basis:context.applied?'real-source-expanded':'real-raw-valid',rawValidation:record.validation,sourceContext:context.applied?context:null});
 if(context.applied)await writeFile(resolve(out,c.id+'-source-context-replay.json'),JSON.stringify({modelCalls:0,rawRecord:record.id,...context},null,2)+'\n');
}
const b=await openBrowser(resolve(dir,'.qa/semantics-'+Date.now())),rows=[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:'http://127.0.0.1:4173/'});await b.until(`window.PoemTrialScene&&!document.getElementById('generate').disabled`);
 async function render(plan){await b.evaluate(`document.getElementById('output').hidden=false;window.PoemTrialScene.render(${JSON.stringify(plan)})`);await b.until('window.PoemTrialScene.inspect().layers.every(l=>l.ticks>0)');}
 async function paint(plan,name){
  await render(plan);await b.evaluate('window.PoemTrialScene.pause(true)');await wait(80);
  const state=await b.evaluate('window.PoemTrialScene.inspect()');assert(state.ready&&state.layers.every(l=>l.finite!==false));
  const png=await b.evaluate(`document.getElementById('scene').toDataURL()`);await writeFile(resolve(out,name+'.png'),Buffer.from(png.split(',')[1],'base64'));
  return {settings:plan.settings,organization:plan.scene.organization,semanticConsumption:plan.semanticConsumption,tools:state.layers.map(l=>({id:l.id,timeScale:l.timeScale,paused:l.paused,options:l.options})),instances:state.instances.length};
 }
 for(const c of cases){
  const plan=buildPlan(c.analysis),before=await paint(buildPlan(withoutScene(c.analysis)),c.id+'-before'),after=await paint(plan,c.id+'-after');
  assert.equal(after.organization.audit.errors,0,c.id+' geometry');
  await writeFile(resolve(out,c.id+'-plan.json'),JSON.stringify(plan,null,2)+'\n');
  rows.push({id:c.id,poem:c.poem,basis:c.basis,record:c.record,rawValidation:c.rawValidation,sourceContext:c.sourceContext?{changes:c.sourceContext.changes,reviewRequired:true}:null,before,after});
 }
 // Inspect the actual p5 clocks, rather than just the planned numeric values.
 const clocks=[];
 for(const pace of ['slow','fast']){
  const a=slowScene();a.scene.actions[1].pace=pace;await render(buildPlan(a));
  const first=await b.evaluate(`window.PoemTrialScene.inspect().layers.find(l=>l.id==='bird').time`);await wait(650);
  const next=await b.evaluate(`window.PoemTrialScene.inspect().layers.find(l=>l.id==='bird')`);clocks.push({pace,timeScale:next.timeScale,delta:next.time-first});
 }
 assert(clocks[1].delta>clocks[0].delta*1.7,'actual fast tool clock must run faster');
 await b.evaluate('window.PoemTrialScene.pause(true)');await wait(100);const pausedBefore=await b.evaluate('window.PoemTrialScene.inspect()');await wait(400);const pausedAfter=await b.evaluate('window.PoemTrialScene.inspect()');assert.equal(pausedBefore.elapsed,pausedAfter.elapsed);assert.deepEqual(pausedBefore.layers.map(l=>l.time),pausedAfter.layers.map(l=>l.time));
 await b.evaluate('window.PoemTrialScene.pause(false)');await wait(350);assert((await b.evaluate('window.PoemTrialScene.inspect().elapsed'))>pausedAfter.elapsed);
 // Existing source-clause failures appear as explicitly reviewed replays in UI.
 const example=cases.find(c=>c.id==='s04'),record={id:'semantic-ui-replay',poem:example.poem,analysis:JSON.parse(await readFile(resolve(out,'s04-record.json'),'utf8')).analysis,effectiveAnalysis:example.analysis,sourceContext:{applied:true},rawValidation:example.rawValidation,plan:buildPlan(example.analysis),mode:'composition',validation:{valid:true,review_required:true},elapsed_seconds:0,cached:true,model:'local-replay',usage:null};
 await b.evaluate(`window.originalFetch=window.fetch;window.fetch=(url,options)=>url==='/api/analyze'?Promise.resolve(new Response(JSON.stringify({record:${JSON.stringify(record)}}))):window.originalFetch(url,options);document.getElementById('poem').value=${JSON.stringify(example.poem)};document.getElementById('generate').click()`);
 await b.until(`!document.getElementById('generate').disabled&&document.getElementById('record-info').textContent.includes('引用范围已展开')`);
 assert(await b.evaluate(`document.getElementById('semantic-applied').children.length>0&&document.getElementById('semantic-pending').children.length>0`));
 await b.evaluate(`document.getElementById('palette').value='night';document.getElementById('palette').dispatchEvent(new Event('change'));document.getElementById('wind').value='.7';document.getElementById('wind').dispatchEvent(new Event('input'));document.getElementById('immersive').click()`);
 assert(await b.evaluate(`document.body.classList.contains('immersive')&&window.PoemTrialScene.inspect().settings.palette==='night'&&window.PoemTrialScene.inspect().settings.wind===.7`));
 await b.evaluate(`document.getElementById('immersive').click()`);
 // Floating boat motion must move its attached figure by exactly the same delta.
 await render(buildPlan(fisherScene()));await wait(150);const at1=await b.evaluate(`window.PoemTrialScene.inspect().instances.filter(e=>['boat','figure'].includes(e.tool))`);await wait(500);const at2=await b.evaluate(`window.PoemTrialScene.inspect().instances.filter(e=>['boat','figure'].includes(e.tool))`);
 const delta=tool=>at2.find(e=>e.tool===tool).placement.at.map((v,i)=>v-at1.find(e=>e.tool===tool).placement.at[i]);
 assert(Math.abs(delta('boat')[0])>1e-6);assert(delta('boat').every((v,i)=>Math.abs(v-delta('figure')[i])<1e-8));
 await b.evaluate(`window.PoemTrialScene.pause(true);document.getElementById('scene').scrollIntoView({block:'center'})`);
 // Find a visible boat pixel that is not covered by its attached figure.
 const drag=await b.evaluate(`(()=>{const st=window.PoemTrialScene.inspect(),entries=st.instances,b=entries.find(e=>e.tool==='boat'),canvases=document.querySelectorAll('#layer-hosts canvas'),src=canvases[b.sourceIndex],ctx=src.getContext('2d'),rect=document.getElementById('scene').getBoundingClientRect();for(let y=250;y<350;y+=3)for(let x=180;x<460;x+=3){if(ctx.getImageData(x,y,1,1).data[3]<60)continue;const px=b.placement.at[0]*960+(x-b.placement.anchor[0])*b.placement.scale,py=b.placement.at[1]*600+(y-b.placement.anchor[1])*b.placement.scale;const top=[...entries].reverse().find(e=>{if(e.layer===b.layer)return true;const p=e.placement,xx=Math.round((px-p.at[0]*960)/p.scale+p.anchor[0]),yy=Math.round((py-p.at[1]*600)/p.scale+p.anchor[1]),s=canvases[e.sourceIndex];return xx>=0&&yy>=0&&xx<640&&yy<388&&s.getContext('2d').getImageData(xx,yy,1,1).data[3]>8;});if(top?.layer===b.layer)return {x:rect.left+px*rect.width/960,y:rect.top+py*rect.height/600,before:entries.filter(e=>['boat','figure'].includes(e.tool))};}throw new Error('No exposed boat pixel');})()`);
 await b.send('Input.dispatchMouseEvent',{type:'mousePressed',x:drag.x,y:drag.y,button:'left',clickCount:1});await b.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:drag.x+50,y:drag.y+8,button:'left',buttons:1});await b.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:drag.x+50,y:drag.y+8,button:'left',clickCount:1});
 const dragged=await b.evaluate(`window.PoemTrialScene.inspect().instances.filter(e=>['boat','figure'].includes(e.tool))`),dragDelta=tool=>dragged.find(e=>e.tool===tool).placement.at.map((v,i)=>v-drag.before.find(e=>e.tool===tool).placement.at[i]);assert(dragDelta('boat')[0]>.02);assert(dragDelta('boat').every((v,i)=>Math.abs(v-dragDelta('figure')[i])<1e-8));
 await b.evaluate('window.PoemTrialScene.resetLayout();window.PoemTrialScene.reseed()');await b.until('window.PoemTrialScene.inspect().layers.every(l=>l.ticks>0)');
 // The save control must offer a real PNG, without depending on a download UI.
 const download=await b.evaluate(`(()=>{let result;const old=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){result={name:this.download,png:this.href.startsWith('data:image/png;base64,')};};try{document.getElementById('save').click();}finally{HTMLAnchorElement.prototype.click=old;}return result;})()`);assert(download.png);
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'),'main mobile overflow');
 const labels={'authored-calibration':'人工校准语义，不是 API 回答','real-raw-valid':'真实 API 回答，原始校验通过','real-source-expanded':'真实 API 回答，原始校验未通过；本地展开相邻原句引用后重放，解读待复核'};
 const cards=rows.map(r=>`<article id="${r.id}"><h2>${r.id} · ${esc(r.poem)}</h2><p>${labels[r.basis]}</p><div class="pair"><figure><img src="verification/semantics/${r.id}-before.png" alt="同一语义关闭整体场景扩展"><figcaption>同一回答，关闭 3.3 整体场景字段</figcaption></figure><figure><img src="verification/semantics/${r.id}-after.png" alt="开启整体场景语义"><figcaption>消费整体场景语义 · 审美待观看</figcaption></figure></div><p>已应用 ${r.after.semanticConsumption.summary.applied} 项，部分应用 ${r.after.semanticConsumption.summary.partial} 项，未支持 ${r.after.semanticConsumption.summary.unsupported} 项。几何错误 ${r.after.organization.audit.errors} 项，待复核 ${r.after.organization.audit.review} 项。</p><details><summary>依据、推断与仍有的空缺</summary>${r.sourceContext?`<p>原始错误：${esc(r.rawValidation.errors.join('；'))}。只展开引用范围，没有改变实体、数量或关系判断，没有重试模型。</p>`:''}<ul>${r.after.semanticConsumption.items.map(i=>`<li>${esc(i.path)} · ${esc(i.status)} · ${esc(i.effect)}${i.basis?'（'+esc(i.basis)+'）':''}${i.evidence?.length?' 依据：'+esc(i.evidence.join('／')):''}</li>`).join('')}</ul></details></article>`).join('');
 await writeFile(resolve(root,'poem-flow/semantic-review.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>流动诗 · 语义贯通实测</title><style>body{max-width:1400px;margin:auto;padding:24px;background:#f5f3ec;color:#344b43;font:16px/1.7 system-ui}a{color:inherit}h1{font-size:30px}h2{font-size:21px}article{padding:24px 0;border-top:1px solid #cbd1c7}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}img{display:block;width:100%}figcaption,details{font-size:14px;color:#626c64}nav{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}li{overflow-wrap:anywhere}@media(max-width:650px){body{padding:16px}.pair{grid-template-columns:1fr}}</style><a href="/">← 生成器</a> · <a href="architecture.html">当前架构</a> · <a href="expressive-review.html">原先认可的参考图</a> · <a href="organization-review.html">上一轮场景组织</a><h1>让解释进入画面</h1><p>左右来自同一份语义回答，只开关整体场景扩展，便于查看主次、远近、动作和照明的作用。打开此页不调用模型。</p><p>本轮六次真实调用均有回答，共 34515 个返回记录 token；原始严格检查 4/6 通过。另两份仅在本地展开同句或相邻句引用后可重放，原始失败保留，语义合理性待复核。图片包含同批本地改进，不是新的独立成功率。前三组是人工校准，不计 API 成功。</p><p>动作仍是有限的主导状态和观看微动；几何检查不判定诗意或审美合格。</p><nav>${rows.map(r=>`<a href="#${r.id}">${r.id}</a>`).join('')}</nav>${cards}</html>`);
 await b.send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:'http://127.0.0.1:4173/poem-flow/semantic-review.html'});await b.until(`document.querySelectorAll('article').length===${rows.length}`);await b.until(`Array.from(document.images).every(i=>i.complete&&i.naturalWidth===960)`);
 await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(r=>writeFile(resolve(out,'review-desktop.png'),Buffer.from(r.data,'base64')));
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'),'review mobile overflow');
 await b.send('Page.navigate',{url:'http://127.0.0.1:4173/poem-flow/architecture.html'});await b.until(`document.images.length===1&&document.images[0].complete&&document.images[0].naturalWidth===1280`);assert(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'),'diagram mobile overflow');
 const diagram=await b.evaluate(`(()=>{const c=document.createElement('canvas');c.width=1280;c.height=1280;c.getContext('2d').drawImage(document.images[0],0,0);return c.toDataURL();})()`);await writeFile(resolve(out,'architecture.png'),Buffer.from(diagram.split(',')[1],'base64'));
 assert.deepEqual(b.errors,[]);assert.deepEqual(b.posts,[]);
 const summary={cases:rows.length,rawApiPass:4,rawApiTotal:6,sourceExpandedReplays:2,geometryErrors:rows.reduce((n,r)=>n+r.after.organization.audit.errors,0),sameBatchRefinement:true,aestheticAcceptance:'pending-user'};
 await writeFile(resolve(out,'verification.json'),JSON.stringify({modelCalls:0,browserErrors:b.errors,networkPosts:b.posts,clocks,pause:true,parentMotion:delta('boat'),dragWithAttachment:dragDelta('boat'),download,mobileWidth:390,cases:rows,summary},null,2)+'\n');console.log(JSON.stringify(summary));
}finally{await b.close();}
