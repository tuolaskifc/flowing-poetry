// Browser replay and pixel inspection; this script never calls the model.
import {spawn,execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {buildPlan} from './planner.mjs';
import {organizationFixtures} from './organization-fixtures.mjs';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../..'),out=resolve(root,'poem-flow/verification/organization');await mkdir(out,{recursive:true});
const qa=resolve(dir,'.qa/organization-'+Date.now());await mkdir(qa,{recursive:true});
for(const f of ['planner.mjs','composition.mjs','imagery-lexicon.js','physical-mapping.mjs','expressive-mapping.mjs','scene-layout.mjs','scene-regions.mjs'])await writeFile(resolve(qa,f),execFileSync('git',['show','659f3e4:experiments/poem-generation/'+f],{cwd:root}));
const old=await import(pathToFileURL(resolve(qa,'planner.mjs')).href),cases=[...organizationFixtures];
const previous=JSON.parse(await readFile(resolve(dir,'generalization-cases.json'),'utf8')).cases;
for(const c of previous){
 let r=JSON.parse(await readFile(resolve(root,'poem-flow/verification/generalization',c.id+'-record.json'),'utf8'));
 if(['g02','g11'].includes(c.id))r=JSON.parse(await readFile(resolve(root,'poem-flow/verification/generalization',c.id+'-r1-record.json'),'utf8'));
 if(c.id==='g12')r=JSON.parse(await readFile(resolve(root,'poem-flow/verification/generalization/g12-quantity-control-record.json'),'utf8'));
 cases.push({...c,basis:c.id==='g12'?'real-3.1-control':'real-3.2-replay',analysis:r.analysis,record:r.id});
}
try{
 const live=JSON.parse(await readFile(resolve(dir,'organization-live-cases.json'),'utf8'));
 for(const c of live.cases){try{const r=JSON.parse(await readFile(resolve(out,c.id+'-record.json'),'utf8'));cases.push({...c,basis:'new-live-3.2',analysis:r.validation.valid?r.analysis:null,record:r.id,validation:r.validation});}catch(e){if(e.code!=='ENOENT')throw e;}}
}catch(e){if(e.code!=='ENOENT')throw e;}
const wait=ms=>new Promise(r=>setTimeout(r,ms)),browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${qa}`,'about:blank'],{windowsHide:true,stdio:'ignore'});let ws;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{
 let port;for(let i=0;i<100;i++){try{port=(await readFile(resolve(qa,'DevToolsActivePort'),'utf8')).split('\n')[0];await fetch(`http://127.0.0.1:${port}/json/version`);break;}catch{await wait(100);}}assert(port);
 const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 let id=0;const pending=new Map(),errors=[],posts=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const q=pending.get(m.id);pending.delete(m.id);m.error?q.reject(new Error(JSON.stringify(m.error))):q.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Network.requestWillBeSent'&&m.params.request.method==='POST')posts.push(m.params.request.url);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async expression=>{for(let i=0;i<200;i++){if(await evaluate(expression))return;await wait(100);}throw new Error('Timeout: '+expression);};
 await send('Runtime.enable');await send('Network.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:4173/'});await until(`window.PoemTrialScene&&!document.getElementById('generate').disabled`);
 const pixelScript=`(()=>{const c=document.getElementById('scene'),ctx=c.getContext('2d'),d=ctx.getImageData(0,0,c.width,c.height).data,bg=[d[0],d[1],d[2]];let ink=0,tiles=Array(12).fill(0);for(let y=0;y<c.height;y+=3)for(let x=0;x<c.width;x+=3){const i=(y*c.width+x)*4,delta=Math.max(...bg.map((v,j)=>Math.abs(v-d[i+j])));if(delta>23){ink++;tiles[Math.min(2,Math.floor(y/c.height*3))*4+Math.min(3,Math.floor(x/c.width*4))]++;}}return {inkRatio:ink/(Math.ceil(c.width/3)*Math.ceil(c.height/3)),occupiedTiles:tiles.filter(n=>n>30).length,tiles};})()`;
 async function paint(plan,name){
  await evaluate(`document.getElementById('output').hidden=false;window.PoemTrialScene.render(${JSON.stringify(plan)})`);await until('window.PoemTrialScene.inspect().layers.every(l=>l.ticks>0)');await evaluate('window.PoemTrialScene.pause(true)');await wait(50);
  const state=await evaluate('window.PoemTrialScene.inspect()');assert(state.ready&&state.layers.every(l=>l.finite!==false));
  const pixels=await evaluate(pixelScript),png=await evaluate('document.getElementById("scene").toDataURL()');await writeFile(resolve(out,name+'.png'),Buffer.from(png.split(',')[1],'base64'));
  return {pixels,scene:plan.scene.kind,layers:plan.layers.length,instances:state.instances.length,organization:plan.scene.organization,omitted:plan.omitted};
 }
 const rows=[];
 for(const c of cases){
  const row={id:c.id,poem:c.poem,basis:c.basis,record:c.record,validation:c.validation};
  if(c.analysis){row.before=await paint(old.buildPlan(c.analysis),c.id+'-before');const plan=buildPlan(c.analysis);row.after=await paint(plan,c.id+'-after');await writeFile(resolve(out,c.id+'-plan.json'),JSON.stringify(plan,null,2)+'\n');}
  rows.push(row);
 }
 const label=b=>({'authored-semantic-exercise':'组合练习 · 人工语义，不是模型结果','real-3.2-replay':'既有严格模式真实回答 · 本地重排','real-3.1-control':'既有数量模式对照 · 不算严格模式成功','new-live-3.2':'本轮新诗的真实回答 · 同批本地优化后重排'}[b]);
 const strategyName=s=>({'general-constraints':'通用区域与依托','regional-proposal':'已有区域构图','isolated-study':'局部意象练习'}[s]||s);
 const cards=rows.map(r=>{const c=cases.find(c=>c.id===r.id),audit=r.after?.organization.audit;return `<article id="${r.id}"><h2>${r.id} · ${esc(r.poem)}</h2><p>${esc(label(r.basis))}${c.author?' · '+esc(c.author)+'《'+esc(c.title)+'》':''}${c.source?.url?' · <a href="'+esc(c.source.url)+'">原句出处</a>':''}</p>${r.after?`<div class="pair"><figure><img loading="lazy" src="verification/organization/${r.id}-before.png" alt="旧规则"><figcaption>本轮前的本地构图规则 · 同一份语义</figcaption></figure><figure><img loading="lazy" src="verification/organization/${r.id}-after.png" alt="新场景组织"><figcaption>场景组织层 · 审美待观看</figcaption></figure></div><p>布局：${esc(strategyName(r.after.organization.strategy))}；已实现检查发现 ${audit.errors} 项错误、${audit.review} 项待复核。${esc(audit.issues.map(i=>i.message).join('；'))}</p><details><summary>检查依据和仍有的空缺</summary><p>只检查 ${esc(audit.checks.join('、'))}。指标用于比较布局，不是审美分数。</p><p>未画：${esc(r.after.omitted.map(e=>e.name+'：'+e.reason).join('；')||'当前已提取意象均有基础画法')}</p><p>记录：${esc(r.record||'人工语义练习')}。没有新增动作时序；未识别的关系仍可能遗漏。</p></details>`:`<div class="failed">严格语义检查未通过，没有生成新画面：${esc(r.validation?.errors?.join('；'))}</div>`}</article>`;}).join('\n');
 await writeFile(resolve(root,'poem-flow/organization-review.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>流动诗 · 场景组织对照</title><style>body{max-width:1400px;margin:auto;padding:24px;background:#f5f3ec;color:#344b43;font:16px/1.7 system-ui}a{color:inherit}h1{font-size:30px}h2{font-size:21px}article{padding:24px 0;border-top:1px solid #cbd1c7}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}img{display:block;width:100%}figcaption,details{font-size:14px;color:#666}.failed{padding:24px;background:#eee4df}nav{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}@media(max-width:650px){body{padding:16px}.pair{grid-template-columns:1fr}}</style><a href="/">← 生成器</a> · <a href="expressive-review.html">原先认可的二十张参考图</a><h1>先组织场景，再落下笔触</h1><p>左右使用同一份语义，比较本轮前的规则与新的场景组织层。人工组合练习、已有真实回答和本轮新诗分别标注；数量模式对照不计作严格模式成功。打开本页不会调用模型。</p><p>本轮六次新诗请求有四次通过语义检查，另两次保留网络失败和数量证据错误。当前图片含后续同批本地优化，不作为新的独立成功率。既有区域构图继续保留。新组合比较三种布局，检查依托、数量、尺度与相对位置。自动检查通过仍不代表诗意理解或画面审美通过。</p><nav>${rows.map(r=>`<a href="#${r.id}">${r.id}</a>`).join('')}</nav>${cards}</html>`);
 // Replay through the actual app with a local response stub, keeping the model
 // out of browser QA. Verify the new supervision text is connected to the UI.
 const example=cases.find(c=>c.id==='n01'&&c.analysis)||cases.find(c=>c.id==='o01'),record={id:'organization-ui-replay',poem:example.poem,analysis:example.analysis,plan:buildPlan(example.analysis),mode:'scene',validation:{valid:true},elapsed_seconds:0,cached:true,model:'local-replay',usage:null};
 await evaluate(`window.originalFetch=window.fetch;window.fetch=(url,options)=>url==='/api/analyze'?Promise.resolve(new Response(JSON.stringify({record:${JSON.stringify(record)}}))):window.originalFetch(url,options);document.getElementById('poem').value=${JSON.stringify(example.poem)};document.getElementById('generate').click()`);await until(`!document.getElementById('generate').disabled&&document.getElementById('organization-summary').textContent.includes('三种布局')`);
 let smokeDrag=null;
 if(example.id==='n01'){
  await evaluate(`document.getElementById('scene').scrollIntoView({block:'center'})`);
  const point=await evaluate(`(()=>{const state=window.PoemTrialScene.inspect(),e=state.instances.find(e=>e.tool==='dwelling'),s=document.querySelectorAll('#layer-hosts canvas')[e.sourceIndex],ctx=s.getContext('2d'),p=e.placement,b=document.getElementById('scene').getBoundingClientRect();for(let y=245;y<302;y+=3)for(let x=280;x<355;x+=3)if(ctx.getImageData(x,y,1,1).data[3]>70)return {x:b.left+(p.at[0]*960+(x-p.anchor[0])*p.scale)*b.width/960,y:b.top+(p.at[1]*600+(y-p.anchor[1])*p.scale)*b.height/600,before:state.instances.filter(e=>['mist','dwelling'].includes(e.tool)).map(e=>({tool:e.tool,at:e.placement.at}))};throw new Error('No visible house pixel for drag test');})()`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+45,y:point.y+12,button:'left',buttons:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x+45,y:point.y+12,button:'left',clickCount:1});
  const after=await evaluate(`window.PoemTrialScene.inspect().instances.filter(e=>['mist','dwelling'].includes(e.tool)).map(e=>({tool:e.tool,at:e.placement.at}))`),delta=tool=>{const a=after.find(e=>e.tool===tool).at,b=point.before.find(e=>e.tool===tool).at;return [a[0]-b[0],a[1]-b[1]];};
  const house=delta('dwelling'),smoke=delta('mist');assert(house[0]>.02);assert(Math.abs(house[0]-smoke[0])<1e-8&&Math.abs(house[1]-smoke[1])<1e-8);smokeDrag={houseDelta:house,smokeDelta:smoke,passed:true};
 }
 await evaluate(`document.getElementById('pause').click();document.getElementById('palette').value='tender';document.getElementById('palette').dispatchEvent(new Event('change'));document.getElementById('reset-layout').click();document.getElementById('immersive').click()`);assert(await evaluate(`document.body.classList.contains('immersive')`));await evaluate(`document.getElementById('immersive').click()`);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'main page mobile overflow');
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://127.0.0.1:4173/poem-flow/organization-review.html'});await until(`document.querySelectorAll('article').length===${rows.length}`);await evaluate(`document.querySelectorAll('img').forEach(i=>i.loading='eager')`);await until(`Array.from(document.images).every(i=>i.complete&&i.naturalWidth===960)`);
 await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(r=>writeFile(resolve(out,'review-desktop.png'),Buffer.from(r.data,'base64')));
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
 assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);
 const report={modelCalls:0,browserErrors:errors,networkPosts:posts,mobileWidth:390,smokeDrag,cases:rows,summary:{total:rows.length,rendered:rows.filter(r=>r.after).length,geometryErrors:rows.reduce((n,r)=>n+(r.after?.organization.audit.errors||0),0),reviewItems:rows.reduce((n,r)=>n+(r.after?.organization.audit.review||0),0),sameBatchRefinement:true,aestheticAcceptance:'pending-user'}};
 await writeFile(resolve(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));await send('Browser.close').catch(()=>{});
}finally{ws?.close();browser.kill();}
