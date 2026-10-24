import test from 'node:test';
import assert from 'node:assert/strict';
import {get} from 'node:http';
import {createPoemServer} from './server.mjs';

test('one local origin serves main, drawing and progress while keeping backend and records private',async()=>{
  let calls=0;
  const server=createPoemServer({port:0,service:{configured:async()=>true,latest:async()=>null,analyze:async()=>{calls++;return {validation:{valid:true}};}}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  try{
    const page=await fetch(origin);assert.equal(page.status,200);assert.match(await page.text(),/id="generate"/);
    assert.equal((await fetch(origin+'/poem-flow/organization-review.html')).status,200);
    assert.equal((await fetch(origin+'/poem-flow/color-motion-review.html')).status,200);
    assert.equal((await fetch(origin+'/poem-flow/verification/color-motion/mineral.png')).status,200);
    assert.equal((await fetch(origin+'/poem-flow/verification/color-motion/verification.json')).status,403);
    assert.equal((await fetch(origin+'/poem-flow/landscape-review.html')).status,200);
    for(const path of ['/poem-flow/abstract.html','/poem-flow/abstract.css','/poem-flow/abstract-app.js','/poem-flow/abstract-studies.json','/poem-flow/abstract-review.html','/poem-flow/abstract-extension-review.html','/experiments/poem-generation/abstract-scene.js','/poem-flow/verification/abstract/a03-0.png','/poem-flow/verification/abstract/a03-extension-0.png'])assert.equal((await fetch(origin+path)).status,200,path);
    for(const path of ['/poem-flow/verification/abstract/a01-record.json','/poem-flow/verification/abstract/a01-request.json','/poem-flow/verification/abstract/a01-response.txt','/poem-flow/verification/abstract/a05-record.json','/poem-flow/verification/abstract/extension-capture.json','/experiments/poem-generation/abstract-contract.mjs'])assert.equal((await fetch(origin+path)).status,403,path);
    for(const path of ['/poem-flow/expression.html','/poem-flow/expression-app.js','/poem-flow/expression-studies.json','/poem-flow/expression-review.html','/experiments/poem-generation/expression-layout.js','/poem-flow/verification/expression/u01-scenery.png'])assert.equal((await fetch(origin+path)).status,200,path);
    for(const path of ['/experiments/poem-generation/expression-contract.mjs','/poem-flow/verification/expression/u01-record.json','/poem-flow/verification/expression/u01-request.json','/poem-flow/verification/expression/capture.json'])assert.equal((await fetch(origin+path)).status,403,path);
    for(const path of ['/poem-flow/expanse-review.html','/experiments/poem-generation/gesture-field.js','/poem-flow/verification/expanse/u02-wide.png'])assert.equal((await fetch(origin+path)).status,200,path);
    for(const path of ['/poem-flow/verification/expanse/verification.json','/poem-flow/verification/expanse/baseline.json','/poem-flow/verification/expanse/prior-expression-review.html'])assert.equal((await fetch(origin+path)).status,403,path);
    const studies=await fetch(origin+'/poem-flow/landscape-studies.json');assert.equal(studies.status,200);const replay=await studies.json();assert.equal(replay.cases.length,5);assert.equal(replay.modelCalls,0);
    assert.equal((await fetch(origin+'/poem-flow/verification/landscape/s02-0.png')).status,200);
    assert.equal((await fetch(origin+'/poem-flow/verification/landscape/verification.json')).status,403);
    for(const path of ['/poem-flow/verification/organization/n01-record.json','/poem-flow/verification/organization/n01-plan.json','/poem-flow/verification/organization/live-capture.json'])assert.equal((await fetch(origin+path)).status,403,path);
    for(const path of ['/poem-flow/main.css','/poem-flow/library.html','/poem-flow/library.js','/poem-flow/library.css','/experiments/poem-generation/curated-poems.json','/experiments/poem-generation/generalization-cases.json','/experiments/poem-generation/curated-library.js','/experiments/poem-generation/app.js','/experiments/poem-generation/imagery-lexicon.js','/experiments/poem-generation/recommendation.js','/experiments/imagery-library/progress.html','/experiments/imagery-library/progress-data.js','/experiments/imagery-library/style.css','/experiments/imagery-library/drawing/tools/oriole.js'])assert.equal((await fetch(origin+path)).status,200,path);
    for(const path of ['/llm%20api.txt','/.git/config','/experiments/poem-generation/service.mjs','/experiments/poem-generation/runs/test/result.json','/poem-flow/tools/serve.mjs','/poem-flow/verification/scene/live-p01-record.json','/poem-flow/verification/expressive/live-p06-record.json','/poem-flow/verification/scene/test.js','/poem-flow/verification/generalization/g01-record.json','/poem-flow/verification/generalization/capture.json'])assert.equal((await fetch(origin+path)).status,403,path);
    assert.equal((await fetch(origin+'/api/status')).status,200);
    const post=(body,headers={})=>fetch(origin+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json',...headers},body});
    assert.equal((await post('{}',{Origin:'https://example.invalid'})).status,403);
    assert.equal((await post('{}',{'Content-Type':'text/plain'})).status,415);
    assert.equal((await post('{')).status,400);
    assert.equal((await post('x'.repeat(12001))).status,413);
    assert.equal(calls,0);
    assert.equal((await post('{"poem":"月"}',{Origin:origin})).status,200);assert.equal(calls,1);
    const wrongHost=await new Promise((resolve,reject)=>{get(origin,{headers:{Host:'example.invalid'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject);});assert.equal(wrongHost,403);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
