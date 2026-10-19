// --live requests one poem through the official browser SDK and submits it once.
// Without --live, only replay the latest saved real result; no model calls.
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url)),main=process.argv.includes('--main'),qa=resolve(dir,'.qa'),out=main?resolve(dir,'../../poem-flow/verification'):dir;await mkdir(qa,{recursive:true});await mkdir(out,{recursive:true});
const curated=process.argv.includes('--curated'),live=process.argv.includes('--live')||process.argv.includes('--sample')||curated,sample=process.argv.includes('--sample'),checkName=curated?'live-curated':sample?'live-sample':live?'live-sdk':'replay';
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
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:'+(main?4173:4186)+'/'});
  await until(`Boolean(window.PoemTrialScene)&&!document.getElementById('generate').disabled`);
  let poetry=null;
  if(live){
    if(curated)await evaluate(`document.getElementById('recommend').click()`);
    if(!sample&&!curated){
      await evaluate(`document.getElementById('fetch-poem').click()`);await until(`!document.getElementById('fetch-poem').disabled`,20000);
      poetry=await evaluate(`({poem:document.getElementById('poem').value,source:document.getElementById('source').textContent,status:document.getElementById('status').textContent})`);
      if(!poetry.status.startsWith('已取到诗句'))throw new Error('Recommendation did not succeed: '+poetry.status);
    }
    if(sample)await evaluate(`document.getElementById('sample').click()`);
    await evaluate(`document.getElementById('generate').click()`);await until(`!document.getElementById('generate').disabled`,100000);
  }else{
    if(await evaluate(`document.getElementById('replay').hidden`))throw new Error('No saved real result available for replay');
    await evaluate(`document.getElementById('replay').click()`);await until(`!document.getElementById('replay').disabled&&window.PoemTrialScene.inspect().ready`);
  }
  const state=await evaluate(`({status:document.getElementById('status').textContent,scene:window.PoemTrialScene.inspect(),poem:document.getElementById('poem').value,sceneTitle:document.getElementById('scene-title').textContent,usage:document.getElementById('usage').textContent,reading:document.getElementById('reading').textContent,omitted:Array.from(document.querySelectorAll('#omitted li'),e=>e.textContent),drawn:Array.from(document.querySelectorAll('#drawn li'),e=>e.textContent)})`);
  await writeFile(resolve(out,checkName+'-check.json'),JSON.stringify({live,poetry,state,network,runtimeErrors:errors},null,2)+'\n');
  if(!state.scene.ready||state.sceneTitle!==state.poem||!state.status.startsWith('已生成画面'))throw new Error(state.status);
  await sleep(160);const moving=await evaluate('window.PoemTrialScene.inspect()');
  if(state.scene.layers.some(l=>!l.paused)&&!moving.layers.some((l,i)=>l.time>state.scene.layers[i].time))throw new Error('Animation did not advance');
  await evaluate(`document.getElementById('pause').click()`);const before=await evaluate('window.PoemTrialScene.inspect()');await sleep(150);const after=await evaluate('window.PoemTrialScene.inspect()');
  if(before.layers.some((l,i)=>l.time!==after.layers[i].time))throw new Error('Pause failed');
  let interactions=null;
  if(main){
    await evaluate(`document.getElementById('wind').value='0.8';document.getElementById('wind').dispatchEvent(new Event('input'))`);
    if(await evaluate('window.PoemTrialScene.inspect().settings.wind')!==.8)throw new Error('Wind failed');
    await evaluate(`document.getElementById('palette').value='tender';document.getElementById('palette').dispatchEvent(new Event('change'))`);
    if(await evaluate('window.PoemTrialScene.inspect().settings.palette')!=='tender')throw new Error('Palette failed');
    await evaluate(`document.getElementById('palette').value='clear';document.getElementById('palette').dispatchEvent(new Event('change'));document.getElementById('wind').value='${state.scene.settings.wind}';document.getElementById('wind').dispatchEvent(new Event('input'))`);
    const hit=await evaluate(`(()=>{const scene=document.getElementById('scene'),b=scene.getBoundingClientRect(),hosts=[...document.querySelectorAll('#layer-hosts canvas')],ps=window.PoemTrialScene.inspect().placements;for(let i=hosts.length-1;i>=0;i--){const c=hosts[i],d=c.getContext('2d').getImageData(0,0,640,388).data,p=ps[i];for(let y=10;y<378;y+=3)for(let x=10;x<630;x+=3)if(d[(y*640+x)*4+3]>30){const sx=p.at[0]*960+(x+.5-p.anchor[0])*p.scale,sy=p.at[1]*600+(y+.5-p.anchor[1])*p.scale;if(sx>25&&sx<880&&sy>50&&sy<530)return {x:b.left+sx*b.width/960,y:b.top+sy*b.height/600};}}return null;})()`);
    if(!hit)throw new Error('No visible draggable ink');
    const hitTarget=await evaluate(`document.elementFromPoint(${hit.x},${hit.y})?.id`);
    if(hitTarget!=='scene')throw new Error('Drag point is covered by '+hitTarget+' at '+JSON.stringify(hit));
    const placements=JSON.stringify(await evaluate('window.PoemTrialScene.inspect().placements'));
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:hit.x,y:hit.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:hit.x+25,y:hit.y+12,buttons:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:hit.x+25,y:hit.y+12,button:'left',clickCount:1});
    if(JSON.stringify(await evaluate('window.PoemTrialScene.inspect().placements'))===placements)throw new Error('Drag failed');
    await evaluate(`document.getElementById('reset-layout').click()`);if(JSON.stringify(await evaluate('window.PoemTrialScene.inspect().placements'))!==placements)throw new Error('Reset layout failed');
    await evaluate(`document.getElementById('immersive').click()`);if(!await evaluate(`document.body.classList.contains('immersive')`))throw new Error('Immersive failed');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});if(await evaluate(`document.body.classList.contains('immersive')`))throw new Error('Escape failed');
    interactions={animation:true,pause:true,wind:true,palette:true,drag:true,resetLayout:true,immersive:true};
  }
  const alpha=await evaluate(`Array.from(document.querySelectorAll('#layer-hosts canvas'),c=>c.getContext('2d').getImageData(0,0,1,1).data[3])`);
  if(alpha.some(a=>a!==0))throw new Error('Layer backgrounds are opaque');
  const png=await evaluate(`document.getElementById('scene').toDataURL()`);if(!png.startsWith('data:image/png'))throw new Error('PNG failed');
  await writeFile(resolve(out,main?checkName+'-scene.png':'generated-scene.png'),Buffer.from(png.split(',')[1],'base64'));
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1280,height:1800,scale:1}});await writeFile(resolve(out,main?checkName+'-preview.png':'preview.png'),Buffer.from(shot.data,'base64'));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(150);const mobile=await evaluate(`({width:innerWidth,document:document.documentElement.scrollWidth})`);if(mobile.document>mobile.width)throw new Error('Horizontal overflow');
  let rejectedResultPreserved=null;
  if(main){
    // Deliberately rejected UI response fixture: no real model request here.
    const oldCanvas=await evaluate(`document.getElementById('scene').toDataURL()`);
    await evaluate(`window.savedFetch=window.fetch;window.fetch=(url,options)=>url==='/api/analyze'?Promise.resolve(new Response(JSON.stringify({record:{validation:{valid:false}}}),{status:422})):window.savedFetch(url,options);document.getElementById('generate').click()`);
    await until(`!document.getElementById('generate').disabled`);
    rejectedResultPreserved=await evaluate(`document.getElementById('status').textContent.includes('没有通过检查')&&document.getElementById('scene-title').textContent===${JSON.stringify(state.poem)}`);
    if(!rejectedResultPreserved||oldCanvas!==await evaluate(`document.getElementById('scene').toDataURL()`))throw new Error('Rejected analysis changed the previous picture');
    await evaluate(`window.fetch=window.savedFetch;delete window.savedFetch`);
  }
  let linkedPages=null;
  if(main){
    await send('Page.navigate',{url:'http://127.0.0.1:4173/experiments/imagery-library/progress.html'});
    await until(`document.querySelectorAll('#rows tr').length===60`);
    if(await evaluate(`new URL(document.getElementById('poem-home').href).origin!==location.origin`))throw new Error('Progress return link leaves the main origin');
    await send('Page.navigate',{url:'http://127.0.0.1:4173/experiments/imagery-library/index.html#moon'});
    await until(`window.imageryExperiment?.inspect().length===28&&window.imageryExperiment.inspect().every(l=>l.ready)`);
    linkedPages={progressRows:60,readyTools:28,sameOrigin:true};
  }
  if(process.argv.includes('--diagram')){
    await send('Emulation.setDeviceMetricsOverride',{width:1660,height:1110,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:pathToFileURL(resolve(dir,'../../docs/assets/模块职能树.svg')).href});
    await until(`Boolean(document.querySelector('svg'))`);await sleep(250);
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(resolve(dir,'../../docs/assets/模块职能树.png'),Buffer.from(shot.data,'base64'));
  }
  if(errors.length)throw new Error(JSON.stringify(errors));
  const result={status:'passed',main,live,poetry,state,interactions,rejectedResultPreserved,linkedPages,transparentLayers:alpha.length,exportPng:true,mobile,runtimeErrors:errors};
  await writeFile(resolve(out,main?checkName+'-verification.json':'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:'passed',poetry,poem:state.poem,tools:state.scene.layers.map(l=>l.id),omitted:state.omitted}));
  await send('Browser.close').catch(()=>{});
}finally{if(ws)ws.close();browser.kill();}
