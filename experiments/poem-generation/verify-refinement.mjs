import{readFile,writeFile}from'node:fs/promises';
import{resolve}from'node:path';
import{createHash}from'node:crypto';
import assert from'node:assert/strict';
import{createPoemServer}from'./server.mjs';
import{openBrowser,wait}from'./browser-qa.mjs';
const out=resolve('poem-flow/verification/refinement'),data=JSON.parse(await readFile('poem-flow/refinement-studies.json','utf8')),before=JSON.parse(await readFile(resolve(out,'before.json'),'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const only=process.argv.find(s=>s.startsWith('--case='))?.slice(7);let previous={rows:[]};if(only)previous=JSON.parse(await readFile(resolve(out,'verification.json'),'utf8'));
const server=createPoemServer({port:0});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,b=await openBrowser(resolve('experiments/poem-generation/.qa/refinement-'+Date.now())),rows=only?previous.rows.filter(r=>r.id!==only):[];
try{
 await b.send('Page.navigate',{url:base+'/poem-flow/expression.html?refine=b035'});await b.until(`window.expressionExperiment?.inspect().ready&&!document.getElementById('generate').disabled`);
 for(const c of data.cases.filter(c=>!only||c.id===only)){
  await b.evaluate(`window.expressionStudy.show(${JSON.stringify(c.record)})`);await b.evaluate('window.expressionExperiment.pause(true);window.PoemTrialScene.pause(true)');await wait(100);
  const initial=await b.evaluate('window.PoemTrialScene.inspect().placements');
  for(const mode of['balanced','scenery','abstract']){
   await b.evaluate(`document.getElementById('expression-mode').value='${mode}';document.getElementById('expression-mode').dispatchEvent(new Event('change'));window.expressionExperiment.pause(true);window.PoemTrialScene.pause(true)`);await wait(110);
   const result=await b.evaluate(`(()=>{const e=window.expressionExperiment;e.at(8);const c=document.getElementById('art'),s=e.inspect();return{png:c.toDataURL(),palette:s.palette,marks:s.expression.marks,nodes:s.nodes.map(n=>({id:n.id,at:n.at})),placements:window.PoemTrialScene.inspect().placements,instances:window.PoemTrialScene.inspect().instances.map(i=>({tool:i.tool,id:i.id,layer:i.layer,at:i.placement.at})),sources:window.PoemTrialScene.inspect().layers};})()`);
   assert(result.nodes.every(n=>n.at.every(Number.isFinite)));assert.deepEqual(result.placements,initial);const png=Buffer.from(result.png.split(',')[1],'base64'),file=c.id+'-'+mode+'-after.png';await writeFile(resolve(out,file),png);const{png:ignored,...info}=result;rows.push({id:c.id,mode,file,sha256:hash(png),...info});
  }console.log('Compared '+c.id);
 }
 for(const[name,expected]of Object.entries(before.hashes))assert.equal(hash(await readFile(resolve(out,name.replace('.png','-before.png')))),expected);
 for(const[file,expected]of Object.entries(before.sourceHashes))assert.equal(hash(await readFile(file)),expected);
 assert.deepEqual(b.errors,[]);assert.deepEqual(b.posts,[]);
 await writeFile(resolve(out,'verification.json'),JSON.stringify({scope:data.scope,modelCalls:0,rows,sourceFilesUnchanged:Object.keys(before.sourceHashes).length,oldImagesUnchanged:Object.keys(before.hashes).length,browserErrors:b.errors,networkPosts:b.posts,aestheticAcceptance:'pending-user'},null,2)+'\n');console.log('Verified '+rows.length+' after images; no model requests');
}finally{await b.close();await new Promise(r=>server.close(r));}
