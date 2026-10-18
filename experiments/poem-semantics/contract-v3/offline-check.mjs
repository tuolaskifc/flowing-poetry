import { readFile, writeFile } from 'node:fs/promises';
import { validateContract, toMarkdown } from './validate.mjs';
import examples from './examples.mjs';

const rows = [];
const text = ['# 固定协议 3.0：离线说明样例', '',
  '**以下均为人工编写的协议样例，不是新一轮 API 回答。没有修改历史回答，也没有调用接口。**', '',
  '前七项参考上一轮实际暴露的问题重新整理；末两项检查动作否定与条件句。通过表示这些说明样例符合协议，不表示模型已经能稳定输出它们。', ''];
for (const example of examples) {
  const validation = validateContract(example.analysis, example.analysis.poem);
  let historicalObservation = null;
  if (example.observed_result) {
    const original = JSON.parse(await readFile(new URL(example.observed_result, import.meta.url), 'utf8'));
    historicalObservation = { case_id: original.case_id, schema_version: original.analysis.schema_version, original_validation: original.validation };
  }
  rows.push({ name: example.name, origin: example.origin, validation, historical_observation: historicalObservation });
  text.push(`## ${example.name}`, '', `结构检查：${validation.valid ? '通过' : '未通过'}；需审阅：${validation.review_required ? '是' : '未发现预设问题'}。`, '', toMarkdown(example.analysis));
}
const report = { protocol_version: '3.0', new_api_calls: 0, origin: 'authored_examples_not_model_outputs', examples: rows };
await writeFile(new URL('./offline-check.json', import.meta.url), JSON.stringify(report, null, 2) + '\n', 'utf8');
await writeFile(new URL('./样例与检查.md', import.meta.url), text.join('\n'), 'utf8');
console.log(JSON.stringify({ examples: rows.length, valid: rows.filter(row => row.validation.valid).length, new_api_calls: 0 }));
if (rows.some(row => !row.validation.valid)) process.exitCode = 1;
