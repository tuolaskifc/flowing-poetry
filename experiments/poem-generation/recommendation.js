// Local, deliberately coarse screening. No model requests or saved poem pool.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./imagery-lexicon.js'));else root.PoemRecommendation=factory(root.PoemImageryLexicon);})(globalThis,lexicon=>{
  'use strict';
  const tokens=new Map();
  for(const rule of lexicon.rules)for(const word of rule.words)if(!tokens.has(word))tokens.set(word,{word,tool:rule.tool});
  for(const word of lexicon.rules.flatMap(r=>r.exclude||[]))if(!tokens.has(word))tokens.set(word,{word,blocked:true});
  for(const word of [...lexicon.unsupportedTerms,'燕京','岁月','光阴','风光','风情','风流','风骨','石头城'])tokens.set(word,{word,blocked:true});
  // These compounds name a supported tool rather than their first character.
  tokens.set('梅雨',{word:'梅雨',tool:'rain'});tokens.set('兰舟',{word:'兰舟',tool:'boat'});
  tokens.set('风',{word:'风',effect:true});
  const words=[...tokens.values()].sort((a,b)=>b.word.length-a.word.length);
  function scorePoem(poem){
    const hits=[],blocked=[],tools=new Set();let wind=false;
    for(let index=0;index<poem.length;){
      const month=poem.slice(index).match(/^(?:[正一二三四五六七八九十冬腊闰]+|\d{1,2})月/);
      if(month){blocked.push(month[0]);index+=month[0].length;continue;}
      const token=words.find(t=>poem.startsWith(t.word,index));
      if(!token){index++;continue;}
      if(token.blocked)blocked.push(token.word);
      else if(token.effect)wind=true;
      else {hits.push({word:token.word,tool:token.tool,index});tools.add(token.tool);}
      index+=token.word.length;
    }
    const count=tools.size;
    // Reward different drawable families, cap the benefit of crowded verses.
    const score=count?Math.min(count,4)*10+(count>=2?4:0)+(wind?1:0)-Math.min(new Set(blocked).size,4)*2:0;
    return {hits,toolCount:count,wind,blocked:[...new Set(blocked)],score};
  }
  function rankCandidates(candidates){
    const unique=new Map();
    for(const c of candidates){if(typeof c.poem!=='string'||!c.poem.trim()||[...c.poem].length>200)continue;const poem=c.poem.trim(),key=poem.replace(/[\s，。！？、；：,.!?;:「」“”‘’]/g,'');if(!unique.has(key))unique.set(key,{poem,source:c.source,selection:scorePoem(poem)});}
    return [...unique.values()].sort((a,b)=>b.selection.score-a.selection.score);
  }
  function normalize(result){
    if(result?.status!=='success'||typeof result.data?.content!=='string')throw new Error('今日诗词没有返回可用诗句。');
    if(!result.data.content.trim()||[...result.data.content].length>200)throw new Error('本次诗句不在 1–200 字范围内。');
    const origin=result.data.origin||{},source={provider:'今日诗词'};
    for(const key of ['author','title','dynasty'])if(typeof origin[key]==='string')source[key]=origin[key].slice(0,120);
    return {poem:result.data.content,source};
  }
  async function collectCandidates(load,{limit=5,intervalMs=1000,timeoutMs=8000,budgetMs=25000,onProgress=()=>{},wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
    const candidates=[],started=Date.now();let attempts=0,error=null;
    const cap=Math.min(5,Math.max(1,Math.floor(limit)||5));
    for(let i=0;i<cap;i++){
      const remaining=budgetMs-(Date.now()-started);if(remaining<=0){error='本轮取句已到等待上限。';break;}
      attempts++;onProgress({attempts,limit:cap});let timer;
      try{
        const result=await Promise.race([Promise.resolve().then(load),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('今日诗词取句超时。')),Math.min(timeoutMs,remaining));})]);
        candidates.push(normalize(result));
      }catch(e){error=e.message||'今日诗词暂时连接不上。';break;}
      finally{clearTimeout(timer);}
      if(i<cap-1){if(Date.now()-started+intervalMs>=budgetMs)break;await wait(intervalMs);}
    }
    const ranked=rankCandidates(candidates);
    return {attempts,received:candidates.length,duplicates:candidates.length-ranked.length,candidates:ranked,error};
  }
  return Object.freeze({scorePoem,rankCandidates,collectCandidates});
});
