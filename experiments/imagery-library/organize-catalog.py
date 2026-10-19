# -*- coding: utf-8 -*-
"""Build a design-only imagery catalog; verify complete coverage of the saved 60 entries."""
from pathlib import Path
import json
from collections import Counter
from urllib.parse import urlencode

root=Path(__file__).resolve().parents[2]
out=root/'experiments/imagery-library'
source=json.loads((root/'docs/sources/quansongci/意象频次.json').read_text(encoding='utf-8'))
# id, label, suggested phase, source code/study (not integrated renderers), remaining work
families=[
('airflow','风的作用','首批','experiments/imagery-library/studies.js','已有风控制试作；需要独立作用场，不能一律画出可见风线。'),
('atmosphere','云与雾','首批','experiments/imagery-library/drawing/tools/cloud.js','已有独立结构化云形与薄雾工具；跨实体遮蔽尚未实现。'),
('moon','月体','首批','experiments/imagery-library/drawing/tools/moon.js','已有五种可选月形与亮边方向；默认弯月，不自动推断诗句中的圆缺。'),
('water','水面','首批','experiments/imagery-library/drawing/tools/water.js','已有独立水纹与风响应；岸线、流向与承载仍待实现。'),
('precipitation','雨雪粒子','首批','experiments/imagery-library/drawing/tools/snow.js','雨线、雪点与静止积雪已有独立试画；累积和实体附着未实现。'),
('surface_weather','露霜附着','扩展','experiments/imagery-library/drawing/tools/grass.js','已有草叶露珠与覆霜；其他载体与地表附着仍待实现。'),
('grass','草叶簇','首批','experiments/imagery-library/drawing/tools/grass.js','已有九簇草叶及风响应；其他草种和地表组织待扩展。'),
('branch','枝干与叶片','首批','experiments/imagery-library/code-research/shan-index.html','已有通用树、柳形与竹竿叶簇；梧桐、松柏、芭蕉仍待专门形态。'),
('flower','花瓣与花冠','首批','experiments/imagery-library/drawing/tools/plum-branch.js','已有通用花、带花苞梅枝和梅／菊／莲花冠示意；桃花、兰与其他整株组合仍待做，辨识待审阅。'),
('petal_drift','离枝花瓣与飞絮','首批','experiments/imagery-library/drawing/tools/falling-petals.js','已有落花与独立细丝柳絮试画；从枝条脱离仍未实现。'),
('bird','鸟体与鸟群','首批','experiments/imagery-library/sources/noc-boid.js','群体运动已试跑；鸟体、物种特征、单体栖息与扑翼仍待细化。'),
('fish','鱼体','扩展','experiments/imagery-library/drawing/tools/fish.js','已有独立单鱼轮廓、鳍、尾与摆尾；鱼种、群游和水体交互未实现。'),
('insect','虫体','扩展',None,'待制作虫体；只有鸣声依据时不自动添加可见虫体。'),
('horse','马体','扩展',None,'待制作轮廓、步态与肢体结构；第一版暂缓。'),
('boat','舟船与桨','首批','experiments/imagery-library/drawing/tools/boat.js','已有独立船体与甲板锚点，不自动加船夫；桨、帆与真正载人关系尚未实现。'),
('architecture','楼亭与栏杆','首批','experiments/imagery-library/drawing/tools/building.js','已有独立空亭与二层／三层写意楼体；楼用曲檐墨面、断笔和疏窗，亭保留折檐。未实现人物登楼或楼内活动。'),
('liquid_container','酒液与容器','扩展','experiments/imagery-library/drawing/tools/wine.js','已有酒液局部、杯中酒与酒壶试画；默认不补杯，饮酒活动仍须语境处理。'),
('instrument','乐器形体','扩展',None,'琴、瑟、笛分别制作；形体与声音分开，暂不实现音频。'),
('fruit','果实','扩展','experiments/imagery-library/code-research/fresco/demos/fruitTrees/sketch.js','有通用果实示例，不代表已有梅子形态；需确认外形与附着。'),
('human_detail','人物局部','扩展',None,'眉、眼、面部局部待做；人物指代或比喻不能机械添加人脸。')]
family_map={f[0]:{'id':f[0],'name':f[1],'phase':f[2],'code_reference':f[3],'status':f[4]} for f in families}
# original term | treatment | possible family ids | visual distinction / required context
text='''风|作用|airflow|作为作用场影响已有主体；可见流线仅是待选择的艺术表达。
云|变体|atmosphere|保留云团轮廓；与烟雾共享部分色层方法但不视为同义词。
月|形态|moon|保留月体；月色、月影与月体是否可见分别判断。
水|形态|water|水面基础形态，具体尺度与流向由语境决定。
雨|变体|precipitation|雨滴与雨线；雨势不直接决定情感配色。
酒|待语境|liquid_container|酒液、酒器、饮酒活动均可能；不自动补出酒杯或饮酒者。
楼|变体|architecture|楼体轮廓，和长亭共享建筑方法但保持层高与结构差异。
梅|组合|branch,flower|先判断花、枝或整株；可复用枝条与花瓣，仍需梅的辨识特征。
柳|变体|branch|枝条下垂与叶形待做；不能仅把通用树叫作柳。
雪|变体|precipitation,surface_weather|飘雪与积雪分开；原文未表明降雪时不自动下雪。
露|附着|surface_weather|附着水珠或局部亮点，需有载体或明确的抽象表达。
草|形态|grass|草叶簇与地表组织；不以通用枝树替代。
霜|附着|surface_weather|附着覆层，不默认持续飘落。
竹|变体|branch|节、竿、窄叶需要独立规则，可共享局部枝叶方法。
莺|变体|bird|共用鸟体与运动骨架，保留物种名；不靠标签宣称已辨认。
兰|组合|flower,grass|花与长叶可分层组织；不直接等同于草。
马|形态|horse|需要独立身体结构和姿态，暂缓专门绘制。
舟|合并|boat|与船共用基础舟船单元；大小、用途、帆桨按原文和艺术选择细化。
鱼|形态|fish|鱼体和摆尾独立制作，群游方法可另行复用。
船|合并|boat|与舟共享绘画入口，原词和语义解释仍保留。
莲|组合|flower,grass|莲花与叶片的组合按语境选择，花冠与叶片均需专门变体。
鸦|变体|bird|保留鸟种与数量，颜色服从意象特征及配色协调。
桃花|变体|flower,branch|可借用枝条与花瓣，仍需检验花形与着生方式。
蝉|待语境|insect|若只是听到蝉鸣，交给声音线索处理，不自动画出虫体。
长安|场景||保留地点／文化语境；不凭地名生成固定城楼或特定历史建筑。
鸳鸯|变体|bird|鸟体可共用；数量、成对关系和象征含义不由名称强制生成。
落花|过程|petal_drift,flower|花瓣形态与离枝／落地状态分开；不默认无限生成或满场循环。
燕子|变体|bird|共用运动方法，尾形与飞行姿态需专门变体。
杨花|待语境|petal_drift|暂保留原词；确认所指后才与飞絮单元对应，不直接当作柳絮的固定别名。
梧桐|变体|branch|树冠、叶片特征待做；共享枝条不代表已有该树种。
长亭|变体|architecture|亭体与柱、檐的轮廓；不自动补成送别事件。
南浦|场景||在语境明确时可组织水岸、行旅等场景；不设独立固定图标。
潇湘|场景||保留地域与语境，山水、岸线等是否出现需有依据。
杜鹃|待语境|bird,flower|可能涉及鸟或花等所指；本目录不代替具体诗句消歧。
登高|动作||交给人物动作、视点与构图；不设登高物体，不自动添加高山。
红叶|变体|branch|复用叶片形态，保留局部红色特征；在枝还是飘落另行判断。
江水|变体|water|与水共享单元，保留江面尺度、岸线、流向等候选参数；不改写原统计。
菊花|变体|flower|多瓣结构待设计，与梅、桃花共享生成接口而非同一轮廓。
桃源|场景||保留语境与艺术意图，不自动添加桃树林或认定具体地点。
柳絮|变体|petal_drift|细絮形态与飘移；与落花共享运动方法但保留不同质感。
芭蕉|变体|branch|宽叶与叶柄结构，不能直接由通用树改名得到。
眉黛|待语境|human_detail|先判断具体眉部、人物指代或其他用法；不自动补出完整人物。
凭栏|动作|human_detail,architecture|动作与人物—栏杆关系；不将人物局部单元视为已有完整人形。
沙鸥|变体|bird|保留鸟种；是否栖息水岸及数量要另行判断。
梅子|附着|fruit,branch|果实与承载枝条可组合；不把梅花和梅子合成同一视觉形态。
秦楼|待语境|architecture|判断实际楼宇还是借代／典故；仅在适宜时使用楼体变体。
鹧鸪|待语境|bird|鸟体与鸣声分开；所指及呈现方式需依具体语境。
黄叶|变体|branch|与红叶共用叶片结构，保留色彩差别；不因黄色就自动飘落。
六朝|背景||历史背景与语境，不设独立可绘物体，也不擅自添加历史建筑。
兰桡|待语境|boat|先判断指桨还是借代舟船；桨与船不是可无条件合并的实体。
鸿雁|变体|bird|共用鸟体与运动；雁形、队列、传书等含义要分别确认。
青鸟|待语境|bird|判断具体鸟体、传信形象或其他用法；不机械画成蓝色小鸟。
烟雾|变体|atmosphere|与云共享部分绘制方法，保留柔边、透叠与遮蔽的差别；不凭空补火源。
松柏|变体|branch|可共用枝干基础，但名称包含的差别及具体树形仍需语境和变体设计。
金陵|场景||保留地点与语境，不以单一建筑替代整个地点。
猿啼|声音| |声音事件优先；若画猿体，需要额外语境或明确艺术选择，当前无猿体单元。
羌笛|待语境|instrument|笛的形体与笛声分开；只出现听觉线索时不自动补演奏者。
琴瑟|组合|instrument|保留琴与瑟的区别；不能合成一个已经确定的通用乐器图标。
蟋蟀|待语境|insect|虫体与鸣声分开，具体是否可见需确认。
哀鸿|待语境|bird|具体鸟体、群体处境或比喻等所指需确认，不直接等同于鸿雁实体。'''
rows={}
for line in text.splitlines():
    name,route,ids,note=[x.strip() for x in line.split('|')]
    assert name not in rows,name
    fs=[x for x in ids.split(',') if x]
    assert all(x in family_map for x in fs),name
    rows[name]={'treatment':route,'candidate_families':fs,'note':note,'status':'语义映射仍是设计候选，未接入正式诗句生成流程'}
names={x['imagery'] for x in source['items']}
assert set(rows)==names,{'missing':list(names-set(rows)),'extra':list(set(rows)-names)}
for f in family_map.values():
    if f['code_reference']:assert (root/f['code_reference']).is_file(),f
items=[{**x,**rows[x['imagery']]} for x in source['items']]
progress_document=json.loads((out/'progress-records.json').read_text(encoding='utf-8'))
progress=progress_document['records']
date=progress_document['date']
assert all(a['count']>=b['count'] for a,b in zip(items,items[1:])), 'Expansion order must retain descending source frequency'
manifest=json.loads((out/'drawing/tool-manifest.json').read_text(encoding='utf-8'))
tool_map={tool['id']:tool for tool in manifest['tools']}
stages={'basic':'基础可画','partial':'部分支持','todo':'待制作','handoff':'转交其他模块'}
assert set(progress)==names,'Progress must cover all 60 original terms exactly'
for item in items:
    record=progress[item['imagery']]
    assert record['stage'] in stages and record['remaining'] and record['available'],item['imagery']
    assert len(record['tools'])==len(set(record['tools'])),item['imagery']
    assert all(t in tool_map for t in record['tools']),item['imagery']
    for tool_id,preset in record.get('presets',{}).items():
        assert tool_id in record['tools'],item['imagery']
        fields={f['id']:f for f in tool_map[tool_id].get('controls',[])}
        assert all(key in fields and any(c['value']==value for c in fields[key]['choices']) for key,value in preset.items()),item['imagery']
    if record['stage'] in ['basic','partial']:assert record['tools'],item['imagery']
    item['progress']={**record,'label':stages[record['stage']]}
stage_counts=Counter(item['progress']['stage'] for item in items)
progress_summary={'total':len(items),'tools':len(tool_map),'stages':{key:{'label':label,'count':stage_counts[key]} for key,label in stages.items()},'needs_context':sum(item['progress']['needs_context'] for item in items),'basic_generation_trial':True,'full_semantic_visual_integration':False,'art_review':'待用户审阅'}
data={'catalog_version':'0.3-frequency','date':date,'status':'设计映射与实际试画进度，不是模型输出协议',
      'basis':'已保存的新华网统计条目与本项目设计讨论；词义提示不是经过词书核实的文学注释',
      'source':'docs/sources/quansongci/意象频次.json','progress_summary':progress_summary,'families':list(family_map.values()),'items':items}
(out/'意象目录.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(out/'progress-data.js').write_text('/* Generated by organize-catalog.py; edit progress-records.json instead. */\nwindow.PoemProgress = '+json.dumps({'summary':progress_summary,'items':items,'tools':manifest['tools'],'sources':manifest['sources']},ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
counts=Counter(x['treatment'] for x in items)
lines=['# 流动诗：意象目录与绘画单元','',f'版本：0.3 高频扩展 · {date}。整体职责仍以 [设计规范](../../docs/设计规范.md) 为准。',
'','## 这次整理的结论','','原始 60 个条目全部保留并逐项安排去向；建议用 **20 类绘画方法**组织，其中 **12 类作为首批范围建议**，并非一次全部实现，也不表示用户已经确认数量。',
'','语义名称与绘画入口分开：共享绘画代码，不等于合并词义。原统计名称、频次均未改写，也不把它们转换成新合并频次。',
'','### 扩展顺序','','按原意象频次从高到低补缺口，已有基础形态先保留；非物体和歧义条目明确去向，共用代码不改写原频次。工具可以共用接口，不能因样例诗句需要就跳到低频项。',
'','本轮依次处理酒（4,546）、楼（3,129）、梅（2,973）；下一批从露（2,157）、霜（1,541）、莺（1,435）继续。风已有共用作用参数；空间风场属于后续作用关系工作，不阻塞基础形态扩展。',
'','### 合并与移交规则','','- 舟、船：共享入口，原词保留；兰桡涉及桨／舟船的选择，不能直接并成船。',
'- 水、江水：共享水面方法，保留尺度、流向和岸线等需要语境支持的参数。',
'- 梅、桃花、菊花、兰、莲：共用部分花瓣方法，需有各自的形态变体，不靠换色代替区别。',
'- 莺、燕、鸦、雁、鸥等：共用鸟体和运动骨架，具体外形、数量和行为另行判断。',
'- 云、烟雾：部分方法可复用，轮廓、透明度和遮蔽表现分开。',
'- 登高、凭栏：移交动作、视点和关系模块；不作为独立物体。',
'- 地名、六朝等：保留场景与背景信息；不再为每个名称单独找一张图。',
'- 鸣声、典故或歧义：进入语境确认，不以随机图形顶替。',
'','## 二十类绘画方法','','下表记录方法层面的现状；具体词条进度以六十项总表为准。只有来源源码、通用形态或部分接口，不代表某个具体物种已经实现。',
'','| 方法 | 建议阶段 | 已有依据与剩余工作 |','| --- | --- | --- |']
for f in family_map.values():lines.append(f"| {f['name']} | {f['phase']} | {f['status']} |")
lines += ['','首批 12 类：'+ '、'.join(f['name'] for f in family_map.values() if f['phase']=='首批')+'。',
'','这些是绘画方法类别，不是 20 种物体。例如“风”属于作用，“露霜”需要附着载体；一条诗句可以组合多种方法。',
'','## 六十项进度总表','','[打开可筛选的网页进度表](progress.html)。同一份进度记录生成本表和网页，按原统计顺序保留全部 60 项。',
'','当前：'+'；'.join(f'{stages[key]} {stage_counts[key]}' for key in stages)+f'。另有 {progress_summary["needs_context"]} 项需要具体语境判断；语境标记不代表该项绘画已完成。',
'','“基础可画”只表示已有该目标的本地形态试画，全部仍待审美确认；“部分支持”表示目标的一部分已实现；通用花、树、鸟的代码不能让未制作的具体物种自动升级。已另做[基础诗句组合试验](../poem-generation/README.md)，不表示全部条目或完整关系已接入。',
'','处理数量：'+'；'.join(f'{k} {v}' for k,v in counts.items())+'。',
'','“待语境”的条目不自动选中某一候选；所有词义提示是本项目的设计审阅提醒，尚未逐条核对词书或原诗，不能作为文学定论。',
'','| 原条目 | 原频次 | 进度 | 已有能力／试画 | 剩余工作 | 语义处理 |','| --- | ---: | --- | --- | --- | --- |']
for x in items:
    fs='、'.join(family_map[k]['name'] for k in x['candidate_families']) or '交其他模块'
    pr=x['progress']
    links='、'.join(f"[{tool_map[t]['name']}](index.html?{urlencode({'tool':t,**pr.get('presets',{}).get(t,{})})}#{t})" for t in pr['tools'])
    context='；需语境确认' if pr['needs_context'] else ''
    lines.append(f"| {x['imagery']} | {x['count']:,} | {pr['label']}{context} | {pr['available']} {links} | {pr['remaining']} | {x['treatment']}：{x['note']} |")
lines += ['',f'当前共 {len(tool_map)} 类工具，见 [独立工具与来源](drawing/README.md)。登记的工具数量不等于完成的文学意象数量；全部试画仍待用户审美确认。','','## 绘画单元需要提供什么','','每个单元后续至少记录：','',
'1. 身份与变体：原词、规范含义、形态类型，以及同一实体的持续身份。',
'2. 形态结构：轮廓、局部特征、锚点与边界；花、叶、果实等是否可分离。',
'3. 可用接口：位置、尺度、方向、笔触疏密；颜色由情感与配色模块统一传入。',
'4. 可承接的作用：风、承载、依附、遮蔽、靠近等；只列已实现能力。',
'5. 状态与时间：生长、静止、离枝、飘落、消散等；否定与完成范围由逻辑和时间模块约束。',
'6. 来源和验收：作者、代码入口、许可、实际截图、未实现特征；明确是否能辨认具体花鸟。',
'','不要为了画面完整，擅自添加鸟、人物、酒杯、火源或默认配对。月体光感不取代情感配色；形态疏密不取代主体数量；单元自身的默认微动也不能覆盖原文否定。',
'','## 已完成与未完成','','已完成：60 项的覆盖检查、绘画方法归并建议、特殊条目转交规则、源码定位与可读取目录。',
'','未完成：表中待制作的专门形态、全部花鸟树种的识别验证、完整关系与逻辑编排、与模型协议 3.0 的完整对齐、任意诗句的完整自动绘画。基础组合试验使用明确限制的本地映射，`candidate_families` 不直接作为运行时绘图指令。',
'','已取得代码见 [第二轮检索](code-research/README.md)。可读取数据见 [意象目录.json](意象目录.json)。原始提取见 [新华网意象记录](../../docs/sources/quansongci/意象提取.md)。']
(out/'意象目录.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
report={'source_count':len(source['items']),'catalog_count':len(items),'unique_terms':len(rows),'families':len(family_map),'suggested_first_phase':sum(f['phase']=='首批' for f in family_map.values()),'treatments':dict(counts),'missing':[],'unknown_family_ids':[],'code_references_exist':True}
report['progress_summary']=progress_summary
(out/'catalog-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
