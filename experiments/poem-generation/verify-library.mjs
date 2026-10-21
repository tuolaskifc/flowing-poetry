// Browser verification only. Model submission is replaced by an explicit
// rejected-response fixture, and no poetry SDK is loaded.
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const dir=dirname(fileURLToPath(import.meta.url)),qa=resolve(dir,'.qa/library-browser'),out=resolve(dir,'../../poem-flow/verification/library');
await mkdir(qa,{recursive:true});await mkdir(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${qa}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
  let port;for(let i=0;i<100;i++){try{const p=(await readFile(resolve(qa,'DevToolsActivePort'),'utf8')).split('\n')[0];await fetch(`http://127.0.0.1:${p}/json/version`);port=p;break;}catch{await sleep(100);}}
  if(!port)throw new Error('Browser startup failed');
  const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
  let id=0,modelPosts=0;const pending=new Map(),errors=[],externalHosts=new Set();
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent'){const r=m.params.request,u=new URL(r.url);if(u.pathname==='/api/analyze'&&r.method==='POST')modelPosts++;if(u.protocol.startsWith('http')&&u.hostname!=='127.0.0.1')externalHosts.add(u.hostname);}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const until=async(expression)=>{const start=Date.now();while(Date.now()-start<20000){if(await evaluate(expression))return;await sleep(100);}throw new Error('Timeout: '+expression);};
  const navigate=async path=>{await send('Page.navigate',{url:'http://127.0.0.1:4173'+path});};
  const screenshot=async(name,height=1300)=>{const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1280,height,scale:1}});await writeFile(resolve(out,name+'.png'),Buffer.from(shot.data,'base64'));};
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate('/');await until(`!document.getElementById('generate').disabled`);
  assert.equal(await evaluate(`document.getElementById('library-choice').value`),'p01');assert.equal(await evaluate(`document.getElementById('library-choice').options.length`),33);assert.equal(await evaluate(`Array.from(document.getElementById('library-choice').options).filter(o=>/^[g][0-9]+$/.test(o.value)).length`),12);assert(await evaluate(`document.getElementById('output').hidden`));
  assert.equal(await evaluate(`document.querySelector('.online-poetry').open`),false);
  const visited=await evaluate(`(()=>{const ids=[];for(let i=0;i<20;i++){ids.push(document.getElementById('library-choice').value);document.getElementById('recommend').click();}return ids;})()`);assert.equal(new Set(visited).size,20);assert.equal(modelPosts,0);
  await navigate('/poem-flow/library.html');await until(`document.querySelectorAll('#rows tr').length===20`);
  assert.equal(await evaluate(`document.querySelectorAll('#rows tr[data-focus="true"]').length`),5);assert(await evaluate(`document.getElementById('summary').textContent.includes('0 组效果已认可')`));
  assert.equal(await evaluate(`document.querySelectorAll('#rows th a[href^="https:"]').length`),20);
  await evaluate(`document.getElementById('scope').value='focus';document.getElementById('scope').dispatchEvent(new Event('change'))`);assert.equal(await evaluate(`document.querySelectorAll('#rows tr').length`),5);
  await screenshot('focus-table',1550);
  await evaluate(`document.getElementById('clear').click();document.getElementById('search').value='桃花';document.getElementById('search').dispatchEvent(new Event('input'))`);assert.equal(await evaluate(`document.querySelectorAll('#rows tr').length`),1);
  await evaluate(`document.getElementById('clear').click();document.getElementById('review').value='已认可';document.getElementById('review').dispatchEvent(new Event('change'))`);assert(await evaluate(`!document.getElementById('empty').hidden`));
  await evaluate(`document.getElementById('clear').click();document.querySelector('#p03 .choose').click()`);await until(`!document.getElementById('generate').disabled`);
  assert.equal(await evaluate(`document.getElementById('library-choice').value`),'p03');assert.equal(await evaluate(`document.getElementById('poem').value`),'春潮带雨晚来急，野渡无人舟自横。');assert.equal(modelPosts,0);
  await evaluate(`document.getElementById('library-choice').value='p09';document.getElementById('library-choice').dispatchEvent(new Event('change'))`);assert.equal(await evaluate(`document.getElementById('poem').value`),'返景入深林，复照青苔上。');
  await evaluate(`document.getElementById('poem').value='手动输入';document.getElementById('poem').dispatchEvent(new Event('input'))`);assert.equal(await evaluate(`document.getElementById('library-choice').value`),'');assert(await evaluate(`document.getElementById('library-goal').hidden`));
  await navigate('/?poem=p04');await until(`!document.getElementById('generate').disabled`);assert.equal(await evaluate(`document.getElementById('library-choice').value`),'p04');
  await evaluate(`document.getElementById('library-goal').open=true`);await screenshot('main-entry');
  await evaluate(`window.submissions=[];window.originalFetch=window.fetch;window.fetch=(url,options)=>{if(url==='/api/analyze'){window.submissions.push(JSON.parse(options.body));return Promise.resolve(new Response(JSON.stringify({record:{validation:{valid:false}}}),{status:422}));}return window.originalFetch(url,options);};document.getElementById('generate').click()`);await until(`!document.getElementById('generate').disabled`);
  const submissions=await evaluate('window.submissions');assert.equal(submissions.length,1);assert.equal(submissions[0].poem,'接天莲叶无穷碧，映日荷花别样红。');assert.equal(submissions[0].source.provider,'精选诗句库');assert.deepEqual(Object.keys(submissions[0]).sort(),['poem','source']);assert.deepEqual(Object.keys(submissions[0].source).sort(),['author','dynasty','provider','title']);assert.equal(modelPosts,0);assert.equal(externalHosts.size,0);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  await navigate('/poem-flow/library.html');await until(`document.querySelectorAll('#rows tr').length===20`);assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));assert.deepEqual(errors,[]);
  await navigate('/poem-flow/expressive-review.html');await until(`document.querySelectorAll('article').length===20`);await evaluate(`document.querySelectorAll('img').forEach(i=>i.loading='eager')`);await until(`document.querySelectorAll('img').length===40&&[...document.images].every(i=>i.complete&&i.naturalWidth===960)`);assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});await screenshot('expressive-review',1600);assert.equal(modelPosts,0);assert.deepEqual(errors,[]);
  const report={status:'passed',poems:20,focus:5,approved:0,sceneReviewItems:20,sceneReviewImages:40,allPoemsSelectable:true,unimplementedScenesSelectable:true,searchAndFilters:true,deepLinkToMain:true,manualInputClearsSelection:true,editorialNotesExcludedFromSubmission:true,fixtureSubmissions:1,realModelPosts:modelPosts,externalRequests:externalHosts.size,mobileWidth:390,runtimeErrors:errors};
  await writeFile(resolve(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await send('Browser.close').catch(()=>{});
}finally{ws?.close();browser.kill();}
