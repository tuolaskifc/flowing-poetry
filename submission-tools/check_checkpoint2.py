"""Independently validate the checkpoint-2 ZIP and repository snapshot, read-only."""
from pathlib import Path, PurePosixPath
import hashlib,json,re,subprocess,zipfile,sys

ROOT=Path(__file__).resolve().parents[1]
NAME='2025011764_刘阳_checkpoint2'
PACKAGE=ROOT/'提交材料'/NAME
ARCHIVE=PACKAGE.with_suffix('.zip')
prefix=NAME+'/'

with zipfile.ZipFile(ARCHIVE) as z:
    names=z.namelist()
    assert len(names)==len(set(names))
    assert all(n.startswith(prefix) and '..' not in PurePosixPath(n).parts for n in names)
    roots={n[len(prefix):].split('/')[0] for n in names}
    assert roots=={'report.md','ai-records','attachments','project'},roots
    assert prefix+'project/.git/HEAD' in names
    assert prefix+'project/README.md' in names
    assert prefix+'project/llm api.example.txt' in names
    assert not any(any(part in ['llm api.txt','node_modules','.qa','__pycache__'] for part in PurePosixPath(n).parts) for n in names)
    manifest=json.loads(z.read(prefix+'attachments/文件清单.json'))
    assert len(manifest['files'])==len(names)-1
    for entry in manifest['files']:
        data=z.read(prefix+entry['file'])
        assert len(data)==entry['bytes'],entry['file']
        assert hashlib.sha256(data).hexdigest()==entry['sha256'],entry['file']
    report=z.read(prefix+'report.md').decode('utf-8')
    result=json.loads(z.read(prefix+'attachments/本次复核结果.json'))
    assert result['commit'] in report and '刘阳' in report and '2025011764' in report
    assert '{{HEAD' not in report
    assert '子任务不同' in report
    assert re.search(r'pass 174\b',z.read(prefix+'attachments/自动测试.txt').decode('utf-8'))
    assert re.search(r'fail 0\b',z.read(prefix+'attachments/自动测试.txt').decode('utf-8'))
    records=json.loads(z.read(prefix+'ai-records/记录清单.json'))
    assert records['fork']['parent']=='01a14d2f-3f06-7ac0-ae3c-48318536fe17'
    assert records['fork']['child']=='01a1693d-b866-7a91-9fab-4ccbf751b205'
    assert records['fork']['same_fixed_task_controlled_experiment'] is False
    for entry in records['records']:
        messages=[json.loads(s) for s in z.read(prefix+'ai-records/'+entry['stem']+'.messages.jsonl').decode('utf-8').splitlines() if s]
        tools=[json.loads(s) for s in z.read(prefix+'ai-records/'+entry['stem']+'.tools.jsonl').decode('utf-8').splitlines() if s]
        assert len(messages)==sum(entry['messages'].values())
        assert len(tools)==entry['tool_events']
        assert all(m['role'] in ['user','assistant'] for m in messages)
        text=z.read(prefix+'ai-records/'+entry['stem']+'.md').decode('utf-8')
        assert len(re.findall(r'^## E\d+',text,re.M))==len(messages)

project=PACKAGE/'project'
def git(*args):return subprocess.check_output(['git',*args],cwd=project,text=True,encoding='utf-8').strip()
assert git('rev-parse','HEAD')==result['commit']
assert not git('status','--porcelain')
assert git('rev-parse','6dbd16c^{commit}')
assert git('rev-parse','9e2d593^{commit}')
assert int(git('rev-list','--count','HEAD'))==result['git_commit_count']
assert not git('remote')
verification=json.loads((PACKAGE/'attachments/离线浏览器复核.json').read_text(encoding='utf-8'))
assert verification['modelCalls']==0 and verification['pausePixelStable']
print(json.dumps({'status':'passed','zip_files':len(names),'zip_MB':round(ARCHIVE.stat().st_size/1048576,1),
                  'git_commits':result['git_commit_count'],'commit':result['commit'],'conversation_parts':len(records['records']),
                  'preserved_evidence_files':result['frozen_evidence_files_matched']},ensure_ascii=False))
