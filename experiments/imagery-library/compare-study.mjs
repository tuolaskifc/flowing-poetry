// Render a local study against a pinned Git version for visual review.
// No external images, poetry requests or model calls.
import {spawn,spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url)),qa=resolve(dir,'.qa'),tool=process.argv[2]||'oriole',baseline=process.argv[3]||'ac9c929';
if(!/^[a-z-]+$/.test(tool)||!/^[a-f0-9]{7,40}$/.test(baseline))throw new Error('Invalid comparison target');
const old=spawnSync('git',['show',baseline+':experiments/imagery-library/drawing/tools/'+tool+'.js'],{cwd:dir,encoding:'utf8'});
if(old.status!==0)throw new Error('Missing comparison source');
await mkdir(qa,{recursive:true});const profile=resolve(qa,'compare-'+Date.now()),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
  let port;for(let i=0;i<100;i++){try{port=(await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await sleep(100);}}
  if(!port)throw new Error('Browser startup failed');
  const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
  const pending=new Map(),errors=[];let serial=0;
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const q=pending.get(m.id);pending.delete(m.id);m.error?q.reject(new Error(JSON.stringify(m.error))):q.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await send('Runtime.enable');await send('Page.enable');await send('Page.navigate',{url:pathToFileURL(resolve(dir,'index.html')).href});
  for(let i=0;i<120;i++){if(await evaluate('Boolean(window.imageryExperiment)&&window.imageryExperiment.inspect().every(t=>t.ready)'))break;if(i===119)throw new Error('Page readiness timeout');await sleep(100);}
  await evaluate(`document.getElementById('pause').click()`);
  const beforeCode=old.stdout.replace("id:'"+tool+"'","id:'"+tool+"-before'");if(beforeCode===old.stdout)throw new Error('Cannot isolate baseline registration');await evaluate(beforeCode);
  const result=await evaluate(`(async()=>{
    const id=${JSON.stringify(tool)},ids=[id+'-before',id],hosts=ids.map(()=>document.body.appendChild(document.createElement('div')));hosts.forEach(h=>h.hidden=true);
    const controllers=ids.map((id,i)=>window.PoemDrawing.mount(id,hosts[i],{wind:0,density:.45,palette:'clear'},777));
    for(let i=0;i<100&&!hosts.every(h=>h.dataset.ready==='true');i++)await new Promise(r=>setTimeout(r,20));controllers.forEach(c=>c.pause(true));controllers.forEach(c=>c.reset(777));
    const field=window.PoemDrawing.definitions().find(t=>t.id===id).controls[0],images=[],labels=[];
    for(const choice of field.choices.slice(0,2)){controllers.forEach(c=>c.configure({[field.id]:choice.value}));await new Promise(r=>setTimeout(r,50));
      for(const host of hosts){const copy=document.createElement('canvas');copy.width=640;copy.height=388;copy.getContext('2d').drawImage(host.querySelector('canvas'),0,0);images.push(copy);}labels.push(choice.label);
    }
    let minX=640,minY=388,maxX=0,maxY=0;
    for(const image of images){const data=image.getContext('2d').getImageData(0,0,640,388).data,bg=[...data.slice(0,3)];for(let y=0;y<388;y++)for(let x=0;x<640;x++){const at=(y*640+x)*4;if(Math.max(...bg.map((v,i)=>Math.abs(v-data[at+i])))>12){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}}
    const centerX=(minX+maxX)/2,centerY=(minY+maxY)/2,cropW=Math.min(640,Math.max(maxX-minX+72,(maxY-minY+64)*640/388)),cropH=cropW*388/640;
    const crop={x:Math.max(0,Math.min(640-cropW,centerX-cropW/2)),y:Math.max(0,Math.min(388-cropH,centerY-cropH/2)),w:cropW,h:cropH};
    const sheet=document.createElement('canvas');sheet.width=1280;sheet.height=432*labels.length;const c=sheet.getContext('2d');c.fillStyle='#f5f3ec';c.fillRect(0,0,sheet.width,sheet.height);
    images.forEach((image,i)=>{const x=i%2*640,y=Math.floor(i/2)*432;c.drawImage(image,crop.x,crop.y,crop.w,crop.h,x,y,640,388);c.fillStyle='#294940';c.font='18px Microsoft YaHei';c.fillText((i%2?'写意试画 · ':'修改前 · ')+labels[Math.floor(i/2)],x+28,y+418);});
    const states=controllers.map(c=>c.inspect()),png=sheet.toDataURL();controllers.forEach(c=>c.dispose());hosts.forEach(h=>h.remove());return {png,crop,states,labels};
  })()`);
  if(errors.length)throw new Error(JSON.stringify(errors));
  await writeFile(resolve(dir,tool+'-style-comparison.png'),Buffer.from(result.png.split(',')[1],'base64'));
  const {png,...metadata}=result;await writeFile(resolve(dir,tool+'-style-comparison.json'),JSON.stringify({tool,baselineCommit:baseline,...metadata,modelCalls:0,runtimeErrors:errors},null,2)+'\n');
  console.log(JSON.stringify({status:'rendered',tool,variants:result.labels,runtimeErrors:0}));await send('Browser.close').catch(()=>{});
}finally{if(ws)ws.close();browser.kill();}
