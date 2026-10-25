// Local fallback for old answers without scene.supports. No synthetic semantic
// claims are inserted: only explicit same-clause singing/perching cues are used.
export function bindSourceDependencies(a,plan){
 if(!plan||!a.entities)return plan;
 plan.notes??=[];
 const clauses=a.poem.split(/[，。；！？\n]/);
 const slash=String.fromCharCode(92),escape=s=>[...s].map(c=>'.*+?^$()[]{}|'.includes(c)||c===slash?slash+c:c).join('');
 const mentions=l=>a.entities.filter(e=>l.entities.includes(e.id)).flatMap(e=>e.mentions);
 const alongside=(l,c)=>mentions(l).some(m=>c.includes(m));
 for(const child of plan.layers.filter(l=>['weapon','flag'].includes(l.tool))){
  const people=plan.layers.filter(l=>l.tool==='figure'),houses=plan.layers.filter(l=>['dwelling','building'].includes(l.tool));
  const ownClauses=clauses.filter(c=>alongside(child,c));
  const held=child.tool==='weapon'&&child.options.kind==='sword'&&child.instances.length===1&&ownClauses.some(c=>!/莫|勿|未|不|岂/.test(c)&&mentions(child).some(m=>new RegExp('(?:提|持|仗|执|携)(?:着|起|一柄|一把)?'+escape(m)).test(c)));
  const localPeople=people.filter(l=>ownClauses.some(c=>alongside(l,c))),primary=people.filter(l=>a.scene?.groups?.some(g=>g.role==='subject'&&g.members.some(id=>l.entities.includes(id))));
  const person=localPeople.length===1?localPeople[0]:!localPeople.length&&primary.length===1?primary[0]:!localPeople.length&&people.length===1?people[0]:null;
  const localHouses=houses.filter(l=>ownClauses.some(c=>alongside(l,c)));
  const sign=mentions(child).some(m=>/酒旗|酒招|招幌|酒幌/.test(m))||ownClauses.some(c=>/挂|掛|悬|懸|檐|墙/.test(c));
  const parent=held?person:child.tool==='flag'&&sign&&localHouses.length===1?localHouses[0]:null;if(!parent)continue;
  if(child.tool==='flag'&&child.instances.length>parent.instances.length*2)continue;
  const anchor=held?[320,286]:[310,310];
  for(const [i,v]of child.instances.entries()){
   const p=parent.instances[i%parent.instances.length],at=p.placement.at,scale=p.placement.scale,row=Math.floor(i/parent.instances.length);
   v.placement={anchor,at:[at[0]+(held?.021:row%2?-.12:.08)*scale,at[1]-(held?.045:.16)*scale],scale:scale*(held?.7:.72)};
   v.attachment={target:parent.entities[0],instance:p.id,anchor:held?'hand':'roof',basis:'source-bound-local-choice'};
  }
  child.placement=structuredClone(child.instances[0].placement);child.placement.at=child.instances.reduce((p,v)=>p.map((x,j)=>x+v.placement.at[j]/child.instances.length),[0,0]);child.z=(parent.z??12)+3;
  if(child.instances.length===1)child.attachment=structuredClone(child.instances[0].attachment);else delete child.attachment;
  child.grounding=false;plan.notes.push(held?'明确提持线索的剑意依附已有主体的手边，不新添持剑者。':'招帘与已有市集屋舍共用屋侧锚点，不凭旗幡另补人物。');
 }
 for(const bird of plan.layers.filter(l=>['bird','oriole'].includes(l.tool)&&!l.semanticSupport)){
  if(bird.semanticAction?.modality==='asserted'&&!['unclear','still'].includes(bird.semanticAction.state))continue;
  const entities=a.entities.filter(e=>bird.entities.includes(e.id));
  const clause=clauses.find(c=>entities.some(e=>e.mentions.some(m=>c.includes(m)))&&/鸣|啭|栖|宿|(?:叶底|叶下).*声/.test(c)&&!/飞|翔|掠/.test(c));if(!clause)continue;
  const parent=plan.layers.find(l=>['tree','willow','bamboo'].includes(l.tool)&&l.entities.some(id=>a.entities.find(e=>e.id===id)?.mentions.some(m=>clause.includes(m))));if(!parent)continue;
  const p=parent.instances[Math.floor(parent.instances.length/2)];
  for(const [i,v]of bird.instances.entries()){
   v.placement.at=[p.placement.at[0]+(i-(bird.instances.length-1)/2)*.055,p.placement.at[1]-.31*p.placement.scale];v.placement.scale=Math.max(v.placement.scale,.55);
  }
  bird.placement.at=bird.instances.reduce((p,v)=>p.map((x,j)=>x+v.placement.at[j]/bird.instances.length),[0,0]);
  bird.options.pose=bird.tool==='bird'?'resting':'folded';if(bird.tool==='oriole')bird.options.motion='still';delete bird.motion;
  const behind=a.spatial?.some(r=>r.modality==='asserted'&&r.type==='behind'&&bird.entities.includes(r.source)&&parent.entities.includes(r.target));
  bird.z=(parent.z??10)+(behind?-1:2);bird.attachment={target:parent.entities[0],instance:p.id,anchor:'canopy',basis:'source-bound-local-choice'};
  bird.localSupport={source:clause,target:parent.entities[0],basis:'source-bound-local-choice'};
  plan.notes.push('鸣、啭或栖宿与同句已提取树木相连：鸟借树冠落点；这是本地依托选择，没有补写模型依托或确定鸟数。');
 }
 return plan;
}
