import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContract } from './validate.mjs';
import examples from './examples.mjs';

const sample = index => structuredClone(examples[index].analysis);
const check = value => validateContract(value, value.poem);

test('all nine authored examples meet the frozen contract', () => {
  for (const { name, analysis } of examples) assert.equal(check(analysis).valid, true, name + ': ' + check(analysis).errors.join('; '));
});
test('requires all fields and rejects extra drawing instructions at every level', () => {
  for (const mutate of [value => { delete value.time; }, value => { value.code = 'draw()'; }, value => { value.entities[0].color = '#ffffff'; }]) {
    const value = sample(0); mutate(value); assert.equal(check(value).valid, false);
  }
});
test('rejects changed input, invented quotations, and invented original mentions', () => {
  const value = sample(0);
  assert.equal(validateContract(value, '另一句诗').valid, false);
  value.relations[0].evidence = ['春风吹旗']; assert.equal(check(value).valid, false);
  const missingTerm = sample(0); missingTerm.entities[0].mentions = ['冬风'];
  assert.equal(check(missingTerm).valid, false);
});
test('rejects missing ids, duplicate ids, and a location with no container', () => {
  for (const mutate of [value => { value.relations[0].target = 'i99'; }, value => { value.entities[1].id = 'i1'; }, value => { value.relations[1].target = null; }]) {
    const value = sample(0); mutate(value); assert.equal(check(value).valid, false);
  }
});
test('allows people and vessels as physical carriers without inventing a place entity', () => {
  assert.equal(check(sample(4)).valid, true);
  const value = sample(6);
  value.relations.push({ type: 'located_in', source: 'i3', target: 'i2', meaning: '人在船内', modality: 'asserted', basis: 'inferred', evidence: ['舟载归人'] });
  assert.equal(check(value).valid, true);
});
test('rejects reversed metaphor direction and a metaphor reference used as an actor', () => {
  const reverse = sample(1);
  [reverse.relations[1].source, reverse.relations[1].target] = [reverse.relations[1].target, reverse.relations[1].source];
  assert.equal(check(reverse).valid, false);
  const actor = sample(1); actor.relations[1].type = 'acts_on';
  assert.equal(check(actor).valid, false);
});
test('separates an absent entity, a negated activity, and an asserted disappearance', () => {
  assert.equal(check(sample(5)).valid, true);
  assert.equal(check(sample(7)).valid, true);
  const doubled = sample(5); doubled.relations[0].modality = 'negated';
  assert.equal(check(doubled).valid, false);
  const activeAbsent = sample(5); activeAbsent.relations[0].type = 'moves';
  assert.equal(check(activeAbsent).valid, false);
});
test('keeps uncertainty and hypothetical modality; unknown roles do not become people', () => {
  const value = sample(8);
  assert.ok(value.relations.every(relation => relation.modality === 'conditional'));
  assert.equal(check(value).review_required, true);
  assert.equal(check(sample(3)).valid, true);
  assert.equal(sample(3).relations[0].source, null);
});
test('shared mentions are flagged for review and are not silently merged', () => {
  const value = sample(6);
  value.entities.push({ ...structuredClone(value.entities[1]), id: 'i4' });
  const result = check(value);
  assert.equal(result.valid, true);
  assert.equal(result.review_required, true);
  assert.ok(result.warnings.some(message => message.includes('复指')));
  assert.equal(value.entities.length, 4);
});
test('malformed JSON-shaped values return a rejection without crashing', () => {
  for (const value of [null, [], 'text', {}, { schema_version: '3.0', entities: [null] }]) assert.equal(validateContract(value, '风').valid, false);
});
