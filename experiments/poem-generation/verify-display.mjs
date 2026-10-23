// Native browser regressions: saved answers, actual default colors, real pointer input.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildPlan,policyVersion} from './planner.mjs';
import {loadLandscapeStudies} from './landscape-cases.mjs';
import {fisherScene} from './composition-fixtures.mjs';
import {openBrowser,wait} from './browser-qa.mjs';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../..'),out=resolve(root,'poem-flow/verification/composition');await mkdir(out,{recursive:true});
const data=JSON.parse(await readFile(resolve(dir,'display-cases.json'),'utf8'));
const latest=(await(await fetch('http://127.0.0.1:4173/api/latest')).json()).record;
if(latest)assert.deepEqual(latest.plan,buildPlan(latest.effectiveAnalysis||latest.analysis),'running backend must use the current planner');
const cases=data.cases.map(c=>({...c,plan:buildPlan(c.analysis)}));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const publicCases=cases.map(c=>({id:c.id,record:{id:c.rawRecord,poem:c.poem,source:c.source,mode:'composition',analysis:c.analysis,validation:{valid:true,review_required:c.sourceExpanded},sourceContext:c.sourceExpanded?{applied:true,reviewRequired:true}:undefined,cached:true,elapsed_seconds:'本地重放',plan:c.plan}}));
await writeFile(resolve(root,'poem-flow/composition-studies.json'),JSON.stringify({policyVersion,scope:data.scope,modelCalls:0,cases:publicCases},null,2)+'\n');
const cards=cases.map(c=>`<article id="${c.id}"><h2>${c.id} · ${esc(c.poem)}</h2><p>${c.sourceExpanded?'既有回答，引用范围曾展开，解读待复核。':'既有真实回答。'}本地重放；自动选择 ${esc(c.plan.settings.palette)}，未指定手动配色。</p><div class="pair"><figure><img src="verification/composition/${c.id}-before.png" alt="改前"><figcaption>改前：原保存画面规则</figcaption></figure><figure><a href="/?review=${c.id}"><img src="verification/composition/${c.id}-after.png" alt="改后"><figcaption>改后：默认生成效果 ↗ 动态与交互</figcaption></a></figure></div>${c.plan.compositions?.length?`<details><summary>同一份解读的 ${c.plan.compositions.length} 种空间布局</summary><div class="three">${c.plan.compositions.map((v,i)=>`<figure><a href="/?review=${c.id}&composition=${v.id}"><img src="verification/composition/${c.id}-variant-${i}.png" alt="${esc(v.label)}"><figcaption>${esc(v.label)}</figcaption></a></figure>`).join('')}</div></details>`:''}<p>${c.plan.layers.filter(l=>l.colorCue).map(l=>esc(l.names.join('／'))+'：'+esc(l.colorCue.evidence)+(l.colorCue.basis==='source-literal'?'（原文颜色线索）':'（本地颜色解释）')).join('；')}</p></article>`).join('');
await writeFile(resolve(root,'poem-flow/composition-review.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>流动诗 · 构图、光色与单体交互</title><style>body{max-width:1480px;margin:auto;padding:24px;background:#f3efe6;color:#344b43;font:15px/1.8 system-ui}a{color:inherit}h1{font-size:30px}h2{font-size:21px}nav{display:flex;gap:16px;flex-wrap:wrap}article{border-top:1px solid #ccd1c5;margin-top:30px;padding-top:18px}.pair,.three{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.three{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:16px}figure{margin:0}img{width:100%;display:block}figcaption{padding:6px 0}summary{cursor:pointer}p{color:#627267}@media(max-width:750px){body{padding:15px}.pair,.three{grid-template-columns:1fr}}</style><nav><a href="/">← 生成器</a><a href="landscape-review.html">此前五类风景</a></nav><h1>构图、光色与单体交互</h1><p>用刚才反馈中的十份真实回答重放，比较改前与当前默认效果。点击改后画面可直接拖动、切换构图；无需再次请求模型。鸟、船等默认单独移动，竹林成组；按住 Shift 可移动同层整组。</p><p>这是同批回归，不是新的 API 泛化试验。两份回答的引用范围曾展开，原始失败保留。几何检查通过仍需观看判断；“荷风”借荷叶提示来源、“花欲燃”用红色属于有说明的本地表达。</p><nav>${cases.map(c=>`<a href="#${c.id}">${c.id}</a>`).join('')}</nav>${cards}</html>`);
const b=await openBrowser(resolve(dir,'.qa/display-'+Date.now())),rows=[];
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1040,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:'http://127.0.0.1:4173/'});await b.until(`window.PoemTrialScene&&!document.getElementById('generate').disabled`);
 async function render(plan){
  await b.evaluate(`document.getElementById('output').hidden=false;window.PoemTrialScene.render(${JSON.stringify(plan)})`);await b.until('window.PoemTrialScene.inspect().layers.every(l=>l.ticks>0)');await b.evaluate('window.PoemTrialScene.pause(true)');await wait(70);
  const st=await b.evaluate('window.PoemTrialScene.inspect()');assert(st.ready&&st.layers.every(l=>l.finite!==false));return st;
 }
 async function save(file){const png=await b.evaluate(`document.getElementById('scene').toDataURL()`);await writeFile(resolve(out,file+'.png'),Buffer.from(png.split(',')[1],'base64'));}
 for(const c of cases){
  await render(c.previousPlan);await save(c.id+'-before');const state=await render(c.plan);await save(c.id+'-after');
  for(const [i,v] of (c.plan.compositions||[]).entries()){await render({...c.plan,...v});await save(c.id+'-variant-'+i);}
  rows.push({id:c.id,rawRecord:c.rawRecord,sourceExpanded:c.sourceExpanded,palette:c.plan.settings.palette,instances:state.instances.length,omitted:c.plan.omitted,geometryErrors:c.plan.scene.organization.audit.errors,displayErrors:c.plan.scene.displayAudit.errors});
 }
 async function dragInstance(id,dx,dy,{shift=false}={}){
  await b.evaluate(`document.getElementById('scene').scrollIntoView({block:'center'})`);
  const point=await b.evaluate(`(()=>{const st=window.PoemTrialScene.inspect(),e=st.instances.find(e=>e.id===${JSON.stringify(id)}),source=document.querySelectorAll('#layer-hosts canvas')[e.sourceIndex],ctx=source.getContext('2d'),box=document.getElementById('scene').getBoundingClientRect(),p=e.placement;for(let y=15;y<source.height-15;y+=2)for(let x=15;x<source.width-15;x+=2){if(ctx.getImageData(x,y,1,1).data[3]<85)continue;const px=p.at[0]*960+(x-p.anchor[0])*p.scale,py=p.at[1]*600+(y-p.anchor[1])*p.scale;if(px<8||px>952||py<8||py>592)continue;return {x:box.left+px*box.width/960,y:box.top+py*box.height/600};}throw new Error('No visible pixel: '+e.id);})()`);
  const modifiers=shift?8:0;
  await b.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1,modifiers});
  await b.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+dx,y:point.y+dy,button:'left',buttons:1,modifiers});
  await b.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x+dx,y:point.y+dy,button:'left',clickCount:1,modifiers});
  return await b.evaluate('window.PoemTrialScene.inspect()');
 }
 const birdCase=cases.find(c=>c.id==='r06');let state=await render(birdCase.plan),before=state.instances.filter(e=>e.tool==='bird');
 let after=(await dragInstance(before.at(-1).id,48,15)).instances.filter(e=>e.tool==='bird');
 const changed=(before,after)=>before.filter(a=>{const z=after.find(v=>v.id===a.id);return Math.hypot(...z.placement.at.map((v,i)=>v-a.placement.at[i]))>.005;});
 assert.equal(changed(before,after).length,1,'drag must move exactly one bird');
 await b.evaluate('window.PoemTrialScene.resetLayout()');assert.deepEqual((await b.evaluate('window.PoemTrialScene.inspect()')).instances.filter(e=>e.tool==='bird'),before);
 after=(await dragInstance(before.at(-1).id,40,10,{shift:true})).instances.filter(e=>e.tool==='bird');assert.equal(changed(before,after).length,before.length,'Shift moves group');
 const bambooCase=cases.find(c=>c.id==='r08');state=await render(bambooCase.plan);before=state.instances.filter(e=>e.tool==='bamboo');after=(await dragInstance(before.at(-1).id,30,6)).instances.filter(e=>e.tool==='bamboo');assert.equal(changed(before,after).length,before.length,'bamboo grove moves together');
 // An attached person follows the chosen boat; a second boat is independent.
 const fisher=buildPlan(fisherScene());state=await render(fisher);before=state.instances;const boat=before.find(e=>e.tool==='boat');after=(await dragInstance(boat.id,35,12)).instances;
 const delta=(tool,old=before,next=after)=>{const a=old.find(e=>e.tool===tool),z=next.find(e=>e.id===a.id);return z.placement.at.map((v,i)=>v-a.placement.at[i]);};
 assert(delta('boat')[0]>.02);assert(delta('boat').every((v,i)=>Math.abs(v-delta('figure')[i])<1e-8));
 const village=(await loadLandscapeStudies()).find(c=>c.id==='s05').record.plan;state=await render(village);before=state.instances;const smokeLayer=village.layers.find(l=>l.tool==='mist'&&l.attachment),house=before.find(e=>e.id===smokeLayer.attachment.instance);after=(await dragInstance(house.id,30,8)).instances;
 const houseBefore=before.find(e=>e.id===house.id),houseAfter=after.find(e=>e.id===house.id),dh=houseAfter.placement.at.map((v,i)=>v-houseBefore.placement.at[i]);assert(dh[0]>.015);assert(dh.every((v,i)=>Math.abs(v-delta('mist')[i])<1e-8));
 assert.equal(changed(before.filter(e=>e.tool==='dwelling'),after.filter(e=>e.tool==='dwelling')).length,1,'other houses remain still');
 await b.send('Page.navigate',{url:'http://127.0.0.1:4173/?review=r07'});await b.until(`window.PoemTrialScene?.inspect().ready&&!document.getElementById('generate').disabled`);assert.equal(await b.evaluate('window.PoemTrialScene.inspect().settings.palette'),'indigo');assert.equal(await b.evaluate('document.getElementById("composition").options.length'),3);
 await b.evaluate(`document.getElementById('palette').value='gilded';document.getElementById('palette').dispatchEvent(new Event('change'));document.getElementById('composition').selectedIndex=1;document.getElementById('composition').dispatchEvent(new Event('change'))`);await b.until(`!document.getElementById('composition').disabled`);assert.equal(await b.evaluate('window.PoemTrialScene.inspect().settings.palette'),'gilded');
 const t1=await b.evaluate('window.PoemTrialScene.inspect().elapsed');await wait(350);assert((await b.evaluate('window.PoemTrialScene.inspect().elapsed'))>t1);await b.evaluate('window.PoemTrialScene.pause(true)');const t2=await b.evaluate('window.PoemTrialScene.inspect().elapsed');await wait(150);assert.equal(await b.evaluate('window.PoemTrialScene.inspect().elapsed'),t2);
 assert(await b.evaluate(`(()=>{let saved=false;const old=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){saved=this.href.startsWith('data:image/png;base64,');};try{window.PoemTrialScene.save();}finally{HTMLAnchorElement.prototype.click=old;}return saved;})()`));
 await b.send('Page.navigate',{url:'http://127.0.0.1:4173/poem-flow/composition-review.html'});await b.until('document.images.length>=20&&Array.from(document.images).every(i=>i.complete&&i.naturalWidth===960)');
 await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(r=>writeFile(resolve(out,'review-desktop.png'),Buffer.from(r.data,'base64')));
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 await b.send('Page.navigate',{url:'http://127.0.0.1:4173/?review=r06'});await b.until(`window.PoemTrialScene?.inspect().ready&&!document.getElementById('generate').disabled`);assert(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));await b.evaluate(`document.getElementById('scene').scrollIntoView({block:'center'})`);
 await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(r=>writeFile(resolve(out,'main-mobile.png'),Buffer.from(r.data,'base64')));
 assert.deepEqual(b.errors,[]);assert.deepEqual(b.posts,[]);
 const hashes={};for(const file of ['planner.mjs','scene-integrity.mjs','world-layout.mjs','scene-organization.mjs','landscape-development.mjs','semantic-policy.mjs','scene.js','app.js','physical-mapping.mjs','expressive-mapping.mjs','../imagery-library/drawing/core.js'])hashes[file]=createHash('sha256').update(await readFile(resolve(dir,file))).digest('hex');
 const report={policyVersion,hashes,modelCalls:0,scope:data.scope,currentBackend:true,rows,individualBirdDrag:true,shiftGroupDrag:true,bambooGroupDrag:true,resetLayout:true,personFollowsBoat:true,smokeFollowsSpecificHouse:true,otherHousesStill:true,automaticNight:true,manualColorSurvivesSwitch:true,animation:true,pause:true,pngExport:true,mobileWidth:390,browserErrors:b.errors,networkPosts:b.posts,aestheticAcceptance:'pending-user'};
 await writeFile(resolve(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({cases:rows.length,...report,rows:undefined}));
}finally{await b.close();}
