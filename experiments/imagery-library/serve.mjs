import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.md':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png'};
const server=createServer(async(req,res)=>{
  try {
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(path==='/'){res.writeHead(302,{'Location':'/experiments/imagery-library/index.html'+new URL(req.url,'http://localhost').search});res.end();return;}
    if(path==='/favicon.ico'){res.writeHead(204);res.end();return;}
    const file=resolve(root,`.${path==='/'?'/experiments/imagery-library/index.html':path}`);
    // This preview only exposes the experiment and the already-vendored p5 file.
    const allowed=file.startsWith(resolve(root,'experiments/imagery-library')+sep)||file===resolve(root,'poem-flow/vendor/p5.min.js');
    if(!allowed){res.writeHead(403);res.end('Forbidden');return;}
    if(!(await stat(file)).isFile())throw new Error('not a file');
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
});
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
server.listen(4185,'127.0.0.1',()=>console.log('意象试画室：http://127.0.0.1:4185'));
