// Verify downloaded examples in isolated local pages; no external runtime dependencies.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const qa=resolve(root,'../.qa');await mkdir(qa,{recursive:true});await mkdir(resolve(root,'previews'),{recursive:true});
const profile=resolve(qa,`research-${Date.now()}`);
const edge=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[
  '--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions',
  '--enable-unsafe-swiftshader','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'
],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ws;
const cases=[
  {id:'shan',title:'Shan, Shui',file:'shan-index.html',kind:'svg'},
  {id:'flower',title:'Generative flower experiment #1',file:'flower/local.html',kind:'flower'},
  {id:'theatre',title:'Fresco Theatre',file:'fresco/demos/theatre/local.html',kind:'canvas'},
  {id:'sailors',title:'Fresco Sailors',file:'fresco/demos/sailors/local.html',kind:'canvas'},
  {id:'fruitTrees',title:'Fresco Fruit Trees',file:'fresco/demos/fruitTrees/local.html',kind:'canvas'},
  {id:'butterfly',title:'Fresco Butterfly',file:'fresco/demos/butterfly/local.html',kind:'canvas'},
  {id:'sunflower',title:'Fresco Sunflower Spiral',file:'fresco/demos/sunflowerSpiral/local.html',kind:'svg'},
  {id:'brush',title:'p5.brush standalone call study',file:'brush/local.html',kind:'brush'}
];
try {
  let port;for(let i=0;i<100;i++){try{port=(await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await sleep(100);}}
  if(!port)throw new Error('Edge debugging port unavailable');
  const t=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
  let next=0,errors=[],requests=[];const pending=new Map();
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(new Error(JSON.stringify(m.error)));else p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;errors.push({message:d.exception?.description||d.text,url:d.url,line:d.lineNumber});}else if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value;};
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1000,height:740,deviceScaleFactor:1,mobile:false});
  const results=[];
  const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
  for(const c of cases.filter(c=>!only||only.includes(c.id))) {
    errors=[];requests=[];await send('Page.navigate',{url:pathToFileURL(resolve(root,c.file)).href});
    let state;
    for(let i=0;i<(c.id==='sailors'?160:60);i++){
      await sleep(150);
      state=await ev(`({ready:document.readyState,canvas:document.querySelectorAll('canvas').length,paths:document.querySelectorAll('svg path,svg polyline,svg polygon').length,frame:typeof frameCount==='number'?frameCount:null,looping:typeof isLooping==='function'?isLooping():null,brush:document.body?.dataset.ready,error:document.body?.dataset.error})`);
      if(errors.length||state.error)break;
      if(c.kind==='brush'?state.brush==='true':c.kind==='svg'?state.paths>10:c.kind==='flower'?state.paths>=5&&state.canvas>0:c.id==='sailors'?state.frame>2&&state.looping===false:state.canvas>0&&state.frame>=2)break;
    }
    if(c.id==='fruitTrees'&&!errors.length){
      // The original intentionally starts empty and asks for a click to grow a branch cluster.
      await send('Input.dispatchMouseEvent',{type:'mousePressed',x:400,y:320,button:'left',clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:400,y:320,button:'left',clickCount:1});
      await sleep(1200);
    }
    await sleep(250);
    const detail=await ev(`(()=>{const a=Array.from(document.querySelectorAll('canvas'));const canvas=a[0];let sample=null;if(canvas){try{const ctx=canvas.getContext('2d');if(ctx){const colors=new Set();const d=ctx.getImageData(0,0,canvas.width,canvas.height).data;const step=Math.max(4,4*Math.floor(d.length/4/5000));for(let i=0;i<d.length;i+=step)colors.add(d.slice(i,i+4).join(','));sample=colors.size;}}catch(e){sample=e.message;}}return {title:document.title,canvases:a.map(c=>({width:c.width,height:c.height})),paths:document.querySelectorAll('svg path,svg polyline,svg polygon').length,frame:typeof frameCount==='number'?frameCount:null,looping:typeof isLooping==='function'?isLooping():null,sampledColors:sample,ready:document.body?.dataset.ready,error:document.body?.dataset.error};})()`);
    const nonempty=c.kind==='brush'?detail.ready==='true':c.kind==='svg'?detail.paths>10:c.kind==='flower'?detail.paths>=5:(typeof detail.sampledColors==='number'&&detail.sampledColors>2&&(c.id!=='sailors'||detail.looping===false));
    const external=requests.filter(u=>/^https?:/.test(u));
    const result={...c,status:!errors.length&&nonempty&&!external.length?'passed':'needs-review',detail,errors:[...errors],externalRequests:external};
    const shot=await send('Page.captureScreenshot',{format:'png',...(c.id==='flower'?{clip:{x:0,y:0,width:230,height:230,scale:1}}:{})});await writeFile(resolve(root,`previews/${c.id}.png`),Buffer.from(shot.data,'base64'));
    results.push(result);console.log(JSON.stringify({id:c.id,status:result.status,detail,errors:result.errors.map(x=>x.message.slice(0,220)),external}));
  }
  let all=results;
  if(only){const previous=JSON.parse(await readFile(resolve(root,'verification.json'),'utf8'));all=cases.map(c=>results.find(r=>r.id===c.id)||previous.results.find(r=>r.id===c.id)).filter(Boolean);}
  errors=[];requests=[];
  await send('Page.navigate',{url:pathToFileURL(resolve(root,'index.html')).href});await sleep(350);
  const gallery=await ev(`({cards:document.querySelectorAll('article').length,images:Array.from(document.images,i=>({loaded:i.complete&&i.naturalWidth>0})),width:innerWidth,scrollWidth:document.documentElement.scrollWidth})`);
  const galleryShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1000,height:1500,scale:1}});await writeFile(resolve(root,'previews/gallery.png'),Buffer.from(galleryShot.data,'base64'));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(100);
  gallery.mobile=await ev(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})`);
  gallery.errors=errors;
  if(gallery.cards!==8||gallery.images.some(i=>!i.loaded)||gallery.mobile.scrollWidth>gallery.mobile.width||errors.length)throw new Error('Gallery layout/image check failed');
  await writeFile(resolve(root,'verification.json'),JSON.stringify({date:'2026-10-18',results:all,gallery,limits:['浏览器烟雾检查和截图，不是性能基准或安卓兼容性验证。','原作默认参数与配色保留；本轮不代表诗句驱动已经接通。','花朵预览截图截取左上 230×230 区域，原始作品布局未更改。','p5.brush 使用软件 WebGL2 完成无界面验证，实际设备性能需另测。']},null,2)+'\n');
  await send('Browser.close').catch(()=>{});
} finally {if(ws)ws.close();edge.kill();}
