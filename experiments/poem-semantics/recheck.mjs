import { readFile, writeFile, readdir } from 'node:fs/promises';
import { validateAnalysis } from './validate.mjs';

// Offline protocol correction only: do not alter responses and do not call an API.
const folder = new URL('./results/structured-v2/', import.meta.url);
const schema = JSON.parse(await readFile(new URL('schema.json', folder), 'utf8'));
const policy = { allowPhysicalCarriers: true, allowEventAttributes: true };
const rows = [];
for (const name of (await readdir(folder)).filter(name => name.endsWith('.result.json')).sort()) {
  const result = JSON.parse(await readFile(new URL(name, folder), 'utf8'));
  const corrected = validateAnalysis(result.analysis, result.poem, schema, policy);
  rows.push({ case_id: result.case_id, poem: result.poem, original: result.validation, corrected });
}
const record = {
  protocol_revision: '2.1-offline-recheck',
  no_new_api_calls: true,
  original_responses_unchanged: true,
  corrections: [
    'A location/support reference can point to an object or person, not only a place-kind image. This does not prove that a particular spatial interpretation is correct.',
    'An attribute can modify an event, e.g. an extent modifier of an action.'
  ],
  policy, results: rows
};
await writeFile(new URL('protocol-2.1-recheck.json', folder), JSON.stringify(record, null, 2) + '\n', 'utf8');
const passed = rows.filter(row => row.corrected.valid).length;
const lines = [
  '# 第二轮的离线协议重检', '',
  '未增加 API 调用，没有修改任何模型回答或最初的检查结果。', '',
  '修正两项由实验协议引起的问题：空间承载关系的参照可以是船、人物等事物；属性也可以修饰动作。检查只保证引用可解析，不替人判断文学或物理含义。', '',
  `原规则通过 ${rows.filter(row => row.original.valid).length}/${rows.length}；修正规则后通过 ${passed}/${rows.length}。样例极少，这些比例不是语义准确率。`, '',
  '| 样例 | 原检查 | 重检 | 仍需处理的结构问题 |', '| --- | --- | --- | --- |',
  ...rows.map(row => `| ${row.poem} | ${row.original.valid ? '通过' : '未通过'} | ${row.corrected.valid ? '通过' : '未通过'} | ${row.corrected.errors.join('；').replaceAll('|', '/')} |`), '',
  '例如，“菊花天”仍可能被不恰当地空间化；“坐见”的古义仍可能解释错误。这些并不会因为引用检查通过而自动消失。', ''
];
await writeFile(new URL('协议重检.md', folder), lines.join('\n'), 'utf8');
console.log(JSON.stringify({ cases: rows.length, original_valid: rows.filter(row => row.original.valid).length, corrected_valid: passed, new_api_calls: 0 }));
