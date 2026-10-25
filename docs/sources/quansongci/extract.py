# -*- coding: utf-8 -*-
from pathlib import Path
import json, re, hashlib
from collections import Counter
root=Path('docs/sources/quansongci')
s=(root/'index.bundle.js').read_text(encoding='utf-8')
def obj_at(marker):
    start=s.index(marker)+len(marker)
    return json.JSONDecoder().raw_decode(s[start:].lstrip())[0]

anchor=s.index('"点绛唇": {')
start=s.rfind('e.exports = ',0,anchor)+len('e.exports = ')
freq=json.JSONDecoder().raw_decode(s[start:])[0]
anchor=s.index('"辛弃疾": {',s.index('r.id = 458'))
start=s.rfind('e.exports = ',0,anchor)+len('e.exports = ')
emotions=json.JSONDecoder().raw_decode(s[start:])[0]
totals=Counter()
for d in freq.values():
    for name,n in d.items():
        assert isinstance(n,int)
        totals[name]+=n
rows=[{'rank':i,'imagery':k,'count':v} for i,(k,v) in enumerate(totals.most_common(),1)]
(root/'意象频次.json').write_text(json.dumps({'source':'https://fms.news.cn/swf/2018_sjxw/quansongci/index.html#/','extracted_on':'2026-10-18','method':'与网页 FreqLine 相同，逐词牌累加模块 163 的意象计数；不重新分析诗词。','ci_pattern_count':len(freq),'imagery_count':len(rows),'items':rows},ensure_ascii=False,indent=2),encoding='utf-8')
(root/'词牌意象原始数据.json').write_text(json.dumps(freq,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'词人意象情绪原始数据.json').write_text(json.dumps(emotions,ensure_ascii=False,indent=2),encoding='utf-8')
lines=['# 新华网《宋词缱绻，何处画人间》意象提取','','来源：[原网页](https://fms.news.cn/swf/2018_sjxw/quansongci/index.html#/) · 提取日期：2026-10-18。','','## 范围与口径','','- 原页面注释说明：基于学者判断遴选 57 个常见意象，不是穷尽全部宋词意象，也不是自动筛出的前 57 名。',f'- 注意：网页注释写 57 个，但实际数据合并得到 60 个不同条目。保留全部原始条目，不擅自删减为 57 个。差异原因尚未确认。',f'- 从公开 index.bundle.js 提取词牌—意象数据（模块 163）：{len(freq)} 个词牌，合并后 {len(rows)} 个意象。', '- 以下频次按页面 FreqLine 的计算方法，逐词牌累加原始计数；未重新统计诗词全文。原脚本未在此模块给出分词、同义词合并、重复出现计次等完整规则，因此不称为“含该意象的作品数”。',f'- 词人—意象—情绪图使用另一组数据（模块 459）：{len(emotions)} 位词人，{len(set(k for d in emotions.values() for k in d))} 个意象，情绪为喜、思、怒、乐、哀；不可混作 57 类的完整情绪统计。','','## 实际提取的意象及网页统计频次','','| 排名 | 意象 | 频次 |','| --- | --- | ---: |']
lines += [f"| {r['rank']} | {r['imagery']} | {r['count']:,} |" for r in rows]
lines += ['','## 可回查文件','','- `index.bundle.js`：公开页面脚本原文件，仅保存供回查，没有执行。','- `意象频次.json`：排序后的意象及计数。','- `词牌意象原始数据.json`：原脚本数据模块 163。','- `词人意象情绪原始数据.json`：原脚本数据模块 459。','- `extract.py`：提取与汇总脚本。',f'- 原脚本 SHA-256：`{hashlib.sha256((root/"index.bundle.js").read_bytes()).hexdigest()}`。','','## 对流动诗的用途','','可用作意象形态库的候选目录。该页面的五类情绪与本项目的 16 类情感没有现成的一一映射；具体诗句仍需结合语境判断。']
(root/'意象提取.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('词牌数',len(freq),'意象数',len(rows),'词人数',len(emotions),'情绪图意象数',len(set(k for d in emotions.values() for k in d)))
print(json.dumps(rows,ensure_ascii=False))

