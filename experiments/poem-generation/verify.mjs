// --live requests one poem through the official browser SDK and submits it once.
// Without --live, only replay the latest saved real result; no model calls.
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url)),qa=resolve(dir,'.qa');await mkdir(qa,{recursive:true});
const live=process.argv.includes('--live')||process.argv.includes('--sample'),sample=process.argv.includes('--sample'),checkName=sample?'live-sample':live?'live-sdk':'replay';
const profile=resolve(qa,'browser-profile'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
  let port;for(let i=0;i<100;i++){try{const candidate=(await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];await fetch('http://127.0.0.1:'+candidate+'/json/version');port=candidate;break;}catch{await sleep(100);}}
  if(!port)throw new Error('Browser startup failed');
  const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
  let next=0;const pending=new Map(),errors=[],network=[];
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Network.responseReceived'){const u=new URL(m.params.response.url);network.push({host:u.hostname,path:u.pathname,status:m.params.response.status});}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const until=async(condition,ms=15000)=>{const start=Date.now();while(Date.now()-start<ms){if(await evaluate(condition))return;await sleep(150);}throw new Error('Timeout: '+await evaluate('document.getElementById("status").textContent'));};
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:4186/'});
  await until(`Boolean(window.PoemTrialScene)&&document.getElementById('status').textContent!=='正在连接本地分析服务……'`);
  let poetry=null;
  if(live){
    if(!sample){
      await evaluate(`document.getElementById('fetch-poem').click()`);await until(`!document.getElementById('fetch-poem').disabled`,20000);
      poetry=await evaluate(`({poem:document.getElementById('poem').value,source:document.getElementById('source').textContent,status:document.getElementById('status').textContent})`);
    }
    if(sample||!poetry.poem)await evaluate(`document.getElementById('sample').click()`);
    await evaluate(`document.getElementById('generate').click()`);await until(`!document.getElementById('generate').disabled`,100000);
  }else{
    if(await evaluate(`document.getElementById('replay').hidden`))throw new Error('No saved real result available for replay');
    await evaluate(`document.getElementById('replay').click()`);await until(`window.PoemTrialScene.inspect().ready`);
  }
  const state=await evaluate(`({status:document.getElementById('status').textContent,scene:window.PoemTrialScene.inspect(),poem:document.getElementById('poem').value,reading:document.getElementById('reading').textContent,omitted:Array.from(document.querySelectorAll('#omitted li'),e=>e.textContent),drawn:Array.from(document.querySelectorAll('#drawn li'),e=>e.textContent)})`);
  await writeFile(resolve(dir,checkName+'-check.json'),JSON.stringify({live,poetry,state,network,runtimeErrors:errors},null,2)+'\n');
  if(!state.scene.ready)throw new Error(state.status);
  await evaluate(`document.getElementById('pause').click()`);const before=await evaluate('window.PoemTrialScene.inspect()');await sleep(150);const after=await evaluate('window.PoemTrialScene.inspect()');
  if(before.layers.some((l,i)=>l.time!==after.layers[i].time))throw new Error('Pause failed');
  const alpha=await evaluate(`Array.from(document.querySelectorAll('#layer-hosts canvas'),c=>c.getContext('2d').getImageData(0,0,1,1).data[3])`);
  if(alpha.some(a=>a!==0))throw new Error('Layer backgrounds are opaque');
  const png=await evaluate(`document.getElementById('scene').toDataURL()`);if(!png.startsWith('data:image/png'))throw new Error('PNG failed');
  await writeFile(resolve(dir,'generated-scene.png'),Buffer.from(png.split(',')[1],'base64'));
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1280,height:1800,scale:1}});await writeFile(resolve(dir,'preview.png'),Buffer.from(shot.data,'base64'));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(150);const mobile=await evaluate(`({width:innerWidth,document:document.documentElement.scrollWidth})`);if(mobile.document>mobile.width)throw new Error('Horizontal overflow');
  if(errors.length)throw new Error(JSON.stringify(errors));
  const result={status:'passed',live,poetry,state,transparentLayers:alpha.length,exportPng:true,mobile,runtimeErrors:errors};
  await writeFile(resolve(dir,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:'passed',poetry,poem:state.poem,tools:state.scene.layers.map(l=>l.id),omitted:state.omitted}));
  await send('Browser.close').catch(()=>{});
}finally{if(ws)ws.close();browser.kill();}
