(() => {
  'use strict';
  const $=id=>document.getElementById(id),names={moon:'月',water:'水',rock:'石',rain:'雨',willow:'柳',lotus:'莲花与荷叶',flower:'通用花',grass:'草与芦穗',bamboo:'竹',boat:'舟',snow:'雪',building:'楼',cloud:'云',tree:'树',dwelling:'房舍与寺院',bird:'鸟',figure:'淡墨人物',landscape:'地形与光色',orchid:'兰',horse:'马',oriole:'莺',mist:'薄烟雾',pavilion:'亭','plum-branch':'疏花枝','flower-forms':'花冠',wine:'酒液与器物',leaves:'叶','falling-petals':'落花',catkins:'飞絮','surface-weather':'露与霜局部'};
  const add=(tag,text,parent)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;parent.append(node);return node;};
  function link(text,href,parent,external=false){const a=add('a',text,parent);a.href=href;if(external){a.target='_blank';a.rel='noopener noreferrer';}return a;}
  fetch('/experiments/poem-generation/curated-poems.json').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{
    const catalog=window.PoemCuratedLibrary.validate(data),poems=window.PoemCuratedLibrary.ordered(catalog);
    $('summary').textContent=poems.length+' 组精选 · '+poems.filter(p=>p.focus).length+' 组首批改画 · '+poems.filter(p=>p.review==='已认可').length+' 组效果已认可';
    function render(){
      const query=$('search').value.trim(),scope=$('scope').value,review=$('review').value;
      const visible=poems.filter(p=>(scope!=='focus'||p.focus)&&(review==='all'||p.review===review)&&(!query||[p.poem,p.title,p.author,...p.imagery,p.goal,...p.gaps].join(' ').includes(query)));
      $('rows').replaceChildren();
      for(const p of visible){
        const row=add('tr',undefined,$('rows'));row.id=p.id;row.dataset.focus=String(p.focus);row.dataset.review=p.review;
        const title=add('th',undefined,row);title.scope='row';if(p.focus)add('span','首批改画',title).className='badge';add('p',p.poem,title).className='verse';add('p',p.dynasty+' · '+p.author+'《'+p.title+'》',title).className='muted';
        link('原句出处 ↗',p.source.url,title,true);const source=add('details',undefined,title);add('summary','版本与核对说明',source);add('p',p.source.note||'在线文本核对',source);add('small','核对日期：'+p.source.verified_on,source);
        add('td',p.imagery.join('、'),row);add('td',p.goal,row);
        const gaps=add('td',undefined,row);add('p',p.available_tools.length?'已有基础：'+p.available_tools.map(t=>names[t]||'待登记的绘画单元').join('、'):'目前缺少合适的场景画法',gaps);const list=add('ul',undefined,gaps);for(const gap of p.gaps)add('li',gap,list);
        const progress=add('td',undefined,row);add('strong',p.review,progress);add('p',p.baseline,progress);link('带入主网页 ↗','/?poem='+encodeURIComponent(p.id),progress).className='choose';
      }
      $('count').textContent='显示 '+visible.length+'／'+poems.length+' 组';$('empty').hidden=visible.length>0;
    }
    for(const id of ['search','scope','review'])$(id).addEventListener(id==='search'?'input':'change',render);
    $('clear').addEventListener('click',()=>{$('search').value='';$('scope').value='all';$('review').value='all';render();});render();
    const target=document.getElementById(location.hash.slice(1));if(target?.tagName==='TR')target.scrollIntoView({block:'start'});
  }).catch(()=>{$('summary').textContent='精选诗句库暂时无法载入，请通过本地服务打开或刷新重试。';});
})();
