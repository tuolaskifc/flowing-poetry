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
    for(const path of ['/poem-flow/main.css','/poem-flow/library.html','/poem-flow/library.js','/poem-flow/library.css','/experiments/poem-generation/curated-poems.json','/experiments/poem-generation/curated-library.js','/experiments/poem-generation/app.js','/experiments/poem-generation/imagery-lexicon.js','/experiments/poem-generation/recommendation.js','/experiments/imagery-library/progress.html','/experiments/imagery-library/progress-data.js','/experiments/imagery-library/style.css','/experiments/imagery-library/drawing/tools/oriole.js'])assert.equal((await fetch(origin+path)).status,200,path);
    for(const path of ['/llm%20api.txt','/.git/config','/experiments/poem-generation/service.mjs','/experiments/poem-generation/runs/test/result.json','/poem-flow/tools/serve.mjs','/poem-flow/verification/scene/live-p01-record.json','/poem-flow/verification/scene/test.js'])assert.equal((await fetch(origin+path)).status,403,path);
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
