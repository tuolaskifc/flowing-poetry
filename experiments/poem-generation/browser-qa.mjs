// Small CDP harness, using installed Edge and Node APIs. No model calls.
import {spawn} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export const wait=ms=>new Promise(r=>setTimeout(r,ms));
export async function openBrowser(profile){
 await mkdir(profile,{recursive:true});
 const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let ws;try{
  let port;for(let i=0;i<100;i++){try{port=(await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];await fetch(`http://127.0.0.1:${port}/json/version`);break;}catch{await wait(100);}}
  if(!port)throw new Error('Browser debugging port unavailable');
  const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
  let id=0;const pending=new Map(),errors=[],posts=[];
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Network.requestWillBeSent'&&m.params.request.method==='POST')posts.push(m.params.request.url);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const until=async expression=>{for(let i=0;i<200;i++){if(await evaluate(expression))return;await wait(100);}throw new Error('Browser timeout: '+expression);};
  await send('Runtime.enable');await send('Network.enable');await send('Page.enable');
  return {send,evaluate,until,errors,posts,async close(){await send('Browser.close').catch(()=>{});ws.close();browser.kill();}};
 }catch(e){ws?.close();browser.kill();throw e;}
}
