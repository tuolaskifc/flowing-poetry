// Separate experimental contract. The established landscape protocols stay frozen.
export const relationKinds=['connect','approach','separate','echo','contrast','interweave','surround','block','converge','disperse','occlude','reveal'];
export const processKinds=['persist','emerge','fade','accumulate','recur','unclear'];
const obj=properties=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
const str={type:'string',minLength:1,maxLength:200},quotes={type:'array',minItems:1,maxItems:3,items:str};
const id={type:'string',pattern:'^a[1-9][0-9]*$'},basis={enum:['explicit','inferred']},modality={enum:['asserted','negated','possible','conditional','unclear']};
export const schema=obj({
 schema_version:{const:'abstract-1.0'},poem:str,reading:{type:'string',minLength:1,maxLength:600},
 subjects:{type:'array',minItems:1,maxItems:5,items:obj({id,mentions:{type:'array',minItems:1,maxItems:3,items:str},meaning:str,kind:{enum:['concrete','abstract']},role:{enum:['scene','reference']},presence:{enum:['present','absent','unclear']},evidence:quotes})},
 relations:{type:'array',maxItems:6,items:obj({source:id,target:{type:['string','null'],pattern:'^a[1-9][0-9]*$'},kind:{enum:relationKinds},modality,basis,evidence:quotes})},
 processes:{type:'array',maxItems:5,items:obj({subject:id,kind:{enum:processKinds},temporal:{enum:['ongoing','already','not_yet','again','repeated','unspecified']},modality,basis,evidence:quotes})},
 atmosphere:obj({labels:{type:'array',maxItems:4,items:str},valence:{enum:['positive','neutral','negative','mixed','unclear']},openness:{enum:['low','medium','high','unclear']},illumination:{enum:['day','twilight','night','unclear']},evidence:quotes}),
 uncertainties:{type:'array',maxItems:6,items:str}
});
export const prompt=`你解释中文诗句的抽象结构，输出符合附带 JSON Schema 的 JSON，版本 abstract-1.0。你不设计图画、不提供坐标、色值、画笔或代码。只解读输入节选，作者和篇名不参与补全。
subjects 提取最多5个原文可指认的景物或抽象概念（如情、追忆、言、离愁、良夜）。mentions 必须是原文中的连续短语，meaning 简述含义。不要把“当时”等纯时间词独立当主体，也不因省略主语补人物。kind=concrete/abstract。比喻参照 role=reference；presence 区分 present/absent/unclear。reference 可以借表达特征，但不能当作实景。
relations 解释已有主体的联系：connect连接/approach趋近/separate分离/echo呼应/contrast对照/interweave交织/surround包围/block阻隔/converge汇聚/disperse分散/occlude遮蔽/reveal显露。source/target 指已有id，二元联系 target 必须存在且不能是自身；仅 disperse/reveal/occlude 可 target=null。不为了展示这些枚举强加关系；没有就 []。可用同一概念的单体过程表达，无需虚构两个对象。
processes 每主体最多一项主导过程：persist延续/emerge显现/fade消退/accumulate积累/recur重现/unclear未明。temporal=ongoing正在/already已成立/not_yet尚未/again再次/repeated反复/unspecified未定。欲、不、未、可、若必须结合语义保留 modality asserted/negated/possible/conditional/unclear。未完成不等于永远不能完成；忘言不是医学失忆，欲辨并未一定说出话；只保留最有根据的过程，不编故事。没有就 []。
所有联系、过程都带 basis=explicit/inferred 和 evidence。引文必须连续来自原文，证据合起来关联每个端点的原词；跨句关系可直接引用完整两句。推断与原文明示区分。缺席/不确定主体不得作为已经发生动作的在场主体。atmosphere 只描述输入的气息、开阔度与照明，夜不等于悲伤；不补月或山。uncertainties 保留歧义和难以压缩的多阶段变化。给“可待”保留反问或可能歧义，不机械认定是在等待未来。不要添加 Schema 外字段。`;
export function validateAbstract(value,poem){
 const errors=[],warnings=[],add=(p,m)=>errors.push(p+' '+m);
 function walk(v,r,p){
  const t=v===null?'null':Array.isArray(v)?'array':typeof v;
  if(r.type&&![r.type].flat().includes(t)){add(p,'类型错误');return;}
  if(r.const!==undefined&&v!==r.const)add(p,'版本错误');if(r.enum&&!r.enum.includes(v))add(p,'枚举错误');
  if(t==='object'){
   for(const k of r.required||[])if(!Object.hasOwn(v,k))add(p+'.'+k,'缺少字段');
   for(const k of Object.keys(v))r.properties?.[k]?walk(v[k],r.properties[k],p+'.'+k):add(p+'.'+k,'额外字段');
  }else if(t==='array'){if(v.length<(r.minItems||0)||v.length>(r.maxItems??Infinity))add(p,'数量越界');v.forEach((x,i)=>walk(x,r.items,p+'['+i+']'));}
  else if(t==='string'){if(v.length<(r.minLength||0)||v.length>(r.maxLength??Infinity))add(p,'长度越界');if(r.pattern&&!new RegExp(r.pattern).test(v))add(p,'id格式错误');}
 }
 walk(value,schema,'analysis');if(errors.length)return {valid:false,errors,warnings,review_required:true};
 if(value.poem!==poem)add('poem','改写了输入');
 const ids=new Map();for(const s of value.subjects){if(ids.has(s.id))add('subjects','重复id');ids.set(s.id,s);for(const q of [...s.mentions,...s.evidence])if(!poem.includes(q))add(s.id,'原词或依据不在原文中');if(!s.evidence.some(q=>s.mentions.some(m=>q.includes(m))))add(s.id,'依据未关联原词');}
 function claim(c,who,path){
  for(const q of c.evidence)if(!poem.includes(q))add(path,'捏造依据');
  for(const id of who){const s=ids.get(id);if(!s){add(path,'端点不存在');continue;}if(!c.evidence.some(q=>s.mentions.some(m=>q.includes(m))))add(path,'依据未关联 '+id);
   const absentResult=s.presence==='absent'&&(c.kind==='fade'&&c.temporal==='already'||c.kind==='block'&&c.target===id);
   if(c.modality==='asserted'&&s.presence!=='present'&&!absentResult)add(path,'非在场主体不能执行确定过程');
  }
  if(c.basis==='inferred')warnings.push(path+' 为解读推断');
 }
 for(const [i,r] of value.relations.entries()){
  if(r.source===r.target)add('relations','不能以自身作二元关系');if(r.target===null&&!['disperse','reveal','occlude'].includes(r.kind))add('relations','二元关系缺少端点');claim(r,[r.source,...r.target?[r.target]:[]],'relations['+i+']');
 }
 const processed=new Set();for(const [i,p] of value.processes.entries()){claim(p,[p.subject],'processes['+i+']');if(processed.has(p.subject))add('processes','重复过程');processed.add(p.subject);}
 for(const q of value.atmosphere.evidence)if(!poem.includes(q))add('atmosphere','捏造依据');
 for(const s of value.subjects)if(s.mentions.every(m=>/^(当时|彼时|从此|此时|已经|尚未)$/.test(m)))warnings.push(s.id+' 为纯时间线索，本地不独立造形；解读待复核');
 return {valid:!errors.length,errors,warnings,review_required:!!errors.length||!!warnings.length||!!value.uncertainties.length};
}
