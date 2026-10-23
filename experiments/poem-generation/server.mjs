import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {dirname,resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGenerationService} from './service.mjs';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../..');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const assets=new Set(['index.html','app.js','scene.js','styles.css','imagery-lexicon.js','recommendation.js','curated-library.js','curated-poems.json','generalization-cases.json']);
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
export function createPoemServer({port=4186,service=createGenerationService()}={}){
const server=createServer(async(req,res)=>{
  try{
    const localPort=server.address()?.port??port,url=new URL(req.url,'http://127.0.0.1:'+localPort),origin='http://'+req.headers.host;
    if(!['127.0.0.1:'+localPort,'localhost:'+localPort].includes(req.headers.host)){json(res,403,{error:'仅供本机预览。'});return;}
    if(url.pathname==='/api/status'&&req.method==='GET'){json(res,200,{configured:await service.configured()});return;}
    if(url.pathname==='/api/latest'&&req.method==='GET'){json(res,200,{record:await service.latest()});return;}
    if(url.pathname==='/api/analyze'&&req.method==='POST'){
      if(req.headers.origin&&req.headers.origin!==origin){json(res,403,{error:'请从本地生成页面提交。'});return;}
      if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'请求格式不正确。'});return;}
      const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>12000){json(res,413,{error:'输入过长。'});return;}chunks.push(chunk);}const body=Buffer.concat(chunks).toString('utf8');
      let input;try{input=JSON.parse(body);}catch{json(res,400,{error:'输入不是有效 JSON。'});return;}
      const record=await service.analyze(input);json(res,record.validation?.valid?200:422,{record});return;
    }
    if(req.method!=='GET'){json(res,405,{error:'不支持该操作。'});return;}
    if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
    const path=decodeURIComponent(url.pathname),file=path==='/'?resolve(root,'poem-flow/index.html'):resolve(root,'.'+path);
    const mainAssets=['index.html','scene-review.html','expressive-review.html','generalization-review.html','organization-review.html','semantic-review.html','color-motion-review.html','landscape-review.html','landscape-studies.json','architecture.html','architecture.svg','main.css','library.html','library.js','library.css','legacy.html','styles.css','app.js','scene.js','vendor/p5.min.js','vendor/p5-LICENSE.txt','THIRD_PARTY.md'].map(p=>resolve(root,'poem-flow',p));
    const library=resolve(root,'experiments/imagery-library');
    const libraryAssets=['index.html','app.js','style.css','studies.js','catalog.js','README.md','progress.html','progress-data.js','progress.js','progress.css','progress-records.json','boid-adapter.js'].map(p=>resolve(library,p));
    const allowed=(file.startsWith(dir+sep)&&assets.has(file.slice(dir.length+1)))||file.startsWith(resolve(library,'drawing')+sep)&&['.js','.md'].includes(extname(file))||libraryAssets.includes(file)||mainAssets.includes(file)||(['scene','expressive','generalization','organization','semantics','color-motion','landscape'].some(folder=>file.startsWith(resolve(root,'poem-flow/verification',folder)+sep))&&extname(file)==='.png');
    if(!allowed){res.writeHead(403);res.end('Forbidden');return;}
    if(!(await stat(file)).isFile())throw new Error('not found');
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(await readFile(file));
  }catch(error){if(req.url?.startsWith('/api/'))json(res,error.status||500,{error:error.message});else{res.writeHead(404);res.end('Not found');}}
});
return server;
}
const port=Number(process.env.POEM_GENERATION_PORT||4186);
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
const server=createPoemServer({port});
server.on('error',()=>{console.error('生成预览服务未能启动，请检查端口。');process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log('诗句生成试验：http://127.0.0.1:'+port));
}
