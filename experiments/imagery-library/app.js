(() => {
  'use strict';
  const shared={wind:.35,density:.45,palette:'clear'};
  const params=new URLSearchParams(location.search);
  let seed=Number(params.get('seed')||42)>>>0,paused=false;
  const controllers=[];
  const studies=document.getElementById('studies');
  for(const [index,d] of window.PoemStudies.definitions.entries()) {
    const card=document.createElement('article');card.className='study';card.id=d.id;
    card.innerHTML=`<div class="canvas-host" aria-label="${d.name}的动态试画" role="img"></div><div class="study-body"><div class="study-heading"><h3>${d.name}</h3><span class="study-index">0${index+1}</span></div><p>${d.subtitle}</p><p>${d.note}</p><p class="credit">${d.credit}</p><div class="study-actions"><a href="#ref-${d.id}">比较社区候选 ↗</a><button type="button" aria-label="保存${d.name}的当前画面">保存这一刻</button></div></div>`;
    studies.append(card);
    const controller=window.PoemStudies.mount(d.id,card.querySelector('.canvas-host'),shared,seed+index*97);
    controllers.push(controller);card.querySelector('button').addEventListener('click',()=>controller.save());
  }
  for(const key of ['wind','density']) {
    document.getElementById(key).addEventListener('input',event=>{
      shared[key]=Number(event.target.value)/100;document.getElementById(`${key}-value`).value=`${event.target.value}%`;
      controllers.forEach(c=>c.refresh());
    });
  }
  document.getElementById('palette').addEventListener('change',e=>{shared.palette=e.target.value;controllers.forEach(c=>c.refresh());});
  document.getElementById('pause').addEventListener('click',e=>{
    paused=!paused;controllers.forEach(c=>c.pause(paused));e.target.textContent=paused?'继续':'暂停';e.target.setAttribute('aria-pressed',String(paused));
  });
  document.getElementById('reseed').addEventListener('click',()=>{
    seed=(seed+1)>>>0;controllers.forEach((c,i)=>c.reset(seed+i*97));document.getElementById('live-status').textContent='已换一组形态。';
  });
  for(const [index,group] of window.ImageryCandidates.entries()) {
    const section=document.createElement('section');section.className='candidate-group';section.id=`ref-${window.PoemStudies.definitions[index].id}`;
    const heading=document.createElement('h3');heading.textContent=group.category;section.append(heading);
    const pair=document.createElement('div');pair.className='candidate-pair';
    for(const item of group.items) {
      const card=document.createElement('article');card.className='candidate';
      const a=document.createElement('a');a.href=`https://openprocessing.org/sketch/${item.id}`;a.target='_blank';a.rel='noopener noreferrer';a.textContent=item.title+' ↗';card.append(a);
      for(const [text,cls] of [[item.author,'author'],[item.note,'note'],[item.license,'license']]) {const p=document.createElement('p');p.className=cls;p.textContent=text;card.append(p);}
      pair.append(card);
    }section.append(pair);document.getElementById('candidate-list').append(section);
  }
  // Read-only hook for browser smoke verification; no product-facing debug controls.
  window.imageryExperiment={inspect:()=>controllers.map(c=>c.inspect()),settings:()=>({...shared})};
})();
