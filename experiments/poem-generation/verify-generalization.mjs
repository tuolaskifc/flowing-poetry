// Replay stored real responses only. No API POSTs, repairs or synthetic model
// answers. A failed 3.2 reply remains failed even when a 3.1 control can render.
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {buildPlan} from './planner.mjs';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../..'),out=resolve(root,'poem-flow/verification/generalization');
const samples=JSON.parse(await readFile(resolve(dir,'generalization-cases.json'),'utf8')).cases;
const notes=JSON.parse(await readFile(resolve(dir,'generalization-notes.json'),'utf8'));
const qa=resolve(dir,'.qa/generalization-'+Date.now());await mkdir(qa,{recursive:true});await mkdir(out,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms)),browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${qa}`,'about:blank'],{windowsHide:true,stdio:'ignore'});let ws;
const optional=async path=>{try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}};
const checks=(sample,p)=>{
 const has=(tool,form)=>p.layers.some(l=>l.tool===tool&&(!form||l.options.form===form));
 const count=tool=>p.layers.filter(l=>l.tool===tool).reduce((n,l)=>n+l.instances.length,0);
 const assertions={g01:{village:has('dwelling'),ground:has('landscape','ground')},g02:{water:has('water'),grass:has('grass'),woodedCreek:p.scene.kind==='wooded-creek'},g03:{oneTree:count('tree')===1,ground:has('landscape','ground')},g04:{noWind:p.settings.wind===0,noBird:!has('bird')&&!has('oriole'),woodland:p.scene.kind==='mixed-woodland'},g05:{oneBoat:count('boat')===1,channel:p.scene.kind==='mountain-channel'},g06:{oneBoat:count('boat')===1,water:has('water'),noPerson:!has('figure')},g07:{mountain:has('landscape','mountain'),noAbsentBodies:!['bird','oriole','figure','boat','snow'].some(t=>has(t))},g08:{village:has('dwelling'),sky:has('landscape','sky')},g09:{spring:has('water'),stream:p.scene.kind==='mountain-stream',noInventedSun:!has('landscape','sun')},g10:{mountain:has('landscape','mountain'),mist:has('mist'),bambooHillside:p.scene.kind==='bamboo-hillside'},g11:{field:has('landscape','field'),water:has('water'),twoPeaks:p.layers.find(l=>l.options.form==='mountain')?.instances.length===2,noPerson:!has('figure')},g12:{twoBirds:count('bird')===2,reeds:has('grass','reed'),noAddedBoat:!has('boat')}};
 return assertions[sample.id];
};
try{
 let port;for(let i=0;i<100;i++){try{port=(await readFile(resolve(qa,'DevToolsActivePort'),'utf8')).split('\n')[0];await fetch(`http://127.0.0.1:${port}/json/version`);break;}catch{await wait(100);}}assert(port);
 const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 let id=0;const pending=new Map(),errors=[],posts=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const q=pending.get(m.id);pending.delete(m.id);m.error?q.reject(new Error(JSON.stringify(m.error))):q.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Network.requestWillBeSent'&&m.params.request.method==='POST')posts.push(m.params.request.url);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async expression=>{for(let i=0;i<200;i++){if(await evaluate(expression))return;await wait(100);}throw new Error('Timeout: '+expression);};
 await send('Runtime.enable');await send('Network.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:4173/'});await until(`window.PoemTrialScene&&!document.getElementById('generate').disabled`);
 async function paint(plan,name){
  await evaluate(`document.getElementById('output').hidden=false;window.PoemTrialScene.render(${JSON.stringify(plan)})`);await until(`window.PoemTrialScene.inspect().layers.every(l=>l.ticks>0)`);await evaluate('window.PoemTrialScene.pause(true)');await wait(50);
  const s=await evaluate('window.PoemTrialScene.inspect()');assert(s.ready&&s.layers.every(l=>l.finite!==false));
  const png=await evaluate(`document.getElementById('scene').toDataURL()`);await writeFile(resolve(out,name+'.png'),Buffer.from(png.split(',')[1],'base64'));
  return {tools:plan.layers.map(l=>l.tool),scene:plan.scene.kind,instances:s.instances.length,omitted:plan.omitted,spatial:plan.spatial,checks:checks(samples.find(c=>name.startsWith(c.id)),plan)};
 }
 const rows=[];
 for(const sample of samples){
  const first=await optional(resolve(out,sample.id+'-record.json')),revision=await optional(resolve(out,sample.id+'-r1-record.json')),record=revision||first;assert(first&&record);
  const row={id:sample.id,poem:sample.poem,first:{record:first.id,valid:first.validation.valid,errors:first.validation.errors},current:{record:record.id,valid:record.validation.valid,errors:record.validation.errors},review:'待用户审阅'};
  if(first.validation.valid)row.first.picture=await paint(first.plan,sample.id+'-before');
  if(record.validation.valid)row.current.picture=await paint(buildPlan(record.analysis),sample.id+'-after');
  const control=await optional(resolve(out,sample.id+'-quantity-control-record.json'));
  if(control){row.quantityControl={record:control.id,mode:control.mode,valid:control.validation.valid};if(control.validation.valid)row.quantityControl.picture=await paint(buildPlan(control.analysis),sample.id+'-control');}
  rows.push(row);
 }
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const figure=(id,label,stage)=>stage.picture?`<figure><img loading="lazy" src="verification/generalization/${id}.png" alt="${esc(label)}"><figcaption>${esc(label)}</figcaption></figure>`:`<div class="failed"><b>${esc(label)}：未生成画面</b><p>${stage.errors.map(esc).join('；')}</p></div>`;
 const cards=rows.map(r=>{const c=samples.find(c=>c.id===r.id),note=notes.cases[r.id];return `<article id="${r.id}"><h2>${r.id} · ${esc(c.poem)}</h2><p>${esc(c.author)}《${esc(c.title)}》 · <a href="${esc(c.source.url)}" target="_blank" rel="noopener noreferrer">原句出处</a> · <a class="choose" href="/?trial=${r.id}">带入生成器</a></p><p>${esc(c.goal)}</p><p>首轮问题：${esc(note.before)}</p><p>本轮处理：${esc(note.changes)}</p><div class="pair">${figure(r.id+'-before','首轮实际结果',r.first)}${figure(r.id+'-after','当前严格场景模式',r.current)}</div>${r.quantityControl?.picture?`<div class="control"><h3>数量模式对照，未提取空间关系</h3>${figure(r.id+'-control','独立的 3.1 模式真实调用；不计作 3.2 成功',r.quantityControl)}</div>`:''}<details><summary>记录与自动检查</summary><p>首轮 ${esc(r.first.record)}；当前 ${esc(r.current.record)}。${r.quantityControl?'数量对照 '+esc(r.quantityControl.record)+'。':''}</p><p>${esc(JSON.stringify(r.current.picture?.checks||{}))}</p><p>仍未绘制：${esc((r.current.picture?.omitted||r.quantityControl?.picture?.omitted||[]).map(e=>e.name+'：'+e.reason).join('；'))}</p></details><p>仍需改进：${esc(note.remaining)}</p><p>审美仍待逐幅确认；首轮失败未被后续结果覆盖。</p></article>`;}).join('\n');
 const initial=rows.filter(r=>r.first.valid).length,current=rows.filter(r=>r.current.valid).length;
 await writeFile(resolve(root,'poem-flow/generalization-review.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>流动诗 · 十二句新组合</title><style>body{max-width:1400px;margin:auto;padding:24px;background:#f5f3ec;color:#344b43;font:16px/1.7 system-ui}a{color:inherit}h1{font-size:30px}h2{font-size:21px}article{padding:24px 0;border-top:1px solid #cbd1c7}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}img{display:block;width:100%}figcaption,details{font-size:14px;color:#666}.failed{padding:24px;background:#eee4df}.control{max-width:750px;margin:20px auto}nav{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}@media(max-width:650px){body{padding:16px}.pair{grid-template-columns:1fr}}</style><a href="/">← 生成器</a> · <a href="expressive-review.html">已基本认可的二十句基线</a><h1>换十二句，看能否举一反三</h1><p>每句首轮都真实调用了模型，选句目标未传给模型。首轮 ${initial}/12 通过结构检查；证据提示修订后，同批 ${current}/12 通过。规则已针对本批问题修复，这些结果属于同批回归，不是新的独立测试成功率。</p><p>白鸟一例仍保留严格场景模式的失败，另列一次数量模式对照；未把它冒充空间关系已经通过。打开本页不会调用模型，带入生成器后需点击生成才会调用。</p><nav>${rows.map(r=>`<a href="#${r.id}">${r.id}</a>`).join('')}</nav>${cards}</html>`);
 await send('Page.navigate',{url:'http://127.0.0.1:4173/?trial=g01'});await until(`!document.getElementById('generate').disabled`);assert.equal(await evaluate(`document.getElementById('poem').value`),samples[0].poem);assert.equal(await evaluate(`document.getElementById('library-choice').value`),'g01');
 await evaluate(`window.trialSubmissions=[];window.actualFetch=window.fetch;window.fetch=(url,options)=>{if(url==='/api/analyze'){window.trialSubmissions.push(JSON.parse(options.body));return Promise.resolve(new Response(JSON.stringify({record:{validation:{valid:false}}}),{status:422}));}return window.actualFetch(url,options);};document.getElementById('generate').click()`);await until(`!document.getElementById('generate').disabled`);
 const submissions=await evaluate('window.trialSubmissions');assert.equal(submissions.length,1);assert.equal(submissions[0].poem,samples[0].poem);assert.deepEqual(Object.keys(submissions[0]).sort(),['poem','source']);assert.deepEqual(Object.keys(submissions[0].source).sort(),['author','dynasty','provider','title']);assert.equal(submissions[0].source.provider,'泛化新句试验');
 await send('Page.navigate',{url:'http://127.0.0.1:4173/poem-flow/generalization-review.html'});await until(`document.querySelectorAll('article').length===12`);await evaluate(`document.querySelectorAll('img').forEach(i=>i.loading='eager')`);await until(`Array.from(document.images).every(i=>i.complete&&i.naturalWidth===960)`);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);
 const failedChecks=rows.flatMap(r=>[r.current.picture,r.quantityControl?.picture].filter(Boolean).flatMap(p=>Object.entries(p.checks).filter(([,v])=>!v).map(([name])=>r.id+': '+name)));
 const report={modelCalls:0,initialValid:initial,currentStrictValid:current,total:12,quantityControls:rows.filter(r=>r.quantityControl?.valid).length,failedChecks,runtimeErrors:errors,mobileWidth:390,baselinePoemsPreserved:true,cases:rows};await writeFile(resolve(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({initial,current,failedChecks,cases:rows.length,controls:report.quantityControls,modelCalls:0}));assert.deepEqual(failedChecks,[]);
 await send('Browser.close').catch(()=>{});
}finally{ws?.close();browser.kill();}
