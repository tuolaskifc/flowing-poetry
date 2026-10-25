import{readFile,writeFile}from'node:fs/promises';
import{resolve}from'node:path';
import{createHash}from'node:crypto';
import assert from'node:assert/strict';
import{createPoemServer}from'./server.mjs';
import{openBrowser,wait}from'./browser-qa.mjs';
const data=JSON.parse(await readFile('poem-flow/rule-studies.json','utf8')),out=resolve('poem-flow/verification/rules'),server=createPoemServer({port:0});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,b=await openBrowser(resolve('experiments/poem-generation/.qa/rules-'+Date.now())),rows=[],pictures=[];
try{
 await b.send('Page.navigate',{url:base+'/poem-flow/expression.html?rules=g01'});await b.until(`window.expressionExperiment?.inspect().ready&&!document.getElementById('generate').disabled`);assert.match(await b.evaluate(`document.getElementById('status').textContent`),/手工/);
 for(const c of data.cases){
  await b.evaluate(`window.expressionStudy.show(${JSON.stringify(c.record)})`);await b.evaluate(`window.expressionExperiment.pause(true);window.PoemTrialScene.pause(true)`);
  const initial=await b.evaluate('window.PoemTrialScene.inspect().placements');
  for(const mode of['scenery','balanced']){
   await b.evaluate(`document.getElementById('expression-mode').value='${mode}';document.getElementById('expression-mode').dispatchEvent(new Event('change'));window.expressionExperiment.pause(true);window.PoemTrialScene.pause(true)`);await wait(100);
   const info=await b.evaluate(`(()=>{window.expressionExperiment.at(8);return{png:document.getElementById('art').toDataURL(),placements:window.PoemTrialScene.inspect().placements,instances:window.PoemTrialScene.inspect().instances.map(v=>({id:v.id,tool:v.tool,at:v.placement.at})),marks:window.expressionExperiment.inspect().expression.marks};})()`);assert.deepEqual(info.placements,initial);assert(info.instances.every(v=>v.at.every(Number.isFinite)));
   const file=c.id+'-'+mode+'.png';await writeFile(resolve(out,file),Buffer.from(info.png.split(',')[1],'base64'));const{png,...metrics}=info;rows.push({id:c.id,mode,file,...metrics});if(mode==='balanced')pictures.push({id:c.id,poem:c.poem,png:info.png});
  }console.log('Policy calibration '+c.id);
 }
 for(let start=0;start<pictures.length;start+=6){const sheet=await b.evaluate(`(async()=>{const c=document.createElement('canvas');c.width=1440;c.height=1500;const x=c.getContext('2d');x.fillStyle='#f2f0e8';x.fillRect(0,0,c.width,c.height);for(const[i,v]of ${JSON.stringify(pictures.slice(start,start+6))}.entries()){const im=new Image();im.src=v.png;await im.decode();const a=i%2*720,y=Math.floor(i/2)*500;x.fillStyle='#304c48';x.font='19px Microsoft YaHei';x.fillText(v.id+' '+v.poem,a+12,y+28);x.drawImage(im,a+8,y+40,704,440);}return c.toDataURL();})()`);await writeFile(resolve(out,'sheet-'+(start/6+1)+'.png'),Buffer.from(sheet.split(',')[1],'base64'));}
 const old=JSON.parse(await readFile('poem-flow/verification/expanse/baseline.json')),accepted=JSON.parse(await readFile('experiments/poem-generation/accepted-baseline.json'));let frozen=0;
 for(const[file,h]of [...Object.entries(old.files),...accepted.images.map(v=>[v.path,v.sha256])]){assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),h);frozen++;}
 assert.deepEqual(b.errors,[]);assert.deepEqual(b.posts,[]);await writeFile(resolve(out,'verification.json'),JSON.stringify({scope:data.scope,providerCalls:0,images:rows.length,rows,browserErrors:b.errors,networkPosts:b.posts,frozenFilesUnchanged:frozen,aestheticAcceptance:'pending-user'},null,2)+'\n');console.log('Verified '+rows.length+' images and '+frozen+' frozen artifacts');
}finally{await b.close();await new Promise(r=>server.close(r));}
