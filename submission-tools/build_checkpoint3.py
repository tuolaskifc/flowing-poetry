# -*- coding: utf-8 -*-
"""Prepare an isolated coursework snapshot, real records and offline MRE. No model calls."""
from pathlib import Path
import subprocess, json, shutil, hashlib, zipfile, importlib.util, sys
from datetime import datetime, timezone
from collections import Counter

ROOT=Path(__file__).resolve().parents[1]
NAME='2025011764_刘阳_checkpoint3'
PKG=ROOT/'提交材料'/NAME
spec=importlib.util.spec_from_file_location('cp2',ROOT/'submission-tools/build_checkpoint2.py')
old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old)
BASE='1ac11d0b12ff22bb1f8fb77d421acf806a951286'
CUTOFF='2026-10-25T07:02:37.677274+00:00'
def run(args,cwd=ROOT):
 p=subprocess.run(args,cwd=cwd,capture_output=True,text=True,encoding='utf8',errors='replace')
 if p.returncode: raise RuntimeError(str(args)+'\n'+p.stdout[-1200:]+p.stderr[-1200:])
 return p.stdout.strip()
def write(p,s):
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf8')
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def scan(p):
 if p.suffix.lower() in old.TEXT_SUFFIXES:
  b=p.read_bytes()
  if any(s.encode() in b for s in old.SECRETS): raise RuntimeError('credential detected in '+str(p.relative_to(ROOT)))

def prepare():
 if (PKG/'project').exists(): raise RuntimeError('Snapshot already exists; do not overwrite it.')
 for d in ['ai-records','attachments','repro']: (PKG/d).mkdir(parents=True,exist_ok=True)
 records=[]
 for month in ['10','11']:
  for f in sorted((Path.home()/'.codex/sessions/2026'/month).rglob('*.jsonl')):
   with f.open(encoding='utf8') as h:
    try: meta=json.loads(h.readline()).get('payload',{})
    except ValueError: continue
   if 'AI编程进阶' not in meta.get('cwd',''): continue
   messages=[];events=[];models=set();count=0
   with f.open(encoding='utf8') as h:
    for line in h:
     try: it=json.loads(line)
     except ValueError: continue
     p=it.get('payload',{});ts=it.get('timestamp','')
     if it.get('type')=='turn_context' and p.get('model'): models.add(p['model'])
     if not ts or datetime.fromisoformat(ts.replace('Z','+00:00'))<datetime.fromisoformat(CUTOFF): continue
     if it.get('type')!='response_item': continue
     typ=p.get('type')
     if typ=='message' and p.get('role') in ['user','assistant'] and p.get('channel') not in ['analysis','summary','justify','confidence']:
      s=old.message_text(p)
      if not s: continue
      count+=1;messages.append({'event':count,'timestamp':ts,'role':p['role'],'text':s})
     elif typ in ['custom_tool_call','custom_tool_call_output','function_call','function_call_output']:
      count+=1;r={k:old.safe_value(p[k]) for k in ['type','id','call_id','name','input','arguments','output','status'] if k in p};r.update(event=count,timestamp=ts);events.append(r)
   if not messages and not events: continue
   stem=f'{len(records)+1:02d}-{meta.get("id",f.stem)}'
   text=['# 阶段实际会话','','保留时间戳与原顺序；工具记录另附。凭据和个人路径脱敏，系统提示、隐藏推理与媒体二进制不导出。','']
   for m in messages: text.extend([f'## E{m["event"]:05d} {m["role"]} {m["timestamp"]}','',m['text'],''])
   write(PKG/'ai-records'/(stem+'.md'),'\n'.join(text))
   for ext,rows in [('messages.jsonl',messages),('tools.jsonl',events)]:write(PKG/'ai-records'/(stem+'.'+ext),'\n'.join(json.dumps(x,ensure_ascii=False) for x in rows)+'\n')
   records.append({'stem':stem,'session_id':meta.get('id'),'forked_from_id':meta.get('forked_from_id'),'messages':len(messages),'tool_events':len(events),'models':sorted(models),'source_file':f.name,'source_sha256':sha(f),'export_last_timestamp':max([x['timestamp'] for x in messages+events])})
 write(PKG/'ai-records/记录清单.json',json.dumps({'cutoff_utc':CUTOFF,'exported_at_utc':datetime.now(timezone.utc).isoformat(),'scope':'本项目会话在上一链接包验证时点之后的可导出记录，包含实际失败与本次材料整理；导出截至本次工具运行时，之后消息不在本次快照。较早背景继续保存在检查点2。','records':records,'omissions':dict(old.OMISSIONS)},ensure_ascii=False,indent=2)+'\n')
 write(PKG/'ai-records/README.md','# AI 记录\n\n记录清单列出真实会话、时间边界和模型标识。每组含可读对话、消息 JSONL 与工具 JSONL。时间为 UTC。保留实际失败；会话分叉可能含重复上下文，不能按消息数量计算独立实验。此前记录已在检查点 2 保存，不重复打包。\n\n用户在本次讨论中确认：竹比通用树更贴近“幽篁”；缺少独坐人物仍不完整，建议坐着的背影。报告是根据这些原话整理的待审初稿，未代替本人完成最终审核。\n')
 selected=['expanded-tool-trial-2026-11-08','free-tool-trial-2026-11-08','tool-guidance-2026-11-08','local-batch-2026-11-08','unfamiliar-2026-11-08','large-generation-2026-10-29']
 for d in selected:
  src=ROOT/'output'/d
  if src.exists(): shutil.copytree(src,PKG/'attachments'/d,dirs_exist_ok=True,ignore=shutil.ignore_patterns('.qa','node_modules','__pycache__'))
 # Preserve the original saved semantic answer and advice used in the demonstrated problem.
 d=json.loads((ROOT/'output/expanded-tool-trial-2026-11-08/e10.json').read_text(encoding='utf8'))
 write(PKG/'repro/input.json',json.dumps({'poem':d['poem'],'recordId':d['record']['id'],'analysis':d['record'].get('effectiveAnalysis') or d['record']['analysis'],'advice':d['advice']},ensure_ascii=False,indent=2)+'\n')
 write(PKG/'repro/run.mjs',REPRO)
 write(PKG/'repro/README.md',REPRO_DOC)
 write(PKG/'report.md',REPORT)
 write(PKG/'提交前阅读.md',HANDOFF)
 # Clone preserves all existing history; additions are committed only in this isolated copy.
 run(['git','clone','--local','--no-hardlinks',str(ROOT),str(PKG/'project')])
 project=PKG/'project';run(['git','remote','remove','origin'],project)
 run(['git','switch','-c','codex/checkpoint3-snapshot'],project)
 names=run(['git','ls-files','--cached','--others','--exclude-standard','-z']).split('\0')
 allowed={'.gitignore','.gitattributes','README.md','llm api.example.txt','docs','experiments','poem-flow','submission-tools'}
 copied=0
 for name in names:
  if not name or name.split('/')[0] not in allowed:continue
  p=ROOT/name
  if not p.is_file() or any(x in p.parts for x in ['.qa','node_modules','__pycache__']):continue
  scan(p);dest=project/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest);copied+=1
 for k in ['user.name','user.email']:
  value=run(['git','config',k]);run(['git','config',k,value],project)
 run(['git','add','.'],project)
 run(['git','commit','-m','Snapshot checkpoint 3: unified generation, tool selection and imagery review'],project)
 head=run(['git','rev-parse','HEAD'],project)
 write(PKG/'attachments/提交版本.json',json.dumps({'baseline_checkpoint2':BASE,'original_head':run(['git','rev-parse','HEAD']),'snapshot_commit':head,'snapshot_branch':'codex/checkpoint3-snapshot','new_commit_created_at_packaging':True,'original_worktree_unchanged':True,'snapshot_files_copied':copied},ensure_ascii=False,indent=2)+'\n')
 p=PKG/'report.md';p.write_text(p.read_text(encoding='utf8').replace('{{SNAPSHOT}}',head),encoding='utf8')
 print(json.dumps({'phase':'prepared','sessions':len(records),'snapshot':head,'files_copied':copied},ensure_ascii=False),flush=True)

REPRO='''import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {buildExpressionPlan} from '../project/experiments/poem-generation/expression-plan.mjs';
import {validateAdvice} from '../project/experiments/poem-generation/tool-guidance.mjs';
const input=JSON.parse(await readFile(new URL('./input.json',import.meta.url),'utf8'));
const a=input.analysis, before=JSON.stringify(a), subject=a.entities.find(e=>e.mentions.includes('幽篁'));
assert.equal(subject.concept,'幽深的竹林');
const baseline=buildExpressionPlan(a);
const checked=validateAdvice(input.advice,a);assert(checked.valid,checked.errors.join(';'));
const tools=Object.fromEntries(input.advice.choices.filter(c=>c.tool_id).map(c=>[c.entity,c.tool_id]));
const guided=buildExpressionPlan(a,{experimentalTools:tools});
const layer=p=>p.concretePlan.layers.find(l=>l.entities.includes(subject.id));
assert.equal(layer(baseline).tool,'tree');
assert.equal(layer(guided).tool,'bamboo');
assert.equal(JSON.stringify(a),before);
assert(!a.entities.some(e=>e.kind==='person'));
console.log(JSON.stringify({poem:input.poem,record:input.recordId,meaning:subject.concept,baseline:layer(baseline).tool,withSavedModelAdvice:layer(guided).tool,analysisUnchanged:true,remainingGap:'原解读未提取独坐人物；坐姿与弹琴未完成',providerCalls:0},null,2));
'''
REPRO_DOC='''# 幽篁选笔问题：离线复现

在 checkpoint3 解压目录执行：

```text
node repro/run.mjs
```

环境：Node.js 24.18.0；无需 npm 安装、密钥或网络。输入为真实实验 e10 的保存解读和工具建议，未重新请求 API。

预期：幽篁应使用竹形。原始语义已解释为“幽深的竹林”，旧本地映射却选择 tree/broadleaf。脚本用同一份语义分别运行原映射与保存的模型选笔，断言 tree → bamboo、语义未改写。去掉接口、网页和无关样例，保留完整该句语义以维持模块输入协议。前后图片及完整回答见 attachments/expanded-tool-trial-2026-11-08/e10*。

定位依据：语义已含竹林，因此偏差位于语义到画笔的选择阶段；并非模型最初不懂幽篁。模型读取工具目录后选择 bamboo。后来主流程在 service.mjs 中接入 tool_selection，经 validateAdvice 后传给 buildExpressionPlan；非法建议回退原规则。service-tool-advice.test.mjs 检查接入与回退，free-tool-trial.test.mjs 检查非在场主体不变成实景。

该案例发生于未提交的实验工作区，原实验没有独立 Git 提交编号。提交版本记录明确给出本次快照编号；快照同时保留原映射及工具选择路径，可直接复现差异。不得把本次打包提交倒记为此前修复版本。

用户已比较画面并确认竹更贴近原句，同时指出应增加坐着的背影。人物在原语义中未被提取，依然是未解决问题，不能把选竹成功写成全诗已画对。截图是已保存的单帧，不是本次新增人工动态验收。
'''
REPORT='''# 流动诗｜检查点3：中期检查

刘阳　2025011764　2026-11-08　主要类别：软件开发

> AI 根据本人讨论与实际记录协助整理的初稿，待本人审核、修改后提交。

## 本阶段做了什么

我继续做把诗句转成动态画面的网页。之前从意象词云出发，为核心意象创建图形，后来发现图形随意摆放、缺少场景，也会把树林或鸟群只画成孤零零一个。因此逐步加入空间、层次、数量和聚集状态。这些主要是检查点2已有基础。

本阶段把抽象、交融收束到统一生成中，并把抽象作为具体画法不足时的托底，同时保留未画出的内容。我也尝试脱离 API，用本地规则解析诗句，但对否定、比喻等情况较难可靠处理，暂时没有用它替换现有解析。

针对陌生诗句效果不佳，我尝试把已有工具目录提供给模型，让它参与选笔。最初是独立两阶段试验；当前代码已将语义与工具建议放入一次请求，建议经检查后才进入本地绘画。已有测试验证接入，报告不把独立试验的效果直接算作新的一次请求实测。

## 实现与我的判断

画笔部分来自开源项目的改编，也有我直接指导 Codex 绘制的内容，来源见 project/poem-flow/THIRD_PARTY.md 和画笔目录 README。我主要通过观看画面来审查效果。

关键转换位于 service.mjs、tool-guidance.mjs 和 expression-plan.mjs：模型给主体建议工具，本地检查主体与工具是否合法，再把可用建议传入绘画计划；数量、空间和具体绘制仍由本地程序控制。没有可靠画法时保留缺口，抽象托底不表示具体主体已经画出。

我的观察是，交融画法对大部分试过的诗句更有感觉。提供工具目录后的改善比预想小，但能更充分使用已有画笔。例如“独坐幽篁里，弹琴复长啸”，解读已知道幽篁是竹林，原映射却选通用树；模型选竹后更贴近原句。我认可这一改变，但仍觉得缺了独坐的人，加入坐着的背影会更完整。

## 调试与验证

上述“幽篁由树变竹”作为真实案例，原始回答、同语义前后图和离线复现放在 repro/ 与 attachments/。node repro/run.mjs 可核对原映射 tree、采用保存建议后 bamboo，且不改变原始语义。该问题发生在尚未提交的实验工作区，本次快照保留两条路径，不补造历史修复提交。

Codex 执行的本次检查见 attachments/verification.json 和日志，包含语法、现有自动测试及上述复现。它们与我的画面观察分别记录，不写成我亲自运行了这些命令。

## 当前问题

人物、动作及部分物象仍会缺失；提供工具目录也不能解决现有画笔本身没有的能力。当前交互主要是点击和拖动，我希望用户生成画面后还能有更多操作和玩耍的空间，具体方案尚未确定。下一步优先处理影响原句表达的缺失，再考虑扩展交互。

## 运行与材料

在 project/ 内执行 npm --prefix poem-flow start，打开 http://127.0.0.1:4173/。依赖说明与无密钥回放见 project/docs/checkpoint2-运行与复核.md；新生成需自行配置接口，真实密钥不随包提交。

检查点2基线为 1ac11d0b12ff22bb1f8fb77d421acf806a951286；本次隔离快照为 {{SNAPSHOT}}。新提交仅在打包副本中创建，原工作区不改写。完整阶段 AI 记录见 ai-records/，版本、测试与材料说明见 attachments/。正常与边界操作的本人逐项验收，以及本初稿的最终审核修改，提交前仍需本人确认。
'''
HANDOFF='''# 提交前阅读

report.md 是简洁初稿，未替本人声明已完成审核。请实际阅读并修改，删除不认可或无意义的表述；在末尾用自己的话确认审核与修改内容。老师要求本人审核修改，这一步必须由本人完成。

- [ ] 本人已读报告、作出修改，并确认内容符合实际。
- [ ] 本人实际核对当前版本一个正常与一个边界/错误情形，在报告补输入、操作和结果；若采用已有真实记录，确认其版本和范围。
- [ ] 按网络学堂格式上传报告、记录、复现材料和含历史仓库。

本包为本地准备材料，未上传网络学堂或推送远端。project/.git 保留旧历史与本次打包快照。只修改 report.md 后，可直接更新压缩包；如修改 project 代码，应重新检查并提交该副本、更新报告编号。

当前主流程已接入工具选择；早先实验说明“未接入正式入口”描述的是当时状态。历史实验结果保留原样，不能按当前实现改写历史成绩。
'''

def finalize():
 project=PKG/'project'
 if run(['git','status','--porcelain'],project): raise RuntimeError('snapshot is dirty')
 files=[]
 for p in sorted(PKG.rglob('*')):
  if not p.is_file() or '.git' in p.relative_to(PKG).parts:continue
  scan(p);files.append({'file':p.relative_to(PKG).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)})
 write(PKG/'attachments/文件清单.json',json.dumps({'files':files},ensure_ascii=False,indent=2)+'\n')
 full=PKG.with_suffix('.zip');small=PKG.parent/(NAME+'_报告与记录.zip')
 for dest,include_project in [(small,False),(full,True)]:
  with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=1) as z:
   for p in sorted(PKG.rglob('*')):
    if not p.is_file():continue
    rel=p.relative_to(PKG)
    if not include_project and rel.parts[0]=='project':continue
    if '.git' in rel.parts and any(s in ['logs','hooks'] for s in rel.parts):continue
    z.write(p,NAME+'/'+rel.as_posix())
  with zipfile.ZipFile(dest) as z:
   assert z.testzip() is None
   if include_project: assert NAME+'/project/.git/HEAD' in z.namelist()
  print(json.dumps({'archive':str(dest),'MB':round(dest.stat().st_size/1048576,1)},ensure_ascii=False),flush=True)

if __name__=='__main__': {'prepare':prepare,'finalize':finalize}[sys.argv[1]]()
