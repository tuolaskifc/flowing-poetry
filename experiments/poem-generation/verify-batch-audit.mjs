// Replay the entire used-input inventory in an actual browser. No provider calls.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createPoemServer} from './server.mjs';
import {openBrowser,wait} from './browser-qa.mjs';
import {collectBatch,evaluateRecord} from './batch-audit.mjs';
const out=resolve('poem-flow/verification/batch'),data=JSON.parse(await readFile(resolve(out,'after.json'),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const server=createPoemServer({port:0});await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});const base='http://127.0.0.1:'+server.address().port;
let prior={versions:[]};if(process.argv.includes('--resume-history')||process.argv.includes('--patch'))try{prior=JSON.parse(await readFile(resolve(out,'render-verification.json'),'utf8'));}catch{}
const selected=process.argv.includes('--patch')?new Set(['b016','b027','b040','b051','b053','b054','b059','b066']):null;
const b=await openBrowser(resolve('experiments/poem-generation/.qa/batch-'+Date.now())),images=[],rows=selected?(prior.rows||[]).filter(v=>!selected.has(v.id)):[],versions=[];
const picture=async(record,mode)=>{
 const key=hash(JSON.stringify(record.plan));await b.evaluate(`(async()=>{if(window._auditRecordKey!==${JSON.stringify(key)}){await window.expressionStudy.show(${JSON.stringify(record)});window._auditRecordKey=${JSON.stringify(key)};}})()`);
 await b.evaluate(`window.expressionExperiment.pause(true);if(window.PoemTrialScene.inspect().ready)window.PoemTrialScene.pause(true);window.expressionExperiment.configure({expression:${JSON.stringify(mode)},expanse:.9});`);
 await wait(90);
 return b.evaluate(`(()=>{const e=window.expressionExperiment;e.at(8);const c=document.getElementById('art'),s=e.inspect(),native=window.PoemTrialScene.inspect(),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let changed=0;for(let i=0;i<d.length;i+=16)if(Math.abs(d[i]-d[0])+Math.abs(d[i+1]-d[1])+Math.abs(d[i+2]-d[2])>25)changed++;return {png:c.toDataURL(),width:c.width,height:c.height,geometry:s.geometryKey,palette:s.palette,nodes:s.nodes.map(n=>({id:n.id,at:n.at})),marks:s.expression.marks.length,placements:native.placements,nonuniform:changed/(d.length/16)};})()`);
};
try{
 await b.send('Page.navigate',{url:base+'/poem-flow/expression.html'});
 await b.until(`window.expressionExperiment?.inspect().ready&&!document.getElementById('generate').disabled`);
 const rendered=new Map();
 for(const c of data.cases.filter(c=>!selected||selected.has(c.id))){
  if(!c.record||c.record.plan.renderability?.status==='unavailable'){rows.push({id:c.id,blocked:true,reason:c.judgment});continue;}
  for(const mode of ['balanced','scenery','abstract']){
   const info=await picture(c.record,mode),file=c.id+'-'+mode+'.png',bytes=Buffer.from(info.png.split(',')[1],'base64');
   info.finiteGeometry=info.nodes.every(n=>n.at.every(Number.isFinite));info.sparseCanvas=info.nonuniform<=.003;
   await writeFile(resolve(out,file),bytes);const {png,...metrics}=info;rows.push({id:c.id,mode,file,sha256:hash(bytes),...metrics});if(mode==='balanced')images.push({id:c.id,poem:c.poem,png:info.png});
  }
  rendered.set(hash(JSON.stringify(c.record.plan)),true);console.log('rendered '+c.id);
 }
 // Replays every usable historical answer, including duplicates whose geometry changed.
 const inventory=await collectBatch();let n=0;
 for(const c of inventory.cases)for(const record of c.versions){
  const previous=prior.versions.find(v=>v.id===record.id),referenceChanged=(record.analysis?.entities||record.analysis?.subjects||[]).some(e=>e.role==='reference'&&e.presence==='unclear');if(previous&&!(selected&&referenceChanged)){versions.push({...previous,reusedPriorBrowserReplay:true});continue;}
  const result=evaluateRecord(record);
  if(!result.plan||result.plan.renderability?.status==='unavailable'){versions.push({id:record.id,status:result.status,blocked:true});continue;}
  const key=hash(JSON.stringify(result.plan));
  if(rendered.has(key)){versions.push({id:record.id,status:result.status,reusedGeometry:true});continue;}
  const info=await picture({id:record.id,poem:record.poem,analysis:result.analysis,plan:result.plan,validation:{valid:true},recovery:result.recovery},'balanced');
  info.finiteGeometry=info.nodes.every(v=>v.at.every(Number.isFinite));
  versions.push({id:record.id,status:result.status,nonuniform:info.nonuniform,palette:info.palette,geometry:info.geometry});rendered.set(key,true);
  if(++n%10===0)console.log('historical variants '+n);
 }
 // Contact sheets are visual-review artifacts; these metrics alone are not acceptance.
 for(let start=0;start<images.length;start+=8){
  const chunk=images.slice(start,start+8),sheet=await b.evaluate(`(async()=>{const c=document.createElement('canvas');c.width=1440;c.height=4*500;const x=c.getContext('2d');x.fillStyle='#eeeae1';x.fillRect(0,0,c.width,c.height);for(const [i,v]of ${JSON.stringify(chunk)}.entries()){const im=new Image();im.src=v.png;await im.decode();const a=i%2*720,y=Math.floor(i/2)*500;x.fillStyle='#283d38';x.font='18px Microsoft YaHei';x.fillText(v.id+' '+v.poem.slice(0,34),a+12,y+27);x.drawImage(im,a+8,y+40,704,440);}return c.toDataURL();})()`);
  const file='sheet-'+String(start/8+1).padStart(2,'0')+'.png';await writeFile(resolve(out,file),Buffer.from(sheet.split(',')[1],'base64'));
 }
 assert.deepEqual(b.errors,[]);assert.deepEqual(b.posts,[]);
 const baseline=JSON.parse(await readFile(resolve(out,'before.json'),'utf8')),unchanged=[];
 for(const [file,expected]of Object.entries({...baseline.hashes,...data.hashes})){assert.equal(hash(await readFile(file)),expected,'historic record changed: '+file);unchanged.push(file);}
 await writeFile(resolve(out,'render-verification.json'),JSON.stringify({rows,versions,sourceRecordsUnchanged:unchanged.length,browserErrors:b.errors,networkPosts:b.posts,renderModelCalls:0,scope:data.summary.scope,aestheticAcceptance:'pending-visual-review'},null,2)+'\n');
 console.log(JSON.stringify({images:rows.filter(v=>v.file).length,blocked:rows.filter(v=>v.blocked).length,versions:versions.length,uniqueGeometries:rendered.size,historicRecordsUnchanged:unchanged.length}));
}finally{await b.close();await new Promise(r=>server.close(r));}
