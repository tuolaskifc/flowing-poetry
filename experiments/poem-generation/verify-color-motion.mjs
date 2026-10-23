// Browser verification with existing model answers. Zero new model calls.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {openBrowser,wait} from './browser-qa.mjs';
import {buildPlan} from './planner.mjs';
import {slowScene,fisherScene} from './composition-fixtures.mjs';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../..'),out=resolve(root,'poem-flow/verification/color-motion');await mkdir(out,{recursive:true});
const raw=JSON.parse(await readFile(resolve(root,'poem-flow/verification/semantics/s02-record.json'),'utf8'));
const b=await openBrowser(resolve(dir,'.qa/color-motion-'+Date.now()));
try{
 await b.send('Emulation.setDeviceMetricsOverride',{width:1400,height:1000,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:'http://127.0.0.1:4173/'});await b.until(`window.PoemTrialScene&&!document.getElementById('generate').disabled`);
 const record={...raw,plan:buildPlan(raw.analysis),cached:true};
 await b.evaluate(`window.realFetch=window.fetch;window.fetch=(url,options)=>url==='/api/analyze'?Promise.resolve(new Response(JSON.stringify({record:${JSON.stringify(record)}}))):window.realFetch(url,options);document.getElementById('poem').value=${JSON.stringify(raw.poem)};document.getElementById('generate').click()`);
 await b.until(`!document.getElementById('generate').disabled&&window.PoemTrialScene.inspect().ready`);
 assert.equal(await b.evaluate(`document.querySelectorAll('#palette option').length`),22);assert.equal(await b.evaluate(`document.querySelectorAll('[data-palette]').length`),6);
 assert.equal(await b.evaluate(`Number(document.getElementById('motion').value)`),1.4);
 await b.evaluate(`document.getElementById('pause').click()`);await wait(150);
 const schemes=await b.evaluate('window.PoemDrawing.paletteOptions()'),signatures=[];
 for(const p of schemes){
  await b.evaluate(`document.getElementById('palette').value=${JSON.stringify(p.id)};document.getElementById('palette').dispatchEvent(new Event('change'))`);await wait(230);
  assert.equal(await b.evaluate('window.PoemTrialScene.inspect().settings.palette'),p.id);
  const signature=await b.evaluate(`(()=>{const c=document.getElementById('scene'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let hash=2166136261;for(let i=0;i<a.length;i+=67){hash^=a[i];hash=Math.imul(hash,16777619);}return hash>>>0;})()`);signatures.push({id:p.id,hash:signature});
 }
 assert.equal(new Set(signatures.map(s=>s.hash)).size,22,'palette changes must reach actual canvas pixels');
 const featured=['mineral','cinnabar','gilded','indigo','heroic','clear'],images=[];
 for(const id of featured){
  if(id==='heroic')await b.evaluate(`document.getElementById('palette').value='heroic';document.getElementById('palette').dispatchEvent(new Event('change'))`);
  else await b.evaluate(`document.querySelector('[data-palette="${id}"]').click()`);
  await wait(260);assert.equal(await b.evaluate('document.getElementById("palette").value'),id);
  const png=await b.evaluate(`document.getElementById('scene').toDataURL()`);await writeFile(resolve(out,id+'.png'),Buffer.from(png.split(',')[1],'base64'));images.push({id,label:schemes.find(p=>p.id===id).label,png});
 }
 const sheet=await b.evaluate(`(async()=>{const items=${JSON.stringify(images)},c=document.createElement('canvas');c.width=1280;c.height=1350;const ctx=c.getContext('2d');ctx.fillStyle='#f3efe6';ctx.fillRect(0,0,c.width,c.height);for(const [i,item] of items.entries()){const im=new Image();im.src=item.png;await im.decode();const x=(i%2)*640,y=Math.floor(i/2)*450;ctx.fillStyle='#344b43';ctx.font='22px Microsoft YaHei';ctx.fillText(item.label,x+18,y+32);ctx.drawImage(im,x+12,y+46,616,385);}return c.toDataURL();})()`);await writeFile(resolve(out,'palette-sheet.png'),Buffer.from(sheet.split(',')[1],'base64'));
 async function render(plan){await b.evaluate(`window.PoemTrialScene.render(${JSON.stringify(plan)})`);await b.until('window.PoemTrialScene.inspect().layers.every(l=>l.ticks>0)');}
 const clock=[];
 for(const intensity of [.5,1.8]){
  await render(buildPlan(slowScene()));await b.evaluate(`window.PoemTrialScene.update({motion:${intensity}})`);
  const before=await b.evaluate('window.PoemTrialScene.inspect()');await wait(800);const after=await b.evaluate('window.PoemTrialScene.inspect()');
  const bird=s=>s.layers.find(l=>l.id==='bird').time,point=s=>s.instances.find(e=>e.tool==='bird').placement.at;
  clock.push({intensity,toolDelta:bird(after)-bird(before),sceneDelta:after.elapsed-before.elapsed,birdPixels:Math.hypot((point(after)[0]-point(before)[0])*960,(point(after)[1]-point(before)[1])*600)});
 }
 assert(clock[1].toolDelta>clock[0].toolDelta*2.2);assert(clock[1].birdPixels>clock[0].birdPixels*2);
 // motion=0 freezes tool and compositor clocks, and all placements.
 await b.evaluate(`window.PoemTrialScene.update({motion:0})`);await wait(120);const zero=await b.evaluate('window.PoemTrialScene.inspect()');await wait(450);const zeroAfter=await b.evaluate('window.PoemTrialScene.inspect()');assert.equal(zero.elapsed,zeroAfter.elapsed);assert.deepEqual(zero.layers.map(l=>l.time),zeroAfter.layers.map(l=>l.time));assert.deepEqual(zero.instances,zeroAfter.instances);
 await b.evaluate('window.PoemTrialScene.update({motion:2});window.PoemTrialScene.pause(true)');await wait(120);const paused=await b.evaluate('window.PoemTrialScene.inspect()');await wait(400);const pausedAfter=await b.evaluate('window.PoemTrialScene.inspect()');assert.equal(paused.elapsed,pausedAfter.elapsed);assert.deepEqual(paused.layers.map(l=>l.time),pausedAfter.layers.map(l=>l.time));
 // A stationary figure moves only with its boat; plants and terrain never drift.
 const fisher=buildPlan(fisherScene());await render(fisher);const first=await b.evaluate('window.PoemTrialScene.inspect()');await wait(650);const next=await b.evaluate('window.PoemTrialScene.inspect()');
 const displacement=tool=>{const one=first.instances.find(e=>e.tool===tool).placement.at,two=next.instances.find(e=>e.tool===tool).placement.at;return two.map((n,i)=>n-one[i]);};assert(displacement('boat').every((v,i)=>Math.abs(v-displacement('figure')[i])<1e-8));assert(next.layers.find(l=>l.id==='figure').paused);
 const roots=buildPlan(raw.analysis);await render(roots);const roots1=await b.evaluate('window.PoemTrialScene.inspect().instances.filter(e=>["tree","landscape","rock"].includes(e.tool))');await wait(450);assert.deepEqual(roots1,await b.evaluate('window.PoemTrialScene.inspect().instances.filter(e=>["tree","landscape","rock"].includes(e.tool))'));
 const still=slowScene();still.scene.actions[1].state='still';still.scene.actions[1].direction='unspecified';await render(buildPlan(still));await b.evaluate('window.PoemTrialScene.update({motion:2})');const rest1=await b.evaluate('window.PoemTrialScene.inspect().instances.filter(e=>e.tool==="bird")');await wait(400);assert.deepEqual(rest1,await b.evaluate('window.PoemTrialScene.inspect().instances.filter(e=>e.tool==="bird")'));
 // Verify active water pixels change, and a pause really stops their changes.
 await render(roots);const waterImage=()=>b.evaluate(`document.querySelectorAll('#layer-hosts canvas')[window.PoemTrialScene.inspect().layers.findIndex(l=>l.id==='water')].toDataURL()`);const water1=await waterImage();await wait(550);assert.notEqual(water1,await waterImage());
 await b.evaluate('window.PoemTrialScene.pause(true)');await wait(100);const waterPaused=await waterImage();await wait(350);assert.equal(waterPaused,await waterImage());
 // Restore a vivid scene, then exercise the actual sliders and download control.
 await b.evaluate(`document.querySelector('[data-palette="mineral"]').click();document.getElementById('motion').value='1.8';document.getElementById('motion').dispatchEvent(new Event('input'));document.getElementById('wind').value='.6';document.getElementById('wind').dispatchEvent(new Event('input'));document.getElementById('scene').scrollIntoView({block:'start'})`);await wait(200);
 assert(await b.evaluate(`document.getElementById('motion-value').textContent.includes('180%')&&window.PoemTrialScene.inspect().settings.motion===1.8&&document.querySelector('[data-palette="mineral"]').getAttribute('aria-pressed')==='true'`));
 const png=await b.evaluate(`(()=>{let result;const old=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){result=this.href.startsWith('data:image/png;base64,');};try{document.getElementById('save').click();}finally{HTMLAnchorElement.prototype.click=old;}return result;})()`);assert(png);
 await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(r=>writeFile(resolve(out,'controls-desktop.png'),Buffer.from(r.data,'base64')));
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'),'mobile overflow');
 await b.evaluate(`document.getElementById('palette-swatches').scrollIntoView({block:'center'})`);await b.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}).then(r=>writeFile(resolve(out,'controls-mobile.png'),Buffer.from(r.data,'base64')));
 assert.deepEqual(b.errors,[]);assert.deepEqual(b.posts,[]);
 const report={modelCalls:0,realAnswerReplay:raw.id,paletteCount:schemes.length,palettePixels:signatures,clock,zeroMotion:true,pause:true,waterPixels:true,staticRoots:true,stationaryBird:true,boatFigureAttachment:true,pngExport:png,mobileWidth:390,browserErrors:b.errors,networkPosts:b.posts,aestheticAcceptance:'pending-user'};
 const cards=images.map(p=>`<figure><img src="verification/color-motion/${p.id}.png" alt="${p.label}山溪试色"><figcaption>${p.label}</figcaption></figure>`).join('');
 await writeFile(resolve(root,'poem-flow/color-motion-review.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>流动诗 · 色彩与动态</title><style>body{max-width:1320px;margin:auto;padding:24px;background:#f3efe6;color:#344b43;font:16px/1.8 system-ui}a{color:inherit}nav{display:flex;flex-wrap:wrap;gap:20px}.pictures{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}img{display:block;width:100%;height:auto}figcaption{padding:7px 0}.schemes{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:14px;margin:25px 0}.colors{display:flex;height:22px}.colors i{flex:1}@media(max-width:650px){body{padding:16px}.pictures{grid-template-columns:1fr}}</style><nav><a href="/">← 生成器</a><a href="semantic-review.html">语义贯通实测</a><a href="architecture.html">当前架构</a></nav><h1>色彩更放开，风景更流动</h1><p>同一份“明月松间照，清泉石上流”的真实语义回答，只切换配色。22 套可选方案包括原规划的 16 组、两组暮夜淡彩与四组鲜明山色。这是观看选择，尚未实现完整情感自动配色；夜景也可手动试暖色。</p><p>回到生成器，点击“回看上次结果”即可直接试色，不必再次请求模型。画面下方有六张快捷色卡和完整下拉菜单；动态程度默认 140%，可调 0–200%，风力另调。人物保留简洁写意，主要增强水纹、飞鸟与草木云雾的动态。已明确静止的主体保持静止。</p><div class="pictures">${cards}</div><h2>全部配色</h2><div class="schemes">${schemes.map(p=>`<div><div class="colors" aria-hidden="true">${Object.values(p.colors).map(c=>`<i style="background:${c}"></i>`).join('')}</div>${p.label}</div>`).join('')}</div><p>本轮没有新增模型调用。98 项本地检查，以及实际像素切色、动态时钟、暂停、固定落点、附着、导出和 390px 窄屏检查通过；画面效果仍待观看。</p></html>`);
 await b.send('Page.navigate',{url:'http://127.0.0.1:4173/poem-flow/color-motion-review.html'});await b.until('document.images.length===6&&Array.from(document.images).every(i=>i.complete&&i.naturalWidth===960)');assert(await b.evaluate('document.documentElement.scrollWidth<=innerWidth'),'gallery mobile overflow');
 await b.send('Page.navigate',{url:'http://127.0.0.1:4173/poem-flow/architecture.html'});await b.until('document.images.length===1&&document.images[0].complete&&document.images[0].naturalWidth===1280');
 const diagram=await b.evaluate(`(()=>{const c=document.createElement('canvas');c.width=1280;c.height=1280;c.getContext('2d').drawImage(document.images[0],0,0);return c.toDataURL();})()`);await writeFile(resolve(out,'architecture.png'),Buffer.from(diagram.split(',')[1],'base64'));
 assert.deepEqual(b.errors,[]);assert.deepEqual(b.posts,[]);report.galleryMobile=true;report.architecture=true;
 await writeFile(resolve(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await b.close();}
