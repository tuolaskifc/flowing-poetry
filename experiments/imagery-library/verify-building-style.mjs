// Local visual comparison against the first building study, plus static,
// seeded rendering checks. No poetry or model requests.
import {spawn,spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url)),qa=resolve(dir,'.qa');await mkdir(qa,{recursive:true});
const profile=resolve(qa,'building-'+Date.now()),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const baseline=spawnSync('git',['show','d699cc1:experiments/imagery-library/drawing/tools/building.js'],{cwd:dir,encoding:'utf8'});
if(baseline.status!==0)throw new Error('Building comparison baseline not available');
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
  let port;for(let i=0;i<100;i++){try{port=(await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await sleep(100);}}
  if(!port)throw new Error('Browser startup failed');
  const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
  const pending=new Map(),errors=[];let serial=0;
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const q=pending.get(m.id);pending.delete(m.id);m.error?q.reject(new Error(JSON.stringify(m.error))):q.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await send('Runtime.enable');await send('Page.enable');await send('Page.navigate',{url:pathToFileURL(resolve(dir,'index.html')).href});
  for(let i=0;i<120;i++){if(await evaluate('Boolean(window.imageryExperiment)&&window.imageryExperiment.inspect().every(t=>t.ready)'))break;if(i===119)throw new Error('Page readiness timeout');await sleep(100);}
  await evaluate(`document.getElementById('pause').click()`);
  await evaluate(baseline.stdout.replace("id:'building'","id:'building-before'"));
  const result=await evaluate(`(async()=>{
    const hosts=['building-before','building'].map(()=>document.body.appendChild(document.createElement('div')));hosts.forEach(h=>h.hidden=true);
    const shared={wind:0,density:.45,palette:'clear'},controllers=['building-before','building'].map((id,i)=>window.PoemDrawing.mount(id,hosts[i],shared,777));
    for(let i=0;i<100&&!hosts.every(h=>h.dataset.ready==='true');i++)await new Promise(r=>setTimeout(r,20));
    controllers.forEach(c=>c.pause(true));controllers.forEach(c=>c.reset(777));await new Promise(r=>setTimeout(r,50));
    const oldCanvas=hosts[0].querySelector('canvas'),newCanvas=hosts[1].querySelector('canvas'),hash=()=>newCanvas.toDataURL();
    const before=hash();controllers[1].reset(777);await new Promise(r=>setTimeout(r,40));const repeat=hash()===before;
    const board=document.createElement('canvas');board.width=1280;board.height=432;const g=board.getContext('2d');
    g.fillStyle='#f5f3ec';g.fillRect(0,0,1280,432);g.drawImage(oldCanvas,0,0);g.drawImage(newCanvas,640,0);g.fillStyle='#294940';g.font='18px Microsoft YaHei';g.fillText('修改前 · 规整轮廓',28,418);g.fillText('写意试画 · 曲檐、断笔、疏窗',668,418);
    const comparison=board.toDataURL();const still=hash();shared.wind=1;controllers[1].refresh();await new Promise(r=>setTimeout(r,40));const staticInWind=still===hash();
    const states=[],keys=[];for(let seed=0;seed<32;seed++){controllers[1].reset(seed);const state=controllers[1].inspect();const anchors=controllers[1].anchors();states.push(state.finite&&anchors.every(a=>Number.isFinite(a.x+a.y)&&a.x>=0&&a.x<=640&&a.y>=0&&a.y<=388));keys.push(state.geometryKey);}
    controllers[1].reset(777);controllers[1].configure({levels:'three'});await new Promise(r=>setTimeout(r,40));const three=controllers[1].inspect();
    const variants=document.createElement('canvas');variants.width=1280;variants.height=432;const v=variants.getContext('2d');v.fillStyle='#f5f3ec';v.fillRect(0,0,1280,432);v.drawImage(newCanvas,0,0);controllers[1].configure({windows:'open'});await new Promise(r=>setTimeout(r,40));v.drawImage(newCanvas,640,0);v.fillStyle='#294940';v.font='18px Microsoft YaHei';v.fillText('三层 · 疏笔窗影',28,418);v.fillText('三层 · 窗影留白',668,418);
    const threeVariants=variants.toDataURL();controllers[1].configure({levels:'two',windows:'lattice'});controllers[1].reset(777);await new Promise(r=>setTimeout(r,40));const single=hash();
    controllers.forEach(c=>c.dispose());hosts.forEach(h=>h.remove());
    return {repeat,staticInWind,allSeedsFinite:states.every(Boolean),distinctSeeds:new Set(keys).size,threeFloors:three.levelCount===3&&three.personCount===0,comparison,threeVariants,single};
  })()`);
  if(!result.repeat||!result.staticInWind||!result.allSeedsFinite||result.distinctSeeds!==32||!result.threeFloors||errors.length)throw new Error(JSON.stringify({...result,comparison:undefined,threeVariants:undefined,single:undefined,errors}));
  for(const [key,name] of [['comparison','building-style-comparison.png'],['threeVariants','building-style-variants.png'],['single','building-style-preview.png']])await writeFile(resolve(dir,name),Buffer.from(result[key].split(',')[1],'base64'));
  const {comparison,threeVariants,single,...checks}=result;
  await writeFile(resolve(dir,'building-style-verification.json'),JSON.stringify({status:'passed',baselineCommit:'d699cc1',...checks,runtimeErrors:errors,modelCalls:0},null,2)+'\n');
  console.log(JSON.stringify({status:'passed',...checks,runtimeErrors:errors.length}));
  await send('Browser.close').catch(()=>{});
}finally{if(ws)ws.close();browser.kill();}
