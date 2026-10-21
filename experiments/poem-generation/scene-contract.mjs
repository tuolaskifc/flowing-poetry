// Small, versioned spatial contract. No drawing parameters cross this boundary.
import {schema as quantitySchema,promptAddition as quantityPrompt,validateQuantityContract} from './quantity-contract.mjs';
export const spatialTypes=['on','beside','behind','in_front_of','outside','among','reflects_on'];
export const schema=structuredClone(quantitySchema);
schema.title='Flowing Poetry scene semantics 3.2';schema.properties.schema_version.const='3.2';
schema.required.push('spatial');schema.properties.spatial={type:'array',maxItems:8,items:{type:'object',additionalProperties:false,required:['type','source','target','modality','basis','evidence'],properties:{type:{enum:spatialTypes},source:{type:'string',pattern:'^i[1-9][0-9]*$'},target:{type:'string',pattern:'^i[1-9][0-9]*$'},modality:{enum:['asserted','negated','possible','conditional','unclear']},basis:{enum:['explicit','inferred']},evidence:{type:'array',minItems:1,maxItems:3,items:{type:'string',minLength:1,maxLength:200}}}}};
export const promptAddition=quantityPrompt+`
【协议 3.2：少量空间关系，替代前文版本号】
schema_version="3.2"，增加必填 spatial 数组，没有可靠关系则 []。relations 仍为空；spatial 不是绘图指令，不填坐标、大小、工具名或配色。
数量自检：unit 非 null 时必须逐字出现在输入原句中；没有原始量词就填 null，不能自行补“轮、棵、条、座”。“明月”的 unit=null，数量通常 unspecified；单个名词不等于明确一件。“孤舟”可 exact=1 且 unit=null。不要用实体名冒充量词。
spatial 每项固定 type,source,target,modality,basis,evidence；source/target 必须引用两个不同的已有实体 id。type 仅 on(在目标表面/水上)、beside(旁边)、behind(后方)、in_front_of(前方)、outside(目标外侧)、among(目标之间)、reflects_on(源的影像映在目标上)。modality 与 basis 沿用成立方式和 explicit/inferred 区分，evidence 为连续原文。
严格区分字段：modality 只能填 asserted / negated / possible / conditional / unclear；绝不能填 inferred 或 explicit。basis 只能填 explicit / inferred。推断成立的关系可以 modality=asserted,basis=inferred；把握不足用 modality=unclear。示例：{"type":"on","source":"i1","target":"i2","modality":"asserted","basis":"inferred","evidence":["舟在水面"]}。最终逐项核对枚举。
例：舟在江上可为 舟 on 江；竹外桃花为 桃花 outside 竹；树阴照水若实体为树与水，可为 树 reflects_on 水（basis=inferred）；仅有树阴不补整棵树。月在松间可为 月 among 松；这是诗句的视觉位置，不推断月亮实际生长在树中。没有倒影线索不补 reflects_on，仅同句出现不能自动当作明确关系。
地理自然景物如寒江、深林、远山可以是 place，它们仍是可见物象；不要把地名补成建筑。只提取输入原文出现的主体，不用常识补岸、山、人物、光源。声音与气味不自动变成可见主体；夕阳/日光不当成月亮。保留缺口和不确定性。
空间证据提交前自检：每项 evidence 合起来必须含 source 的至少一个原始 mention，也含 target 的至少一个原始 mention。只写“深树鸣”“入芦花”而遗漏鸟的原文称谓，不足以证明两端；可扩大为含两端的完整原句，仍须逐字连续引用。不要为通过检查而往 mentions 添加无关原词。无法找到关联两端的原文就删去该关系。
确定关系自检：modality=asserted 的两端都必须 role=scene、presence=present；缺席、出现不明或比喻参照不能用于确定关系。不确定的“门”等不得为了充实空间关系改写为在场，更不得补出拟人动作的执行人。优先少提可靠关系。
成对计数自检：一双鸟若按个体解释，可 min=max=2、scope=individual、unit=null；若记 min=max=1、scope=group、unit="双"，则是一个二体群体。不要把两种计数口径混在同一 quantity 中。
`;
export function validateSceneContract(value,poem){
  if(!value||typeof value!=='object')return validateQuantityContract(value,poem);
  const projected=structuredClone(value);projected.schema_version='3.1';delete projected.spatial;
  const result=validateQuantityContract(projected,poem),errors=[...result.errors],warnings=[...result.warnings];
  if(value.schema_version!=='3.2')errors.push('场景协议要求 schema_version=3.2');
  if(!Array.isArray(value.spatial)||value.spatial.length>8)errors.push('spatial 必须为至多八项的数组');
  else if(result.valid){
    const entities=new Map(value.entities.map(e=>[e.id,e]));
    for(const [i,r] of value.spatial.entries()){
      const prefix='spatial['+i+']';
      if(!r||typeof r!=='object'||Array.isArray(r)){errors.push(prefix+' 结构不正确');continue;}
      const def=schema.properties.spatial.items;
      if(def.required.some(k=>!Object.hasOwn(r,k))||Object.keys(r).some(k=>!Object.hasOwn(def.properties,k)))errors.push(prefix+' 字段不正确');
      if(!spatialTypes.includes(r.type)||!def.properties.modality.enum.includes(r.modality)||!def.properties.basis.enum.includes(r.basis))errors.push(prefix+' 枚举不正确');
      if(!entities.has(r.source)||!entities.has(r.target)||r.source===r.target)errors.push(prefix+' 必须引用两个不同的已有实体');
      if(!Array.isArray(r.evidence)||!r.evidence.length||r.evidence.length>3||r.evidence.some(s=>typeof s!=='string'||!s||!poem.includes(s)))errors.push(prefix+' 依据不是连续原文');
      else for(const id of [r.source,r.target]){const e=entities.get(id);if(e&&!r.evidence.some(s=>e.mentions.some(m=>s.includes(m))))errors.push(prefix+' 依据未关联关系两端');}
      if(r.modality==='asserted'&&[r.source,r.target].some(id=>{const e=entities.get(id);return e&&(e.role!=='scene'||e.presence!=='present');}))errors.push(prefix+' 确定的空间关系不能使用缺席或比喻参照主体');
      if(r.basis==='inferred'||r.modality!=='asserted')warnings.push(prefix+' 的推断或非确定关系需审阅');
    }
  }
  return {valid:errors.length===0,errors,warnings,review_required:errors.length>0||warnings.length>0||result.review_required};
}
