import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateAnalysis } from './validate.mjs';

const poem = '风过水面';
const fixture = {
  schema_version: '1.0', poem, core_reading: '风经过水面。',
  imagery: [
    { id: 'i1', surface: '风', concept: '风', kind: 'environment', presence: 'literal', evidence: ['风'] },
    { id: 'i2', surface: '水面', concept: '水面', kind: 'place', presence: 'literal', evidence: ['水面'] }
  ],
  relations: [{ source: 'i1', target: 'i2', type: 'acts_on', description: '风经过水面。', evidence: ['风过水面'] }],
  mood: { labels: ['平静'], energy: 'low', tension: 'low', spatial_openness: 'unclear', explanation: '没有足够线索判断空间大小。', evidence: ['水面'] },
  temporal: { mode: 'unspecified', description: '未明确时间过程。', evidence: ['过'] },
  uncertainties: []
};

test('accepts a complete, anchored semantic record', () => {
  assert.equal(validateAnalysis(fixture, poem).valid, true);
});
test('rejects drawing code fields at top level and in an image', () => {
  for (const modify of [v => { v.code = 'draw()'; }, v => { v.imagery[0].color = '#ffffff'; }]) {
    const value = structuredClone(fixture); modify(value);
    assert.equal(validateAnalysis(value, poem).valid, false);
  }
});
test('rejects invented evidence, even if otherwise schema-valid', () => {
  const value = structuredClone(fixture); value.mood.evidence = ['悲伤'];
  assert.equal(validateAnalysis(value, poem).valid, false);
});
test('rejects missing references, duplicate ids, and changed input', () => {
  for (const modify of [v => { v.relations[0].target = 'i99'; }, v => { v.imagery[1].id = 'i1'; }, v => { v.poem = '改过的诗'; }]) {
    const value = structuredClone(fixture); modify(value);
    assert.equal(validateAnalysis(value, poem).valid, false);
  }
});

test('v2 rejects an action with a missing participant and a non-place location relation', () => {
  const contract = JSON.parse(readFileSync(new URL('./schema-v2.json', import.meta.url), 'utf8'));
  const value = structuredClone(fixture);
  value.schema_version = '2.0';
  value.temporal.markers = [];
  value.events = [{ id: 'e1', predicate: '过', meaning: '风经过水面', actor: 'i1', patient: null, location: 'i2', modality: 'asserted', basis: 'explicit', evidence: ['风过水面'] }];
  value.attributes = [];
  assert.equal(validateAnalysis(value, poem, contract).valid, true);
  const missingActor = structuredClone(value);
  missingActor.events[0].actor = 'i99';
  assert.equal(validateAnalysis(missingActor, poem, contract).valid, false);
  const wrongPlace = structuredClone(value);
  wrongPlace.relations = [{ source: 'i2', target: 'i1', type: 'located_in', description: '错误地把风当地点', evidence: ['风过水面'] }];
  assert.equal(validateAnalysis(wrongPlace, poem, contract).valid, false);
});

test('offline revision allows physical supports and event attributes but rejects null locations', () => {
  const contract = JSON.parse(readFileSync(new URL('./schema-v2.json', import.meta.url), 'utf8'));
  const value = structuredClone(fixture);
  value.schema_version = '2.0'; value.temporal.markers = [];
  value.events = [{ id: 'e1', predicate: '过', meaning: '经过', actor: 'i1', patient: null, location: 'i2', modality: 'asserted', basis: 'explicit', evidence: ['过'] }];
  value.attributes = [{ surface: '过', kind: 'state', owner: 'e1', meaning: '经过的动作', evidence: ['过'] }];
  value.imagery[1].kind = 'object';
  value.relations = [{ source: 'i1', target: 'i2', type: 'located_in', description: '用于测试引用规则，非文学标准答案', evidence: ['风过水面'] }];
  const policy = { allowPhysicalCarriers: true, allowEventAttributes: true };
  assert.equal(validateAnalysis(value, poem, contract, policy).valid, true);
  value.relations[0].target = null;
  assert.equal(validateAnalysis(value, poem, contract, policy).valid, false);
});
