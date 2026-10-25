import{readFile,writeFile}from'node:fs/promises';
import{resolve}from'node:path';
import{openBrowser}from'./browser-qa.mjs';
const out=resolve('poem-flow/verification/batch'),d=JSON.parse(await readFile(resolve(out,'after.json'),'utf8')),b=await openBrowser(resolve('experiments/poem-generation/.qa/batch-sheets-'+Date.now()));
try{for(const mode of ['balanced','scenery']){
 const images=[];for(const c of d.cases){if(c.record?.plan.renderability?.status==='unavailable')continue;try{const bytes=await readFile(resolve(out,c.id+'-'+mode+'.png'));images.push({id:c.id,poem:c.poem,png:'data:image/png;base64,'+bytes.toString('base64')});}catch{}}
 for(let i=0;i<images.length;i+=8){const chunk=images.slice(i,i+8);const uri=await b.evaluate(`(async()=>{const c=document.createElement('canvas');c.width=1440;c.height=2000;const x=c.getContext('2d');x.fillStyle='#eeeae1';x.fillRect(0,0,1440,2000);for(const[i,v]of ${JSON.stringify(chunk)}.entries()){const im=new Image();im.src=v.png;await im.decode();const a=i%2*720,y=Math.floor(i/2)*500;x.fillStyle='#283d38';x.font='18px Microsoft YaHei';x.fillText(v.id+' '+v.poem.slice(0,34),a+12,y+27);x.drawImage(im,a+8,y+40,704,440);}return c.toDataURL();})()`);await writeFile(resolve(out,'contact-'+mode+'-'+String(i/8+1).padStart(2,'0')+'.png'),Buffer.from(uri.split(',')[1],'base64'));}console.log(mode+': '+images.length);
}}finally{await b.close();}
