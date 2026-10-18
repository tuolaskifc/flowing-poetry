// Check provenance, actual source files/licenses and saved upstream hashes.
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'..');
const sandbox={window:{}};vm.createContext(sandbox);
const html=await readFile(resolve(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script defer src="([^"]+)"/g)].map(m=>m[1]).filter(p=>p.startsWith('drawing/'));
for(const script of scripts)vm.runInContext(await readFile(resolve(root,script),'utf8'),sandbox,{filename:script});
const definitions=sandbox.window.PoemDrawing.definitions(),sources=sandbox.window.PoemDrawingSources;
if(definitions.length!==7)throw new Error('Expected seven independently registered tools');
for(const tool of definitions)for(const key of tool.sources){
  const source=sources[key];if(!source)throw new Error(`Source missing: ${key}`);
  if(source.kind==='adapted'&&(!source.url||!source.license||!source.licenseFile||!source.originals.length))throw new Error(`Incomplete attribution: ${key}`);
  for(const file of [...source.originals,...(source.licenseFile?[source.licenseFile]:[])])await stat(resolve(root,file));
}
let originalFilesChecked=0;
for(const [path,key] of [['sources/manifest.json','files'],['code-research/source-manifest.json','originalFiles']]){
  const manifest=JSON.parse(await readFile(resolve(root,path),'utf8'));
  for(const item of manifest[key]){
    const bytes=await readFile(resolve(dirname(resolve(root,path)),item.file));
    if(createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw new Error(`Changed upstream original: ${item.file}`);
    originalFilesChecked++;
  }
}
const report={status:'passed',tools:definitions,sources,originalFilesChecked,scope:'元数据、许可文件、来源原件及 SHA-256；不判断文学解释或画面审美。'};
await writeFile(resolve(dir,'tool-manifest.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,tools:definitions.length,sources:Object.keys(sources).length,originalFilesChecked}));
