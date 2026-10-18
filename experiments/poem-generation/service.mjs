import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {validateContract,schema} from '../poem-semantics/contract-v3/validate.mjs';
import {buildPlan,policyVersion} from './planner.mjs';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../..');
export function parseCredentials(text){
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));
  const named=Object.fromEntries(lines.filter(s=>/^LLM_[A-Z_]+=/.test(s)).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1).replace(/^(['"])(.*)\1$/,'$2')];}));
  const base=named.LLM_BASE_URL??lines[0],key=(named.LLM_API_KEY??lines[1]??'').replace(/^Bearer\s+/i,''),model=named.LLM_MODEL??lines[2];
  if(!base||!key||!model)throw new Error('本地接口配置不完整。');
  const url=new URL(base);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('接口地址必须为无内嵌认证的 HTTPS 地址。');
  let path=url.pathname.replace(/\/$/,'');if(!path.endsWith('/chat/completions'))path+=path.endsWith('/v1')?'/chat/completions':'/v1/chat/completions';url.pathname=path;
  return {endpoint:url.href,key,model};
}
export function createGenerationService({fetcher=fetch,credentialsPath=resolve(root,'llm api.txt'),runsDir=resolve(dir,'runs')}={}){
  let busy=false;
  const promptFile=resolve(dir,'../poem-semantics/contract-v3/system-prompt.txt');
  async function configured(){try{parseCredentials(await readFile(credentialsPath,'utf8'));return true;}catch{return false;}}
  async function latest(){
    let names;try{names=await readdir(runsDir);}catch{return null;}
    for(const name of names.sort().reverse())try{const r=JSON.parse(await readFile(resolve(runsDir,name,'result.json'),'utf8'));if(r.validation?.valid)return {...r,plan:buildPlan(r.analysis),cached:true};}catch{}
    return null;
  }
  async function analyze(input){
    if(typeof input?.poem!=='string'||!input.poem.trim()||[...input.poem].length>200){const e=new Error('请输入 1–200 字的诗句。');e.status=400;throw e;}
    if(busy){const e=new Error('上一条诗句仍在分析，请稍候。');e.status=429;throw e;}
    busy=true;let key='';
    try{
      const config=parseCredentials(await readFile(credentialsPath,'utf8'));key=config.key;
      const mode=input.mode==='full'?'full':'imagery-only';
      const requestSchema=structuredClone(schema);
      if(mode==='imagery-only')requestSchema.properties.relations.maxItems=0;
      const poem=input.poem,prompt=(await readFile(promptFile,'utf8'))+(mode==='imagery-only'?'\n\n【本次任务范围：基础意象通路】\n本次只检验 entities 到现有绘画库的连接，尚未请求完整关系抽取。relations 必须为 []，不得输出任何关系项。动作和属性只在 reading 中简述。其余字段仍按协议 3.0 填写。不要把人物想象成在场；保留 presence 与 role 的不确定性。':'\n\n【本轮通路自检补充】\n提交前检查每条关系引用。grows_from、carries、located_in、compared_to 等双对象关系必须给出两个已有实体的 id，不能有 null；缺少第二个实体就不输出该关系。状态或属性可留在 reading 中，不要虚构生长或承载动作。怀念不是观察，observes 只用于实际观看。relations 可以为空数组。');
      const fingerprint=createHash('sha256').update(JSON.stringify({poem,prompt,schema:requestSchema,model:config.model,endpoint:config.endpoint,policyVersion})).digest('hex');
      const last=await latest();if(last?.fingerprint===fingerprint)return last;
      const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8),folder=resolve(runsDir,runId);await mkdir(folder,{recursive:true});
      const redact=text=>String(text).split(key).join('[REDACTED]').replace(/\bsk-[a-zA-Z0-9_-]+/g,'[REDACTED]');
      const save=(name,value)=>writeFile(resolve(folder,name),redact(typeof value==='string'?value:JSON.stringify(value,null,2)+'\n'),'utf8');
      const request={model:config.model,temperature:.2,max_tokens:4096,stream:false,thinking:{type:'disabled'},response_format:{type:'json_object'},messages:[{role:'system',content:prompt+'\n\nJSON Schema:\n'+JSON.stringify(requestSchema)},{role:'user',content:JSON.stringify({poem})}]};
      const source=input.source&&typeof input.source==='object'?Object.fromEntries(['provider','author','title','dynasty'].filter(k=>typeof input.source[k]==='string').map(k=>[k,input.source[k].slice(0,120)])):null;
      const record={id:runId,fingerprint,poem,source,mode,model:config.model,started_at:new Date().toISOString(),cached:false};
      await save('request.json',request);await save('prompt.txt',prompt);await save('schema.json',requestSchema);
      const start=Date.now();
      try{
        const response=await fetcher(config.endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(90000),headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(request)});
        record.http_status=response.status;
        if(!response.ok)throw new Error('诗句分析接口返回 HTTP '+response.status+'，本次没有生成画面。');
        const data=await response.json(),text=data.choices?.[0]?.message?.content;
        record.model=data.model??config.model;record.usage=data.usage??null;record.finish_reason=data.choices?.[0]?.finish_reason??null;
        if(typeof text!=='string'||!text.trim())throw new Error('接口没有返回最终文本。');
        await save('response.txt',text);
        try{record.analysis=JSON.parse(text);}catch{throw new Error('接口回答不是有效 JSON，原始回答已保留，没有自动改写。');}
        record.validation=validateContract(record.analysis,poem);
        if(mode==='imagery-only'&&record.analysis.relations?.length){record.validation.valid=false;record.validation.errors.push('基础意象模式要求 relations=[]。');}
        if(record.finish_reason!=='stop'){record.validation.valid=false;record.validation.errors.push('回答未正常结束。');}
        if(record.validation.valid)record.plan=buildPlan(record.analysis);
      }catch(error){record.error=redact(error.message);record.validation={valid:false,errors:[record.error],warnings:[],review_required:true};}
      record.elapsed_seconds=Math.round((Date.now()-start)/100)/10;await save('result.json',record);
      return record;
    }catch(error){const e=new Error(key?String(error.message).split(key).join('[REDACTED]'):error.code==='ENOENT'?'未找到本地分析接口配置。':error.message);e.status=error.status??500;throw e;}
    finally{busy=false;}
  }
  return {configured,analyze,latest};
}
