"""Independently inspect the final ZIP without changing submission files."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import re
import zipfile
from io import BytesIO
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
archive = root / '提交材料/2025011764_刘阳_checkpoint1.zip'
prefix = archive.stem + '/'
credential_lines = (root / 'llm api.txt').read_text(encoding='utf-8-sig').splitlines()
secret = credential_lines[1].strip()
assert len(secret) > 12
with zipfile.ZipFile(archive) as z:
    names = z.namelist()
    assert z.testzip() is None
    assert len(names) == len(set(names))
    assert all(n.startswith(prefix) and '..' not in PurePosixPath(n).parts for n in names)
    assert {n[len(prefix):].split('/')[0] for n in names} == {'report.md', 'ai-records', 'attachments'}
    assert not any(part in {'.git', '.env', '.qa', 'llm api.txt', 'node_modules'} for n in names for part in PurePosixPath(n).parts)
    contents = {n[len(prefix):]: z.read(n) for n in names}
    assert all(secret.encode() not in data for data in contents.values())
    manifest = json.loads(contents['attachments/文件清单.json'])
    assert len(manifest['files']) == len(contents) - 1
    for item in manifest['files']:
        data = contents[item['file']]
        assert len(data) == item['bytes']
        assert hashlib.sha256(data).hexdigest() == item['sha256']
    report = contents['report.md'].decode('utf-8')
    assert '刘阳' in report and '2025011764' in report
    assert not re.search(r'OpenCode|待补齐|待补充', report, re.I)
    for source in ['The Nature of Code', 'sxywu', 'Lingdong Huang', 'Niels Pichon', 'LGPL-2.1', 'MIT', 'Apache-2.0']:
        assert source in report
    for name, data in contents.items():
        if name.endswith(('.md', '.txt', '.json')) and not name.startswith('ai-records/codex-'):
            assert not re.search(r'OpenCode|待补齐', data.decode('utf-8'), re.I), name
    pdf = PdfReader(BytesIO(contents['attachments/report.pdf']))
    assert len(pdf.pages) == 4
    assert all(len(page.extract_text()) > 200 for page in pdf.pages)
    assert all(secret not in page.extract_text() for page in pdf.pages)
    assert contents['attachments/report.pdf'] == (root / 'output/pdf/checkpoint1_report.pdf').read_bytes()
    logs = json.loads(contents['ai-records/记录清单.json'])
    for log in logs:
        text = contents['ai-records/' + log['file']].decode('utf-8')
        assert len(re.findall(r'^## \d{3}\s', text, re.M)) == sum(log['messages'].values())
    calls = [json.loads(data) for name, data in contents.items() if name.endswith('.result.json')]
    assert len(calls) == 4
    assert sum(c['usage']['total_tokens'] for c in calls) == 9406
    assert sum(c['validation']['valid'] for c in calls) == 2
    test_log = contents['attachments/本地测试运行日志.txt'].decode('utf-8')
    assert re.search(r'^.*\bpass 18\s*$', test_log, re.M)
    assert re.search(r'^.*\bfail 0\s*$', test_log, re.M)
print(json.dumps({'status': 'passed', 'files': len(contents), 'pdf_pages': len(pdf.pages), 'dialogue_messages': sum(sum(log['messages'].values()) for log in logs), 'source_licenses': 5, 'zip_bytes': archive.stat().st_size}, ensure_ascii=True))
