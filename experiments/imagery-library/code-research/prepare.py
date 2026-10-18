# -*- coding: utf-8 -*-
"""Create local launchers; preserve downloaded source and license files."""
from pathlib import Path
import json, re, hashlib

root=Path(__file__).resolve().parent
style='<style>html,body{margin:0;background:#f4f2eb;}canvas,svg{display:block;max-width:100vw;max-height:100vh;object-fit:contain;}</style>'
flower=(root/'flower/index.html').read_text(encoding='utf-8')
flower=flower.replace('https://d3js.org/d3.v4.min.js','../vendor/d3-4.13.0.min.js').replace('https://unpkg.com/p5@0.6.0/lib/p5.js','../vendor/p5-0.6.0.min.js').replace('https://unpkg.com/lodash@4.17.5/lodash.js','../vendor/lodash-4.17.5.min.js')
(root/'flower/local.html').write_text('<!-- Local launcher: dependency URLs only. Original: index.html / sxywu / MIT. -->\n'+flower,encoding='utf-8')
for demo in ['theatre','sailors','butterfly','fruitTrees','sunflowerSpiral']:
    p=root/'fresco/demos'/demo/'index.html'
    text=p.read_text(encoding='utf-8').replace('https://cdn.jsdelivr.net/npm/p5@1.2.0/lib/p5.min.js','../../js/external/p5.min.js').replace('https://unpkg.com/ccapture.js@1.1.0/build/CCapture.all.min.js','../../js/external/CCapture.all.min.js').replace('https://unpkg.com/p5.js-svg@1.1.1','../../js/external/p5.js-svg@1.1.1')
    text=text.replace('</head>',style+'</head>')
    (p.parent/'local.html').write_text('<!-- Local launcher: dependencies localized; display-only canvas CSS. Niels Pichon / Apache-2.0. -->\n'+text,encoding='utf-8')

tree=json.loads((root/'fresco-tree.json').read_text(encoding='utf-8'))
tree_files={x['path']:x for x in tree['tree'] if x['type']=='blob'}
brush_tree=json.loads((root/'brush-tree.json').read_text(encoding='utf-8'))
gist=json.loads((root/'flower-gist.json').read_text(encoding='utf-8'))
records=[]
for p in sorted(root.rglob('*')):
    if not p.is_file() or p.name=='local.html' or p.suffix=='.png' or '.qa' in p.parts: continue
    rel=p.relative_to(root).as_posix()
    if rel.startswith(('fresco/','vendor/','flower/','brush/')) or rel.startswith('shan-'):
        content=p.read_bytes();record={'file':rel,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()}
        if rel.startswith('fresco/'):
            path=rel.removeprefix('fresco/')
            if path in tree_files:
                git_sha=hashlib.sha1(b'blob '+str(len(content)).encode()+b'\0'+content).hexdigest()
                record['matchesGithubBlob']=git_sha==tree_files[path]['sha']
                assert record['matchesGithubBlob'],rel
                record['url']='https://raw.githubusercontent.com/NielsPichon/p5.Fresco/main/'+path
                record['gitBlob']=tree_files[path]['sha']
                record['blobApiUrl']='https://api.github.com/repos/NielsPichon/p5.Fresco/git/blobs/'+tree_files[path]['sha']
        records.append(record)
(root/'source-manifest.json').write_text(json.dumps({'date':'2026-10-18','frescoTree':tree['sha'],'brushTree':brush_tree['sha'],'flowerRevision':gist['history'][0]['version'],'originalFiles':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Prepared six offline launchers; recorded',len(records),'source/dependency files.')
