import { readFileSync } from 'node:fs';

export const schema = JSON.parse(readFileSync(new URL('./schema.json', import.meta.url), 'utf8'));

// Structural validation is intentionally separate from literary judgement.
// Only the schema keywords used by this contract are implemented here.
export function validateContract(value, poem) {
  const errors = [];
  const warnings = [];
  const add = (path, message) => errors.push(`${path}: ${message}`);
  function walk(item, rule, path) {
    if (rule.$ref) return walk(item, rule.$ref.slice(2).split('/').reduce((node, key) => node[key], schema), path);
    if ('const' in rule && item !== rule.const) add(path, '固定值不符');
    if (rule.enum && !rule.enum.includes(item)) add(path, '不在允许值中');
    const type = item === null ? 'null' : Array.isArray(item) ? 'array' : typeof item;
    if (rule.type && ![rule.type].flat().includes(type)) {
      add(path, '类型不符');
      return;
    }
    if (type === 'object') {
      for (const key of rule.required ?? []) if (!Object.hasOwn(item, key)) add(`${path}.${key}`, '缺少固定字段');
      for (const [key, child] of Object.entries(item)) {
        if (rule.additionalProperties === false && !Object.hasOwn(rule.properties ?? {}, key)) add(`${path}.${key}`, '额外字段');
        if (Object.hasOwn(rule.properties ?? {}, key)) walk(child, rule.properties[key], `${path}.${key}`);
      }
    } else if (type === 'array') {
      if (item.length < (rule.minItems ?? 0) || item.length > (rule.maxItems ?? Infinity)) add(path, '项目数量越界');
      if (rule.items) item.forEach((entry, i) => walk(entry, rule.items, `${path}[${i}]`));
    } else if (type === 'string') {
      const length = [...item].length;
      if (length < (rule.minLength ?? 0) || length > (rule.maxLength ?? Infinity)) add(path, '文本长度越界');
      if (rule.pattern && !new RegExp(rule.pattern).test(item)) add(path, '标识格式不符');
    }
  }
  walk(value, schema, '$');
  if (typeof poem !== 'string' || !poem.trim() || [...poem].length > 200) add('input', '本协议只接受 1–200 字的非空节选');
  if (value?.poem !== poem) add('$.poem', '原始输入被改写');
  // Further checks assume that shape validation succeeded; bad data is rejected,
  // rather than repaired, executed, or sent to another service.
  if (errors.length) return { valid: false, errors, warnings, review_required: true };

  function quote(text, path) {
    if (!poem.includes(text)) add(path, '不是输入中的连续原文');
  }
  function evidence(item, path) {
    item.evidence.forEach((text, i) => quote(text, `${path}.evidence[${i}]`));
  }
  const ids = new Map();
  const mentions = new Map();
  const concepts = new Map();
  value.entities.forEach((entity, index) => {
    const path = `$.entities[${index}]`;
    if (ids.has(entity.id)) add(path, '重复 id');
    ids.set(entity.id, entity);
    const ownMentions = new Set();
    for (const term of entity.mentions) {
      quote(term, `${path}.mentions`);
      if (ownMentions.has(term)) add(path, '同一实体重复列出原词');
      ownMentions.add(term);
      if (mentions.has(term) && mentions.get(term) !== entity.id) warnings.push(`原词“${term}”属于多个实体，需检查复指或同形异义`);
      mentions.set(term, entity.id);
    }
    if (concepts.has(entity.concept)) warnings.push(`概念“${entity.concept}”重复，需检查是否应合并`);
    concepts.set(entity.concept, entity.id);
    if (entity.role === 'reference' && entity.presence !== 'unclear') add(path, '比喻参照不能被断言为场景中的在场/缺席物体');
    if (entity.role === 'scene' && entity.presence === 'unclear') warnings.push(`${path}: 场景主体的出现情况不清楚`);
    evidence(entity, path);
  });
  const requiredSource = new Set(['acts_on', 'moves', 'moves_toward', 'moves_away', 'carries', 'grows_from', 'disappears', 'changes', 'obscures', 'located_in', 'compared_to', 'contrasts_with', 'corresponds_with']);
  const requiredTarget = new Set(['acts_on', 'moves_toward', 'moves_away', 'carries', 'grows_from', 'obscures', 'located_in', 'compared_to', 'contrasts_with', 'corresponds_with', 'observes']);
  const active = new Set(['acts_on', 'moves', 'moves_toward', 'moves_away', 'carries', 'obscures', 'observes']);
  const physical = new Set([...active, 'grows_from', 'disappears', 'changes', 'located_in']);
  value.relations.forEach((relation, index) => {
    const path = `$.relations[${index}]`;
    for (const role of ['source', 'target']) if (relation[role] !== null && !ids.has(relation[role])) add(`${path}.${role}`, '引用不存在的实体');
    if (requiredSource.has(relation.type) && relation.source === null) add(path, '缺少关系主体');
    if (requiredTarget.has(relation.type) && relation.target === null) add(path, '缺少关系对象');
    if (['moves', 'disappears', 'changes'].includes(relation.type) && relation.target !== null) add(path, '此类型固定使用 target=null');
    if (relation.source !== null && relation.source === relation.target) add(path, '关系不能指向自身');
    const source = ids.get(relation.source);
    const target = ids.get(relation.target);
    if (relation.type === 'compared_to') {
      if (source?.role !== 'scene' || target?.role !== 'reference') add(path, '比喻方向必须是主体→参照');
    } else if (physical.has(relation.type) && [source, target].some(entity => entity?.role === 'reference')) {
      add(path, '比喻参照不能直接参与场景中的实际动作');
    }
    if (relation.modality === 'asserted' && active.has(relation.type) && source?.presence === 'absent') add(path, '缺席主体不能同时执行已发生的实际动作');
    if (relation.modality === 'asserted' && active.has(relation.type) && target?.presence === 'absent') add(path, '缺席对象不能同时承受已发生的实际动作');
    if (relation.type === 'disappears' && relation.modality === 'negated' && source?.presence === 'absent') add(path, '消失取反与缺席状态冲突，需人工确认');
    if (relation.type === 'other') warnings.push(`${path}: 未归类关系需人工确认`);
    if (relation.modality === 'unclear') warnings.push(`${path}: 关系是否成立尚不清楚`);
    evidence(relation, path);
  });
  evidence(value.atmosphere, '$.atmosphere');
  value.time.markers.forEach((marker, index) => quote(marker.surface, `$.time.markers[${index}].surface`));
  if (!value.entities.length) warnings.push('没有可识别意象，不应自动编造场景');
  if (value.uncertainties.length) warnings.push('模型保留了不确定性，需要审阅');
  return { valid: errors.length === 0, errors, warnings, review_required: errors.length > 0 || warnings.length > 0 };
}

export function toMarkdown(value, { includePoem = true } = {}) {
  const label = id => value.entities.find(entity => entity.id === id)?.concept ?? '未明说';
  return [
    ...(includePoem ? [`> ${value.poem}`, ''] : []), value.reading, '', '**意象**', '',
    ...value.entities.map(entity => `- ${entity.id}：${entity.mentions.join(' / ')} → ${entity.concept}；${entity.role}，${entity.presence}`),
    '', '**关系**', '',
    ...value.relations.map(relation => `- ${label(relation.source)} → ${label(relation.target)}：${relation.type}；${relation.meaning}（${relation.modality}，${relation.basis}；依据：${relation.evidence.join(' / ')}）`),
    '', `**气息**：${value.atmosphere.labels.join('、') || '未判定'}；感受倾向 ${value.atmosphere.valence}，强度 ${value.atmosphere.energy}，紧张感 ${value.atmosphere.tension}，开阔度 ${value.atmosphere.openness}。`, '',
    '**时间提示**', '',
    ...(value.time.markers.length ? value.time.markers.map(marker => `- ${marker.surface}：${marker.meaning}`) : ['没有明确标记。']),
    ...(value.time.note ? ['', value.time.note] : []),
    '', '**待确认**', '',
    ...(value.uncertainties.length ? value.uncertainties.map(item => `- ${item}`) : ['未列出。格式通过并不意味着诗意正确。']), ''
  ].join('\n');
}
