// User-authorized pictorial abstraction. Preserve original entity semantics;
// only the local drawing representation changes, with an explicit note.
export function expressiveRule(entity,rule,poem=''){
  const mentions=entity.mentions.join(' '),text=mentions+' '+entity.concept;
  if(entity.kind==='person'&&entity.mentions.some(m=>/^(人|行人|游人|旅人|客|渔人|渔翁|渔父|钓翁|翁|老翁|蓑笠翁|僧|僧人|童子|牧童|樵夫)$/.test(m)))return {tool:'figure',options:{pose:/蓑笠|渔|钓/.test(mentions+' '+poem)?'fisher':'standing'},approximation:'只以淡墨衣形和头部笔点提示人物，不作肖像或服饰考据'};
  if(entity.mentions.some(m=>/^(桃花|杏花|桃树|杏树)$/.test(m))){
    const q=entity.quantity,branches=q?.scope==='part'&&q.unit==='枝'&&['exact','range'].includes(q.mode)?Math.max(1,Math.min(7,Math.round((q.min+q.max)/2))):7;
    if(q?.scope==='individual'&&q.unit==='朵')return {tool:'flower-forms',options:{kind:'plum'},approximation:'明确数朵时借用五瓣花冠，不把花朵数量当作整树数量'};
    return {tool:'tree',options:{form:'blossom',branches:String(branches)},approximation:'以一树疏花组织花枝；整株轮廓是本地写意借形，明确枝数只约束主花枝'};
  }
  if(entity.mentions.some(m=>/(舟|船)$/.test(m)))return {tool:'boat',approximation:'按舟船这个主体选择画法，材质或修饰词不另画成植物'};
  if(entity.mentions.some(m=>/酒$/.test(m)))return {tool:'wine',options:{form:'liquid'},approximation:'以酒液概括酒名，不把配料另画成花果'};
  if(entity.mentions.some(m=>/(寺|庙|禅房)$/.test(m)))return {tool:'dwelling',options:{kind:'temple'},approximation:'按寺院屋舍概括，不把名称里的天空或山另作主体'};
  if(!rule)return null;
  if(mentions.includes('杜鹃')&&!mentions.includes('杜鹃花')&&/花|植物|灌木/.test(entity.concept)&&!/[啼鸣鸟]/.test(entity.concept))return {tool:'flower',approximation:'杜鹃按花意借用通用花形'};
  if(rule.tool==='bird'){
    const clauses=poem.split(/[，。；！？]/).filter(c=>entity.mentions.some(m=>c.includes(m))),context=[...entity.evidence,mentions,...clauses].join(' '),aquatic=/鸭|鸳鸯/.test(text),flight=/飞|上青天|翔|掠|归鸟/.test(context),resting=/栖|宿|停|不飞|未飞|未翔/.test(context);
    return {...rule,options:{pose:resting?'resting':aquatic&&!flight?'waterbird':'flying',tone:/白鹭|白鸟|白鸥|鹤/.test(text)||/鸟.{0,3}白|白.{0,3}鸟/.test(context)?'light':'ink',facing:'right'}};
  }
  return rule;
}
