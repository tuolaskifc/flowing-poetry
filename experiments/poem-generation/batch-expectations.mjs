// Manually stated minimums for the frozen input inventory. These are reviewer
// expectations, not model outputs or a claim that poetry has a unique reading.
const rows=[
 ['b001','orchid,flower-forms','怀人不等于眼前出现佳人'],
 ['b002','moon,tree,water,rock','月光与石上水流仍是简化表达'],
 ['b003','water','风是参数；池水须有实际水域'],
 ['b004','figure,weapon','兵器画法缺失，不能用其他物体代替'],
 ['b005','rain,dwelling,willow','渭城是地点背景；柳色可用柳形借形'],
 ['b006','landscape:sun','把酒不自动补酒杯；无语不补人物'],
 ['b007','water,landscape:sun','漪尚未形成、雨已晴，不把候选涟漪和过去雨都画为在场'],
 ['b008','lotus:leaf','采莲的可能性不等于已有人正在采莲'],
 ['b009','cloud,landscape:sun','晚翠与秋声的对象未明'],
 ['b010','bird,landscape:sun','由雁声借鸟形属于本地表达'],
 ['b011','water,boat,rain','无人不补人物；潮雨急的动态仍有限'],
 ['b012','lotus:leaf,lotus:flower','叶花需要分布成片'],
 ['b013','moon,water,landscape:shadow','暗香和疏影不自动补梅树'],
 ['b014','bamboo,tree:blossom,water,bird','三两枝不等于三棵树；鸭需在水面'],
 ['b015','boat,figure,water,snow','孤舟单数，人物依附舟身'],
 ['b016','landscape:waterfall,landscape:mountain','银河是比喻参照，不补真实星河'],
 ['b017','water,bird,landscape:mountain,flower','白鸟需可见，花不是火焰'],
 ['b018','moon,landscape:stars,water,landscape:ground','月亮应明显区别于星点；月涌尚未完整表现'],
 ['b019','tree,moon,water','月近人属于观看关系，不强求人物特写'],
 ['b020','flower,grass,horse','人眼不是花，马蹄可借马形'],
 ['b021','bird|oriole,willow','两个黄鹂与一行白鹭分别计数'],
 ['b022','dwelling,tree,landscape:path','寺院与深林，花木深不是孤树'],
 ['b023','landscape:field,tree,bird|oriole','白鹭和黄鹂以通用鸟意概括'],
 ['b024','tree,dwelling,landscape:mountain','郭与村不可不加区分地补建筑'],
 ['b025','grass,water,tree,bird|oriole','鸣鸟可以借形；岸草需落地'],
 ['b026','tree:blossom','一簇不虚构精确花数'],
 ['b027','bamboo,tree','虫鸣尚无可靠虫形；不能换成鸟'],
 ['b028','landscape:mountain,boat','两岸留水路；孤帆仅一舟'],
 ['b029','water,boat','无人不补人物，孤舟单数'],
 ['b030','landscape:mountain','鸟、人缺席；千山万径不逐字计数'],
 ['b031','dwelling,tree,bird,landscape:sun','烟有聚落依托，日霞不挤成重复太阳'],
 ['b032','water,rock,tree,landscape:lightwash','泉声可以借水形；日色不补大日轮'],
 ['b033','bamboo,mist,landscape:mountain,landscape:sun','烟与落日在山竹间'],
 ['b034','water,landscape:field,landscape:mountain','明确两山；绕田仍需观察水路关系'],
 ['b035','bird,grass:reed,water','一双白鸟；立、惊起、入芦花是多阶段'],
 ['b036','landscape:shore,dwelling,mist','墟里借屋舍、孤烟有源点'],
 ['b037','rain,fish,bird','鱼需要水域依托，微风只作参数'],
 ['b038','landscape:mountain,dwelling,tree,mist','独树明确为一；村落不等于一栋房'],
 ['b039','tree,pavilion','五月不是月亮，汀沙可借岸地'],
 ['b040','water,bird|oriole','一两声不作两只鸟，苔点不当整棵树'],
 ['b041','boat,bird','来去迟重的节奏只作有限表达'],
 ['b042','tree,landscape:moss,landscape:lightwash','返照在林间，复照不自动无限闪烁'],
 ['b043','building,rain,tree:blossom','夜与明朝是两个时段；卖花不证明花树长在巷内'],
 ['b044','bamboo,lotus','荷叶是从荷风借形，露珠局部仍有限'],
 ['b045','tree:blossom|flower,wine,rain,landscape:glow','桃李、杯酒、夜雨、灯；十年不是十盏灯'],
 ['b046','horse','骑兵借马群；未画细甲胄，河洛只作地理背景'],
 ['b047','','追忆、惘然不强行补实景'],
 ['b048','','忘言不等于医学失忆，欲辨并未一定开口'],
 ['b049','','离愁可借纠缠纹理，不增加真实绳索'],
 ['b050','moon,building','无心不等于无月楼；月下楼原生位移仍未完成'],
 ['b051','','春水是比喻参照，不强画江岸'],
 ['b052','','不必朝夕相守不证明相守缺席；旧解读问题已留档，条件不作已执行过程'],
 ['b053','','逆旅作旅舍；旧逆行词义错误已留档，比喻旅舍不作实景'],
 ['b054','flower,water','江花不当江水；火和蓝草不补实景'],
 ['b055','water,landscape:mountain','晴雨是两种景况，不强行同时下雨出太阳'],
 ['b056','tree,grass,water|landscape:ground','晴川可存词义分歧，不能因解释含晴日就补太阳'],
 ['b057','cloud,mist','回望合与入看无是视点变化，不证明云霭消亡'],
 ['b058','flower,bird','泪不能变成江河；拟人、感物的歧义保留'],
 ['b059','falling-petals,rain','飞花应离枝，不画一排带茎的花'],
 ['b060','boat,water,landscape:lightwash','千帆是过去经过；当前舟群不能无根据补满'],
 ['b061','','问句不自动断言某一对象就是情'],
 ['b062','','天长地久不拆为天空；此恨延续不自动消退'],
 ['b063','','欲与恐保持可能性，不能把琼楼当已在场'],
 ['b064','building','上一层是动作／局部层数，不复制一群楼'],
 ['b065','rain,flower-forms','菊花天不拆为一片真实菊花天空；酒旗仍缺画法'],
 ['b066','weapon','缺少戈鋋主体画法；不能用比喻的星空顶替兵器'],
 ['b067','bird,building','万里是距离，可酣是可能性；不补已饮酒者'],
 ['b068','flower-forms','白发与花期对照；不强排成先后生长动画'],
 ['b069','boat,figure','人应依舟，而非漂在船外'],
 ['b070','cloud,boat,landscape:glow','野径云黑，火属于舟边点光'],
 ['b071','water,landscape:shadow','泉眼不是人眼，树阴不补整树'],
 ['b072','willow,boat,landscape:mountain','手工构图练习，舟二'],
 ['b073','grass,horse,tree,dwelling','手工练习，马二'],
 ['b074','fish,bird','手工练习，燕二'],
 ['b075','bamboo,figure,moon','手工练习'],
 ['b076','tree,pavilion,bird','手工练习，鸟在树冠'],
 ['b077','tree,dwelling,grass,landscape:path','手工练习，树二'],
 ['b078','willow,boat','明确水不见，不据舟补水'],
 ['b079','lotus:leaf,lotus:flower,moon','手工练习，叶花各一']
];
export const expectations=Object.fromEntries(rows.map(([id,required,note])=>[id,{required:required?required.split(',').map(s=>s.split('|')):[],note}]));
export function judgeBatch(c,result){
 const expected=expectations[c.id],issues=[];
 if(!expected)return {grade:'review',issues:['本句尚未人工定义最低表达要求']};
 if(!result.plan)return {grade:'unavailable',issues:[result.reason||'没有可靠当前画面'],note:expected.note};
 const p=result.plan,cp=p.concretePlan,layers=cp?.layers||[],key=l=>l.tool+(l.options.form?':'+l.options.form:'');
 const matches=(l,t)=>t.includes(':')?key(l)===t:l.tool===t;
 for(const options of expected.required)if(!layers.some(l=>options.some(t=>matches(l,t))))issues.push('缺少主要表达：'+options.join('／'));
 for(const l of layers){
  for(const id of l.entities){const e=(result.analysis.entities||result.analysis.subjects||[]).find(e=>e.id===id);if(e&&(e.presence!=='present'||e.role!=='scene'))issues.push('缺席、候选或比喻参照进入实景：'+e.mentions.join('／'));}
  for(const id of l.entities){const e=(result.analysis.entities||[]).find(e=>e.id===id);if(e?.mentions.some(m=>/^(人眼|眼)$/.test(m))&&l.tool==='flower'||e?.mentions.some(m=>/^(泪|眼泪|泪水)$/.test(m))&&l.tool==='water')issues.push('身体局部被错误映射：'+e.mentions.join('／'));}
  if(l.names.some(n=>/^(?:泪|眼泪|泪水|人眼|眼|天长地久)$/.test(n)))issues.push('非独立实景的词被误画：'+l.names.join('／'));
  if(l.names.some(n=>n==='江花')&&l.tool!=='flower')issues.push('江花画笔错误');
  if(l.names.some(n=>n==='飞花')&&l.tool!=='falling-petals')issues.push('飞花画笔错误');
 }
 if(cp?.scene?.organization?.audit.errors)issues.push('已有几何检查错误 '+cp.scene.organization.audit.errors+' 项');
 if(cp?.scene?.displayAudit?.errors)issues.push('显示检查错误 '+cp.scene.displayAudit.errors+' 项');
 if(p.renderability?.status==='unavailable')issues.push('主体缺画法，当前只会留下底色或参照装饰');
 const critical=issues.length>0;
 const limitations=[];
 if(p.expression.gaps.length)limitations.push('未单独表现：'+p.expression.gaps.map(g=>g.label).join('、'));
 if(result.recovery?.status==='partial')limitations.push('局部解释被隔离');
 if(['b034','b035','b043','b050','b052','b053','b057','b060','b063','b065','b068'].includes(c.id))limitations.push(expected.note);
 return {grade:critical?'below-floor':limitations.length?'limited':'basic',issues,limitations,note:expected.note,aestheticAcceptance:'pending-user'};
}
