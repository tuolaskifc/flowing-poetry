// Local visual policy. The model supplies semantics, never executable drawing code.
import {createHash} from 'node:crypto';
export const policyVersion='trial-3-surfaces-and-ying';
const rules=[
  {words:['柳絮'],tool:'catkins'},
  {words:['落花'],tool:'falling-petals'},
  {words:['菊花','黄华','菊'],tool:'flower-forms',options:{kind:'chrysanthemum'}},
  {words:['梅花','梅枝','寒梅','红梅','白梅','梅'],tool:'plum-branch',exclude:['梅子','梅雨']},
  {words:['酒杯','酒盏','杯中酒'],tool:'wine',options:{form:'cup'}},
  {words:['酒壶','酒坛'],tool:'wine',options:{form:'jar'}},
  {words:['酒液','清酒','浊酒','美酒','酒'],tool:'wine',options:{form:'liquid'},exclude:['饮酒','饮','劝酒','醉酒','沽酒','买酒']},
  {words:['楼阁','楼台','楼宇','楼'],tool:'building'},
  {words:['莲花','荷花','莲'],tool:'flower-forms',options:{kind:'lotus'}},
  {words:['红叶'],tool:'leaves',options:{color:'red'}},
  {words:['黄叶'],tool:'leaves',options:{color:'yellow'}},
  {words:['竹'],tool:'bamboo'}, {words:['柳'],tool:'willow',exclude:['柳絮','杨柳絮']},
  {words:['草'],tool:'grass'},
  {words:['露珠','露水','露'],tool:'surface-weather',options:{surface:'dew',carrier:'detail'},exclude:['露出','显露','露面','露宿']},
  {words:['霜'],tool:'surface-weather',options:{surface:'frost',carrier:'detail'}},
  {words:['黄莺','莺'],tool:'oriole',exclude:['夜莺']},
  {words:['雪'],tool:'snow',options:{state:'fall'}},
  {words:['明月','月亮','月'],tool:'moon'},
  {words:['烟雾','薄雾','雾'],tool:'mist'}, {words:['云'],tool:'cloud'},
  {words:['雨'],tool:'rain'}, {words:['江水','流水','清泉','泉水','水','泉','江','溪'],tool:'water'},
  {words:['舟','船'],tool:'boat'}, {words:['长亭','亭'],tool:'pavilion'},
  {words:['石','岩'],tool:'rock'}, {words:['鱼'],tool:'fish'},
  {words:['花'],tool:'flower',exclude:['桃花','兰花','杜鹃','杨花','桂花','槐花','梅子','菊花','莲花','荷花']}
];
const order=['moon','cloud','mist','building','willow','bamboo','pavilion','water','rock','boat','grass','plum-branch','flower','flower-forms','wine','leaves','surface-weather','fish','oriole','falling-petals','catkins','rain','snow'];
const placements={
  moon:{anchor:[320,175],at:[.76,.2],scale:.85},cloud:{anchor:[320,170],at:[.46,.2],scale:1.05},
  mist:{anchor:[320,190],at:[.5,.48],scale:1.4},water:{anchor:[320,130],at:[.5,.57],scale:1.5},
  rock:{anchor:[320,245],at:[.3,.78],scale:.95},boat:{anchor:[320,230],at:[.6,.72],scale:.95},
  willow:{anchor:[320,340],at:[.23,.88],scale:1},bamboo:{anchor:[320,335],at:[.24,.88],scale:1},
  grass:{anchor:[320,315],at:[.42,.92],scale:1},pavilion:{anchor:[320,280],at:[.73,.75],scale:.85},
  fish:{anchor:[320,195],at:[.55,.8],scale:.8},'flower-forms':{anchor:[320,188],at:[.42,.65],scale:.9},
  flower:{anchor:[320,320],at:[.4,.9],scale:.95},leaves:{anchor:[320,190],at:[.52,.54],scale:1.05},
  'falling-petals':{anchor:[320,190],at:[.5,.5],scale:1.3},catkins:{anchor:[320,190],at:[.5,.5],scale:1.3},
  rain:{anchor:[320,194],at:[.5,.5],scale:1.55},snow:{anchor:[320,194],at:[.5,.5],scale:1.55},
  building:{anchor:[320,320],at:[.76,.79],scale:.9},'plum-branch':{anchor:[120,302],at:[.12,.87],scale:1},wine:{anchor:[320,244],at:[.57,.87],scale:.75},
  'surface-weather':{anchor:[320,206],at:[.43,.76],scale:.9},oriole:{anchor:[320,200],at:[.64,.43],scale:.72}
};
export function buildPlan(analysis){
  const layers=[],omitted=[],notes=[],entityTools=new Map();let wind=0;
  for(const entity of analysis.entities){
    const name=entity.mentions.join('／');
    if(entity.role!=='scene'||entity.presence!=='present'){
      omitted.push({id:entity.id,name,reason:entity.role==='reference'?'仅为比喻参照，不当作实景':entity.presence==='absent'?'原文中缺席，不绘制':'出现情况不确定，暂不补画'});continue;
    }
    const localSurface=entity.kind==='place'&&entity.mentions.some(m=>/^(石上|石间|岩石|石头|水面|江面|亭中|船上|舟中|楼|楼阁|楼台|楼宇|楼中|楼上|楼前)$/.test(m));
    if(entity.kind==='abstract'||entity.kind==='person'||entity.kind==='place'&&!localSurface){
      omitted.push({id:entity.id,name,reason:'暂未提供该人物、地点或抽象含义的绘画单元'});continue;
    }
    // Prefer exact source mentions. Concepts may normalize inflected mentions,
    // but a specific unsupported organism never falls through to a generic one.
    const text=entity.mentions.join(' ')+' '+entity.concept;
    if(/风/.test(text)&&entity.kind==='environment'){
      const denied=analysis.relations.some(r=>r.source===entity.id&&['negated','conditional','possible','unclear'].includes(r.modality));
      if(!denied)wind=.45;
      notes.push(denied?`${name}的作用未被确认，暂不启用风。`:`${name}作为风参数，不额外画风线；强弱是本次试画选择。`);continue;
    }
    const specificUnsupported=/(松柏|松树|松林|松间|松|柏|梧桐|芭蕉|桃花|兰花|兰草|杜鹃|杨花|梅子|燕|雁|鸦|夜莺|鸳鸯|沙鸥|青鸟|鹧鸪|桂花)/.test(text);
    const findRule=value=>rules.find(r=>r.words.some(word=>value.includes(word))&&!r.exclude?.some(word=>value.includes(word)));
    const rule=specificUnsupported?null:findRule(entity.mentions.join(' '))||findRule(text);
    if(!rule){omitted.push({id:entity.id,name,reason:'该具体意象尚无可用形态；没有替换成通用树、花或鸟群'});continue;}
    const options={...rule.options};
    if(rule.tool==='oriole'){
      const evidence=[...entity.mentions,...entity.evidence].join(' ');
      const sound=/莺[声啼鸣歌]|[听闻].{0,6}莺/.test(evidence)||/(?:只|但|惟)闻.{0,8}莺/.test(analysis.poem);
      const sight=/(?:见|看|望).{0,6}莺/.test(evidence);
      if(sound&&!sight){omitted.push({id:entity.id,name,reason:'目前只有莺声或听闻线索，暂不补出可见鸟体'});continue;}
      const birdRelations=analysis.relations.filter(r=>r.source===entity.id&&['moves','moves_toward','moves_away'].includes(r.type));
      const denied=birdRelations.some(r=>r.modality!=='asserted');
      const flying=!denied&&(/飞|翔|掠/.test(entity.mentions.join(' '))||birdRelations.some(r=>r.modality==='asserted'&&r.evidence.some(e=>/飞|翔|掠/.test(e))));
      options.pose=flying?'spread':'folded';options.motion=flying?'flap':'still';
    }
    if(rule.tool==='wine'){
      // A normalized concept must not invent a container absent from mentions.
      const mentions=entity.mentions.join(' ');
      const explicitCup=/酒杯|酒盏|杯中酒/.test(mentions),explicitJar=/酒壶|酒坛/.test(mentions);
      if(!explicitCup&&!explicitJar&&/饮酒|饮|劝酒|醉酒|沽酒|买酒/.test(mentions)){
        omitted.push({id:entity.id,name,reason:'这是饮酒或相关活动线索，未据此补出杯、壶或人物'});continue;
      }
      options.form=explicitCup?'cup':explicitJar?'jar':'liquid';
    }
    if(localSurface)notes.push(`${name}以明确提到的物体轮廓试画，不表示已实现其上的承载或流动关系。`);
    if(rule.tool==='moon'){
      options.shape=/圆月|满月|月满/.test(text)?'full':/半月/.test(text)?'half':'crescent';
      if(!/圆月|满月|月满|半月|弯月|新月|残月|月牙/.test(text))notes.push('原句未明确月形，暂用弯月试画；可以手动切换。');
    }
    if(rule.tool==='snow'&&/积雪|雪地|覆雪/.test(text))options.state='settled';
    const freeze=analysis.relations.some(r=>r.source===entity.id&&['moves','moves_toward','moves_away','changes','disappears'].includes(r.type)&&r.modality!=='asserted');
    const key=rule.tool+JSON.stringify(options),existing=layers.find(l=>l.key===key);
    if(existing){existing.entities.push(entity.id);existing.names.push(name);if(freeze)existing.animate=false;}
    else layers.push({key,tool:rule.tool,entities:[entity.id],names:[name],options,animate:!freeze,placement:placements[rule.tool]});
    entityTools.set(entity.id,rule.tool);
    if(freeze)notes.push(`${name}的动作被否定或尚未成立，保持静止试画。`);
    if(rule.tool==='flower-forms')notes.push(`${name}目前只画花冠示意，未补出枝叶或整株。`);
    if(rule.tool==='plum-branch')notes.push(`${name}采用带花与花苞的梅枝试画；枝形和花朵数量是本地选择，未实现整树或离枝落花。`);
    if(rule.tool==='wine'&&options.form==='liquid')notes.push(`${name}仅以酒液局部作抽象试画，不补杯、壶或饮酒者；不表示原文给出了酒液的外形。`);
    if(rule.tool==='wine'&&options.form!=='liquid')notes.push(`${name}按明确提到的容器绘制风格化轮廓，不作历史器型复原。`);
    if(rule.tool==='building')notes.push(`${name}采用二层楼体试画，层数与门窗排列是本地选择；不等同于具体历史建筑，也未实现人物登楼。`);
    if(rule.tool==='surface-weather')notes.push(`${name}只显示露珠或霜层的局部笔触，不自动补草叶、枝条或地面；具体载体附着尚未从诗句自动匹配。`);
    if(rule.tool==='oriole')notes.push(`${name}使用单只黄身深翼的莺形写意试作，不是对原诗鸟种的鉴定；数量、位置与默认朝向是本地选择，不添加栖枝或同伴。`);
  }
  layers.sort((a,b)=>order.indexOf(a.tool)-order.indexOf(b.tool));
  if(!analysis.relations.length&&/不|未|无|若|倘|如果/.test(analysis.poem)){
    wind=0;layers.forEach(l=>l.animate=false);notes.push('本句有否定或假设提示，基础意象模式未细分其范围，暂缓动画，不宣称完成逻辑解释。');
  }
  const relations=analysis.relations.map(r=>({type:r.type,meaning:r.meaning,modality:r.modality,visualized:r.type==='acts_on'&&wind>0&&analysis.entities.find(e=>e.id===r.source)?.mentions.some(m=>m.includes('风'))&&entityTools.has(r.target)}));
  if(relations.some(r=>!r.visualized))notes.push('已识别的其他关系保留在解读中；本次未实现承载、遮蔽或完整动作编排。');
  notes.push('位置、大小、笔触、固定群体数量与默认微动是本地试画选择；不表示原句给出了这些数值。');
  return {version:policyVersion,seed:parseInt(createHash('sha256').update(analysis.poem).digest('hex').slice(0,8),16),settings:{wind,density:.45,palette:'clear'},layers:layers.map(({key,...l})=>l),omitted,notes:[...new Set(notes)],relations};
}
