// Browser smoke verification using installed Edge and standard Node APIs.
// Default: file URL. Add --http to verify the running local preview server.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const qa=resolve(dir,'.qa');await mkdir(qa,{recursive:true});
const profile=resolve(qa,`browser-${Date.now()}`);
const edge=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[
  '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
  '--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'
],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws;
try {
  let port;
  for(let i=0;i<100;i++){try{port=(await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await sleep(100);}}
  if(!port)throw new Error('Edge did not open debugging port');
  const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
  let nextId=0;const pending=new Map(),errors=[];
  ws.addEventListener('message',e=>{const msg=JSON.parse(e.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);if(msg.error)p.reject(new Error(JSON.stringify(msg.error)));else p.resolve(msg.result);}else if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async(expression)=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await send('Runtime.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  const targetUrl=process.argv.includes('--http')?'http://127.0.0.1:4185/?seed=42':pathToFileURL(resolve(dir,'index.html')).href+'?seed=42';
  await send('Page.navigate',{url:targetUrl});
  try {await evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(window.imageryExperiment && document.querySelectorAll('[data-ready="true"]').length===5){clearInterval(t);resolve(true);}else if(++n>100){clearInterval(t);reject(new Error('Canvas readiness timeout'));}},100);})`);}
  catch(e){console.error(JSON.stringify({errors,page:await evaluate(`({url:location.href,text:document.body.innerText.slice(0,1200),p5:typeof p5,ready:document.querySelectorAll('[data-ready="true"]').length})`)}));throw e;}
  const initial=await evaluate('window.imageryExperiment.inspect()');
  await evaluate(`document.getElementById('pause').click()`);
  const pausedBefore=await evaluate('window.imageryExperiment.inspect()');
  await sleep(250);
  const pausedAfter=await evaluate('window.imageryExperiment.inspect()');
  if(pausedBefore.some((x,i)=>x.time!==pausedAfter[i].time))throw new Error('Pause did not freeze time');
  await evaluate(`for(const [id,val] of [['wind',100],['density',100]]){const el=document.getElementById(id);el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}));}const sel=document.getElementById('palette');sel.value='tender';sel.dispatchEvent(new Event('change'));document.getElementById('reseed').click();`);
  await sleep(100);
  const changed=await evaluate('window.imageryExperiment.inspect()');
  if(changed.some((x,i)=>x.seed!==initial[i].seed+1))throw new Error('Reseed failed');
  const settings=await evaluate('window.imageryExperiment.settings()');
  if(settings.wind!==1||settings.density!==1||settings.palette!=='tender')throw new Error('Controls failed');
  // Export via canvas data proves a drawable, untainted image; does not test OS download UI.
  const exportInfo=await evaluate(`Array.from(document.querySelectorAll('canvas'),c=>({width:c.width,height:c.height,png:c.toDataURL('image/png').startsWith('data:image/png;base64,')}))`);
  if(exportInfo.length!==5||exportInfo.some(x=>!x.png||!x.width))throw new Error('Canvas export failed');
  await evaluate(`document.getElementById('pause').click()`);await sleep(1200);
  const resumed=await evaluate('window.imageryExperiment.inspect()');
  if(resumed.some(x=>!x.finite||x.time<=0)||resumed[4].birdCount!==22)throw new Error('Animation/bird state failed');
  // Restore the initial viewing controls for a representative screenshot.
  await evaluate(`for(const [id,val] of [['wind',35],['density',45]]){const el=document.getElementById(id);el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}));}const s=document.getElementById('palette');s.value='clear';s.dispatchEvent(new Event('change'));document.getElementById('pause').click()`);await sleep(100);
  const wideLayout=await evaluate(`({viewport:innerWidth,document:document.documentElement.scrollWidth,candidates:document.querySelectorAll('.candidate').length,canvases:document.querySelectorAll('canvas').length})`);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1280,height:2180,scale:1}});
  await writeFile(resolve(dir,'preview.png'),Buffer.from(shot.data,'base64'));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(150);
  const narrowLayout=await evaluate(`({viewport:innerWidth,document:document.documentElement.scrollWidth,canvases:document.querySelectorAll('canvas').length})`);
  if(narrowLayout.document>narrowLayout.viewport||wideLayout.document>wideLayout.viewport)throw new Error('Horizontal overflow');
  const mobile=await send('Page.captureScreenshot',{format:'png'});await writeFile(resolve(qa,'mobile.png'),Buffer.from(mobile.data,'base64'));
  if(errors.length)throw new Error(JSON.stringify(errors));
  const report={status:'passed',targetUrl,initial,pausedBefore,pausedAfter,changed,settings,resumed,exportInfo,wideLayout,narrowLayout,runtimeErrors:errors,limitations:['未操作系统下载确认界面；仅验证 canvas 导出 PNG 数据。','本地画面经浏览器截图检查；OpenProcessing 原作未完成视觉检查。']};
  await writeFile(resolve(dir,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,wideLayout,narrowLayout,runtimeErrors:errors.length}));
  await send('Browser.close').catch(()=>{});
}finally{if(ws)ws.close();edge.kill();}
