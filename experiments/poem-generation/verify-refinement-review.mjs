import{readFile,writeFile}from'node:fs/promises';
import{resolve}from'node:path';
import{createHash}from'node:crypto';
import assert from'node:assert/strict';
import{openBrowser}from'./browser-qa.mjs';
import{createPoemServer}from'./server.mjs';
const server=createPoemServer({port:0});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,b=await openBrowser(resolve('experiments/poem-generation/.qa/refinement-review-'+Date.now())),out=resolve('poem-flow/verification/refinement');
try{
 await b.send('Page.navigate',{url:base+'/poem-flow/refinement-review.html'});await b.until(`document.images.length===25&&Array.from(document.images).every(i=>i.complete&&i.naturalWidth===960)`);assert.equal(await b.evaluate('document.querySelectorAll("article").length'),13);
 await b.evaluate(`document.getElementById('mode').value='scenery';document.getElementById('mode').dispatchEvent(new Event('change'))`);await b.until(`Array.from(document.images).every(i=>i.complete&&i.naturalWidth===960)`);assert(await b.evaluate(`Array.from(document.images).every(i=>i.src.includes('-scenery-'))`));
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 await b.send('Page.navigate',{url:base+'/poem-flow/expression.html?refine=b065'});await b.until(`window.expressionExperiment?.inspect().ready&&!document.getElementById('generate').disabled`);assert(await b.evaluate(`window.PoemDrawing.definitions().some(d=>d.id==='flag')&&window.PoemDrawing.definitions().some(d=>d.id==='weapon')`));assert(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 const pictures={};for(const id of['b035','b053','b012','b065']){pictures[id]=[];for(const side of['before','after'])pictures[id].push('data:image/png;base64,'+(await readFile(resolve(out,id+'-balanced-'+side+'.png'))).toString('base64'));}
 for(const[id,pair]of Object.entries(pictures)){
  const result=await b.evaluate(`(async()=>{const c=document.createElement('canvas');c.width=1920;c.height=660;const x=c.getContext('2d');x.fillStyle='#f2f0e8';x.fillRect(0,0,c.width,c.height);x.fillStyle='#304c48';x.font='22px Microsoft YaHei';x.fillText('修改前',22,36);x.fillText('修改后',982,36);let counts=[];for(const[i,url]of ${JSON.stringify(pair)}.entries()){const im=new Image();im.src=url;await im.decode();x.drawImage(im,i*960,60);const s=document.createElement('canvas');s.width=960;s.height=600;const q=s.getContext('2d');q.drawImage(im,0,0);const d=q.getImageData(0,300,960,300).data;let green=0;for(let j=0;j<d.length;j+=4)if(d[j+1]>d[j]*1.08&&d[j+1]>d[j+2]*1.03)green++;counts.push(green);}return {png:c.toDataURL(),counts};})()`);
  if(id==='b012')assert(result.counts[1]>result.counts[0]*1.5,'explicit green leaves must survive the final composite');
  await writeFile(resolve(out,id+'-comparison.png'),Buffer.from(result.png.split(',')[1],'base64'));
 }
 const a=JSON.parse(await readFile('experiments/poem-generation/accepted-baseline.json')),old=JSON.parse(await readFile('poem-flow/verification/expanse/baseline.json'));let n=0;
 for(const[file,expected]of [...Object.entries(old.files),...a.images.map(v=>[v.path,v.sha256])]){assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),expected);n++;}
 assert.deepEqual(b.errors,[]);assert.deepEqual(b.posts,[]);
 await writeFile(resolve(out,'review-verification.json'),JSON.stringify({cards:13,initialPictures:25,modeSwitch:true,mobile:390,newToolsLoaded:true,literalGreenPixelCheck:true,baselineFilesUnchanged:n,modelCalls:0,browserErrors:b.errors,networkPosts:b.posts},null,2)+'\n');console.log('Review UI, real color pixels and '+n+' frozen files verified');
}finally{await b.close();await new Promise(r=>server.close(r));}
