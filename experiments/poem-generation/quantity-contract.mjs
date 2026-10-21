// Versioned semantic extension; the frozen 3.0 contract is never edited.
import {schema as originalSchema,validateContract} from '../poem-semantics/contract-v3/validate.mjs';
export const quantitySchema={type:'object',additionalProperties:false,required:['mode','min','max','unit','scope','extent','evidence'],properties:{
  mode:{enum:['exact','range','few','many','unspecified']},min:{type:['number','null']},max:{type:['number','null']},unit:{type:['string','null']},
  scope:{enum:['individual','part','group','extent','unspecified']},extent:{enum:['local','spread','unspecified']},evidence:{type:'array',maxItems:3,items:{type:'string',minLength:1,maxLength:200}}
}};
export const schema=structuredClone(originalSchema);
schema.title='Flowing Poetry quantity-aware semantic contract 3.1';schema.properties.schema_version.const='3.1';
schema.properties.entities.items.required.push('quantity');schema.properties.entities.items.properties.quantity=quantitySchema;
export const promptAddition=`
【协议 3.1：数量与范围补充，替代上文版本号】
schema_version 必须为 "3.1"。每个实体增加 quantity，固定字段为 mode,min,max,unit,scope,extent,evidence。不要输出任何坐标、图层数、工具名或绘图代码。
mode：exact=原文明说的确定数量；range=原文支持的数量范围；few=几朵、数枝等少量但无确定边界；many=群体、繁多或铺展但不能逐个计数；unspecified=没有数量依据。
exact 的 min=max=非负整数；range 的 min/max 是原文支持的整数边界；many/unspecified 的 min/max=null，不猜数字。unit 是原始量词或单位，不明则 null。
scope：individual=个体数量；part=枝、花瓣等局部数量；group=一片、一丛、一行等群体单位；extent=里、丈等范围单位；unspecified=未确定。
extent：local=局部/孤立，spread=成片铺展，unspecified=未确定。不要因单个名词就断言只有一个。
evidence 必须为输入里的连续原文，包含数量或范围提示，并能关联该实体；unspecified 允许 []。孤舟可记 exact=1；两只莺是两个个体；一行鸟是一个群体，不等于一只鸟；三两枝是局部范围，不等于两三棵树；十里荷花不是十朵；无穷碧、乱花、花满、竹林等可支持 many，不虚构精确数量。
数量、在场与比喻分开；没有、未开等不能误当数量一。无穷与无声也不能自动否定物体或全部动作。只解释输入原句，不从篇名或候选库补入内容。
本次仍不请求完整关系抽取，relations 必须为 []。其余字段沿用协议 3.0 的语义边界。
`;
export function validateQuantityContract(value,poem){
  if(!value||typeof value!=='object')return {valid:false,errors:['回答必须为对象'],warnings:[],review_required:true};
  const projected=structuredClone(value);projected.schema_version='3.0';
  if(Array.isArray(projected.entities))projected.entities.forEach(e=>{if(e&&typeof e==='object')delete e.quantity;});
  const result=validateContract(projected,poem),errors=[...result.errors],warnings=[...result.warnings];
  if(value.schema_version!=='3.1')errors.push('数量协议要求 schema_version=3.1');
  if(result.valid)for(const e of value.entities){
    const q=e.quantity,path=e.id+'.quantity';
    if(!q||typeof q!=='object'||Array.isArray(q)){errors.push(path+' 缺少数量字段');continue;}
    if(Object.keys(q).some(k=>!Object.hasOwn(quantitySchema.properties,k))||quantitySchema.required.some(k=>!Object.hasOwn(q,k)))errors.push(path+' 字段不正确');
    for(const key of ['mode','scope','extent'])if(!quantitySchema.properties[key].enum.includes(q[key]))errors.push(path+'.'+key+' 不在允许值中');
    if(q.unit!==null&&(typeof q.unit!=='string'||!q.unit.trim()||q.unit.length>12||!poem.includes(q.unit)))errors.push(path+' 单位不是原文');
    if(['exact','range'].includes(q.mode)){
      if(!Number.isInteger(q.min)||!Number.isInteger(q.max)||q.min<0||q.max<q.min||q.max>100000||(q.mode==='exact'&&q.min!==q.max))errors.push(path+' 数量范围不正确');
    }else if(q.min!==null||q.max!==null)errors.push(path+' 不明确或繁多数量不得猜数字');
    if(!Array.isArray(q.evidence)||q.evidence.length>3||q.evidence.some(s=>typeof s!=='string'||!s||!poem.includes(s)))errors.push(path+' 依据不是连续原文');
    else if(q.mode!=='unspecified'&&(!q.evidence.length||!q.evidence.some(s=>e.mentions.some(m=>s.includes(m)||m.includes(s)))))errors.push(path+' 数量依据未关联本实体');
    if(e.role==='scene'&&e.presence==='present'&&q.mode==='exact'&&q.max===0)errors.push(path+' 在场实体与零数量冲突');
  }
  return {valid:errors.length===0,errors,warnings,review_required:errors.length>0||result.review_required};
}
