import{writeFile}from'node:fs/promises';
import{resolve}from'node:path';
import assert from'node:assert/strict';
import{openBrowser}from'./browser-qa.mjs';
import{createPoemServer}from'./server.mjs';
const server=createPoemServer({port:0});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,b=await openBrowser(resolve('experiments/poem-generation/.qa/rule-review-'+Date.now()));
try{
 await b.send('Page.navigate',{url:base+'/poem-flow/rule-review.html'});await b.until(`document.images.length===24&&Array.from(document.images).every(i=>i.complete&&i.naturalWidth===960)`);assert.equal(await b.evaluate('document.querySelectorAll("article").length'),12);
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 await b.send('Page.navigate',{url:base+'/poem-flow/expression.html?rules=g06&mode=scenery'});await b.until(`window.expressionExperiment?.inspect().ready&&!document.getElementById('generate').disabled`);assert.match(await b.evaluate(`document.getElementById('status').textContent`),/手工/);assert.equal(await b.evaluate(`document.getElementById('expression-mode').value`),'scenery');assert(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 assert.equal((await fetch(base+'/poem-flow/verification/rules/replay.json')).status,403);assert.deepEqual(b.errors,[]);assert.deepEqual(b.posts,[]);
 await writeFile('poem-flow/verification/rules/review-verification.json',JSON.stringify({cards:12,pictures:24,mobile:390,authoredLabel:true,modeLink:true,internalReportProtected:true,browserErrors:b.errors,providerCalls:0},null,2)+'\n');console.log('12 cards and 24 pictures, mobile layout, calibration label and report access verified.');
}finally{await b.close();await new Promise(r=>server.close(r));}
