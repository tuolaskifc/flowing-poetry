import { readFileSync } from 'node:fs';

export const schema = JSON.parse(readFileSync(new URL('./schema.json', import.meta.url), 'utf8'));

// This small validator implements only the keywords present in schema.json.
// It deliberately rejects unknown fields; it never evaluates model output.
export function validateAnalysis(value, poem, contract = schema, policy = {}) {
  const errors = [];
  function check(item, rule, path) {
    if (rule.$ref) {
      const resolved = rule.$ref.slice(2).split('/').reduce((part, name) => part[name], contract);
      return check(item, resolved, path);
    }
    if ('const' in rule && item !== rule.const) errors.push(`${path}: unexpected constant`);
    if (rule.enum && !rule.enum.includes(item)) errors.push(`${path}: not an allowed value`);
    const actual = item === null ? 'null' : Array.isArray(item) ? 'array' : typeof item;
    if (rule.type && ![rule.type].flat().includes(actual)) {
      errors.push(`${path}: expected ${JSON.stringify(rule.type)}, got ${actual}`);
      return;
    }
    if (actual === 'object') {
      for (const key of rule.required ?? []) if (!(key in item)) errors.push(`${path}.${key}: missing`);
      for (const key of Object.keys(item)) {
        if (rule.additionalProperties === false && !(key in (rule.properties ?? {}))) errors.push(`${path}.${key}: unexpected field`);
        if (rule.properties?.[key]) check(item[key], rule.properties[key], `${path}.${key}`);
      }
    }
    if (actual === 'array') {
      if (rule.minItems !== undefined && item.length < rule.minItems) errors.push(`${path}: too few items`);
      if (rule.maxItems !== undefined && item.length > rule.maxItems) errors.push(`${path}: too many items`);
      if (rule.items) item.forEach((entry, i) => check(entry, rule.items, `${path}[${i}]`));
    }
    if (actual === 'string') {
      const length = [...item].length;
      if (rule.minLength !== undefined && length < rule.minLength) errors.push(`${path}: text too short`);
      if (rule.maxLength !== undefined && length > rule.maxLength) errors.push(`${path}: text too long`);
      if (rule.pattern && !new RegExp(rule.pattern).test(item)) errors.push(`${path}: pattern mismatch`);
    }
  }
  check(value, contract, '$');
  if (value?.poem !== poem) errors.push('$.poem: input was changed');
  const images = Array.isArray(value?.imagery) ? value.imagery : [];
  const ids = new Set();
  for (const image of images) {
    if (ids.has(image?.id)) errors.push('$.imagery: duplicate id');
    ids.add(image?.id);
    if (typeof image?.surface === 'string' && !poem.includes(image.surface)) errors.push(`$.imagery.${image.id}: surface is not in input`);
  }
  const imageIds = new Set(ids);
  const events = Array.isArray(value?.events) ? value.events : [];
  for (const event of events) {
    if (ids.has(event?.id)) errors.push('$.events: duplicate id');
    ids.add(event?.id);
    for (const role of ['actor', 'patient', 'location']) {
      if (event?.[role] !== null && !imageIds.has(event?.[role])) errors.push(`$.events.${event?.id}.${role}: image does not exist`);
    }
    if (typeof event?.predicate === 'string' && !poem.includes(event.predicate)) errors.push(`$.events.${event.id}: predicate is not in input`);
  }
  for (const attr of Array.isArray(value?.attributes) ? value.attributes : []) {
    const owners = policy.allowEventAttributes ? ids : imageIds;
    if (attr?.owner !== null && !owners.has(attr?.owner)) errors.push('$.attributes: owner does not exist');
    if (typeof attr?.surface === 'string' && !poem.includes(attr.surface)) errors.push('$.attributes: surface is not in input');
  }
  for (const marker of Array.isArray(value?.temporal?.markers) ? value.temporal.markers : []) {
    if (typeof marker?.surface === 'string' && !poem.includes(marker.surface)) errors.push('$.temporal.markers: surface is not in input');
  }
  for (const rel of Array.isArray(value?.relations) ? value.relations : []) {
    if (!ids.has(rel?.source)) errors.push('$.relations: source does not exist');
    if (rel?.target !== null && !ids.has(rel?.target)) errors.push('$.relations: target does not exist');
    if (contract.properties.schema_version.const === '2.0' && rel?.type === 'located_in') {
      if (policy.allowPhysicalCarriers) {
        if (!imageIds.has(rel.target)) errors.push('$.relations: located_in needs a referenced image; null is not a location');
      } else if (!images.some(image => image?.id === rel.target && image?.kind === 'place')) {
        errors.push('$.relations: located_in target must be a place');
      }
    }
  }
  function checkQuotes(item, path) {
    if (!item || typeof item !== 'object') return;
    if (Array.isArray(item.evidence)) {
      item.evidence.forEach(quote => {
        if (typeof quote === 'string' && !poem.includes(quote)) errors.push(`${path}.evidence: quote is not in input`);
      });
    }
    Object.entries(item).forEach(([key, child]) => checkQuotes(child, `${path}.${key}`));
  }
  checkQuotes(value, '$');
  return { valid: errors.length === 0, errors };
}
