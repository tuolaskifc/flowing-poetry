// Source-bound drawing choices. Raw kinds, roles and quantities stay unchanged.
export function sourceDrawing(entity,poem=''){
 const words=entity.mentions;
 if(words.some(w=>w==='江枫')&&/枫树|枫木|枫林/.test(entity.concept))return {rule:{tool:'tree',options:{form:'broadleaf'},approximation:'按本次解读的江边枫树借阔叶树形；江枫亦有其他解释，保留待复核，不由江字补水'},allowPlace:true};
 if(words.some(w=>w==='菊')&&/菊残/.test(poem))return {omit:'原文明示菊残，现有菊丛是盛花形态，残败菊花尚无可靠画法',category:'unsupported-detail'};
 if(words.some(w=>w==='傲霜枝')&&/枝/.test(entity.concept))return {omit:'此处为菊的枝条；现有霜笔触不能代替枝条，暂缺可靠画法',category:'unsupported-detail'};
 if(words.some(w=>/^(?:长安|南浦|潇湘|桃源|蝉|寒蝉|蟋蟀)$/.test(w)))return {omit:'地名、集合概念或本阶段不绘制的虫体：保留语境，不拆字补景',category:'context-only'};
 if(words.some(w=>/^(?:眉黛|蛾眉|娥眉|佳人|美人|丽人|女子|少女|仕女|姑娘|女郎|玉人|红颜|红袖|翠袖|罗敷)$/.test(w)))return {rule:{tool:'figure',options:{pose:'woman'},approximation:'按用户确认的人物借代，以疏墨衣影提示女子；不描画眉眼，不增加肖像细节'},allowAbstract:true};
 if(words.some(w=>w==='秦楼'))return {rule:{tool:'building',approximation:'以已有楼体借形，不复原典故或具体历史建筑'},allowPlace:true};
 if(words.some(w=>/^(?:沙鸥|哀鸿|鸿雁|鸳鸯)$/.test(w)))return {rule:{tool:'bird',approximation:'复用通用写意鸟；鸳鸯未明数量时以两只示意，明确数量优先'}};
 if(words.some(w=>/^(?:长亭|茅亭)$/.test(w)))return {rule:{tool:'pavilion',options:{roof:'thatched',railing:'rail'}},allowPlace:true};
 if(words.some(w=>/^(?:兰桡|兰舟)$/.test(w))&&!/桨|船桨|划桨/.test(entity.concept))return {rule:{tool:'boat',approximation:'以舟船借形，不因兰桡这个称谓自动补桨'}};
 if(words.some(w=>w==='杜鹃')){
  const flower=/花|花木|灌木|植株/.test(entity.concept),bird=/鸟|禽|啼|鸣/.test(entity.concept);
  if(flower&&!bird)return {rule:{tool:'flower',approximation:'据本次语义中的花木解释借通用花形'}};
  if(bird&&!flower)return {rule:{tool:'bird',approximation:'据本次语义中的鸟鸣解释借通用鸟形'}};
  return {omit:'杜鹃的鸟／花所指未能确定，保留歧义，暂不随机选画笔',category:'ambiguous-reference'};
 }
 if(words.some(w=>/^(?:羌笛|笛子|横笛|玉笛|竹笛|笛|古琴|琴|瑟|琴瑟)$/.test(w)))return {rule:{tool:'instrument',options:{kind:words.some(w=>/笛/.test(w))?'flute':words.includes('瑟')?'se':words.includes('琴瑟')?'pair':'qin'},approximation:'以简线表现乐器形体，琴瑟保留两种形体；不自动补演奏者或音频'}};
 if(words.some(w=>/^(?:酒旗|酒招|旗幡|旗帜|旌旗|招幌|酒幌|(?:红|青|白|素|黄|战|军|彩|小|大)?旗)$/.test(w)))return {rule:{tool:'flag',approximation:'按完整词绘旗幡或招帘，不把酒旗拆成酒液；旗形与飘动为本地写意选择'}};
 if(words.some(w=>/^(?:提|持|仗)?(?:长剑|宝剑|剑|戈鋋|戈|矛|长矛|戟)$/.test(w)))return {rule:{tool:'weapon',options:{kind:words.some(w=>w.includes('剑'))?'sword':'spear'},approximation:'以细长墨线与简略刃形概括原文兵器，不复原历史器制；群体疏密由原数量和本地构图区分'}};
 if(words.some(w=>/^(?:市|市集|街市)$/.test(w)))return {rule:{tool:'dwelling',options:{kind:'house'},approximation:'以现有屋舍群概括市集环境，房数属于本地示意，不补行人或摊贩'},allowPlace:true};
 if(entity.kind==='abstract'&&words.every(w=>/^(?:正|[一二三四五六七八九十冬腊\d]+)月$/.test(w)))return {omit:'月份作为时节背景保留，不把纯时间标签当作独立抽象主体补画',category:'context-only'};
 if(words.some(w=>w==='桃李'))return {rule:{tool:'tree',options:{form:'blossom'},approximation:'以已有花树概括春日桃李；花色与树数为本地写意选择，不冒充原文明示数量'}};
 if(words.some(w=>w==='枫林'))return {rule:{tool:'tree',options:{form:'broadleaf'},approximation:'以现有阔叶树群概括枫林，不复原具体树形；数量为构图选择'},allowPlace:true};
 if(entity.kind==='person'&&words.some(w=>/^(?:我|吾|余|予|君|归人|故人|客人|行客|旅客|过客|君子|知己)$/.test(w)))return {rule:{tool:'figure',options:{pose:'standing'},approximation:'以基本写意人影概括原文明示的普通人物，不作肖像或补出叙述者位置'}};
 if(words.some(w=>/^(?:人眼|眼|眼前|眼中|眼底|心|内心|心中|泪|眼泪|泪水|泪珠|泪痕)$/.test(w)))return {omit:'身体局部或心绪线索尚无独立画法，不从概念解释中借出花、江河或其他实景',category:'unsupported-detail'};
 if(words.some(w=>/^(?:天长地久|秋色|春色)$/.test(w)))return {omit:'这是时间或综合色彩线索，不按其中单字另补天空、太阳或地面',category:'context-only'};
 if(words.some(w=>/^(?:江|溪|岸|山|野|河)花$/.test(w)))return {rule:{tool:'flower',approximation:'以通用花形概括原文花意；修饰位置不替代花的主体'},allowPlace:true};
 if(words.some(w=>/^(?:飞花|落英|落红)$/.test(w)))return {rule:{tool:'falling-petals',approximation:'以已有离枝花瓣画笔概括飘飞花意，不补直立茎叶；内部花瓣数量另保留画法限制'}};
 if(words.some(w=>/^(?:柳色|柳阴|柳荫)$/.test(w)))return {rule:{tool:'willow',approximation:'由柳色或柳荫借柳形提示来源，树数属于本地表达，不冒充原文明确树数'},allowAbstract:true,allowPlace:true};
 if(words.some(w=>/^(?:斜晖|余晖|馀晖|残照|夕晖)$/.test(w)))return {rule:{tool:'landscape',options:{form:'lightwash'},approximation:'按原文光色绘局部返照，不因概念解释含太阳就另画日轮'},allowPlace:true};
 if(words.some(w=>/^(?:寒|春|秋|清|碧|大|小|长|深|浅|野|幽)?(?:池|塘|池塘|湖泊|溪流)$/.test(w)))return {rule:{tool:'water'},allowPlace:true};
 if(words.some(w=>w==='茅亭'))return {rule:{tool:'pavilion'},allowPlace:true};
 if(words.some(w=>/^(?:汀沙|沙地|汀)$/.test(w)))return {rule:{tool:'landscape',options:{form:'shore'},approximation:'按明确沙地或汀岸借地表形，不复原具体地名'},allowPlace:true};
 if(words.some(w=>w==='晴川')){
  const water=/江面|水面|河流|河面|江水/.test(entity.concept)&&!/原野|平野|平原/.test(entity.concept);
  return {rule:water?{tool:'water',approximation:'晴川按本次解读中的江面借形，词义仍需复核；不由晴字补太阳'}:{tool:'landscape',options:{form:'ground'},approximation:'晴川按晴日原野借地表形，词义仍需复核；不由晴字补太阳'},allowPlace:true};
 }
 if(words.some(w=>w==='幽州骑'))return {rule:{tool:'horse',approximation:'以马群借骑兵主体，不细画骑者、兵器或历史军服'},allowPerson:true};
 return null;
}
