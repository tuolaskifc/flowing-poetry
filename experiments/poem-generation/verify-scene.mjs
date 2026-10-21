// Fixed-suite visual regression. Default: 20 authored fixtures, no model calls.
// --live: four API requests, no automatic retries. --saved: replay those records.
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {benchmarks} from './scene-benchmarks.mjs';
import {buildPlan} from './planner.mjs';
import {fixture,quantity} from './quantity-fixtures.mjs';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../..'),qa=resolve(dir,'.qa/scene'),out=resolve(root,'poem-flow/verification/scene');await mkdir(qa,{recursive:true});await mkdir(out,{recursive:true});
const live=process.argv.includes('--live'),saved=process.argv.includes('--saved'),prefix=live?'live':saved?'real-replay':'fixtures';assert(!(live&&saved));
for(const file of ['planner.mjs','composition.mjs','imagery-lexicon.js'])await writeFile(resolve(qa,file),execFileSync('git',['show','1ef1b3d:experiments/poem-generation/'+file],{cwd:root}));
const {buildPlan:beforePlan}=await import(pathToFileURL(resolve(qa,'planner.mjs')).href);
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),profile=resolve(qa,'browser');await mkdir(profile,{recursive:true});
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});let ws;
try{
 let port;for(let i=0;i<100;i++){try{const p=(await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];await fetch(`http://127.0.0.1:${p}/json/version`);port=p;break;}catch{await sleep(100);}}if(!port)throw new Error('Browser startup failed');
 const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 let id=0;const pending=new Map(),errors=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async exp=>{for(let i=0;i<200;i++){if(await evaluate(exp))return;await sleep(100);}throw new Error('Timeout '+exp);};
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:4173/'});await until(`window.PoemTrialScene&&!document.getElementById('generate').disabled`);
 const selection=process.argv.find(a=>a.startsWith('--cases='))?.slice(8).split(',');
 const samples=(live||saved?benchmarks.filter(b=>['p01','p11','p12','p17'].includes(b.id)):benchmarks).filter(b=>!selection||selection.includes(b.id));assert(samples.length);
 const report=[];let requests=0;
 for(const sample of samples){
  let analysis=sample.analysis,record=null;
  if(saved){record=JSON.parse(await readFile(resolve(out,'live-'+sample.id+'-record.json'),'utf8'));analysis=record.analysis;}
  if(live){requests++;const response=await fetch('http://127.0.0.1:4173/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({poem:sample.poem,source:{provider:'场景通路实测',...sample.source}}),signal:AbortSignal.timeout(110000)});const body=await response.json();record=body.record;await writeFile(resolve(out,'live-'+sample.id+'-record.json'),JSON.stringify(record||body,null,2)+'\n');assert(record?.validation?.valid,JSON.stringify(record?.validation||body));analysis=record.analysis;}
  const pair={},pictures={};
  for(const [version,plan] of Object.entries({before:beforePlan(analysis),after:buildPlan(analysis)})){
   await evaluate(`document.getElementById('output').hidden=false;document.getElementById('welcome').hidden=true;window.PoemTrialScene.render(${JSON.stringify(plan)})`);await until(`window.PoemTrialScene.inspect().layers.every(c=>c.ticks>0)`);await evaluate('window.PoemTrialScene.pause(true)');await sleep(35);
   const state=await evaluate('window.PoemTrialScene.inspect()');assert(state.ready&&state.layers.every(l=>l.finite!==false));
   const png=await evaluate(`document.getElementById('scene').toDataURL()`);pictures[version]=png;await writeFile(resolve(out,`${prefix}-${sample.id}-${version}.png`),Buffer.from(png.split(',')[1],'base64'));
   const visible=analysis.entities.filter(e=>e.role==='scene'&&e.presence==='present'&&e.kind!=='abstract'),covered=new Set(plan.layers.flatMap(l=>l.entities));
   pair[version]={covered:visible.filter(e=>covered.has(e.id)).length,total:visible.length,tools:plan.layers.map(l=>l.tool),instances:state.instances.length,missing:plan.omitted.map(e=>e.name),spatial:plan.spatial||[],scene:plan.scene?.kind};
   if(version==='after'){
    const before=state.layers.map(l=>l.time);await sleep(50);assert.deepEqual((await evaluate('window.PoemTrialScene.inspect()')).layers.map(l=>l.time),before);
    if(sample.id==='p12'){assert(state.layers.some(l=>l.id==='water'));assert.equal(state.instances.filter(l=>l.tool==='boat').length,1);}
    if(sample.id==='p01')assert(state.layers.some(l=>l.id==='tree'&&l.form==='pine'));
   }
  }
  if(['p01','p09','p11','p12','p17'].includes(sample.id)){
   const comparison=await evaluate(`(async()=>{const c=document.createElement('canvas');c.width=1920;c.height=660;const x=c.getContext('2d');x.fillStyle='#eeeae3';x.fillRect(0,0,1920,660);x.fillStyle='#344b43';x.font='23px SimSun';x.fillText('修改前：数量与固定图层',25,38);x.fillText('修改后：景物映射、空间骨架与局部关系',985,38);for(const [i,url] of ${JSON.stringify(Object.values(pictures))}.entries()){const img=new Image();img.src=url;await img.decode();x.drawImage(img,i*960,60);}return c.toDataURL();})()`);await writeFile(resolve(out,`${prefix}-${sample.id}-comparison.png`),Buffer.from(comparison.split(',')[1],'base64'));
  }
  report.push({id:sample.id,poem:sample.poem,basis:record?'real-model':'authored-semantic-fixture',record:record?.id,usage:record?.usage,review:'待人工审美确认',...pair});
 }
 const extra={...fixture('竹外两朵花，月影映水。',[{text:'竹'},{text:'花',quantity:quantity({mode:'exact',min:2,max:2,scope:'individual',evidence:['两朵花']})},{text:'月'},{text:'水'}]),schema_version:'3.2',spatial:[{type:'outside',source:'i2',target:'i1',modality:'asserted',basis:'explicit',evidence:['竹外两朵花']},{type:'reflects_on',source:'i3',target:'i4',modality:'asserted',basis:'inferred',evidence:['月影映水']}]};
 const extraPlan=buildPlan(extra);assert(extraPlan.spatial.every(r=>r.visualized));const flowers=extraPlan.layers.find(l=>l.tool==='flower'),bamboo=extraPlan.layers.find(l=>l.tool==='bamboo');assert(Math.min(...flowers.instances.map(v=>v.placement.at[0]))>Math.max(...bamboo.instances.map(v=>v.placement.at[0])));
 await evaluate(`window.PoemTrialScene.render(${JSON.stringify(extraPlan)})`);await until(`window.PoemTrialScene.inspect().layers.every(c=>c.ticks>0)`);await evaluate('window.PoemTrialScene.pause(true)');await sleep(40);const reflected=await evaluate(`document.getElementById('scene').toDataURL()`);await writeFile(resolve(out,'spatial-authored-study.png'),Buffer.from(reflected.split(',')[1],'base64'));
 const flatPlan=structuredClone(extraPlan);flatPlan.layers.forEach(l=>delete l.reflection);await evaluate(`window.PoemTrialScene.render(${JSON.stringify(flatPlan)})`);await until(`window.PoemTrialScene.inspect().layers.every(c=>c.ticks>0)`);await evaluate('window.PoemTrialScene.pause(true)');await sleep(40);assert.notEqual(await evaluate(`document.getElementById('scene').toDataURL()`),reflected,'explicit reflection should change the rendered water image');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));assert.deepEqual(errors,[]);
 const summary={status:'passed',modelRequests:requests,savedRecordReplay:saved,beforeCovered:report.reduce((n,r)=>n+r.before.covered,0),afterCovered:report.reduce((n,r)=>n+r.after.covered,0),entities:report.reduce((n,r)=>n+r.after.total,0),cases:report,spatialStudy:{basis:'authored-semantic-fixture',outsideGroupsSeparated:true,reflectionChangesPng:true},mobileWidth:390,runtimeErrors:errors};
 await writeFile(resolve(out,prefix+'-verification.json'),JSON.stringify(summary,null,2)+'\n');
 if(!live&&!saved){
  const cards=report.map(r=>`<article><h2>${r.id} · ${r.poem}</h2><p>基础物象覆盖 ${r.before.covered}/${r.before.total} → ${r.after.covered}/${r.after.total} · 待审美确认</p><div class="pair"><figure><img loading="lazy" src="verification/scene/fixtures-${r.id}-before.png"><figcaption>修改前</figcaption></figure><figure><img loading="lazy" src="verification/scene/fixtures-${r.id}-after.png"><figcaption>修改后</figcaption></figure></div><p>仍未画出：${r.after.missing.join('、')||'本样例主体均有基础画法；完整关系仍需检查'}</p></article>`).join('\n');
  await writeFile(resolve(root,'poem-flow/scene-review.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>流动诗 · 场景对照</title><style>body{margin:0 auto;max-width:1400px;padding:28px;background:#f5f3ec;color:#344b43;font:16px/1.7 system-ui}a{color:inherit}h1{font-size:32px}h2{font-size:21px}article{border-top:1px solid #cbd1c7;padding:20px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}img{display:block;width:100%}figcaption{font-size:14px;color:#666}@media(max-width:650px){.pair{grid-template-columns:1fr}body{padding:16px}}</style><a href="/">← 返回生成器</a><h1>二十句，逐幅看场景</h1><p>固定诗句与人工编写的语义测试样例，零模型调用。对照使用同一份语义及当前工具，修改前为 1ef1b3d 的规划规则。覆盖只统计测试中列出的非抽象在场主体是否有基础画法，香气等非视觉内容不计入分母，不代表整句理解或审美通过。</p><p>基础物象覆盖 ${summary.beforeCovered}/${summary.entities} → ${summary.afterCovered}/${summary.entities}。未支持的主体保留为空缺，不自动补背景物种。</p>${cards}</html>`);
 }
 console.log(JSON.stringify({status:'passed',cases:report.length,requests,beforeCovered:summary.beforeCovered,afterCovered:summary.afterCovered,entities:summary.entities,records:report.flatMap(r=>r.record?[r.record]:[])}));await send('Browser.close').catch(()=>{});
}finally{ws?.close();browser.kill();}
