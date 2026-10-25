"""Build checkpoint 2 from a committed checkout and actual visible conversations.

No model requests. Does not modify previous reports, source conversations or history.
Requires Python 3.9+, Git, Node.js; browser verification uses the installed QA runtime.
"""
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
NAME = '2025011764_刘阳_checkpoint2'
PACKAGE = ROOT / '提交材料' / NAME
BRANCH_TIME = '2026-10-23T14:50:15.226Z'
MAIN_ID = '01a14d2f-3f06-7ac0-ae3c-48318536fe17'
FORK_ID = '01a1693d-b866-7a91-9fab-4ccbf751b205'
SESSION_ROOT = Path.home() / '.codex/sessions/2026/10'
ARCHIVE = PACKAGE.with_suffix('.zip')
TEXT_SUFFIXES = {'.md','.txt','.json','.jsonl','.js','.mjs','.cjs','.py','.html','.css','.svg','.csv','.yaml','.yml','.example'}


def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def command(args, cwd=ROOT, allow_failure=False):
    p = subprocess.run(args, cwd=cwd, capture_output=True, text=True,
                       encoding='utf-8', errors='replace')
    if p.returncode and not allow_failure:
        raise RuntimeError('Command failed: ' + ' '.join(map(str,args)) + '\n' + p.stdout[-1600:] + p.stderr[-1600:])
    return p


def known_secrets():
    p = ROOT / 'llm api.txt'
    if not p.exists():
        return []
    lines = [s.strip() for s in p.read_text(encoding='utf-8-sig').splitlines()
             if s.strip() and not s.lstrip().startswith('#')]
    named = [s.split('=',1)[1].strip().strip('\"\'') for s in lines if s.startswith('LLM_API_KEY=')]
    if not named and len(lines) >= 2:
        named = [re.sub(r'^Bearer\s+', '', lines[1], flags=re.I)]
    return [s for s in named if len(s) > 10]


SECRETS = known_secrets()
OMISSIONS = Counter()


def clean_string(s):
    for secret in SECRETS:
        s = s.replace(secret, '[API Key 已脱敏]')
    s = re.sub(r'\bsk-[A-Za-z0-9_-]{16,}', '[API Key 已脱敏]', s)
    s = re.sub(r'(?i)Bearer\s+[A-Za-z0-9_.-]{24,}', 'Bearer [认证值已脱敏]', s)
    if re.search(r'"type"\s*:\s*"THINK"', s):
        OMISSIONS['third_party_reasoning_output'] += 1
        return '[该工具输出含第三方推理内容，已整体省略；可见回复与其他工具记录另行保留。]'
    s = re.sub(r'data:(?:image|audio|video)/[^;\s]+;base64,[A-Za-z0-9+/=\s]+',
               '[媒体二进制省略]', s)
    s = re.sub(r'<oai-mem-citation>[\s\S]*?</oai-mem-citation>', '[内部记忆来源标记已省略]', s)
    for variant in [str(ROOT), ROOT.as_posix()]:
        s = s.replace(variant, '[项目目录]')
    s = s.replace('C:\\Users\\Liu Mie', '[个人目录]').replace('C:/Users/Liu Mie', '[个人目录]')
    return s


def safe_value(value):
    if isinstance(value,str):
        # Tool text can itself hold serialized MCP content, including images.
        stripped = value.lstrip()
        if stripped.startswith(('{','[')):
            try:
                parsed = json.loads(value)
                return json.dumps(safe_value(parsed), ensure_ascii=False)
            except (ValueError,RecursionError):
                pass
        return clean_string(value)
    if isinstance(value,list):
        return [safe_value(x) for x in value]
    if isinstance(value,dict):
        typ = value.get('type','')
        if typ in ['image','input_image','output_image','audio','input_audio','THINK','thinking','reasoning']:
            OMISSIONS['media_or_reasoning_blocks'] += 1
            return {'type':'omitted','note':'媒体二进制或推理块不导出'}
        return {k:safe_value(v) for k,v in value.items()
                if k not in ['reasoning_content','encrypted_content','internal_chat_message_metadata_passthrough']}
    return value


def message_text(message):
    out=[]
    for block in message.get('content',[]):
        if isinstance(block,dict) and block.get('type') in ['input_text','output_text','text']:
            out.append(block.get('text',''))
    text='\n'.join(out)
    for tag in ['environment_context','in-app-browser-context','external_codex_apps_open_page','permissions','turn_aborted']:
        text=re.sub(r'<'+tag+r'\b[^>]*>[\s\S]*?</'+tag+r'>','',text)
    text=text.strip()
    if text.startswith(('# AGENTS.md instructions','The following is the Codex agent history','<environment_context>')):
        return ''
    return clean_string(text)


def source_session(day, sid):
    matches=list((SESSION_ROOT/day).glob('*'+sid+'.jsonl'))
    if len(matches)!=1:
        raise RuntimeError('Cannot locate source session: '+sid)
    return matches[0]


def read_session(path):
    messages=[]; tools=[]; models=set(); meta={}; event_index=0
    with path.open(encoding='utf-8') as f:
        for line in f:
            try:
                item=json.loads(line)
            except ValueError:
                continue
            p=item.get('payload',{}); kind=item.get('type'); ts=item.get('timestamp','')
            if kind=='session_meta':
                meta={k:safe_value(p[k]) for k in ['id','timestamp','forked_from_id','source'] if k in p}
            if kind=='turn_context' and p.get('model'):
                models.add(p['model'])
            if kind!='response_item':
                continue
            typ=p.get('type')
            if typ=='message' and p.get('role') in ['user','assistant'] and p.get('channel') not in ['analysis','summary','justify','confidence']:
                text=message_text(p)
                if text:
                    event_index+=1
                    messages.append({'event':event_index,'timestamp':ts,'role':p['role'],'text':text})
            elif typ in ['custom_tool_call','custom_tool_call_output','function_call','function_call_output']:
                event_index+=1
                record={k:safe_value(p[k]) for k in ['type','id','call_id','name','input','arguments','output','status'] if k in p}
                record.update(event=event_index,timestamp=ts)
                tools.append(record)
    return {'messages':messages,'tools':tools,'models':sorted(models),'meta':meta,'source_sha256':sha(path),'source_filename':path.name}


def export_part(data, stem, title, predicate=lambda ts:True):
    target=PACKAGE/'ai-records'
    messages=[m for m in data['messages'] if predicate(m['timestamp'])]
    tools=[m for m in data['tools'] if predicate(m['timestamp'])]
    lines=['# '+title,'',
           '真实记录的可见用户／助手文字，按原时序导出；工具执行记录见同名前缀的 tools.jsonl。',
           '不含系统／开发者提示、隐藏推理、媒体二进制与自动注入的环境状态。密钥、个人目录和内部记忆标记已作显式脱敏。',
           '截图与历史输出保存在 project/poem-flow/verification/ 和 attachments/；工具记录中的媒体占位符不代表原来没有图片。','']
    for m in messages:
        lines.extend([f"## E{m['event']:05d}｜{'用户' if m['role']=='user' else '助手'}｜{m['timestamp']}",'',m['text'],''])
    (target/(stem+'.md')).write_text('\n'.join(lines),encoding='utf-8')
    for suffix,rows in [('messages.jsonl',messages),('tools.jsonl',tools)]:
        with (target/(stem+'.'+suffix)).open('w',encoding='utf-8') as f:
            for row in rows:
                f.write(json.dumps(row,ensure_ascii=False)+'\n')
    return {'stem':stem,'title':title,'messages':dict(Counter(m['role'] for m in messages)),
            'tool_events':len(tools),'first':messages[0]['timestamp'] if messages else None,
            'last':messages[-1]['timestamp'] if messages else None,'models':data['models'],
            'source':data['meta'],'source_filename':data['source_filename'],'source_sha256':data['source_sha256']}


def prepare():
    for name in ['ai-records','attachments']:
        (PACKAGE/name).mkdir(parents=True,exist_ok=True)
    records=[]
    main=read_session(source_session('18',MAIN_ID))
    records.append(export_part(main,'01-common-context','分叉前共同上下文（含项目早期背景）',lambda ts:ts<=BRANCH_TIME))
    records.append(export_part(main,'02-A-original-continuation','方案 A：原会话后续',lambda ts:ts>BRANCH_TIME))
    child=read_session(source_session('23',FORK_ID))
    assert child['meta'].get('forked_from_id')==MAIN_ID
    records.append(export_part(child,'03-B-abstract-fork','方案 B：真实 fork 后的抽象方向'))
    for day,sid,stem,title in [
        ('13','01a1342d-d7c5-7e81-b838-3e2a9abed59f','04-design-and-submission','设计、时间与配色规划及提交整理'),
        ('18','01a14ce3-72cc-7290-a071-6bf019692ee8','05-semantic-experiments','语义实验与协议讨论（含早期基础）'),
        ('18','01a14cc7-e0d0-7a02-a481-309c0f62bcf1','06-reference-discussion','资料与意象来源讨论（含早期基础）')]:
        records.append(export_part(read_session(source_session(day,sid)),stem,title))
    manifest={'exported_at_utc':datetime.now(timezone.utc).isoformat(),'records':records,
              'fork':{'parent':MAIN_ID,'child':FORK_ID,'split_utc':BRANCH_TIME,
                      'same_fixed_task_controlled_experiment':False,
                      'note':'使用本人认可的已有真实分叉。两路子任务及后续工作区状态不同，不能将效果差异全归因于 Prompt。'},
              'omissions':dict(OMISSIONS),
              'scope':'可见文字与可导出工具记录；不含系统提示、隐藏推理和媒体二进制；部分早期历史用于共同上下文和来源定位，不计为本阶段新增成果。'}
    (PACKAGE/'ai-records/记录清单.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (PACKAGE/'ai-records/README.md').write_text('''# AI 记录索引

01 为分叉前共同上下文，02 为原会话后续 A，03 为真实分叉 B；04–06 为相关设计、语义与来源讨论。每段提供可读 Markdown、消息 JSONL 和工具 JSONL，使用原事件顺序及 UTC 时间戳对应。模型标识、原始来源校验值和导出截止位置在记录清单中。

共同上下文含早期项目背景；这不表示其中全部工作都计入检查点 2。04 还包含截至导出时点的本次提交整理对话。自动环境状态、系统与开发者提示、隐藏推理、媒体二进制不导出；明确的脱敏／省略均留标记。工具中出现的历史请求或回放不自动等同于新模型调用。

分叉元数据确实指向原会话，但两路后来开展不同子任务、共用过工作目录；报告据此比较实际开发路线，不声称同一任务下的单变量效果实验。
''',encoding='utf-8')
    scope='''# 现有 fork 的范围说明

按用户要求采用已有真实分叉，未新造、拼接或回填会话。共同问题是抽象诗句如何表达；B 承接建议实现抽象表达，A 后来继续稳定性、失败反馈与规则改进。具体提示和结果见 report.md 第四节。

两条路线的子任务、时间和后续代码状态不同，不能视为同一固定任务、同一起始代码的严格控制对比。本包保留这一限制供课程审阅，没有因为存在 fork 元数据就宣称所有对比条件完全相同。
'''
    (PACKAGE/'attachments/fork范围说明.md').write_text(scope,encoding='utf-8')
    feedback=[]
    for r in [main,child]:
        for m in r['messages']:
            if m['role']=='user' and any(s in m['text'] for s in ['我刚刚再试了试','竹外桃花','解读没有通过检查','确实不赖','贯穿','有些画法','我自己尝试了很多']):
                feedback.append(m)
    feedback.sort(key=lambda m:m['timestamp'])
    text=['# 本人体验与问题反馈摘录','','以下为真实用户消息节选，完整上下文见 ai-records/。未补造当时未记下的操作或输入。','']
    for m in feedback:
        text.extend(['## '+m['timestamp'],'',m['text'],''])
    (PACKAGE/'attachments/本人体验原始反馈摘录.md').write_text('\n'.join(text),encoding='utf-8')
    print(json.dumps({'phase':'prepared','parts':len(records),'messages':sum(sum(x['messages'].values()) for x in records),'tool_events':sum(x['tool_events'] for x in records),'omissions':dict(OMISSIONS)},ensure_ascii=False),flush=True)


def scan_bytes(data,label):
    for secret in SECRETS:
        if secret.encode() in data:
            raise RuntimeError('Known credential detected; do not package: '+label)


def preflight():
    names=command(['git','ls-files','--cached','--others','--exclude-standard','-z']).stdout.split('\0')
    checked=0
    for name in names:
        if not name or name.split('/')[0] not in ['.gitignore','.gitattributes','README.md','llm api.example.txt','docs','experiments','poem-flow','submission-tools']:
            continue
        path=ROOT/name
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        scan_bytes(path.read_bytes(),name); checked+=1
    print(json.dumps({'phase':'preflight','text_files_checked':checked,'known_credential_found':False},ensure_ascii=False),flush=True)


def scan_git_history(repo):
    # Inspect object bytes in memory; never print secrets or raw objects.
    listing=command(['git','rev-list','--objects','--all'],cwd=repo).stdout.splitlines()
    ids=[s.split(' ',1)[0] for s in listing]
    proc=subprocess.Popen(['git','cat-file','--batch'],cwd=repo,stdin=subprocess.PIPE,stdout=subprocess.PIPE)
    checked=0
    try:
        for oid in ids:
            proc.stdin.write((oid+'\n').encode());proc.stdin.flush()
            header=proc.stdout.readline().decode().strip().split()
            if len(header)!=3:raise RuntimeError('Unexpected git object header')
            size=int(header[2]); data=proc.stdout.read(size); proc.stdout.read(1)
            scan_bytes(data,'Git object '+oid); checked+=1
    finally:
        proc.stdin.close();proc.wait(timeout=30)
    return checked


def build():
    if not (PACKAGE/'ai-records/记录清单.json').exists():
        raise RuntimeError('Run prepare first')
    head=command(['git','rev-parse','HEAD']).stdout.strip()
    branch=command(['git','branch','--show-current']).stdout.strip()
    assert branch=='main'
    dirty=command(['git','status','--porcelain','--untracked-files=no']).stdout.strip()
    if dirty:raise RuntimeError('Commit tracked changes before building the package')
    project=PACKAGE/'project'
    if project.exists():
        # Reuse only this tool's clean, generated snapshot; never reset the source checkout.
        assert project.resolve().parent==PACKAGE.resolve() and (project/'.git').is_dir()
        assert not command(['git','status','--porcelain'],cwd=project).stdout.strip()
        if command(['git','rev-parse','HEAD'],cwd=project).stdout.strip()!=head:
            command(['git','fetch',str(ROOT),'main'],cwd=project)
            command(['git','reset','--hard','FETCH_HEAD'],cwd=project)
        print('Reusing the verified, clean generated snapshot at the current source commit...',flush=True)
    else:
        print('Creating an independent repository snapshot with full history...',flush=True)
        command(['git','-c','core.longpaths=true','clone','--no-hardlinks','--config','core.longpaths=true',str(ROOT),str(project)])
        command(['git','remote','remove','origin'],cwd=project)
    assert command(['git','rev-parse','HEAD'],cwd=project).stdout.strip()==head
    assert not (project/'llm api.txt').exists()
    assert not (project/'提交材料').exists()
    template=(ROOT/'submission-tools/checkpoint2-report-template.md').read_text(encoding='utf-8')
    report=template.replace('{{HEAD_SHORT}}',head[:7]).replace('{{HEAD}}',head)
    (PACKAGE/'report.md').write_text(report,encoding='utf-8')
    (PACKAGE/'attachments/Git提交记录.txt').write_text(command(['git','log','--date=iso-strict','--format=%h %ad %s'],cwd=project).stdout,encoding='utf-8')
    checks=[]
    npm='npm.cmd' if os.name=='nt' else 'npm'
    for name,args in [('语法检查',[npm,'--prefix','poem-flow','run','check']),('自动测试',[npm,'--prefix','poem-flow','test'])]:
        p=command(args,cwd=project,allow_failure=True)
        (PACKAGE/f'attachments/{name}.txt').write_text(clean_string(p.stdout+p.stderr),encoding='utf-8')
        checks.append({'check':name,'command':' '.join(args),'exit_code':p.returncode,'executor':'Codex','fresh_packaged_copy':True})
        if p.returncode:raise RuntimeError(name+' failed in the packaged copy')
    p=command(['node',str(ROOT/'submission-tools/verify_checkpoint2.mjs'),str(project),str(PACKAGE/'attachments')],allow_failure=True)
    (PACKAGE/'attachments/离线浏览器复核.txt').write_text(clean_string(p.stdout+p.stderr),encoding='utf-8')
    if p.returncode:raise RuntimeError('Offline browser verification failed')
    checks.append({'check':'无真实密钥服务与浏览器回放','exit_code':0,'executor':'Codex','model_calls':0})
    print('Checking reachable Git history for the locally configured credential...',flush=True)
    objects=scan_git_history(project)
    frozen=0
    for name in command(['git','ls-files','-z'],cwd=project).stdout.split('\0'):
        if not name:continue
        if any(name.startswith(prefix) for prefix in ['experiments/poem-generation/runs/','experiments/poem-semantics/results/','poem-flow/verification/','docs/sources/']):
            if sha(ROOT/name)!=sha(project/name):raise RuntimeError('Recorded evidence changed in snapshot: '+name)
            frozen+=1
    files=command(['git','ls-files'],cwd=project).stdout.splitlines()
    record={'date':'2026-10-25','branch':branch,'commit':head,'checks':checks,'git_objects_scanned':objects,
            'known_credential_found':False,'frozen_evidence_files_matched':frozen,'project_tracked_files':len(files),
            'git_commit_count':int(command(['git','rev-list','--count','HEAD'],cwd=project).stdout.strip()),
            'fork_scope':'existing-real-fork-different-subtasks-not-controlled','original_workspace_not_rewritten':True}
    (PACKAGE/'attachments/本次复核结果.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    samples=[('poem-flow/verification/rules/sheet-1.png','共用规则画面总览-1.png'),
             ('poem-flow/verification/rules/sheet-2.png','共用规则画面总览-2.png'),
             ('poem-flow/verification/expanse/u01-sheet.png','已有抽象铺展对照.png')]
    for src,dst in samples:
        if (project/src).is_file():shutil.copy2(project/src,PACKAGE/'attachments'/dst)
    print(json.dumps({'phase':'snapshot_verified',**record},ensure_ascii=False),flush=True)


def archive():
    if not (PACKAGE/'attachments/本次复核结果.json').exists():raise RuntimeError('Build first')
    manifest=[]
    for folder,dirs,names in os.walk(PACKAGE):
        dirs[:]=[d for d in dirs if d not in ['.qa','node_modules','__pycache__','.pytest_cache']]
        dirs.sort();names.sort()
        for name in names:
            p=Path(folder)/name;rel=p.relative_to(PACKAGE).as_posix()
            if rel=='attachments/文件清单.json':continue
            if any(part in ['node_modules','.qa','__pycache__','llm api.txt'] for part in p.relative_to(PACKAGE).parts):
                raise RuntimeError('Excluded path in package: '+rel)
            if p.suffix.lower() in TEXT_SUFFIXES:scan_bytes(p.read_bytes(),rel)
            manifest.append({'file':rel,'bytes':p.stat().st_size,'sha256':sha(p)})
    (PACKAGE/'attachments/文件清单.json').write_text(json.dumps({'files':manifest},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    temp=ARCHIVE.with_suffix('.zip.partial')
    print('Writing ZIP including .git history and all required local assets...',flush=True)
    with zipfile.ZipFile(temp,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
        for folder,dirs,names in os.walk(PACKAGE):
            dirs[:]=[d for d in dirs if d not in ['.qa','node_modules','__pycache__','.pytest_cache']]
            dirs.sort();names.sort()
            for name in names:
                p=Path(folder)/name
                z.write(p,NAME+'/'+p.relative_to(PACKAGE).as_posix())
    temp.replace(ARCHIVE)
    print(json.dumps({'archive':str(ARCHIVE),'MB':round(ARCHIVE.stat().st_size/1048576,1),'sha256':sha(ARCHIVE),'files':len(manifest)+1},ensure_ascii=False),flush=True)


if __name__=='__main__':
    actions={'prepare':prepare,'preflight':preflight,'build':build,'archive':archive}
    if len(sys.argv)!=2 or sys.argv[1] not in actions:
        raise SystemExit('Usage: python submission-tools/build_checkpoint2.py prepare|preflight|build|archive')
    actions[sys.argv[1]]()
