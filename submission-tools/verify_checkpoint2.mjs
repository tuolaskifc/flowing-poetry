// Verify a packaged checkout without real credentials or external model requests.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const project=resolve(process.argv[2]),out=resolve(process.argv[3]);
const {createPoemServer}=await import(pathToFileURL(join(project,'experiments/poem-generation/server.mjs')).href);
const require=createRequire(import.meta.url);
const {chromium}=require(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const server=createPoemServer({port:0});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
  const status=await(await fetch(origin+'/api/status')).json();
  assert.equal(status.configured,false,'Packaged copy must not contain real credentials');
  const latest=await(await fetch(origin+'/api/latest?mode=expression')).json();
  assert(latest.record?.validation?.valid,'Saved expression must replay without a key');
  const empty=await fetch(origin+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({poem:''})});
  assert.equal(empty.status,400);
  const emptyBody=await empty.json();assert.match(emptyBody.error,/1–200/);
  const invalid=await fetch(origin+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});
  assert.equal(invalid.status,400);
  assert.equal((await fetch(origin+'/llm%20api.txt')).status,403);
  assert.equal((await fetch(origin+'/.git/config')).status,403);
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  const pageErrors=[],posts=[],blocked=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
  await page.route('**/*',route=>{
    const url=route.request().url();
    if(url.startsWith(origin)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();
    blocked.push(new URL(url).hostname);return route.abort();
  });
  await page.goto(origin+'/poem-flow/expression.html?latest=1',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.getElementById('seed-label')?.textContent.includes('画法种子'),null,{timeout:30000});
  await page.waitForTimeout(300);
  if(await page.locator('#pause').getAttribute('aria-pressed')!=='true')await page.locator('#pause').click();
  await page.waitForTimeout(100);
  const first=await page.locator('#art').evaluate(c=>c.toDataURL());
  await page.waitForTimeout(180);
  const second=await page.locator('#art').evaluate(c=>c.toDataURL());
  assert.equal(first,second,'Pause must freeze the visible composite');
  await page.screenshot({path:join(out,'本次无密钥回放.png'),fullPage:true});
  const downloadPromise=page.waitForEvent('download');await page.locator('#save').click();
  const download=await downloadPromise;await download.saveAs(join(out,'本次PNG导出.png'));
  const png=await readFile(join(out,'本次PNG导出.png'));assert(png.length>1000);assert.equal(png.subarray(1,4).toString(),'PNG');
  const title=await page.locator('#poem-title').textContent();
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:join(out,'本次窄屏回放.png'),fullPage:true});
  assert.equal(pageErrors.length,0,pageErrors.join('\n'));
  assert.equal(posts.length,0,'Browser replay must not submit a new generation request');
  const result={executor:'Codex',realCredentials:false,modelCalls:0,browserGenerationPOSTs:posts.length,
    savedExpressionReplayed:title,pausePixelStable:true,pngExportBytes:png.length,narrowViewport:390,
    horizontalOverflow:false,emptyInputStatus:empty.status,invalidJSONStatus:invalid.status,
    credentialAndGitHTTPStatus:403,pageErrors,blockedExternalHosts:[...new Set(blocked)]};
  await writeFile(join(out,'离线浏览器复核.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
}finally{
  await browser?.close();
  await new Promise(r=>server.close(r));
}
