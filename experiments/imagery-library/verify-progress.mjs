// Browser checks for the generated 60-row table and its actual drawing links.
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url)),qa=resolve(dir,'.qa');await mkdir(qa,{recursive:true});
const profile=resolve(qa,`progress-browser-${Date.now()}`),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
  let port;for(let i=0;i<100;i++){try{port=(await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await sleep(100);}}
  if(!port)throw new Error('Browser did not start');
  const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
  let id=0;const pending=new Map(),errors=[],requests=[];
  ws.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(new Error(JSON.stringify(msg.error))):p.resolve(msg.result);}else if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails);else if(msg.method==='Network.requestWillBeSent')requests.push(msg.params.request.url);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});ws.send(JSON.stringify({id:next,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const waitFor=async condition=>{for(let i=0;i<150;i++){if(await evaluate(condition))return;await sleep(100);}throw new Error('Readiness timeout: '+condition);};
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
  const base=process.argv.includes('--http')?'http://127.0.0.1:4185/experiments/imagery-library/':pathToFileURL(dir+'/').href;
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:base+'progress.html'});await waitFor('Boolean(window.PoemProgressView)');
  const full=await evaluate(`({inspection:window.PoemProgressView.inspect(),rows:Array.from(document.querySelectorAll('#rows tr'),r=>({name:r.dataset.imagery,stage:r.dataset.stage,frequency:Number(r.querySelector('th small').textContent.replaceAll(',',''))})),links:Array.from(document.querySelectorAll('#rows a'),a=>a.getAttribute('href'))})`);
  const catalog=JSON.parse(await readFile(resolve(dir,'意象目录.json'),'utf8'));
  if(full.rows.length!==60||new Set(full.rows.map(r=>r.name)).size!==60||catalog.items.some(item=>!full.rows.some(row=>row.name===item.imagery&&row.frequency===item.count&&row.stage===item.progress.stage)))throw new Error('Progress rows differ from canonical catalog');
  const expected=catalog.progress_summary;
  const filters=await evaluate(`(()=>{
    const stage=document.getElementById('stage'),context=document.getElementById('context'),search=document.getElementById('search'),clear=document.getElementById('clear');
    const count=()=>document.querySelectorAll('#rows tr').length,result={};
    for(const key of ['basic','partial','todo','handoff']){stage.value=key;stage.dispatchEvent(new Event('change'));result[key]=count();}
    clear.click();context.value='required';context.dispatchEvent(new Event('change'));result.context=count();
    clear.click();search.value='羌笛';search.dispatchEvent(new Event('input'));result.search=count()===1&&document.querySelector('#rows tr').dataset.imagery==='羌笛';
    search.value='没有这个词__';search.dispatchEvent(new Event('input'));result.empty=count()===0&&!document.getElementById('empty').hidden;clear.click();result.reset=count()===60;return result;
  })()`);
  if(Object.entries(expected.stages).some(([key,value])=>filters[key]!==value.count)||filters.context!==expected.needs_context||!filters.search||!filters.empty||!filters.reset)throw new Error('Table filters failed: '+JSON.stringify(filters));
  const wide=await evaluate('({width:innerWidth,document:document.documentElement.scrollWidth})');
  const image=await send('Page.captureScreenshot',{format:'png'});await writeFile(resolve(dir,'progress-preview.png'),Buffer.from(image.data,'base64'));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(100);
  const narrow=await evaluate('({width:innerWidth,document:document.documentElement.scrollWidth,table:document.querySelector(".table-wrap").scrollWidth})');
  if(wide.document>wide.width||narrow.document>narrow.width||narrow.table<=narrow.width)throw new Error('Table overflow is not contained');
  const mobile=await send('Page.captureScreenshot',{format:'png'});await writeFile(resolve(qa,'progress-mobile.png'),Buffer.from(mobile.data,'base64'));
  const deepLinks=[];
  for(const [name,tool,option,value] of [['露','grass','surface','dew'],['黄叶','leaves','color','yellow']]){
    const href=await evaluate(`Array.from(document.querySelectorAll('#rows tr')).find(r=>r.dataset.imagery===${JSON.stringify(name)}).querySelector('a').href`);
    await send('Page.navigate',{url:href});await waitFor('Boolean(window.imageryExperiment)&&window.imageryExperiment.inspect().every(t=>t.ready)');
    const linked=await evaluate(`({value:document.getElementById(${JSON.stringify(tool+'-'+option)}).value,state:window.imageryExperiment.inspect().find(t=>t.id===${JSON.stringify(tool)})})`);
    if(linked.value!==value||linked.state.options[option]!==value||name==='露'&&linked.state.dewCount!==54)throw new Error('Variant deep link failed: '+name);
    deepLinks.push({name,href,selected:linked.value});
    await send('Page.navigate',{url:base+'progress.html'});await waitFor('Boolean(window.PoemProgressView)');
  }
  const external=requests.filter(url=>url.startsWith('http')&&new URL(url).hostname!=='127.0.0.1');
  if(errors.length||external.length)throw new Error(JSON.stringify({errors,external}));
  const report={status:'passed',total:full.rows.length,summary:expected,filters,deepLinks,wide,narrow,runtimeErrors:errors,externalRequests:external,limits:['基础可画仍待用户审美确认；不代表诗句自动生成已完成。','来源与词义提示的事实边界见目录；不把通用轮廓计为全部物种完成。']};
  await writeFile(resolve(dir,'progress-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'passed',total:full.rows.length,filters,deepLinks,externalRequests:external.length}));
  await send('Browser.close').catch(()=>{});
}finally{if(ws)ws.close();child.kill();}
