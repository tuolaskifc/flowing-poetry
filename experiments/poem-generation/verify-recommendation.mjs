// Default: explicit SDK/response fixtures, no external requests. --live fetches
// one bounded real candidate batch; --generate then submits only its selection.
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const dir=dirname(fileURLToPath(import.meta.url)),qa=resolve(dir,'.qa/recommendation-browser'),out=resolve(dir,'../../poem-flow/verification/recommendation');
await mkdir(qa,{recursive:true});await mkdir(out,{recursive:true});
const live=process.argv.includes('--live'),generate=live&&process.argv.includes('--generate'),name=live?'live':'fixtures',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${qa}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
  let port;for(let i=0;i<100;i++){try{const p=(await readFile(resolve(qa,'DevToolsActivePort'),'utf8')).split('\n')[0];await fetch(`http://127.0.0.1:${p}/json/version`);port=p;break;}catch{await sleep(100);}}
  if(!port)throw new Error('Browser startup failed');
  const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
  let id=0;const pending=new Map(),errors=[];let modelPosts=0,sdkResponses=0;
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent'){const r=m.params.request,u=new URL(r.url);if(u.pathname==='/api/analyze'&&r.method==='POST')modelPosts++;}else if(m.method==='Network.responseReceived'){const u=new URL(m.params.response.url);if(u.hostname==='v2.jinrishici.com'&&u.pathname==='/one.json')sdkResponses++;}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const until=async(expression,ms=40000)=>{const start=Date.now();while(Date.now()-start<ms){if(await evaluate(expression))return;await sleep(100);}throw new Error('Timeout: '+expression);};
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:4173/'});
  await until(`Boolean(window.PoemRecommendation)&&!document.getElementById('generate').disabled`);
  if(!live)await evaluate(`window.testCalls=0;window.jinrishici={load(done){const poems=['提剑出燕京','花','月照水，柳含烟。','花','十月不见燕京'];done({status:'success',data:{content:poems[window.testCalls++],origin:{author:'测试作者',title:'明确标记的测试数据'}}});}}`);
  await evaluate(`document.getElementById('fetch-poem').click()`);await until(`!document.getElementById('fetch-poem').disabled`);
  const selection=await evaluate(`({poem:document.getElementById('poem').value,source:document.getElementById('source').textContent,status:document.getElementById('status').textContent,summary:document.getElementById('candidate-summary').textContent,rows:[...document.querySelectorAll('[data-candidate]')].map(b=>({label:b.querySelector('small').textContent,selected:b.getAttribute('aria-pressed'),disabled:b.disabled})),calls:window.testCalls??null})`);
  assert.equal(modelPosts,0,'screening must not call DeepSeek');
  const checks={screeningModelPosts:0};
  if(!live){
    assert.equal(selection.calls,5);assert.equal(selection.rows.length,4);assert.equal(selection.poem,'月照水，柳含烟。');assert.equal(selection.rows[0].selected,'true');
    await evaluate(`document.querySelector('[data-candidate="1"]').click()`);assert.equal(await evaluate(`document.getElementById('poem').value`),'花');
    await evaluate(`document.getElementById('poem').value='保留这条输入月';document.getElementById('poem').dispatchEvent(new Event('input'));window.testCalls=0;window.jinrishici.load=done=>{window.testCalls++;done({status:'success',data:{content:'君子死知己，提剑出燕京。'}});};document.getElementById('fetch-poem').click()`);
    await until(`!document.getElementById('fetch-poem').disabled`);assert.equal(await evaluate(`document.getElementById('poem').value`),'保留这条输入月');assert.equal(await evaluate('window.testCalls'),5);assert(await evaluate(`document.getElementById('status').textContent.includes('保留原输入')`));
    await evaluate(`window.testCalls=0;window.jinrishici.load=(done,fail)=>{if(window.testCalls++===0)done({status:'success',data:{content:'月水',origin:{author:'测试作者'}}});else fail({errMessage:'测试的取句中断'});};document.getElementById('fetch-poem').click()`);
    await until(`!document.getElementById('fetch-poem').disabled`);assert.equal(await evaluate('window.testCalls'),2);assert.equal(await evaluate(`document.getElementById('poem').value`),'月水');
    await evaluate(`window.submissions=[];window.originalFetch=window.fetch;window.fetch=(url,options)=>{if(url==='/api/analyze'){window.submissions.push(JSON.parse(options.body));return Promise.resolve(new Response(JSON.stringify({record:{validation:{valid:false}}}),{status:422}));}return window.originalFetch(url,options);};document.getElementById('generate').click()`);
    await until(`!document.getElementById('generate').disabled`);const submissions=await evaluate('window.submissions');assert.equal(submissions.length,1);assert.equal(submissions[0].poem,'月水');assert.equal(submissions[0].source.provider,'今日诗词');assert.deepEqual(Object.keys(submissions[0]).sort(),['poem','source']);assert.equal(modelPosts,0);
    Object.assign(checks,{fiveCalls:true,deduplicated:true,ranked:true,manualSelection:true,noMatchPreservesInput:true,partialFailureStops:true,onlySelectedSubmitted:true,fixtureSubmissions:1});
  }else{
    assert(sdkResponses>0&&sdkResponses<=5);checks.sdkResponses=sdkResponses;
    if(generate&&selection.rows.some(r=>r.selected==='true')){
      await evaluate(`document.getElementById('generate').click()`);await until(`!document.getElementById('generate').disabled`,110000);
      const scene=await evaluate(`({title:document.getElementById('scene-title').textContent,status:document.getElementById('status').textContent,usage:document.getElementById('usage').textContent,scene:window.PoemTrialScene.inspect()})`);
      await writeFile(resolve(out,'live-analysis.json'),JSON.stringify(scene,null,2)+'\n');assert.equal(modelPosts,1);assert.equal(scene.title,selection.poem);assert(scene.status.startsWith('已生成画面'),scene.status);checks.generatedTools=scene.scene.layers.map(l=>l.id);
    }
  }
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1280,height:1600,scale:1}});await writeFile(resolve(out,name+'.png'),Buffer.from(shot.data,'base64'));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(100);assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));assert.deepEqual(errors,[]);
  const report={status:'passed',live,generate,selection:live?{...selection,rows:selection.rows.map(r=>({...r}))}:selection,checks,modelPosts,runtimeErrors:errors};
  await writeFile(resolve(out,name+'.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  await send('Browser.close').catch(()=>{});
}finally{ws?.close();browser.kill();}
