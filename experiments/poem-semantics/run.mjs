import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAnalysis } from './validate.mjs';
import { validateContract, toMarkdown as contractToMarkdown } from './contract-v3/validate.mjs';

const lab = dirname(fileURLToPath(import.meta.url));
const root = resolve(lab, '../..');
const argv = process.argv.slice(2);
function arg(name, fallback) {
  const index = argv.indexOf(name);
  if (index < 0) return fallback;
  if (!argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error(`Missing value for ${name}`);
  return argv[index + 1];
}
const credentialPath = resolve(root, arg('--credentials', 'llm api.txt'));
const runName = arg('--run', `run-${new Date().toISOString().replace(/[:.]/g, '-')}`);
if (!/^[a-zA-Z0-9_-]+$/.test(runName)) throw new Error('Run name must be a simple directory name.');
const output = join(lab, 'results', runName);
const caseId = arg('--case', null);
const limit = Number(arg('--limit', '5'));
if (!Number.isInteger(limit) || limit < 1 || limit > 7) throw new Error('Limit must be 1 through 7.');
const version = arg('--version', 'v3');
if (!['v1', 'v2', 'v3'].includes(version)) throw new Error('Version must be v1, v2, or v3.');
const continueOnInvalid = argv.includes('--continue-on-invalid');
const prepareOnly = argv.includes('--prepare-only');
const thinking = arg('--thinking', 'disabled');
if (!['disabled', 'enabled', 'default'].includes(thinking)) throw new Error('Thinking must be disabled, enabled, or default.');

let apiKey = '';
function redact(text) {
  let clean = String(text);
  if (apiKey) clean = clean.split(apiKey).join('[REDACTED]');
  return clean.replace(/\bsk-[a-zA-Z0-9_-]+/g, '[REDACTED]');
}
async function save(path, value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n';
  await writeFile(path, redact(text), 'utf8');
}
function parseConfig(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  const named = Object.fromEntries(lines.filter(line => /^LLM_[A-Z_]+=/.test(line)).map(line => {
    const index = line.indexOf('=');
    return [line.slice(0, index), line.slice(index + 1).replace(/^(['"])(.*)\1$/, '$2')];
  }));
  const base = named.LLM_BASE_URL ?? lines[0];
  apiKey = (named.LLM_API_KEY ?? lines[1] ?? '').replace(/^Bearer\s+/i, '');
  const model = named.LLM_MODEL ?? lines[2];
  if (!base || !apiKey || !model) throw new Error('Local configuration needs endpoint, key, and model.');
  const url = new URL(base);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Use an HTTPS endpoint without embedded credentials or query parameters.');
  let path = url.pathname.replace(/\/$/, '');
  if (!path.endsWith('/chat/completions')) path += path.endsWith('/v1') ? '/chat/completions' : '/v1/chat/completions';
  url.pathname = path;
  return { endpoint: url.href, model };
}

const zh = {
  low: '低', medium: '中', high: '高', unclear: '不确定',
  object: '物象', environment: '环境', place: '地点', person: '人物',
  literal: '字面', figurative_reference: '比喻参照', inferred: '隐含', uncertain: '待定',
  negated: '被否定', explicit: '直接支持', asserted: '陈述', possible: '可能/可以', conditional: '假设',
  continuous: '持续', cyclic: '循环', progressive: '渐变', suspended: '悬置', unspecified: '未明确',
  acts_on: '作用', moves_toward: '趋向', moves_away: '远离', located_in: '位于', compared_to: '比喻',
  contrasts_with: '对照', precedes: '先于', corresponds_with: '呼应', obscures: '遮蔽', persists: '持续'
};
function singleLine(value) { return String(value ?? '').replace(/[\r\n|]/g, ' '); }

async function buildReport() {
  const records = [];
  for (const name of (await readdir(output)).filter(name => name.endsWith('.result.json')).sort()) {
    records.push(JSON.parse(await readFile(join(output, name), 'utf8')));
  }
  const total = records.reduce((sum, record) => sum + (record.usage?.total_tokens ?? 0), 0);
  const lines = [
    '# 古诗语义实验：原始结果', '',
    '范围：模型只返回语义数据，不生成绘图代码；尚未接入网页。', '',
    '本轮未提供作者、全文、意象词书或针对单句的提示。cases.json 中的审阅重点没有发送给模型。', '',
    '注意：格式校验通过只表示数据符合约定、引用原文存在，不代表文学解释正确，也不代表已经能生成好看的画面。', '',
    `共 ${records.length} 次已记录请求；格式校验通过 ${records.filter(x => x.validation?.valid).length} 次。`, '',
    `接口返回的 total_tokens 合计：${total}。费用需以服务商账单为准，未据此估算金额。`, ''
  ];
  for (const record of records) {
    lines.push(`## ${record.case_id}`, '', `> ${record.poem}`, '',
      `模型：${record.model}；用时：${record.elapsed_seconds} 秒；结束原因：${record.finish_reason ?? '未返回'}。`, '',
      `格式校验：${record.validation?.valid ? '通过' : '未通过'}。`, '');
    if (record.error) lines.push(`请求问题：${record.error}`, '');
    if (record.validation?.errors.length) lines.push(...record.validation.errors.map(x => `- ${x}`), '');
    const value = record.analysis;
    if (!value) continue;
    if (value.schema_version === '3.0') {
      if (record.validation?.valid) lines.push(contractToMarkdown(value, { includePoem: false }));
      else lines.push('未通过固定协议检查；原始最终文本与解析结果均已保留，不自动修复或绘制。', '');
      if (record.validation?.warnings?.length) lines.push('**检查提醒：**', '', ...record.validation.warnings.map(message => `- ${message}`), '');
      continue;
    }
    lines.push(`**模型解读：** ${value.core_reading}`, '', '**意象：**', '', '| 原词 | 解释 | 存在方式 | 原文依据 |', '| --- | --- | --- | --- |');
    const images = Array.isArray(value.imagery) ? value.imagery : [];
    for (const image of images) lines.push(`| ${singleLine(image.surface)} | ${singleLine(image.concept)} | ${zh[image.presence] ?? image.presence} | ${singleLine(image.evidence?.join('、'))} |`);
    const names = Object.fromEntries(images.map(x => [x.id, x.surface]));
    lines.push('', '**关系：**', '');
    for (const rel of Array.isArray(value.relations) ? value.relations : []) lines.push(`- ${names[rel.source] ?? rel.source} → ${names[rel.target] ?? '未指定目标'}（${zh[rel.type] ?? rel.type}）：${rel.description}。依据：${rel.evidence?.join('、')}`);
    if (Array.isArray(value.events)) {
      lines.push('', '**动作与变化：**', '');
      for (const event of value.events) lines.push(`- ${event.predicate}：${event.meaning}；施事=${names[event.actor] ?? '未明说'}，受事=${names[event.patient] ?? '未指定'}，地点=${names[event.location] ?? '未指定'}；${zh[event.modality] ?? event.modality}，${zh[event.basis] ?? event.basis}。依据：${event.evidence?.join('、')}`);
    }
    if (Array.isArray(value.attributes)) {
      lines.push('', '**属性：**', '');
      for (const attr of value.attributes) lines.push(`- ${attr.surface}：${attr.meaning}；修饰=${names[attr.owner] ?? '全句/未指定'}。依据：${attr.evidence?.join('、')}`);
    }
    if (value.mood) lines.push('', `**气息：** ${value.mood.labels?.join('、')}；强度${zh[value.mood.energy]}，紧张感${zh[value.mood.tension]}，空间开阔度${zh[value.mood.spatial_openness]}。`, '', `${value.mood.explanation}（依据：${value.mood.evidence?.join('、')}）`, '');
    if (value.temporal) lines.push(`**时间：** ${zh[value.temporal.mode]}。${value.temporal.description}（依据：${value.temporal.evidence?.join('、')}）`, '');
    if (Array.isArray(value.temporal?.markers) && value.temporal.markers.length) lines.push(`时间标记：${value.temporal.markers.map(marker => `${marker.surface}（${marker.meaning}；参照${marker.reference_is_clear ? '清楚' : '未明确'}）`).join('；')}`, '');
    lines.push('**模型保留的不确定性：**', '');
    for (const issue of Array.isArray(value.uncertainties) ? value.uncertainties : []) lines.push(`- ${issue.topic}：${issue.alternatives?.join('；')}。${issue.reason}`);
    if (!value.uncertainties?.length) lines.push('模型未列出不确定性。');
    lines.push('');
  }
  await save(join(output, '结果汇总.md'), lines.join('\n').trimEnd() + '\n');
}

async function main() {
  const config = parseConfig(await readFile(credentialPath, 'utf8'));
  const allCases = JSON.parse(await readFile(join(lab, version === 'v1' ? 'cases.json' : 'cases-v2.json'), 'utf8'));
  const cases = (caseId ? allCases.filter(item => item.id === caseId) : allCases).slice(0, limit);
  if (!cases.length) throw new Error('No matching case.');
  const promptName = version === 'v3' ? 'contract-v3/system-prompt.txt' : version === 'v2' ? 'prompt-v2.txt' : 'prompt-v1.txt';
  const schemaName = version === 'v3' ? 'contract-v3/schema.json' : version === 'v2' ? 'schema-v2.json' : 'schema.json';
  const schema = JSON.parse(await readFile(join(lab, schemaName), 'utf8'));
  const prompt = await readFile(join(lab, promptName), 'utf8');
  await mkdir(output, { recursive: true });
  for (const [source, destination] of [[promptName, 'prompt.txt'], [schemaName, 'schema.json']]) {
    const snapshot = join(output, destination);
    try {
      const old = await readFile(snapshot, 'utf8');
      const current = await readFile(join(lab, source), 'utf8');
      if (old !== current) throw new Error('Prompt/schema changed: use a new run directory.');
    } catch (error) {
      if (error.code === 'ENOENT') await copyFile(join(lab, source), snapshot);
      else throw error;
    }
  }
  const parameters = { temperature: 0.2, max_tokens: 4096, stream: false, response_format: { type: 'json_object' } };
  if (thinking !== 'default') parameters.thinking = { type: thinking };
  const metadata = { endpoint: config.endpoint, model: config.model, parameters };
  const metadataPath = join(output, 'config.public.json');
  try {
    if (JSON.stringify(JSON.parse(await readFile(metadataPath, 'utf8'))) !== JSON.stringify(metadata)) throw new Error('Configuration changed: use a new run directory.');
  } catch (error) { if (error.code === 'ENOENT') await save(metadataPath, metadata); else throw error; }
  for (const item of cases) {
    const resultPath = join(output, `${item.id}.result.json`);
    try {
      const existing = JSON.parse(await readFile(resultPath, 'utf8'));
      console.log(JSON.stringify({ case: item.id, skipped: 'Already recorded; no repeat charge.' }));
      if (!existing.validation?.valid) {
        process.exitCode = 1;
        if (!continueOnInvalid) break;
      }
      continue;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const request = {
      model: config.model,
      ...parameters,
      messages: [
        { role: 'system', content: prompt + '\n\nJSON Schema:\n' + JSON.stringify(schema) },
        { role: 'user', content: JSON.stringify({ poem: item.text }) }
      ]
    };
    await save(join(output, `${item.id}.request.json`), request);
    if (prepareOnly) {
      console.log(JSON.stringify({ case: item.id, prepared: true, api_called: false }));
      continue;
    }
    const start = Date.now();
    const record = { case_id: item.id, poem: item.text, model: config.model, started_at: new Date().toISOString() };
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(180000),
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      record.http_status = response.status;
      const body = await response.text();
      if (!response.ok) {
        // Save only a bounded, redacted provider error; never headers or credentials.
        let detail = '';
        try { const failure = JSON.parse(body); detail = String(failure.error?.message ?? failure.message ?? ''); } catch {}
        throw new Error(`HTTP ${response.status}${detail ? ': ' + detail.slice(0, 400) : ''}`);
      }
      const result = JSON.parse(body);
      record.model = result.model ?? config.model;
      record.usage = result.usage ?? null;
      record.finish_reason = result.choices?.[0]?.finish_reason ?? null;
      const text = result.choices?.[0]?.message?.content;
      record.reasoning_content_present = Boolean(result.choices?.[0]?.message?.reasoning_content);
      // Deliberately do not store hidden reasoning fields.
      if (typeof text !== 'string' || !text.trim()) throw new Error('No final text content returned.');
      await save(join(output, `${item.id}.response.txt`), text);
      try { record.analysis = JSON.parse(text); }
      catch { throw new Error('Final text is not strict JSON. Original final text is saved without repair.'); }
      record.validation = version === 'v3' ? validateContract(record.analysis, item.text) : validateAnalysis(record.analysis, item.text, schema);
      if (record.finish_reason !== 'stop') record.validation = { ...record.validation, valid: false, review_required: true, errors: [...record.validation.errors, `Unexpected finish_reason: ${record.finish_reason}`] };
    } catch (error) {
      record.error = redact(error.message);
      record.validation = { valid: false, errors: [record.error] };
    }
    record.elapsed_seconds = Math.round((Date.now() - start) / 100) / 10;
    await save(resultPath, record);
    await buildReport();
    console.log(JSON.stringify({ case: item.id, http_status: record.http_status, valid: record.validation.valid, review_required: record.validation.review_required ?? null, seconds: record.elapsed_seconds, usage: record.usage, errors: record.validation.errors }));
    if (!record.validation.valid) {
      process.exitCode = 1;
      // Evaluation mode may collect the rest; never retry a failed request.
      if (!continueOnInvalid) break;
    }
  }
  if (prepareOnly) {
    await save(join(output, '准备说明.md'), '# 请求准备记录\n\n只生成待发送的请求、提示词、Schema 和公开配置；本次没有调用 API，没有模型回答。认证密钥没有写入这些文件。\n');
    console.log('Preparation complete; no API calls made.');
    return;
  }
  await buildReport();
  console.log('Report saved in experiments/poem-semantics/results/' + runName + '/结果汇总.md');
}

main().catch(error => { console.error(redact(error.message)); process.exitCode = 1; });
