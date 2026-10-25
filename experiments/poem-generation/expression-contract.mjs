// One entity vocabulary for literal scenery and abstract structure. Old schemas stay frozen.
import {schema as compositionSchema,promptAddition,validateCompositionContract} from './composition-contract.mjs';
import {schema as abstractSchema} from './abstract-contract.mjs';
export const version='expression-1.0';
export const schema=structuredClone(compositionSchema);
schema.title='Flowing Poetry unified expression 1.0';schema.properties.schema_version.const=version;
schema.properties.relations.maxItems=0;
const relations=structuredClone(abstractSchema.properties.relations),processes=structuredClone(abstractSchema.properties.processes);
for(const r of [relations.items.properties.source,relations.items.properties.target,processes.items.properties.subject])r.pattern='^i[1-9][0-9]*$';
processes.maxItems=6;
export const expressionSchema={type:'object',additionalProperties:false,required:['relations','processes'],properties:{relations,processes}};
schema.required.push('expression');schema.properties.expression=expressionSchema;
export const prompt=promptAddition+`
【统一表达协议，最终覆盖版本：expression-1.0】
schema_version="expression-1.0"。保留3.3所有字段，新增 expression={relations,processes}；旧顶层 relations 必须为 []。所有联系、过程和场景共用 entities 的 iN，不再重复一套主体。
entities 同时保留具体景物与关键抽象概念（如无心、离愁）；不要把纯时间词或每一个动作都拆成独立主体。不为给抽象概念凑场景而加山、水、人物。抽象概念的quantity.mode用unspecified，min/max/unit为null，scope/extent用unspecified，evidence=[]；scene.groups/supports/actions只组织实际景物，纯抽象句可为空；setting.kind=unclear。
expression.relations 使用 connect/approach/separate/echo/contrast/interweave/surround/block/converge/disperse/occlude/reveal；source、target为已有iN。仅disperse/reveal/occlude允许target=null。比喻通过role=reference保留，不作为实景，不把“有如春水”画成真的江岸。没有有根据的关系就[]。
expression.processes 每主体最多一项：persist/emerge/fade/accumulate/recur/unclear，temporal=ongoing/already/not_yet/again/repeated/unspecified。用modality区分asserted/negated/possible/conditional/unclear。“若”是条件，“不必相守”不证明相守缺席，“又”不一律反复循环。“逆旅”作旅舍，不解释成逆行。已消退的缺席结果可用fade+already，不执行其他在场过程。引用与推断规则同前，每项含basis,evidence，依据需关联所有端点。
模型只解释文字，不给画法建议、坐标、尺寸、色值、随机种子、画笔或代码；风景优先或抽象优先由用户与本地策略控制。`;
export const reliabilityPrompt=`
【输出自检】本次最终版本仅 expression-1.0，前文版本号为历史说明。
scene.atmosphere 是一个对象，visibility 和 illumination 是字符串，不再包 value/enum 对象。未明时可为 {"visibility":"unclear","illumination":"unclear","basis":"inferred","evidence":[]}；有依据再选择相应枚举，basis/evidence 放在同一外层。
比喻、比较可使用 echo/contrast 关联 role=reference,presence=unclear 的参照主体：这断言的是比较成立，不是参照真实在场。参照不能进入物理 scene 分组、依托、动作，也不能执行确定的主体过程。
每条联系的 evidence 要合起来覆盖两个主体的原词，省略主语时引用包含主语的同句或相邻完整原句。不改 mentions、不编引文来凑检查。不能确认的关系宁可省略，保留可靠实体、数量和不确定性。
数量只根据原文数词、孤独或群体线索提取。单写月、日、舟、楼不推出 exact=1；没有数量提示时使用 mode=unspecified,min=null,max=null,unit=null,scope=unspecified。unit 只抄原文实际出现的量词；不要自行补轮、盏、只、个。十年灯的十年是时长，不是十盏灯或确定一盏；一两声是声音次数，不是鸟只数。数量 evidence 引用包括该实体原词的完整短句。
空间、动作、群落、关系和过程的枚举严格从 JSON Schema 选择，不能自行发明枚举。无法确认的可选空间关系和动作留空数组；scene 的 setting/groups/supports/actions/atmosphere 字段仍完整返回。抽象主体、比喻参照与缺席主体不放入物理 scene.groups/supports/actions。
`;
export function sceneProjection(a){const p=structuredClone(a);p.schema_version='3.3';delete p.expression;return p;}
export function validateExpression(a,poem){
 if(!a||typeof a!=='object'||Array.isArray(a))return {valid:false,errors:['回答必须为对象'],warnings:[],review_required:true};
 const base=validateCompositionContract(sceneProjection(a),poem),errors=[...base.errors],warnings=[...base.warnings];
 if(a.schema_version!==version)errors.push('schema_version 要求 expression-1.0');
 if(Array.isArray(a.relations)&&a.relations.length)errors.push('顶层 relations 必须为空；统一表达关系写入 expression');
 function walk(v,r,path){const type=v===null?'null':Array.isArray(v)?'array':typeof v;
  if(r.type&&![r.type].flat().includes(type)){errors.push(path+' 类型错误');return;}
  if(r.enum&&!r.enum.includes(v))errors.push(path+' 枚举错误');
  if(type==='object'){for(const k of r.required||[])if(!Object.hasOwn(v,k))errors.push(path+'.'+k+' 缺少字段');for(const k of Object.keys(v))r.properties?.[k]?walk(v[k],r.properties[k],path+'.'+k):errors.push(path+'.'+k+' 额外字段');}
  else if(type==='array'){if(v.length<(r.minItems||0)||v.length>(r.maxItems??Infinity))errors.push(path+' 数量越界');v.forEach((item,i)=>walk(item,r.items,path+'['+i+']'));}
  else if(type==='string'&&(v.length<(r.minLength||0)||v.length>(r.maxLength??Infinity)||r.pattern&&!new RegExp(r.pattern).test(v)))errors.push(path+' 文本或id错误');
 }
 walk(a.expression,expressionSchema,'expression');if(errors.length)return {valid:false,errors,warnings,review_required:true};
 const entities=new Map(a.entities.map(e=>[e.id,e])),seen=new Set();
 for(const id of [...a.scene.groups.flatMap(g=>g.members),...a.scene.actions.map(c=>c.entity),...a.scene.supports.flatMap(c=>[c.entity,...c.target?[c.target]:[]])])if(entities.get(id)?.kind==='abstract')errors.push('scene 抽象概念不得作为物理场景、动作或依托主体');
 function claim(c,ids,path,comparison=false){for(const q of c.evidence)if(!poem.includes(q))errors.push(path+' 依据不在原文');for(const id of ids){const e=entities.get(id);if(!e){errors.push(path+' 端点不存在');continue;}if(!c.evidence.some(q=>e.mentions.some(m=>q.includes(m))))errors.push(path+' 依据未关联 '+id);
   const reference=comparison&&e.role==='reference'&&e.presence==='unclear';
   const result=e.presence==='absent'&&(c.kind==='fade'&&c.temporal==='already'||c.kind==='block'&&c.target===id);if(c.modality==='asserted'&&e.presence!=='present'&&!result&&!reference)errors.push(path+' 非在场主体不能执行确定过程');
  }if(c.basis==='inferred')warnings.push(path+' 为语义推断');}
 for(const [i,r] of a.expression.relations.entries()){if(r.source===r.target||r.target===null&&!['disperse','reveal','occlude'].includes(r.kind))errors.push('expression.relations 端点错误');claim(r,[r.source,...(r.target?[r.target]:[])],'expression.relations['+i+']',['echo','contrast'].includes(r.kind));}
 for(const [i,p] of a.expression.processes.entries()){if(seen.has(p.subject))errors.push('expression.processes 重复主体');seen.add(p.subject);claim(p,[p.subject],'expression.processes['+i+']');}
 return {valid:!errors.length,errors,warnings,review_required:base.review_required||!!errors.length||!!warnings.length};
}
