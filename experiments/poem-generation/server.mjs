import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {dirname,resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGenerationService} from './service.mjs';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../..'),port=Number(process.env.POEM_GENERATION_PORT||4186),service=createGenerationService();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.png':'image/png'};
const assets=new Set(['index.html','app.js','scene.js','styles.css']);
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1:'+port),origin='http://'+req.headers.host;
    if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)){json(res,403,{error:'仅供本机预览。'});return;}
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
    const path=decodeURIComponent(url.pathname),file=path==='/'?resolve(dir,'index.html'):resolve(root,'.'+path);
    const allowed=(file.startsWith(dir+sep)&&assets.has(file.slice(dir.length+1)))||file.startsWith(resolve(root,'experiments/imagery-library/drawing')+sep)&&['.js'].includes(extname(file))||file===resolve(root,'experiments/imagery-library/boid-adapter.js')||file===resolve(root,'poem-flow/vendor/p5.min.js');
    if(!allowed){res.writeHead(403);res.end('Forbidden');return;}
    if(!(await stat(file)).isFile())throw new Error('not found');
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(await readFile(file));
  }catch(error){if(req.url?.startsWith('/api/'))json(res,error.status||500,{error:error.message});else{res.writeHead(404);res.end('Not found');}}
});
server.on('error',()=>{console.error('生成预览服务未能启动，请检查端口。');process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log('诗句生成试验：http://127.0.0.1:'+port));
