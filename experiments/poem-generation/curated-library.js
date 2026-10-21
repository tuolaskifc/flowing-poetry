// Editorial records are deliberately separate from model interpretation.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PoemCuratedLibrary=factory();})(globalThis,()=>{
  function validate(catalog){
    if(!catalog||!Number.isInteger(catalog.version)||!Array.isArray(catalog.poems)||!catalog.poems.length)throw new Error('精选诗句库格式不正确。');
    const ids=new Set(),texts=new Set();
    for(const p of catalog.poems){
      if(!/^p\d{2,}$/.test(p.id)||ids.has(p.id)||texts.has(p.poem))throw new Error('精选诗句编号或原句重复。');
      for(const key of ['poem','author','title','dynasty','goal','baseline','review'])if(typeof p[key]!=='string'||!p[key].trim())throw new Error('精选诗句缺少 '+key);
      if([...p.poem].length>200||typeof p.focus!=='boolean')throw new Error('精选诗句长度或重点标记不正确。');
      for(const key of ['imagery','available_tools','gaps'])if(!Array.isArray(p[key])||p[key].some(v=>typeof v!=='string'||!v.trim()))throw new Error('精选诗句列表不正确：'+key);
      if(!p.source||!/^https:\/\//.test(p.source.url)||!/^\d{4}-\d{2}-\d{2}$/.test(p.source.verified_on))throw new Error('精选诗句缺少可追溯出处。');
      ids.add(p.id);texts.add(p.poem);
    }
    return catalog;
  }
  function ordered(catalog){return [...catalog.poems].sort((a,b)=>Number(b.focus)-Number(a.focus));}
  function find(catalog,id){return catalog?.poems.find(p=>p.id===id)||null;}
  function next(catalog,currentPoem){const list=ordered(catalog),index=list.findIndex(p=>p.poem===currentPoem);return list[(index+1)%list.length];}
  function sourceFor(poem){return {provider:'精选诗句库',author:poem.author,title:poem.title,dynasty:poem.dynasty};}
  return Object.freeze({validate,ordered,find,next,sourceFor});
});
