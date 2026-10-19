/* Renders generated progress data. No network calls or model interpretation. */
(() => {
  'use strict';
  if(location.protocol==='http:'&&location.port!=='4185')document.getElementById('poem-home').href='/';
  const {items,summary,tools,sources}=window.PoemProgress,toolMap=new Map(tools.map(t=>[t.id,t]));
  const search=document.getElementById('search'),stage=document.getElementById('stage'),context=document.getElementById('context');
  const add=(tag,text,parent,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;parent.append(el);return el;};
  for(const [key,value] of Object.entries(summary.stages)){
    const card=add('div',undefined,document.getElementById('summary'),'stat '+key);
    add('strong',String(value.count),card);add('span',value.label,card);
  }
  const foot=add('p',`${summary.total} 项意象 · ${summary.tools} 类绘画工具 · ${summary.needs_context} 项需语境确认`,document.getElementById('summary'),'totals');
  function render(){
    const query=search.value.trim().toLocaleLowerCase();
    const visible=items.filter(item=>(stage.value==='all'||item.progress.stage===stage.value)&&(context.value!=='required'||item.progress.needs_context)&&(!query||[item.imagery,item.progress.available,item.progress.remaining,item.note].join(' ').toLocaleLowerCase().includes(query)));
    const body=document.getElementById('rows');body.replaceChildren();
    for(const item of visible){
      const pr=item.progress,row=add('tr',undefined,body);row.dataset.imagery=item.imagery;row.dataset.stage=pr.stage;
      const name=add('th',undefined,row);name.scope='row';add('strong',item.imagery,name);add('small',item.count.toLocaleString('zh-CN'),name);
      const status=add('td',undefined,row);add('span',pr.label,status,'badge '+pr.stage);if(pr.needs_context)add('small','需语境确认',status,'context-note');
      add('td',pr.available,row);const remaining=add('td',pr.remaining,row);if(pr.needs_context)add('small',item.note,remaining,'context-note');
      const links=add('td',undefined,row);
      if(!pr.tools.length)add('span',pr.stage==='handoff'?'见目录处理规则':'暂无专用试画',links,'muted');
      for(const id of pr.tools){
        const tool=toolMap.get(id),a=add('a',tool.name+' ↗',links,'drawing-link');a.href='index.html?'+new URLSearchParams({tool:id,...pr.presets?.[id]})+'#'+id;
      }
      if(pr.tools.length){
        const details=add('details',undefined,links,'source-details');add('summary','来源与改动',details);
        for(const id of pr.tools){const tool=toolMap.get(id),credit=add('p',tool.name+'：'+tool.sources.map(s=>sources[s].author+(sources[s].license?' · '+sources[s].license:'')).join('；'),details);const record=add('a','查看记录 ↗',credit);record.href=tool.reference.startsWith('ref-')?'drawing/README.md':tool.reference;}
      }
    }
    document.getElementById('result-count').textContent=`显示 ${visible.length} / ${items.length} 项`;
    document.getElementById('empty').hidden=visible.length>0;
  }
  for(const el of [search,stage,context])el.addEventListener(el===search?'input':'change',render);
  document.getElementById('clear').addEventListener('click',()=>{search.value='';stage.value='all';context.value='all';render();});
  const used=new Set(items.flatMap(i=>i.progress.tools)),extra=document.getElementById('extra-tools');
  for(const tool of tools.filter(t=>!used.has(t.id))){const a=add('a',tool.name+' ↗',extra);a.href='index.html#'+tool.id;extra.append('　');}
  render();
  window.PoemProgressView=Object.freeze({inspect:()=>({total:items.length,visible:document.querySelectorAll('#rows tr').length,summary})});
})();
