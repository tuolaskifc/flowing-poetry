// Experimental advice only. Existing analysis and production rendering are unchanged.
import manifest from '../imagery-library/drawing/tool-manifest.json' with {type:'json'};
const boundaries={tree:'阔叶、松意、疏花树是近似形态，不辨认具体品种或残败状态。',bird:'通用单鸟形，飞、停、水鸟可选；不证明听见的鸟一定可见。',figure:'简略人影，可近似女性或钓者；无行走步态与五官。',boat:'船体；不附加桅杆、帆、桨、人物。',lotus:'静态花、叶或花叶组合；无凋残或生长过程。','flower-forms':'花冠或盛开的菊丛，不支持残菊。','surface-weather':'露霜局部笔触，不是枝条，也不表示霜在空中飘落。',landscape:'山、岸、地面、田、天、光、倒影等概括形态；须分别选择，不能据此补造实景。',water:'水纹，支持场景布局配合，不提供真实流体模拟。',instrument:'笛、琴、瑟写意器形；没有演奏者、演奏动作或声音。'};
export const toolCatalog=manifest.tools.filter(t=>t.id!=='birds').map(t=>({id:t.id,name:t.name,capability:boundaries[t.id]||t.note,variants:(t.controls||[]).filter(c=>['form','pose','state','kind'].includes(c.id)).flatMap(c=>c.choices.map(v=>v.label))}));
const ids=new Set(toolCatalog.map(t=>t.id));
export const advicePrompt=`你是诗句绘画方案审阅员。先依据已有诗句解读理解画面，再根据给定本地工具目录为每个主体提建议。保留数量、同指、缺席、比喻、文字颜色与不确定性；不得增加原文没有的物象。不要把工具建议当作对原文事实的证据。严格区分原文主体与推断背景。目录描述的是工具的能力上限，不代表所有细节或关系已经实现。不得写代码、坐标、颜色值、绘图参数或编造工具。不存在可靠画法就 tool_id=null，写明缺口；不要为填满画面把缺席、可能或比喻参照强行画成实物。已消退、残败、未支持动作需注明限制，不能因能画常态就声称画出原句状态。输出一个 JSON 对象，不加 Markdown：{"choices":[{"entity":"i1","tool_id":"moon","fit":"direct","reason":"简短说明","evidence":["原文连续片段"]}],"composition":"文字概述场景组织，不发明主体","expected":"可表现与缺口的定性预测，非审美保证","uncertainties":["简短说明"]}。上例仅示意格式，entity 必须完全等于已有 id，例如 i1，不加其他文字；tool_id 必须为目录中的 id 或 null。fit 只可为 direct、approximate、unavailable、not_drawn；后两者的 tool_id 必须为 null。choices 恰好覆盖每个主体一次；对于纯抽象、缺席和比喻参照用 not_drawn 和 null。`;
export function validateAdvice(value,analysis){
 const errors=[],valid=analysis?.entities||[],map=new Map(valid.map(e=>[e.id,e])),seen=new Set();
 if(!value||typeof value!=='object'||Array.isArray(value))return {valid:false,errors:['建议必须为对象']};
 if(Object.keys(value).sort().join(',')!=='choices,composition,expected,uncertainties')errors.push('顶层字段不符');
 if(!Array.isArray(value.choices))errors.push('choices 必须是数组');else for(const [i,c] of value.choices.entries()){
  if(!c||typeof c!=='object'||Object.keys(c).sort().join(',')!=='entity,evidence,fit,reason,tool_id'){errors.push(`choices[${i}] 字段不符`);continue;}
  const e=map.get(c.entity);if(!e||seen.has(c.entity))errors.push(`choices[${i}] 主体不存在或重复`);seen.add(c.entity);
  if(!['direct','approximate','unavailable','not_drawn'].includes(c.fit))errors.push(`choices[${i}] fit 错误`);
  if(c.tool_id!==null&&!ids.has(c.tool_id))errors.push(`choices[${i}] 未知工具`);
  if(['unavailable','not_drawn'].includes(c.fit)!==(c.tool_id===null))errors.push(`choices[${i}] 工具与状态不一致`);
  if(e&&(e.role!=='scene'||e.presence!=='present'||e.kind==='abstract')&&c.tool_id!==null)errors.push(`choices[${i}] 非确定实景不得选画笔`);
  if(typeof c.reason!=='string'||!c.reason.trim()||c.reason.length>300)errors.push(`choices[${i}] 原因不符`);
  if(!Array.isArray(c.evidence)||!c.evidence.length||c.evidence.some(q=>typeof q!=='string'||!q||!analysis.poem.includes(q))||e&&!c.evidence.some(q=>e.mentions.some(m=>q.includes(m))))errors.push(`choices[${i}] 原文依据不符`);
 }
 if(seen.size!==valid.length)errors.push('主体未完整覆盖');
 for(const field of ['composition','expected'])if(typeof value[field]!=='string'||value[field].length>600)errors.push(field+' 不符');
 if(!Array.isArray(value.uncertainties)||value.uncertainties.some(s=>typeof s!=='string'||s.length>300))errors.push('uncertainties 不符');
 return {valid:!errors.length,errors};
}
