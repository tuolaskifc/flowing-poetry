// Record provenance for downloaded, actually-used source files. No network I/O.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const base='https://raw.githubusercontent.com/nature-of-code/noc-examples-p5.js-archived/master/';
const files=[
  ['noc-boid.js','chp06_agents/NOC_6_09_Flocking/boid.js'],
  ['noc-flock.js','chp06_agents/NOC_6_09_Flocking/flock.js'],
  ['noc-tree.js','chp08_fractals/NOC_8_06_Tree/sketch.js'],
  ['noc-wave.js','chp03_oscillation/NOC_3_09_wave/sketch.js'],
  ['NOC-LICENSE.txt','LICENSE']
];
const records=await Promise.all(files.map(async([file,path])=>{
  const bytes=await readFile(resolve(dir,'sources',file));
  return {file,url:base+path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),license:'MIT'};
}));
await writeFile(resolve(dir,'sources/manifest.json'),JSON.stringify({retrievedOn:'2026-10-18',author:'Daniel Shiffman / The Nature of Code',files:records},null,2)+'\n');
await writeFile(resolve(dir,'sources/access-log.json'),JSON.stringify({checkedOn:'2026-10-18',directRequests:[{url:'https://openprocessing.org/sketch/2225948',observedTitle:'Validating Connection — OpenProcessing',completeSourceObtained:false},{url:'https://openprocessing.org/@u288685/2041849',observedTitle:'Validating Connection — OpenProcessing',completeSourceObtained:false}],indexedSources:'Search results provided descriptions, account paths, visible license labels, and in a few cases incomplete code. These do not establish current runtime or privacy status.',candidateInventory:'../catalog.js',actualLocalCodeSources:'manifest.json',opCodeImported:false},null,2)+'\n');
console.log(`Recorded ${records.length} original files; OpenProcessing code imported: false.`);
