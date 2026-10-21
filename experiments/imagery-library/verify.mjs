// Browser smoke verification using installed Edge and standard Node APIs.
// Default: file URL. Add --http to verify the running local preview server.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {buildPlan} from '../poem-generation/planner.mjs';
const dir=dirname(fileURLToPath(import.meta.url));
const expected=JSON.parse(await readFile(resolve(dir,'drawing/tool-manifest.json'),'utf8')).tools.map(t=>t.id);
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
  try {await evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(window.imageryExperiment && document.querySelectorAll('[data-ready="true"]').length===${expected.length}){clearInterval(t);resolve(true);}else if(++n>100){clearInterval(t);reject(new Error('Canvas readiness timeout'));}},100);})`);}
  catch(e){console.error(JSON.stringify({errors,page:await evaluate(`({url:location.href,text:document.body.innerText.slice(0,1200),p5:typeof p5,ready:document.querySelectorAll('[data-ready="true"]').length})`)}));throw e;}
  const initial=await evaluate('window.imageryExperiment.inspect()');
  if(JSON.stringify(initial.map(x=>x.id).sort())!==JSON.stringify([...expected].sort()))throw new Error('Missing/extra tool registrations');
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
  if(exportInfo.length!==expected.length||exportInfo.some(x=>!x.png||!x.width))throw new Error('Canvas export failed');
  const countCheck=await evaluate('window.imageryExperiment.inspect()');
  if(countCheck.find(x=>x.id==='birds').birdCount!==22||countCheck.find(x=>x.id==='flower').flowerCount!==7||countCheck.find(x=>x.id==='boat').personCount!==0)throw new Error('Density changed entity counts or boat added a person');
  const isolation=await evaluate(`(async()=>{
    const ids=['moon',...window.PoemDrawing.definitions().map(d=>d.id)];
    const hosts=ids.map(()=>document.createElement('div'));hosts.forEach(h=>{h.style.display='none';document.body.append(h);});
    const controls=hosts.map((h,i)=>window.PoemDrawing.mount(ids[i],h,{wind:0,density:.5,palette:'clear'},777));
    await new Promise((r,j)=>{let n=0;const t=setInterval(()=>{if(hosts.every(h=>h.dataset.ready==='true')){clearInterval(t);r();}else if(++n>100){clearInterval(t);j(new Error('Isolation setup timeout'));}},20);});
    controls.forEach(c=>c.pause(true));controls.forEach(c=>c.reset(777));await new Promise(r=>setTimeout(r,50));
    const hash=()=>hosts.map(h=>{let v=2166136261;for(const c of h.querySelector('canvas').toDataURL('image/png')){v=Math.imul(v^c.charCodeAt(0),16777619);}return (v>>>0).toString(16);});
    const before=controls.map(c=>c.inspect()),images=hash();controls.forEach(c=>c.reset(777));await new Promise(r=>setTimeout(r,50));
    const repeatAll=controls.every((c,i)=>c.inspect().geometryKey===before[i].geometryKey)&&hash().every((h,i)=>h===images[i]);
    controls[0].reset(778);await new Promise(r=>setTimeout(r,30));
    const changed=controls.map(c=>c.inspect()),changedImages=hash();controls[0].reset(777);await new Promise(r=>setTimeout(r,30));
    const repeated=controls[0].inspect(),repeatImage=hash()[0],anchors=controls[0].anchors();controls.forEach(c=>c.dispose());
    const disposed=hosts.every(h=>h.querySelectorAll('canvas').length===0);hosts.forEach(h=>h.remove());
    return {toolIds:ids,repeatAll,sameSeed:before[0].geometryKey===before[ids.lastIndexOf('moon')].geometryKey&&images[0]===images[ids.lastIndexOf('moon')],independent:changed.slice(1).every((x,i)=>x.geometryKey===before[i+1].geometryKey&&changedImages[i+1]===images[i+1]),repeated:repeated.geometryKey===before[0].geometryKey&&repeatImage===images[0],differentSeed:changed[0].geometryKey!==before[0].geometryKey,anchors,disposed};
  })()`);
  if(!isolation.repeatAll||!isolation.sameSeed||!isolation.independent||!isolation.repeated||!isolation.differentSeed||!isolation.disposed)throw new Error('Tool isolation/reset/disposal failed');
  const architecture=await evaluate(`(async()=>{
    const snapshot=id=>document.querySelector('#'+id+' canvas').toDataURL();
    const choose=async(id,value)=>{const s=document.getElementById(id);s.value=value;s.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,40));};
    const low=snapshot('rock');await choose('rock-profile','tall');const tall=snapshot('rock');await choose('rock-profile','low');
    const tiled=snapshot('pavilion');await choose('pavilion-roof','thatched');const thatched=snapshot('pavilion');await choose('pavilion-roof','tiled');
    await choose('pavilion-railing','rail');const rail=snapshot('pavilion');await choose('pavilion-railing','open');
    const before=['rock','pavilion'].map(snapshot),wind=document.getElementById('wind');wind.value=0;wind.dispatchEvent(new Event('input'));await new Promise(r=>setTimeout(r,40));
    const windStatic=['rock','pavilion'].every((id,i)=>snapshot(id)===before[i]);wind.value=100;wind.dispatchEvent(new Event('input'));
    const hosts=['rock','pavilion'].map(()=>document.body.appendChild(document.createElement('div')));hosts.forEach(h=>h.style.display='none');
    const controls=hosts.map((h,i)=>window.PoemDrawing.mount(['rock','pavilion'][i],h,{},777));
    await new Promise(r=>setTimeout(r,150));controls.forEach(c=>c.pause(true));
    const anchors=controls.map(c=>c.anchors()),counts=controls.map(c=>c.inspect());controls.forEach(c=>c.dispose());hosts.forEach(h=>h.remove());
    return {rockVariants:low!==tall,roofVariants:tiled!==thatched,railingVariant:tiled!==rail,windStatic,countsCorrect:counts[0].rockCount===1&&counts[1].pavilionCount===1&&counts[1].personCount===0,anchorsFinite:anchors.every(a=>a.length===2&&a.every(q=>Number.isFinite(q.x+q.y)&&q.x>=0&&q.x<=640&&q.y>=0&&q.y<=388))};
  })()`);
  if(Object.values(architecture).some(v=>v!==true))throw new Error('Stone/pavilion variants failed: '+JSON.stringify(architecture));
  const variants=await evaluate(`(async()=>{
    const select=document.getElementById('moon-shape'),side=document.getElementById('moon-lightSide');
    const snapshot=()=>document.querySelector('#moon canvas').toDataURL();
    const shapes={};
    for(const shape of ['crescent','half','gibbous','full','dark']){select.value=shape;select.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,35));shapes[shape]=snapshot();}
    select.value='crescent';select.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,35));
    const right=snapshot();side.value='left';side.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,35));
    const mirrored=right!==snapshot();side.value='right';side.dispatchEvent(new Event('change'));
    const host=document.createElement('div');host.style.display='none';document.body.append(host);
    const petals=window.PoemDrawing.mount('falling-petals',host,{wind:.35,density:.45,palette:'clear'},777);
    await new Promise(r=>setTimeout(r,100));petals.reset(777);
    const start=performance.now();while(petals.inspect().time<6.1){if(performance.now()-start>18000)throw new Error('Landing timeout');await new Promise(r=>setTimeout(r,100));}
    const landed=petals.inspect();await new Promise(r=>setTimeout(r,150));const still=petals.inspect();
    petals.configure({playback:'loop'});await new Promise(r=>setTimeout(r,120));const loop=petals.inspect();
    let invalidRejected=false;try{petals.configure({playback:'unknown'});}catch{invalidRejected=true;}
    petals.dispose();host.remove();
    return {distinctShapes:new Set(Object.values(shapes)).size,mirrored,landedCount:landed.landedCount,staysLanded:landed.poseKey===still.poseKey,loopMoves:loop.poseKey!==still.poseKey&&loop.landedCount===0,invalidRejected};
  })()`);
  if(variants.distinctShapes!==5||!variants.mirrored||variants.landedCount!==18||!variants.staysLanded||!variants.loopMoves||!variants.invalidRejected)throw new Error('Moon variants or petal lifecycle failed: '+JSON.stringify(variants));
  const newFeatures=await evaluate(`(async()=>{
    const snapshot=id=>document.querySelector('#'+id+' canvas').toDataURL();
    const choose=async(id,value)=>{const s=document.getElementById(id);s.value=value;s.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,40));};
    const unique={};
    for(const id of ['grass','snow','leaves','fish','flower-forms','wine','building','plum-branch','surface-weather','oriole','orchid','horse','lotus']){
      const d=window.PoemDrawing.definitions().find(d=>d.id===id),field=d.controls[0],images=[];
      for(const choice of field.choices){await choose(id+'-'+field.id,choice.value);images.push(snapshot(id));}
      unique[id]=new Set(images).size===field.choices.length;await choose(id+'-'+field.id,field.default);
    }
    await choose('grass-surface','dew');const dew=window.imageryExperiment.inspect().find(t=>t.id==='grass');
    await choose('grass-surface','frost');const frost=window.imageryExperiment.inspect().find(t=>t.id==='grass');await choose('grass-surface','plain');
    await choose('snow-state','settled');const snowStill=snapshot('snow');const wind=document.getElementById('wind');wind.value=0;wind.dispatchEvent(new Event('input'));await new Promise(r=>setTimeout(r,50));
    const snowStatic=snowStill===snapshot('snow');await choose('snow-state','fall');wind.value=100;wind.dispatchEvent(new Event('input'));
    const inspect=window.imageryExperiment.inspect(),find=id=>inspect.find(x=>x.id===id);
    const counts=find('grass').bladeCount===54&&find('bamboo').culmCount===3&&find('willow').treeCount===1&&find('fish').fishCount===1&&find('leaves').leafCount===5&&find('catkins').tuftCount===18;
    return {...unique,attachedDew:dew.dewCount===54,attachedFrost:frost.frostBladeCount===54,snowStatic,counts};
  })()`);
  if(Object.values(newFeatures).some(v=>v!==true))throw new Error('New tool options failed: '+JSON.stringify({newFeatures,errors}));
  const frequencyFeatures=await evaluate(`(async()=>{
    const snapshot=id=>document.querySelector('#'+id+' canvas').toDataURL();
    const choose=async(id,value)=>{const s=document.getElementById(id);s.value=value;s.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,50));};
    const find=id=>window.imageryExperiment.inspect().find(t=>t.id===id);
    const liquid=find('wine');await choose('wine-form','cup');const cup=find('wine');await choose('wine-form','jar');const jar=find('wine');await choose('wine-form','liquid');
    const two=find('building');await choose('building-levels','three');const three=find('building');await choose('building-levels','two');
    const lattice=snapshot('building');await choose('building-windows','open');const windowsDiffer=lattice!==snapshot('building');await choose('building-windows','lattice');
    const plum=find('plum-branch');
    const wind=document.getElementById('wind'),buildingBefore=snapshot('building'),plumBefore=snapshot('plum-branch');wind.value=0;wind.dispatchEvent(new Event('input'));await new Promise(r=>setTimeout(r,50));
    const buildingStatic=buildingBefore===snapshot('building'),plumResponds=plumBefore!==snapshot('plum-branch');wind.value=100;wind.dispatchEvent(new Event('input'));
    const ids=['wine','building','plum-branch'],hosts=ids.map(()=>document.body.appendChild(document.createElement('div')));hosts.forEach(h=>h.hidden=true);
    const controls=ids.map((id,i)=>window.PoemDrawing.mount(id,hosts[i],{wind:.4},777));await new Promise(r=>setTimeout(r,150));controls.forEach(c=>c.pause(true));
    const anchors=controls.map(c=>c.anchors());controls.forEach(c=>c.dispose());hosts.forEach(h=>h.remove());
    return {liquidNoVessel:liquid.vesselCount===0&&liquid.personCount===0,cupOnly:cup.vesselCount===1&&cup.personCount===0,jarOnly:jar.vesselCount===1&&jar.personCount===0,twoFloors:two.levelCount===2&&two.windowCount===5&&two.doorCount===1,threeFloors:three.levelCount===3&&three.windowCount===8&&three.buildingCount===1&&three.personCount===0,windowsDiffer,buildingStatic,plumResponds,plumCounts:plum.flowerCount===9&&plum.budCount===4,anchorsFinite:anchors.every(a=>a.length>=2&&a.every(q=>Number.isFinite(q.x+q.y)&&q.x>=0&&q.x<=640&&q.y>=0&&q.y<=388))};
  })()`);
  if(Object.values(frequencyFeatures).some(v=>v!==true))throw new Error('Frequency-priority tools failed: '+JSON.stringify(frequencyFeatures));
  const surfaceBirdFeatures=await evaluate(`(async()=>{
    const choose=async(id,value)=>{const s=document.getElementById(id);s.value=value;s.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,40));};
    const hash=id=>document.querySelector('#'+id+' canvas').toDataURL(),surfaceImages=[];
    for(const carrier of ['leaf','branch','stone','detail']){await choose('surface-weather-carrier',carrier);for(const surface of ['dew','frost']){await choose('surface-weather-surface',surface);surfaceImages.push(hash('surface-weather'));}}
    const detail=window.imageryExperiment.inspect().find(t=>t.id==='surface-weather');
    await choose('surface-weather-carrier','leaf');await choose('surface-weather-surface','dew');
    const birdBefore=hash('oriole');await choose('oriole-facing','left');const facesDiffer=birdBefore!==hash('oriole');await choose('oriole-facing','right');
    const hosts=['surface-weather','oriole'].map(()=>document.body.appendChild(document.createElement('div')));hosts.forEach(h=>h.hidden=true);
    const shared={wind:0,density:.45,palette:'clear'},surface=window.PoemDrawing.mount('surface-weather',hosts[0],shared,777),bird=window.PoemDrawing.mount('oriole',hosts[1],shared,777);
    await new Promise(r=>setTimeout(r,150));surface.pause(true);bird.pause(true);surface.reset(777);bird.reset(777);await new Promise(r=>setTimeout(r,50));
    const original=surface.anchors(),snapshot=()=>hosts[0].querySelector('canvas').toDataURL();shared.wind=1;surface.refresh();await new Promise(r=>setTimeout(r,50));const moved=surface.anchors();
    const d=a=>Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),attachedRigidly=Math.abs(d(original)-d(moved))<1e-7,anchorsMove=original.some((q,i)=>Math.abs(q.x-moved[i].x)+Math.abs(q.y-moved[i].y)>.01);
    surface.configure({carrier:'stone'});await new Promise(r=>setTimeout(r,50));const stone=snapshot();shared.wind=0;surface.refresh();await new Promise(r=>setTimeout(r,50));const stoneStatic=stone===snapshot();
    const birdImage=()=>hosts[1].querySelector('canvas').toDataURL();bird.configure({pose:'spread',motion:'flap'});bird.pause(false);await new Promise(r=>setTimeout(r,80));const flying=birdImage();await new Promise(r=>setTimeout(r,160));const wingMoves=flying!==birdImage();
    bird.configure({pose:'folded'});await new Promise(r=>setTimeout(r,60));const folded=birdImage();await new Promise(r=>setTimeout(r,160));const foldedStill=folded===birdImage();
    const inspection=bird.inspect();surface.dispose();bird.dispose();hosts.forEach(h=>h.remove());
    return {eightDistinct:new Set(surfaceImages).size===8,detailNoCarrier:detail.carrierCount===0&&detail.airborneCount===0,facesDiffer,attachedRigidly,anchorsMove,stoneStatic,wingMoves,foldedStill,birdCounts:inspection.birdCount===1&&inspection.perchCount===0};
  })()`);
  if(Object.values(surfaceBirdFeatures).some(v=>v!==true))throw new Error('Surface and bird features failed: '+JSON.stringify(surfaceBirdFeatures));
  const plantHorseFeatures=await evaluate(`(async()=>{
    const choose=async(id,value)=>{const s=document.getElementById(id);s.value=value;s.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,40));};
    const hash=id=>document.querySelector('#'+id+' canvas').toDataURL(),find=id=>window.imageryExperiment.inspect().find(t=>t.id===id);
    const orchid=find('orchid'),horse=find('horse'),flower=find('lotus'),horseRight=hash('horse');
    await choose('horse-facing','left');const facingDiffers=horseRight!==hash('horse');await choose('horse-facing','right');
    const open=hash('lotus');await choose('lotus-state','bud');const budDiffers=open!==hash('lotus');await choose('lotus-state','open');
    await choose('lotus-form','leaf');const leaf=find('lotus');await choose('lotus-form','composition');const paired=find('lotus');await choose('lotus-form','flower');
    await choose('orchid-form','flower');const detail=find('orchid');await choose('orchid-form','plant');
    const before=hash('horse'),wind=document.getElementById('wind');wind.value=0;wind.dispatchEvent(new Event('input'));await new Promise(r=>setTimeout(r,40));const horseStatic=before===hash('horse');wind.value=100;wind.dispatchEvent(new Event('input'));
    const ids=['orchid','horse','lotus'],hosts=ids.map(()=>document.body.appendChild(document.createElement('div')));hosts.forEach(h=>h.hidden=true);
    const shared={wind:0},controllers=ids.map((id,i)=>window.PoemDrawing.mount(id,hosts[i],shared,777));await new Promise(r=>setTimeout(r,160));controllers.forEach(c=>c.pause(true));controllers.forEach(c=>c.reset(777));await new Promise(r=>setTimeout(r,50));
    const a=controllers[0].anchors(),l=controllers[2].anchors();shared.wind=1;controllers.forEach(c=>c.refresh());await new Promise(r=>setTimeout(r,50));const b=controllers[0].anchors(),m=controllers[2].anchors();
    const moved=(x,y)=>x.some((p,i)=>Math.abs(p.x-y[i].x)+Math.abs(p.y-y[i].y)>.01),anchorMove=moved(a,b)&&moved(l,m);
    const anchors=controllers.flatMap(c=>c.anchors()),finiteAnchors=anchors.every(q=>Number.isFinite(q.x+q.y)&&q.x>=0&&q.x<=640&&q.y>=0&&q.y<=388);controllers.forEach(c=>c.dispose());hosts.forEach(h=>h.remove());
    return {orchidCounts:orchid.leafCount===7&&orchid.flowerCount===2&&orchid.potCount===0,orchidDetail:detail.leafCount===0&&detail.flowerCount===1,horseCounts:horse.horseCount===1&&horse.legCount===4&&horse.riderCount===0&&horse.gait===false,horseStatic,facingDiffers,flowerOnly:flower.flowerCount===1&&flower.leafCount===0&&flower.waterCount===0,leafOnly:leaf.flowerCount===0&&leaf.leafCount===1&&leaf.waterCount===0,paired:paired.flowerCount===1&&paired.leafCount===1&&paired.waterCount===0,budDiffers,anchorMove,finiteAnchors};
  })()`);
  if(Object.values(plantHorseFeatures).some(v=>v!==true))throw new Error('Orchid horse lotus features failed: '+JSON.stringify(plantHorseFeatures));
  const extensionLifecycle=await evaluate(`(async()=>{
    const ids=['catkins','cloud','fish'],hosts=ids.map(()=>document.body.appendChild(document.createElement('div')));hosts.forEach(h=>h.style.display='none');
    const controls=hosts.map((h,i)=>window.PoemDrawing.mount(ids[i],h,{wind:.8,density:.5,palette:'clear'},777));
    await new Promise(r=>setTimeout(r,100));controls.forEach(c=>c.pause(true));
    const clouds=controls[1],keys=[];
    for(let seed=0;seed<64;seed++){clouds.reset(seed);const state=clouds.inspect();if(!state.finite||state.cloudCount!==3)throw new Error('Cloud seed failed: '+seed);keys.push(state.geometryKey);}
    clouds.reset(10);const repeated=clouds.inspect().geometryKey===keys[10];
    const catkins=controls[0];catkins.reset(777);catkins.pause(false);
    const fish=controls[2];fish.configure({motion:'tail'});fish.reset(777);fish.pause(false);
    const hashFish=()=>hosts[2].querySelector('canvas').toDataURL();await new Promise(r=>setTimeout(r,80));const fishBefore=hashFish();await new Promise(r=>setTimeout(r,180));const fishMoves=fishBefore!==hashFish();fish.pause(true);
    const start=performance.now();while(catkins.inspect().time<12.1){if(performance.now()-start>22000)throw new Error('Catkin duration timeout');await new Promise(r=>setTimeout(r,100));}
    const once=catkins.inspect();await new Promise(r=>setTimeout(r,150));const still=catkins.inspect();catkins.configure({playback:'loop'});await new Promise(r=>setTimeout(r,180));const looping=catkins.inspect();
    const result={cloudSeeds:64,cloudDistinct:new Set(keys).size,cloudRepeat:repeated,catkinsStop:once.poseKey===still.poseKey,catkinsLoop:looping.poseKey!==still.poseKey,fishMoves};controls.forEach(c=>c.dispose());hosts.forEach(h=>h.remove());return result;
  })()`);
  if(extensionLifecycle.cloudDistinct!==64||!extensionLifecycle.cloudRepeat||!extensionLifecycle.catkinsStop||!extensionLifecycle.catkinsLoop||!extensionLifecycle.fishMoves)throw new Error('Extended lifecycle failed: '+JSON.stringify(extensionLifecycle));
  await evaluate(`document.getElementById('pause').click()`);await sleep(1200);
  const resumed=await evaluate('window.imageryExperiment.inspect()');
  if(resumed.some(x=>!x.finite||x.time<=0)||resumed.find(x=>x.id==='birds').birdCount!==22)throw new Error('Animation/bird state failed');
  // Restore the initial viewing controls for a representative screenshot.
  await evaluate(`for(const [id,val] of [['wind',35],['density',45]]){const el=document.getElementById(id);el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}));}const s=document.getElementById('palette');s.value='clear';s.dispatchEvent(new Event('change'));document.getElementById('pause').click()`);await sleep(100);
  const wideLayout=await evaluate(`({viewport:innerWidth,document:document.documentElement.scrollWidth,candidates:document.querySelectorAll('.candidate').length,canvases:document.querySelectorAll('canvas').length})`);
  const variantSheet=await evaluate(`(async()=>{
    const variants=[['grass','surface','dew'],['grass','surface','frost'],['snow','state','settled'],['leaves','color','yellow'],['fish','motion','tail'],['flower-forms','kind','chrysanthemum'],['flower-forms','kind','lotus'],['moon','shape','half'],['moon','shape','gibbous']];
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=810;const c=canvas.getContext('2d');c.fillStyle='#f5f4ed';c.fillRect(0,0,1200,810);
    const set=async(id,field,value)=>{const select=document.getElementById(id+'-'+field);select.value=value;select.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,40));};
    for(const [i,[id,field,value]] of variants.entries()){await set(id,field,value);const x=(i%3)*400,y=Math.floor(i/3)*270;c.drawImage(document.querySelector('#'+id+' canvas'),x,y,400,242.5);c.fillStyle='#344b43';c.font='16px Microsoft YaHei';const select=document.getElementById(id+'-'+field);c.fillText(document.querySelector('#'+id+' h3').textContent+' · '+select.selectedOptions[0].textContent,x+16,y+263);}
    for(const [id,field] of variants){const d=window.PoemDrawing.definitions().find(d=>d.id===id);await set(id,field,d.controls.find(f=>f.id===field).default);}return canvas.toDataURL();
  })()`);
  await writeFile(resolve(dir,'variant-preview.png'),Buffer.from(variantSheet.split(',')[1],'base64'));
  const galleryHeight=await evaluate(`Math.ceil(document.getElementById('studies').getBoundingClientRect().bottom+scrollY+40)`);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1280,height:galleryHeight,scale:1}});
  await writeFile(resolve(dir,'preview.png'),Buffer.from(shot.data,'base64'));
  const newToolSheet=await evaluate(`(()=>{
    const ids=['grass','bamboo','willow','snow','leaves','fish','cloud','catkins','flower-forms'];
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=810;const c=canvas.getContext('2d');c.fillStyle='#f5f4ed';c.fillRect(0,0,1200,810);
    ids.forEach((id,i)=>{const x=(i%3)*400,y=Math.floor(i/3)*270;c.drawImage(document.querySelector('#'+id+' canvas'),x,y,400,242.5);c.fillStyle='#344b43';c.font='16px Microsoft YaHei';c.fillText(document.querySelector('#'+id+' h3').textContent,x+16,y+263);});return canvas.toDataURL();
  })()`);
  await writeFile(resolve(dir,'new-tools-preview.png'),Buffer.from(newToolSheet.split(',')[1],'base64'));
  const frequencySheet=await evaluate(`(async()=>{
    const variants=[['wine','form','liquid'],['wine','form','cup'],['wine','form','jar'],['building','levels','two'],['building','levels','three'],['building','windows','open'],['plum-branch','form','branch'],['plum-branch','form','sprig'],['flower-forms','kind','plum']];
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=810;const c=canvas.getContext('2d');c.fillStyle='#f5f4ed';c.fillRect(0,0,1200,810);
    for(const [i,[id,field,value]] of variants.entries()){
      const select=document.getElementById(id+'-'+field);select.value=value;select.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,40));
      const x=i%3*400,y=Math.floor(i/3)*270;c.drawImage(document.querySelector('#'+id+' canvas'),x,y,400,242.5);c.fillStyle='#344b43';c.font='16px Microsoft YaHei';c.fillText(document.querySelector('#'+id+' h3').textContent+' · '+select.selectedOptions[0].textContent,x+16,y+263);
    }
    for(const id of ['wine','building','plum-branch','flower-forms'])for(const field of window.PoemDrawing.definitions().find(t=>t.id===id).controls){const s=document.getElementById(id+'-'+field.id);s.value=field.default;s.dispatchEvent(new Event('change'));}
    return canvas.toDataURL();
  })()`);
  await writeFile(resolve(dir,'frequency-tools-preview.png'),Buffer.from(frequencySheet.split(',')[1],'base64'));
  const surfaceBirdSheet=await evaluate(`(async()=>{
    const variants=[['surface-weather',{carrier:'leaf',surface:'dew'},'叶面 · 露'],['surface-weather',{carrier:'leaf',surface:'frost'},'叶面 · 霜'],['oriole',{pose:'folded',facing:'right'},'莺形 · 收翅'],['surface-weather',{carrier:'branch',surface:'dew'},'枝条 · 露'],['surface-weather',{carrier:'branch',surface:'frost'},'枝条 · 霜'],['oriole',{pose:'spread',facing:'right'},'莺形 · 展翅'],['surface-weather',{carrier:'stone',surface:'dew'},'石面 · 露'],['surface-weather',{carrier:'stone',surface:'frost'},'石面 · 霜'],['oriole',{pose:'folded',facing:'left'},'莺形 · 向左']];
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=810;const c=canvas.getContext('2d');c.fillStyle='#f5f4ed';c.fillRect(0,0,1200,810);
    for(const [i,[id,patch,label]] of variants.entries()){
      for(const [field,value] of Object.entries(patch)){const s=document.getElementById(id+'-'+field);s.value=value;s.dispatchEvent(new Event('change'));}await new Promise(r=>setTimeout(r,40));
      const x=i%3*400,y=Math.floor(i/3)*270;c.drawImage(document.querySelector('#'+id+' canvas'),x,y,400,242.5);c.fillStyle='#344b43';c.font='16px Microsoft YaHei';c.fillText(label,x+16,y+263);
    }
    for(const id of ['surface-weather','oriole'])for(const field of window.PoemDrawing.definitions().find(t=>t.id===id).controls){const s=document.getElementById(id+'-'+field.id);s.value=field.default;s.dispatchEvent(new Event('change'));}
    return canvas.toDataURL();
  })()`);
  await writeFile(resolve(dir,'surface-bird-preview.png'),Buffer.from(surfaceBirdSheet.split(',')[1],'base64'));
  const plantHorseSheet=await evaluate(`(async()=>{
    const variants=[['orchid',{form:'plant'},'兰意 · 长叶疏花'],['orchid',{form:'flower'},'兰意 · 花部'],['horse',{pose:'stand',facing:'right'},'马意 · 静立'],['horse',{pose:'lower',facing:'right'},'马意 · 低首'],['horse',{pose:'stand',facing:'left'},'马意 · 向左'],['lotus',{form:'flower',state:'open'},'莲 · 花与茎'],['lotus',{form:'flower',state:'bud'},'莲 · 含苞'],['lotus',{form:'leaf',state:'open'},'荷叶'],['lotus',{form:'composition',state:'open'},'莲 · 显式花叶组合']];
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=810;const c=canvas.getContext('2d');c.fillStyle='#f5f4ed';c.fillRect(0,0,1200,810);
    for(const [i,[id,patch,label]] of variants.entries()){
      for(const [field,value] of Object.entries(patch)){const s=document.getElementById(id+'-'+field);s.value=value;s.dispatchEvent(new Event('change'));}await new Promise(r=>setTimeout(r,40));
      const x=i%3*400,y=Math.floor(i/3)*270;c.drawImage(document.querySelector('#'+id+' canvas'),x,y,400,242.5);c.fillStyle='#344b43';c.font='16px Microsoft YaHei';c.fillText(label,x+16,y+263);
    }
    for(const id of ['orchid','horse','lotus'])for(const field of window.PoemDrawing.definitions().find(t=>t.id===id).controls){const s=document.getElementById(id+'-'+field.id);s.value=field.default;s.dispatchEvent(new Event('change'));}
    return canvas.toDataURL();
  })()`);
  await writeFile(resolve(dir,'orchid-horse-lotus-preview.png'),Buffer.from(plantHorseSheet.split(',')[1],'base64'));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(150);
  const narrowLayout=await evaluate(`({viewport:innerWidth,document:document.documentElement.scrollWidth,canvases:document.querySelectorAll('canvas').length})`);
  if(narrowLayout.document>narrowLayout.viewport||wideLayout.document>wideLayout.viewport)throw new Error('Horizontal overflow');
  const mobile=await send('Page.captureScreenshot',{format:'png'});await writeFile(resolve(qa,'mobile.png'),Buffer.from(mobile.data,'base64'));
  // Explicitly authored offline fixture, separate from poetry/API model runs.
  const fixture={poem:'本地手工组合：梅枝、楼、酒杯',relations:[],entities:[['i1','梅枝','organism'],['i2','楼','object'],['i3','酒杯','object']].map(([id,text,kind])=>({id,mentions:[text],concept:text,kind,role:'scene',presence:'present',evidence:[text]}))};
  const offlinePlan=buildPlan(fixture);
  if(offlinePlan.layers.map(l=>l.tool).join(',')!=='building,plum-branch,wine')throw new Error('Offline fixture mapping failed');
  await evaluate(`document.body.insertAdjacentHTML('beforeend','<canvas id="scene" width="960" height="600"></canvas><div id="layer-hosts" hidden></div>')`);
  await evaluate(await readFile(resolve(dir,'../poem-generation/scene.js'),'utf8'));
  await evaluate(`window.PoemTrialScene.render(${JSON.stringify(offlinePlan)})`);await sleep(120);await evaluate('window.PoemTrialScene.pause(true)');
  const composition=await evaluate(`({state:window.PoemTrialScene.inspect(),alpha:Array.from(document.querySelectorAll('#layer-hosts canvas'),c=>c.getContext('2d').getImageData(0,0,1,1).data[3]),png:document.getElementById('scene').toDataURL()})`);
  if(composition.state.layers.length!==3||composition.alpha.some(a=>a!==0))throw new Error('Offline transparent composition failed');
  await writeFile(resolve(dir,'frequency-composition.png'),Buffer.from(composition.png.split(',')[1],'base64'));
  await writeFile(resolve(dir,'frequency-composition.json'),JSON.stringify({source:'project-authored offline fixture; not model output',modelCalls:0,fixture,plan:offlinePlan,state:composition.state,transparentLayers:composition.alpha.length},null,2)+'\n');
  await evaluate('window.PoemTrialScene.dispose()');
  const newFixture={poem:'本地手工组合：兰、马、莲花',relations:[],entities:[['i1','兰','organism'],['i2','马','organism'],['i3','莲花','organism']].map(([id,text,kind])=>({id,mentions:[text],concept:text,kind,role:'scene',presence:'present',evidence:[text]}))};
  const newPlan=buildPlan(newFixture);if(newPlan.layers.map(l=>l.tool).join(',')!=='horse,lotus,orchid')throw new Error('New plant/horse fixture mapping failed');
  await evaluate(`window.PoemTrialScene.render(${JSON.stringify(newPlan)})`);await sleep(120);await evaluate('window.PoemTrialScene.pause(true)');
  const newScene=await evaluate(`({state:window.PoemTrialScene.inspect(),alpha:Array.from(document.querySelectorAll('#layer-hosts canvas'),c=>c.getContext('2d').getImageData(0,0,1,1).data[3]),png:document.getElementById('scene').toDataURL()})`);
  if(newScene.state.placements.length!==3||newScene.alpha.length!==newScene.state.layers.length||newScene.alpha.some(a=>a!==0))throw new Error('New plant/horse transparent scene failed');
  await writeFile(resolve(dir,'orchid-horse-lotus-scene.png'),Buffer.from(newScene.png.split(',')[1],'base64'));
  await writeFile(resolve(dir,'orchid-horse-lotus-scene.json'),JSON.stringify({source:'project-authored offline fixture; not model output',modelCalls:0,fixture:newFixture,plan:newPlan,state:newScene.state,transparentLayers:newScene.alpha.length},null,2)+'\n');await evaluate('window.PoemTrialScene.dispose()');
  if(errors.length)throw new Error(JSON.stringify(errors));
  const report={status:'passed',targetUrl,initial,pausedBefore,pausedAfter,changed,settings,resumed,exportInfo,isolation,variants,architecture,newFeatures,extensionLifecycle,wideLayout,narrowLayout,runtimeErrors:errors,limitations:['未操作系统下载确认界面；仅验证 canvas 导出 PNG 数据。','本地画面经浏览器截图检查；具体花鸟树种尚未做植物学或生物学辨识验收。','所有登记工具检查暂停重置后的重复出图；不等同于运动的跨设备逐帧确定性。']};
  report.frequencyFeatures=frequencyFeatures;
  report.surfaceBirdFeatures=surfaceBirdFeatures;
  report.plantHorseFeatures=plantHorseFeatures;
  await writeFile(resolve(dir,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,wideLayout,narrowLayout,runtimeErrors:errors.length}));
  await send('Browser.close').catch(()=>{});
}finally{if(ws)ws.close();edge.kill();}
