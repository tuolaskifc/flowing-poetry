// Default uses labelled authored fixtures. --live makes exactly two model
// requests through the local API; invalid answers stop without repair/retry.
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {buildPlan} from './planner.mjs';
import {fixture,quantity,lotusFixture} from './quantity-fixtures.mjs';
const dir=dirname(fileURLToPath(import.meta.url)),qa=resolve(dir,'.qa/quantity'),out=resolve(dir,'../../poem-flow/verification/quantity'),live=process.argv.includes('--live'),saved=process.argv.includes('--saved'),prefix=live?'live':saved?'real-replay':'fixtures';
assert(!(live&&saved),'Choose live requests or saved-record replay');
await mkdir(qa,{recursive:true});await mkdir(out,{recursive:true});
const beforeCode=execFileSync('git',['show','d9220b5:experiments/poem-generation/planner.mjs'],{cwd:resolve(dir,'../..')}).toString().replace("'./imagery-lexicon.js'",JSON.stringify(pathToFileURL(resolve(dir,'imagery-lexicon.js')).href));
await writeFile(resolve(qa,'before-planner.mjs'),beforeCode);const {buildPlan:beforePlan}=await import(pathToFileURL(resolve(qa,'before-planner.mjs')).href);
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),profile=resolve(qa,'browser');await mkdir(profile,{recursive:true});
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});let ws;
try{
  let port;for(let i=0;i<100;i++){try{const p=(await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];await fetch(`http://127.0.0.1:${p}/json/version`);port=p;break;}catch{await sleep(100);}}if(!port)throw new Error('Browser startup failed');
  const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
  let id=0;const pending=new Map(),errors=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const until=async exp=>{const start=Date.now();while(Date.now()-start<20000){if(await evaluate(exp))return;await sleep(100);}throw new Error('Timeout: '+exp);};
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:'http://127.0.0.1:4173/'});await until(`window.PoemTrialScene&&!document.getElementById('generate').disabled`);
  const exact=fixture('两朵花，一叶孤舟。',[{text:'花',quantity:quantity({mode:'exact',min:2,max:2,unit:'朵',scope:'individual',evidence:['两朵花']})},{text:'孤舟',kind:'object',quantity:quantity({mode:'exact',min:1,max:1,unit:null,scope:'individual',evidence:['一叶孤舟']})}]);
  const units=fixture('两竿竹，两株草，三片红叶。',[['竹',2,'竿','两竿竹'],['草',2,'株','两株草'],['红叶',3,'片','三片红叶']].map(([text,n,unit,evidence])=>({text,quantity:quantity({mode:'exact',min:n,max:n,unit,scope:'individual',evidence:[evidence]})})));
  const cases=live||saved?[{id:'lotus',poem:lotusFixture().poem,source:{provider:'数量通路实测',author:'杨万里',title:'晓出净慈寺送林子方',dynasty:'宋代'}},{id:'lone-boat',poem:'孤舟蓑笠翁，独钓寒江雪。',source:{provider:'数量通路实测',author:'柳宗元',title:'江雪',dynasty:'唐代'}}]:[{id:'lotus',analysis:lotusFixture()},{id:'exact',analysis:exact},{id:'units',analysis:units}];
  const report=[];
  for(const sample of cases){
    let record=null,analysis=sample.analysis;
    if(saved){record=JSON.parse(await readFile(resolve(out,'live-'+sample.id+'-record.json'),'utf8'));assert(record.validation.valid);analysis=record.analysis;}
    if(live){const response=await fetch('http://127.0.0.1:4173/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({poem:sample.poem,source:sample.source}),signal:AbortSignal.timeout(110000)});const body=await response.json();record=body.record;await writeFile(resolve(out,prefix+'-'+sample.id+'-record.json'),JSON.stringify(record||body,null,2)+'\n');assert(record?.validation?.valid,JSON.stringify(record?.validation||body));analysis=record.analysis;}
    const plans={before:beforePlan(analysis),after:buildPlan(analysis)},pictures={};
    for(const [version,plan] of Object.entries(plans)){
      await evaluate(`document.getElementById('output').hidden=false;document.getElementById('welcome').hidden=true;document.getElementById('scene-title').textContent=${JSON.stringify(analysis.poem)};window.PoemTrialScene.render(${JSON.stringify(plan)})`);
      await until(`window.PoemTrialScene.inspect().layers.every(c=>c.ticks>0)`);await sleep(80);await evaluate('window.PoemTrialScene.pause(true)');await sleep(60);
      const state=await evaluate('window.PoemTrialScene.inspect()'),png=await evaluate(`document.getElementById('scene').toDataURL()`);pictures[version]=png;await writeFile(resolve(out,`${prefix}-${sample.id}-${version}.png`),Buffer.from(png.split(',')[1],'base64'));
      const coverage=await evaluate(`(()=>{const c=document.getElementById('scene'),d=c.getContext('2d').getImageData(0,0,960,600).data,b=d.slice(0,3);let ink=0;for(let i=0;i<d.length;i+=4)if(Math.max(...[0,1,2].map(j=>Math.abs(d[i+j]-b[j])))>12)ink++;return ink/(960*600);})()`);
      sample[version]={instances:state.instances.length,renderers:state.layers.length,inkCoverage:coverage};
      if(version==='after'){
        const times=state.layers.map(l=>l.time);await sleep(120);assert.deepEqual((await evaluate('window.PoemTrialScene.inspect()')).layers.map(l=>l.time),times);assert(state.layers.every(l=>l.ready&&l.finite!==false));
        if(sample.id==='lotus'){
          assert(state.instances.length>20);assert(state.layers.length<=6);assert(state.layers.every(l=>l.flowerCount<=1&&l.leafCount<=1));
          await evaluate(`document.getElementById('scene').scrollIntoView({block:'center'})`);
          const hit=await evaluate(`(()=>{const scene=document.getElementById('scene'),b=scene.getBoundingClientRect(),hosts=[...document.querySelectorAll('#layer-hosts canvas')];for(const entry of window.PoemTrialScene.inspect().instances.slice().reverse()){const c=hosts[entry.sourceIndex],d=c.getContext('2d').getImageData(0,0,640,388).data,p=entry.placement;for(let y=10;y<378;y+=3)for(let x=10;x<630;x+=3)if(d[(y*640+x)*4+3]>30){const sx=p.at[0]*960+(x+.5-p.anchor[0])*p.scale,sy=p.at[1]*600+(y+.5-p.anchor[1])*p.scale;if(sx>40&&sx<880&&sy>50&&sy<530){const px=b.left+sx*b.width/960,py=b.top+sy*b.height/600;if(document.elementFromPoint(px,py)===scene)return {x:px,y:py};}}}return null;})()`);
          assert(hit,'visible group should be draggable');
          await send('Input.dispatchMouseEvent',{type:'mousePressed',x:hit.x,y:hit.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:hit.x+25,y:hit.y+12,buttons:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:hit.x+25,y:hit.y+12,button:'left',clickCount:1});
          const moved=await evaluate('window.PoemTrialScene.inspect()'),changed=state.placements.map((p,i)=>JSON.stringify(p)!==JSON.stringify(moved.placements[i])).flatMap((v,i)=>v?[i]:[]);assert.equal(changed.length,1);
          const group=changed[0],delta=moved.placements[group].at.map((v,i)=>v-state.placements[group].at[i]);
          for(const instance of state.instances){const next=moved.instances.find(v=>v.layer===instance.layer&&v.index===instance.index);for(let j=0;j<2;j++)assert(Math.abs((next.placement.at[j]-instance.placement.at[j])-(instance.layer===group?delta[j]:0))<1e-9,'all copies of the selected imagery should move together');}
          await evaluate('window.PoemTrialScene.resetLayout()');assert.deepEqual((await evaluate('window.PoemTrialScene.inspect()')).instances,state.instances);
          await evaluate('window.PoemTrialScene.reseed()');await sleep(80);const reset=await evaluate('window.PoemTrialScene.inspect()');assert(reset.layers.every((l,i)=>l.seed===state.layers[i].seed+1));assert.equal(reset.instances.length,state.instances.length);assert(reset.layers.every(l=>l.paused));
        }
        if(sample.id==='lone-boat')assert.equal(state.instances.filter(i=>i.tool==='boat').length,1);
        if(sample.id==='exact'){assert.equal(state.instances.filter(i=>i.tool==='flower').length,2);assert.equal(state.instances.filter(i=>i.tool==='boat').length,1);assert(state.layers.filter(l=>l.id==='flower').every(l=>l.flowerCount===1));}
        if(sample.id==='units'){for(const [tool,n,field] of [['bamboo',2,'culmCount'],['grass',2,'tuftCount'],['leaves',3,'leafCount']]){assert.equal(state.instances.filter(i=>i.tool===tool).length,n);assert(state.layers.filter(l=>l.id===tool).every(l=>l[field]===1));}}
      }
    }
    if(sample.id==='lotus')assert(sample.after.inkCoverage>sample.before.inkCoverage*2,'lotus field should visibly occupy more space');
    const comparison=await evaluate(`(async()=>{const c=document.createElement('canvas');c.width=1920;c.height=660;const ctx=c.getContext('2d');ctx.fillStyle='#eeeae3';ctx.fillRect(0,0,1920,660);ctx.fillStyle='#344b43';ctx.font='23px SimSun';ctx.fillText('修改前：固定位置的独立图层',25,38);ctx.fillText('修改后：数量、群落与近远层次',985,38);for(const [i,url] of ${JSON.stringify(Object.values(pictures))}.entries()){const img=new Image();img.src=url;await img.decode();ctx.drawImage(img,i*960,60);}return c.toDataURL();})()`);
    await writeFile(resolve(out,`${prefix}-${sample.id}-comparison.png`),Buffer.from(comparison.split(',')[1],'base64'));
    report.push({id:sample.id,poem:analysis.poem,basis:live||saved?'real-model':'authored-fixture',record:record?.id,usage:record?.usage,quantity:analysis.entities.map(e=>({mentions:e.mentions,quantity:e.quantity})),before:sample.before,after:sample.after});
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));assert.deepEqual(errors,[]);
  await writeFile(resolve(out,prefix+'-verification.json'),JSON.stringify({status:'passed',live,savedRecordReplay:saved,modelRequests:live?2:0,cases:report,pause:true,groupDrag:true,resetLayout:true,reseed:true,exportPng:true,mobileWidth:390,runtimeErrors:errors},null,2)+'\n');console.log(JSON.stringify({status:'passed',live,cases:report.map(({quantity,...r})=>r)}));await send('Browser.close').catch(()=>{});
}finally{ws?.close();browser.kill();}
