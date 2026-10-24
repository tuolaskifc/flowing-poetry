// Actual browser + local HTTP service, replaying saved provider replies.
// No external model calls; includes partial and hard-failure negative controls.
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createPoemServer} from './server.mjs';
import {createGenerationService} from './service.mjs';
import {openBrowser} from './browser-qa.mjs';
const data=JSON.parse(await readFile(new URL('reliability-cases.json',import.meta.url),'utf8'));
const out=new URL('../../poem-flow/verification/reliability/',import.meta.url);await mkdir(out,{recursive:true});
const temp=await mkdtemp(join(tmpdir(),'poem-reliability-browser-')),credentials=join(temp,'config');await writeFile(credentials,'https://example.invalid/v1\ndummy-browser-secret\nmodel\n');
let mockCalls=0,last,active,sequence=0;
function useReply(analysis,{network=false,finish='stop'}={}){
 active=createGenerationService({credentialsPath:credentials,runsDir:join(temp,'runs-'+sequence++),fetcher:async()=>{mockCalls++;if(network)throw Error('fetch failed');return new Response(JSON.stringify({choices:[{finish_reason:finish,message:{content:JSON.stringify(analysis)}}]}));}});
}
useReply(data.cases[0].analysis);
const server=createPoemServer({port:0,service:{configured:()=>active.configured(),latest:o=>active.latest(o),analyze:async input=>{last=await active.analyze(input);return last;}}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const b=await openBrowser(resolve('experiments/poem-generation/.qa/reliability-'+Date.now())),rows=[];
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:origin+'/poem-flow/expression.html'});await b.until(`window.expressionExperiment?.inspect().ready&&!document.getElementById('generate').disabled`);
 async function submit(poem){
  await b.evaluate(`document.getElementById('poem').value=${JSON.stringify(poem)};document.getElementById('generate').click()`);await b.until(`!document.getElementById('generate').disabled`);
  return await b.evaluate(`({ready:window.expressionExperiment.inspect().ready,title:document.getElementById('poem-title').textContent,status:document.getElementById('status').textContent,review:document.getElementById('review-note').textContent,retry:document.getElementById('generate').textContent})`);
 }
 async function save(name){const png=await b.evaluate(`window.expressionExperiment.pause(true);window.PoemTrialScene.pause(true);window.expressionExperiment.at(8);document.getElementById('art').toDataURL()`);await writeFile(new URL(name+'.png',out),Buffer.from(png.split(',')[1],'base64'));}
 for(const c of data.cases){
  useReply(c.analysis);const calls=mockCalls,state=await submit(c.poem);assert.equal(mockCalls,calls+1);assert(last.validation.valid,c.id);assert(state.ready);assert.equal(state.title,c.poem);assert(!/没有通过|未通过检查/.test(state.status));
  rows.push({id:c.id,poem:c.poem,delivery:last.delivery.status,recovery:last.recovery?.status||null,rawValid:(last.rawValidation||last.validation).valid,status:state.status});
  if(c.id.endsWith('8e7ec1b9'))await save('comparison');if(c.id.endsWith('fa6aac63'))await save('normalized');if(c.id.endsWith('17efb396'))await save('source-context');
 }
 const a=structuredClone(data.cases.at(-1).analysis);a.expression.processes.push({subject:'i2',kind:'persist',temporal:'ongoing',modality:'asserted',basis:'inferred',evidence:[a.poem]});useReply(a);
 const partial=await submit(a.poem);assert.equal(last.delivery.status,'partial');assert(partial.status.includes('暂未采用'));assert(partial.review.includes('暂未采用'));await save('partial');
 const before=await b.evaluate(`({title:document.getElementById('poem-title').textContent,png:document.getElementById('art').toDataURL(),time:window.expressionExperiment.inspect().time})`);
 const bad=structuredClone(a);bad.entities[0].mentions=['凭空添加的主体'];useReply(bad);const rejected=await submit(a.poem);
 assert(!last.validation.valid);assert.equal(last.delivery.status,'failed');assert.equal(rejected.title,before.title);assert(rejected.status.includes('上次画面'));assert.equal(rejected.retry,'重试本句');assert.equal(await b.evaluate(`document.getElementById('art').toDataURL()`),before.png);
 useReply(a,{network:true});const network=await submit(a.poem);assert(network.status.includes('尚未生成本句画面'));assert.equal(await b.evaluate(`document.getElementById('art').toDataURL()`),before.png);
 useReply(a,{finish:'length'});const truncated=await submit(a.poem);assert(truncated.status.includes('未完整返回'));assert.equal(await b.evaluate(`document.getElementById('art').toDataURL()`),before.png);
 const calls=mockCalls;await b.evaluate(`document.getElementById('replay-latest').click()`);await b.until(`!document.getElementById('replay-latest').disabled`);assert.equal(mockCalls,calls);assert(await b.evaluate(`document.getElementById('status').textContent.includes('暂未采用')`));
 await b.evaluate(`document.getElementById('art').scrollIntoView({block:'center'})`);await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(r=>writeFile(new URL('desktop.png',out),Buffer.from(r.data,'base64')));
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(r=>writeFile(new URL('mobile.png',out),Buffer.from(r.data,'base64')));
 // Real running backend: newest saved answer can be replayed through the new UI.
 const actualLatest=await(await fetch('http://127.0.0.1:4173/api/latest?mode=expression')).json();assert(actualLatest.record?.validation.valid);assert(actualLatest.record.delivery);
 await b.send('Page.navigate',{url:'http://127.0.0.1:4173/poem-flow/expression.html?latest=1'});await b.until(`window.expressionExperiment?.inspect().ready&&!document.getElementById('generate').disabled&&document.getElementById('poem-title').textContent===${JSON.stringify(actualLatest.record.poem)}`);
 assert.deepEqual(b.errors,[]);assert(b.posts.every(url=>url.startsWith(origin+'/api/analyze')));
 for(const c of data.cases){const bytes=await readFile(new URL('runs/'+c.id+'/result.json',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),c.originalResultHash);}
 const baseline=JSON.parse(await readFile(new URL('../../poem-flow/verification/expanse/baseline.json',import.meta.url),'utf8'));
 for(const [file,hash] of Object.entries(baseline.files))assert.equal(createHash('sha256').update(await readFile(resolve(file))).digest('hex'),hash,file);
 const report={scope:'saved-provider-response-browser-replays-and-negative-controls',modelCalls:0,savedReplays:rows,partialResult:true,retainsOldPictureOnHardFailure:true,retainsOldPictureOnNetworkFailure:true,truncationRejected:true,manualRetryLabel:true,replayButtonWithoutModelRequest:true,currentBackendLatest:true,mobileWidth:390,historicalArtifactsUnchanged:Object.keys(baseline.files).length,localMockCalls:mockCalls,browserErrors:b.errors,localSubmissions:b.posts.length,aestheticAcceptance:'pending-user'};
 await writeFile(new URL('verification.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,savedReplays:rows.length}));
}finally{await b.close();await new Promise(r=>server.close(r));assert(temp.startsWith(join(tmpdir(),'poem-reliability-browser-')));await rm(temp,{recursive:true,force:true});}
