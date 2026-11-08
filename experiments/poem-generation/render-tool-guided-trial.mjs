import {readFile,writeFile,mkdir} from 'node:fs/promises';import {resolve} from 'node:path';import assert from 'node:assert/strict';
import {createPoemServer} from './server.mjs';import {openBrowser,wait} from './browser-qa.mjs';import {buildExpressionPlan} from './expression-plan.mjs';import {constrainRecoveredPlan} from './generation-recovery.mjs';import {buildGuidedTrial} from './tool-guided-plan.mjs';
const out=resolve('output/tool-guidance-2026-11-08/drawing-trial');await mkdir(out,{recursive:true});
const server=createPoemServer({port:0});await new Promise(r=>server.listen(0,'127.0.0.1',r));let b;
try{b=await openBrowser(resolve('experiments/poem-generation/.qa/guided-'+Date.now()));await b.send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/poem-flow/expression.html'});await b.until('window.expressionExperiment?.inspect().ready&&!document.getElementById("generate").disabled');const rows=[];
for(const id of ['n02','n03','n04','n05','n06']){
 const {record}=JSON.parse(await readFile(resolve('output/unfamiliar-2026-11-08',id+'.json'),'utf8'));const path=['n03','n04','n05'].includes(id)?'revision/':'';const advice=JSON.parse(await readFile(resolve('output/tool-guidance-2026-11-08',path+id+'.json'),'utf8')).advice;
 const trial=buildGuidedTrial(record,advice),base=constrainRecoveredPlan(buildExpressionPlan(record.effectiveAnalysis||record.analysis),record.recovery),images=[];
 for(const [label,plan] of [['baseline',base],['guided',trial.plan]]){
  const r={...record,plan,delivery:{status:plan.expression.gaps.length?'partial':'complete',message:'试验画面'}};
  await b.evaluate(`window.expressionStudy.show(${JSON.stringify(r)},null)`);await b.evaluate('window.expressionExperiment.pause(true);if(window.PoemTrialScene.inspect().ready)window.PoemTrialScene.pause(true);window.expressionExperiment.at(8)');await wait(150);
  const png=await b.evaluate('document.getElementById("art").toDataURL("image/png")');await writeFile(resolve(out,id+'-'+label+'.png'),Buffer.from(png.split(',')[1],'base64'));images.push(png);
 }
 rows.push({id,poem:record.poem,audit:trial.audit,excluded:trial.excluded,gaps:trial.plan.expression.gaps,baseline:base.concretePlan?.layers.map(l=>({names:l.names,tool:l.tool})),guided:trial.plan.concretePlan?.layers.map(l=>({names:l.names,tool:l.tool}))});
 const pair=await b.evaluate(`(async()=>{const c=document.createElement('canvas');c.width=1440;c.height=490;const x=c.getContext('2d');x.fillStyle='#f5f1e8';x.fillRect(0,0,c.width,c.height);for(const [i,url]of ${JSON.stringify(images)}.entries()){const im=new Image();im.src=url;await im.decode();x.fillStyle='#283d38';x.font='20px Microsoft YaHei';x.fillText(i?'采用经检查的建议':'现行共用规则',i*720+12,27);x.drawImage(im,i*720+8,38,704,440);}return c.toDataURL();})()`);await writeFile(resolve(out,id+'-comparison.png'),Buffer.from(pair.split(',')[1],'base64'));console.log(id+' '+JSON.stringify(trial.audit.map(x=>x.status)));
}
assert.deepEqual(b.posts,[]);assert.deepEqual(b.errors,[]);await writeFile(resolve(out,'audit.json'),JSON.stringify({providerCalls:0,rows},null,2)+'\n');
}finally{if(b)await b.close();await new Promise(r=>server.close(r));}
