// Fixed local inputs; isolated server and browser; no model POST or saved-answer analysis.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {analyzeLocally} from './local-rule-pipeline.mjs';
import {createPoemServer} from './server.mjs';
import {openBrowser,wait} from './browser-qa.mjs';
const cases=JSON.parse(await readFile('experiments/poem-generation/local-batch-cases.json','utf8'));
const output=resolve('output/local-batch-2026-11-08');await mkdir(output,{recursive:true});
const server=createPoemServer({port:0});await new Promise(r=>server.listen(0,'127.0.0.1',r));
let b;try{
 b=await openBrowser(resolve('experiments/poem-generation/.qa/local-batch-'+Date.now()));
 await b.send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/poem-flow/expression.html'});
 await b.until('window.expressionExperiment?.inspect().ready&&!document.getElementById("generate").disabled');
 const rows=[],images=[];
 for(const c of cases){
  const result=analyzeLocally(c.poem);assert(result.validation.valid,JSON.stringify(result.validation));
  const record={...result,id:c.id,delivery:{status:result.deferred.length||result.plan.expression.gaps.length?'partial':'complete',message:'本地词语分析，结果需要复核。'}};
  await b.evaluate(`window.expressionStudy.show(${JSON.stringify(record)},null)`);
  await b.evaluate('window.expressionExperiment.pause(true);if(window.PoemTrialScene.inspect().ready)window.PoemTrialScene.pause(true);window.expressionExperiment.at(8)');await wait(100);
  const image=await b.evaluate('document.getElementById("art").toDataURL("image/png")');await writeFile(resolve(output,c.id+'.png'),Buffer.from(image.split(',')[1],'base64'));images.push({id:c.id,poem:c.poem,focus:c.focus,png:image});
  rows.push({id:c.id,poem:c.poem,focus:c.focus,mode:result.plan.expression.recommendation,entities:result.analysis.entities.map(e=>({id:e.id,word:e.mentions[0]})),layers:(result.plan.concretePlan?.layers||[]).filter(l=>!l.inferred).map(l=>({names:l.names,tool:l.tool,count:l.instances.length})),deferred:result.deferred,gaps:result.plan.expression.gaps,artisticFallback:result.plan.nodes.some(n=>n.artisticFallback)});
  console.log(c.id+' '+result.plan.expression.recommendation+' '+result.analysis.entities.length);
 }
 for(let i=0;i<images.length;i+=6){const data=images.slice(i,i+6);const sheet=await b.evaluate(`(async()=>{const c=document.createElement('canvas');c.width=1440;c.height=1470;const x=c.getContext('2d');x.fillStyle='#f5f1e8';x.fillRect(0,0,c.width,c.height);for(const [j,v] of ${JSON.stringify(data)}.entries()){const img=new Image();img.src=v.png;await img.decode();const left=j%2*720,top=Math.floor(j/2)*490;x.fillStyle='#2b3c35';x.font='20px Microsoft YaHei';x.fillText(v.id+' '+v.poem.slice(0,28),left+12,top+27);x.drawImage(img,left+8,top+38,704,440);}return c.toDataURL();})()`);await writeFile(resolve(output,'sheet-'+(i/6+1)+'.png'),Buffer.from(sheet.split(',')[1],'base64'));}
 assert.deepEqual(b.posts,[]);assert.deepEqual(b.errors,[]);
 await writeFile(resolve(output,'results.json'),JSON.stringify({inputs:cases.length,providerCalls:0,postRequests:b.posts,render:'actual-browser',rows},null,2)+'\n');
 console.log('rendered '+rows.length+'; zero POST requests');
}finally{if(b)await b.close();await new Promise(r=>server.close(r));}
