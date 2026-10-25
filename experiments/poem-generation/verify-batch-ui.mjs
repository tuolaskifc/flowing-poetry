// Browser checks for the audit table, partial output and retention of a good image.
import{readFile,writeFile}from'node:fs/promises';
import{resolve}from'node:path';
import{createHash}from'node:crypto';
import assert from'node:assert/strict';
import{createPoemServer}from'./server.mjs';
import{openBrowser}from'./browser-qa.mjs';
const out=resolve('poem-flow/verification/batch'),d=JSON.parse(await readFile(resolve(out,'after.json'),'utf8')),good=d.cases.find(c=>c.id==='b002').record,blocked=d.cases.find(c=>c.id==='b066').record;
const service={configured:async()=>true,latest:async()=>good,analyze:async({poem})=>poem===blocked.poem?blocked:{poem,validation:{valid:false},delivery:{status:'failed',message:'基础解读未通过检查。'}}};
const server=createPoemServer({port:0,service});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,b=await openBrowser(resolve('experiments/poem-generation/.qa/batch-ui-'+Date.now()));
try{
 await b.send('Page.navigate',{url:base+'/poem-flow/expression.html?audit=b002'});await b.until(`window.expressionExperiment?.inspect().ready&&!document.getElementById('generate').disabled`);
 await b.evaluate('window.expressionExperiment.pause(true);window.PoemTrialScene.pause(true);window.expressionExperiment.at(8)');
 const before=await b.evaluate(`document.getElementById('art').toDataURL()`);
 await b.evaluate(`document.getElementById('poem').value=${JSON.stringify(blocked.poem)};document.getElementById('generate').click()`);await b.until(`!document.getElementById('generate').disabled`);
 assert.equal(await b.evaluate('document.getElementById("art").toDataURL()'),before);assert.match(await b.evaluate('document.getElementById("status").textContent'),/上次画面/);assert.equal(await b.evaluate('document.getElementById("poem-title").textContent'),good.poem);
 await b.evaluate(`document.getElementById('poem').value='无效测试';document.getElementById('generate').click()`);await b.until(`!document.getElementById('generate').disabled`);assert.equal(await b.evaluate('document.getElementById("art").toDataURL()'),before);
 await b.send('Page.navigate',{url:base+'/poem-flow/expression.html?audit=b041'});await b.until(`window.expressionExperiment?.inspect().ready&&!document.getElementById('generate').disabled`);assert.match(await b.evaluate('document.getElementById("review-note").textContent'),/部分|缺口|全量/);
 await b.send('Page.navigate',{url:base+'/poem-flow/expression.html?audit=b066'});await b.until(`document.getElementById('poem-title').textContent===${JSON.stringify(blocked.poem)}&&!document.getElementById('generate').disabled`);assert(!await b.evaluate('window.expressionExperiment.inspect().ready'));assert.match(await b.evaluate('document.getElementById("status").textContent'),/可靠画法/);
 await b.send('Page.navigate',{url:base+'/poem-flow/batch-audit-review.html'});await b.until(`document.querySelectorAll('tbody tr').length===79`);await b.evaluate(`document.getElementById('filter').value='below-floor';document.getElementById('filter').dispatchEvent(new Event('change'))`);assert.equal(await b.evaluate(`document.querySelectorAll('tbody tr:not([hidden])').length`),d.cases.filter(c=>c.judgment.grade==='below-floor').length);
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 for(const path of ['after.json','before.json','current-api-sweep.json'])assert.equal((await fetch(base+'/poem-flow/verification/batch/'+path)).status,403);
 assert.deepEqual(b.errors,[]);assert.equal(b.posts.length,2);assert(b.posts.every(p=>p===base+'/api/analyze'));
 const accepted=JSON.parse(await readFile('experiments/poem-generation/accepted-baseline.json')),frozen=JSON.parse(await readFile('poem-flow/verification/expanse/baseline.json'));let baselines=0;
 for(const [file,expected]of [...Object.entries(frozen.files),...accepted.images.map(v=>[v.path,v.sha256])]){assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),expected);baselines++;}
 await writeFile(resolve(out,'ui-verification.json'),JSON.stringify({partialSceneReplay:true,unavailableRetainsPriorPicture:true,invalidCoreRetainsPriorPicture:true,unavailableInitialViewDoesNotSubstituteAnotherPoem:true,tableRows:79,belowFloorRows:d.cases.filter(c=>c.judgment.grade==='below-floor').length,mobile:390,privateRecordsBlocked:true,providerCalls:0,baselineFilesUnchanged:baselines,browserErrors:b.errors},null,2)+'\n');console.log('UI checks passed; '+baselines+' historical artifacts unchanged');
}finally{await b.close();await new Promise(r=>server.close(r));}
