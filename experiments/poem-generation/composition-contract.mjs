// Semantic 3.3 extends, never edits, the stored 3.0–3.2 contracts.
import {schema as previous,promptAddition as previousPrompt,validateSceneContract} from './scene-contract.mjs';
export const settings=['mountain_stream','waterside','woodland','settlement','field','open_land','sky','mixed','unclear'];
export const groupRoles=['subject','environment','accent'];
export const patterns=['single','cluster','grove','flock','field','scattered','unspecified'];
export const depths=['near','middle','far','unspecified'];
export const states=['still','flow','fly','float','sway','fall','rise','walk','unclear'];
const evidence={type:'array',maxItems:3,items:{type:'string',minLength:1,maxLength:200}};
const basis={enum:['explicit','inferred']},id={type:'string',pattern:'^i[1-9][0-9]*$'};
const object=properties=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
export const sceneSchema=object({
 setting:object({kind:{enum:settings},basis,evidence}),
 groups:{type:'array',maxItems:6,items:object({members:{type:'array',minItems:1,maxItems:6,items:id},role:{enum:groupRoles},pattern:{enum:patterns},depth:{enum:depths},basis,evidence})},
 supports:{type:'array',maxItems:6,items:object({entity:id,surface:{enum:['water','ground','mountain','vegetation','boat']},target:{type:['string','null'],pattern:'^i[1-9][0-9]*$'},basis,evidence})},
 actions:{type:'array',maxItems:6,items:object({entity:id,state:{enum:states},pace:{enum:['slow','normal','fast','unspecified']},direction:{enum:['approach','recede','across','up','down','unspecified']},modality:{enum:['asserted','negated','possible','conditional','unclear']},basis,evidence})},
 atmosphere:object({visibility:{enum:['clear','hazy','dark','unclear']},illumination:{enum:['day','twilight','night','unclear']},basis,evidence})
});
export const schema=structuredClone(previous);
schema.title='Flowing Poetry scene composition semantics 3.3';schema.properties.schema_version.const='3.3';
schema.required.push('scene');schema.properties.scene=sceneSchema;
export const promptAddition=previousPrompt+`
【协议 3.3：整体场景语义，最后覆盖前文版本号与任务范围】
schema_version="3.3"。保留 entities、quantity、spatial、atmosphere、time、uncertainties，并增加必填 scene。旧 relations 仍为 []；本次动作状态写在 scene.actions，不再仅写入 reading。只解释输入节选，原文在场、缺席、比喻、数量与不确定性边界不变。
scene 固定含 setting,groups,supports,actions,atmosphere，所有字段按附带 Schema 输出。禁止坐标、尺寸数值、图层、绘画工具、颜色值、速度数值或执行代码。
setting.kind：mountain_stream 山间溪景 / waterside 水边 / woodland 林地 / settlement 聚落 / field 田地 / open_land 原野 / sky 天空 / mixed 混合 / unclear 未明。只作环境解释，不增加原文实体；合理场景推断标 basis=inferred，并给原文依据。
groups：按整体画面组织已有、在场的 scene 实体，每个实体至多属于一组。role=subject 主体/environment 环境/accent 点景；pattern=single 单体意向/cluster 局部丛组/grove 树丛/flock 鸟鱼群/field 铺展/scattered 分散/unspecified 未明；depth=near/middle/far/unspecified。原文没交代主次远近时可作合理整体解读，basis=inferred；这不是原文明确给定的绘图要求。明确个体数始终由 quantity 决定，群落解释不覆盖它；“一两声”是声音次数，不是鸟数。
supports：entity 所依托的 surface=water/ground/mountain/vegetation/boat。target 为原文已有的承托实体 id；必要环境未被明说时 target=null,basis=inferred，不往 entities 编造环境。surface=boat 必须有已有船体 target，不因有人影就补船。只给必要依托，不为填满画面补风景；明确缺席的对应环境不能再次补出。
actions：提取已有主体的主导动作状态 still/flow/fly/float/sway/fall/rise/walk/unclear，及定性的 pace 与方向。每实体本版最多一项，先后多阶段过程在 uncertainties 中注明。pace=slow/normal/fast/unspecified；direction=approach/recede/across/up/down/unspecified，来去通常是靠近/远离观察位置，不能臆断左右。不确定方向填 unspecified。否定、可能、假设必须保留 modality，不能作为已发生动作执行。“重、迟”可以支持慢的解读并标清推断；动植物名不自动证明正在运动。
scene.atmosphere 将画面可见度 visibility 与照明 illumination 明确为枚举；不要把“夜”直接当悲伤，也不要从篇名补雨、人物或月亮。原 atmosphere 的 valence/energy/openness 仍按原文解释。
所有新语义项都带 basis 和 evidence；evidence 是连续原文。setting/氛围确实未明可用 unclear 与 []，其余项必须有依据。group 的证据合起来关联其每个成员；support/action 的证据包含该实体的原词，已有 target 的支持证据还需关联 target。省略主体时扩大到前后完整原句，不能只写“一两声”“入芦花”。entity 以 iN 引用，不能用词语替代 id。非原文明示的主次、远近和环境解释要显式标 inferred。
`;

export function validateCompositionContract(value,poem){
 if(!value||typeof value!=='object'||Array.isArray(value))return {valid:false,errors:['回答必须为对象'],warnings:[],review_required:true};
 const projected=structuredClone(value);projected.schema_version='3.2';delete projected.scene;
 const prior=validateSceneContract(projected,poem),errors=[...prior.errors],warnings=[...prior.warnings];
 const add=(path,message)=>errors.push(path+' '+message);
 if(value.schema_version!=='3.3')add('schema_version','整体场景协议要求 3.3');
 function walk(v,rule,path){
  const type=v===null?'null':Array.isArray(v)?'array':typeof v;
  if(rule.type&&![rule.type].flat().includes(type)){add(path,'类型不符');return;}
  if(rule.enum&&!rule.enum.includes(v))add(path,'枚举不正确');
  if(type==='object'){
   for(const k of rule.required||[])if(!Object.hasOwn(v,k))add(path+'.'+k,'缺少字段');
   for(const k of Object.keys(v)){if(!Object.hasOwn(rule.properties||{},k))add(path+'.'+k,'额外字段');else walk(v[k],rule.properties[k],path+'.'+k);}
  }else if(type==='array'){
   if(v.length<(rule.minItems||0)||v.length>(rule.maxItems??Infinity))add(path,'数量越界');
   for(const [i,item] of v.entries())walk(item,rule.items,path+'['+i+']');
  }else if(type==='string'){
   if(v.length<(rule.minLength||0)||v.length>(rule.maxLength??Infinity))add(path,'文本长度越界');
   if(rule.pattern&&!new RegExp(rule.pattern).test(v))add(path,'实体 id 格式不正确');
  }
 }
 walk(value.scene,sceneSchema,'scene');
 if(errors.length)return {valid:false,errors,warnings,review_required:true};
 const entities=new Map(value.entities.map(e=>[e.id,e])),seenGroups=new Set(),seenActions=new Set();
 function claim(c,path,ids=[],optional=false){
  if(!optional&&!c.evidence.length)add(path,'缺少原文依据');
  for(const q of c.evidence)if(!poem.includes(q))add(path,'依据不是连续原文');
  for(const id of ids){
   const e=entities.get(id);
   if(!e){add(path,'引用不存在的实体 '+id);continue;}
   if(e.role!=='scene'||e.presence!=='present')add(path,'不能把缺席、未知或比喻参照作为在场画面主体');
   if(!c.evidence.some(q=>e.mentions.some(m=>q.includes(m))))add(path,'原文依据未关联 '+id);
  }
  if(c.basis==='inferred')warnings.push(path+' 为语义推断，绘画选择需与原文明示区分');
 }
 const s=value.scene;claim(s.setting,'scene.setting',[],s.setting.kind==='unclear');
 for(const [i,g] of s.groups.entries()){
  claim(g,'scene.groups['+i+']',g.members);
  for(const id of g.members){if(seenGroups.has(id))add('scene.groups','一个实体不可重复分组 '+id);seenGroups.add(id);}
 }
 for(const e of value.entities.filter(e=>e.role==='scene'&&e.presence==='present'))if(!seenGroups.has(e.id))warnings.push(e.id+' 未进入整体分组，后续使用本地默认布局');
 for(const [i,c] of s.supports.entries()){
  claim(c,'scene.supports['+i+']',[c.entity,...(c.target?[c.target]:[])]);
  if(c.entity===c.target)add('scene.supports['+i+']','不能依托自身');
  if(c.target===null&&c.basis!=='inferred')add('scene.supports['+i+']','未明说的环境依托必须标为推断');
  if(c.surface==='boat'&&!c.target)add('scene.supports['+i+']','不能因人物而补船');
 }
 for(const [i,c] of s.actions.entries()){
  claim(c,'scene.actions['+i+']',[c.entity]);
  if(seenActions.has(c.entity))add('scene.actions','本版每实体只接一个主导状态，多阶段需保留待办');seenActions.add(c.entity);
  if(c.state==='still'&&c.direction!=='unspecified')add('scene.actions','静止状态不能同时声明行进方向');
 }
 claim(s.atmosphere,'scene.atmosphere',[],s.atmosphere.visibility==='unclear'&&s.atmosphere.illumination==='unclear');
 return {valid:errors.length===0,errors,warnings,review_required:errors.length>0||warnings.length>0||prior.review_required};
}
