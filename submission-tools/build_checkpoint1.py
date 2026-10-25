# -*- coding: utf-8 -*-
"""Build an honest, redacted checkpoint-1 review package from verified evidence.
Run with the bundled Python (reportlab, pypdf, Pillow). No API calls are made.
"""
from pathlib import Path
from datetime import datetime, timezone, timedelta
from collections import Counter
import hashlib, html, json, re, shutil, subprocess, zipfile
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'提交材料'
NAME='刘阳';STUDENT='2025011764'
PACKAGE=OUT/f'{STUDENT}_{NAME}_checkpoint1'
PDFOUT=ROOT/'output/pdf/checkpoint1_report.pdf'
for p in [PACKAGE/'ai-records',PACKAGE/'attachments/generation-results',PDFOUT.parent,ROOT/'tmp/pdfs']:
    p.mkdir(parents=True,exist_ok=True)

keys=[]
credential=ROOT/'llm api.txt'
if credential.exists():
    lines=[s.strip() for s in credential.read_text(encoding='utf-8-sig').splitlines() if s.strip() and not s.startswith('#')]
    for s in lines:
        if s.startswith('LLM_API_KEY='):keys.append(s.split('=',1)[1].strip('\"\''))
    if len(lines)>=2 and not any(s.startswith('LLM_') for s in lines):keys.append(re.sub(r'^Bearer\s+','',lines[1]))
project_variants=[str(ROOT),ROOT.as_posix()]
def redact(text):
    for key in keys:
        if key:text=text.replace(key,'[API Key 已脱敏]')
    text=re.sub(r'\bsk-[A-Za-z0-9_-]+','[API Key 已脱敏]',text)
    for p in project_variants:text=text.replace(p,'[项目目录]')
    text=text.replace('C:\\Users\\Liu Mie','[个人目录]').replace('C:/Users/Liu Mie','[个人目录]')
    text=text.replace('C:/Users/Liu%20Mie','[个人目录]')
    return text

SESSIONS=[
    ('codex-01-语义接口实验完整可见对话.md',Path(r'C:/Users/Liu Mie/.codex/sessions/2026/10/18/rollout-2026-10-18T10-42-17-01a14ce3-72cc-7290-a071-6bf019692ee8.jsonl'),'语义接口实验与设计讨论',None),
    ('codex-02-意象库与生成通路完整可见对话.md',Path(r'C:/Users/Liu Mie/.codex/sessions/2026/10/18/rollout-2026-10-18T12-05-04-01a14d2f-3f06-7ac0-ae3c-48318536fe17.jsonl'),'意象库与基础生成通路','能否现在根据课程网站')
]
exports=[]
for dest,path,title,stop in SESSIONS:
    lines=[f'# {title}：Codex 可见文字对话（脱敏）','',
      '工具：Codex。本文件是实际编程实践的可见文字对话导出。',
      '范围：保留本段实践中已保存的全部用户/助手可见文字，按原顺序排列；不删去失败或修改过程。',
      '导出边界：不包含系统/开发者提示、隐藏推理、自动注入的界面与环境状态、工具内部原始输入输出及图片二进制。代表性画面另附 attachments/。这些边界不是对原始回答的修复。',
      '脱敏：API Key、个人目录以及与本作业无关的内部记忆来源标记；所有脱敏均有标记。',
      '第二段在课程提交要求讨论开始前结束，不包含本次压缩包整理过程。','']
    counts=Counter();models=set();timestamps=[]
    for raw in path.open(encoding='utf-8'):
        data=json.loads(raw);p=data.get('payload',{})
        if data.get('type')=='turn_context' and p.get('model'):models.add(p['model'])
        if data.get('type')!='response_item' or p.get('type')!='message':continue
        role=p.get('role');channel=p.get('channel','')
        if role not in ['user','assistant'] or channel in ['analysis','summary','justify','confidence']:continue
        parts=[c.get('text','') for c in p.get('content',[]) if isinstance(c,dict) and c.get('type') in ['input_text','output_text','text']]
        text='\n'.join(parts)
        if role=='user' and stop and stop in text:break
        for tag in ['environment_context','in-app-browser-context','external_codex_apps_open_page','permissions','turn_aborted']:
            text=re.sub(r'<'+re.escape(tag)+r'\b[^>]*>[\s\S]*?</'+re.escape(tag)+r'>','',text)
        text=re.sub(r'<oai-mem-citation>[\s\S]*?</oai-mem-citation>','[内部记忆来源标记已省略]',text)
        text=text.strip()
        if not text:continue
        if text.startswith(('# AGENTS.md instructions','The following is the Codex agent history')):continue
        stamp=data.get('timestamp','');timestamps.append(stamp);counts[role]+=1
        lines.extend([f'## {sum(counts.values()):03d}　'+('用户' if role=='user' else '助手')+f'　{stamp}', '', redact(text), ''])
    (PACKAGE/'ai-records'/dest).write_text('\n'.join(lines),encoding='utf-8')
    exports.append({'file':dest,'title':title,'model_ids':sorted(models),'messages':dict(counts),'start':timestamps[0] if timestamps else None,'end':timestamps[-1] if timestamps else None,'raw_source_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'scope':'完整可见文字；不含隐藏推理、系统提示、工具内部原始数据及图片二进制'})
(PACKAGE/'ai-records/记录清单.json').write_text(json.dumps(exports,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

for src,dest in [
 ('experiments/poem-generation/generated-scene.png','attachments/生成画面-月水石.png'),
 ('experiments/imagery-library/new-tools-preview.png','attachments/意象绘画工具预览.png'),
 ('experiments/imagery-library/progress-preview.png','attachments/六十项意象进度表.png'),
 ('experiments/poem-generation/verification.json','attachments/生成页面浏览器验证.json'),
 ('experiments/imagery-library/catalog-check.json','attachments/意象覆盖检查.json')]:
    shutil.copy2(ROOT/src,PACKAGE/dest)
records=[]
for i,p in enumerate(sorted((ROOT/'experiments/poem-generation/runs').glob('*/result.json')),1):
    d=json.loads(p.read_text(encoding='utf-8'));records.append(d)
    (PACKAGE/f'attachments/generation-results/{i:02d}.result.json').write_text(redact(p.read_text(encoding='utf-8')),encoding='utf-8')
    (PACKAGE/f'attachments/generation-results/{i:02d}.response.txt').write_text(redact((p.parent/'response.txt').read_text(encoding='utf-8')),encoding='utf-8')
total_tokens=sum((d.get('usage') or {}).get('total_tokens',0) for d in records)
run=lambda args:subprocess.run(args,cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace')
git=run(['git','log','--format=%h %ad %s','--date=iso-strict'])
node_version=run(['node','--version']).stdout.strip();git_version=run(['git','--version']).stdout.strip()
(PACKAGE/'attachments/Git提交记录.txt').write_text(redact(git.stdout),encoding='utf-8')
tests=run(['node','--test','experiments/poem-generation/flow.test.mjs','experiments/poem-semantics/contract-v3/validate.test.mjs'])
(PACKAGE/'attachments/本地测试运行日志.txt').write_text(redact(tests.stdout+tests.stderr),encoding='utf-8')
assert tests.returncode==0,'Local checks failed; do not label them passed'
runtime=f'Windows，系统内核版本 10.0.26300.0；Node.js {node_version}；{git_version}。'
models=sorted(set(d['model'] for d in records));model='、'.join(models)
checks=json.loads((ROOT/'experiments/poem-generation/verification.json').read_text(encoding='utf-8'))
summary=['# 运行证据说明','',runtime,'',
 '以下是 Codex 开发过程中的实际运行证据。命令、自动测试与浏览器检查由 Codex 执行，报告中的功能要求和设计取舍来自用户对话。','',
 f'诗句分析接口：{len(records)} 次真实请求，{sum(bool(d["validation"]["valid"]) for d in records)} 次基础意象模式通过，2 次完整关系请求失败。合计 {total_tokens} token。',
 '模型返回名称：'+model+'。失败的关系没有自动修复后冒充成功。','',
 '生成页面浏览器检查：'+checks['status']+'；月、水、石三层组合、透明背景、暂停、PNG 数据导出与窄屏布局已检查。',
 '本地自动检查：18 项通过，完整运行输出见 本地测试运行日志.txt。','',
 '证据文件均来自本项目已有运行记录；本次打包不新增诗词或模型调用。']
(PACKAGE/'attachments/运行证据说明.md').write_text('\n'.join(summary)+'\n',encoding='utf-8')

blocks=[]
def title(t):blocks.append(('title',t))
def h(t):blocks.append(('h',t))
def p(t):blocks.append(('p',t))
def table(rows,widths=None):blocks.append(('table',rows,widths))
def page():blocks.append(('page',))
title('流动诗｜检查点 1：选题与启动')
p(f'姓名：{NAME}　　学号：{STUDENT}　　日期：2026-10-18')
p('主要类别：软件开发；具体方向是诗句驱动的生成艺术与交互可视化网页。')
h('一、项目简介与本学期目标')
p('我想做一个把中文诗句转成动态画面的网页，暂名“流动诗”。使用者可以输入一句诗，或从今日诗词取得一句推荐诗，观看其中已经支持的意象如何进入同一张画面，并暂停、换形态或保存图片。')
p('模型只解释文字，程序决定怎样画。我不打算让运行时模型生成并执行绘图代码，而是先整理可复用的本地绘画工具，再用固定规则连接意象和图形。这样，同一意象的变化、绘画来源以及没有完成的部分都能被核对。')
p('本学期先以电脑网页为主，围绕有限的可用意象改进输入、解释、组合和交互。第一步先让少量受支持的诗句跑通，再扩充形态和逻辑。当前已有 20 个试画工具，但并不表示原统计中的 60 项全部完成。完整关系、情感驱动、跨物体作用和安卓移植仍是后续工作。')
h('二、技术栈、AI 工具与已有基础')
table([
 ['技术或工具','用途与选择理由'],
 ['HTML / CSS / JavaScript','制作浏览器界面与交互，便于本地运行和观察画面。'],
 ['p5.js 2.3.3','绘制和更新动态图形；已有工具可以拆成独立单元复用。'],
 ['Node.js','提供本地页面和模型请求服务；密钥只在后端读取。'],
 ['Codex','本次实际辅助编写、修改、运行与调试；我提出功能边界并审阅结果。'],
 ['今日诗词与模型接口','前者按官方浏览器 SDK 取句，后者提取语义。程序中的诗句模型为 '+model+'。']
],[112,365])
p('绘画部分采用检索现成实现、核对许可、拆出需要的几何与运动、接入本地工具的做法。枝树、水纹、鸟群参考 The Nature of Code，花瓣改编自 sxywu，舟、石、亭取用 Shan, Shui 的部分几何，云形改编自 p5.Fresco。本项目补充共用工具接口、参数、风响应、来源登记、进度表、语义校验与组合页面。具体来源、许可和改动见第七节。')
page()
h('三、首次 AI 编程实践：跑通诗句到画面的通路')
p(runtime+' 实际使用的编程助手为 Codex，会话记录中的模型标识为 gpt-6.1-sol。诗句分析接口另用 '+model+'；二者分别承担开发辅助和程序运行时的文字分析。')
p('这次的小任务是先验证“取诗句 → 提取基础意象 → 选择已有工具 → 合成画面”。我要求保留固定的输出结构、失败和不确定性；没有对应形态时说明缺口，不用通用树、花或鸟随意替代。主要上下文是项目设计文档、已有绘画工具及诗句分析协议。')
p('Codex 完成了取句、模型请求、固定格式检查、局部绘画规则和网页连接，并执行了测试与浏览器检查。第一次推荐句为“兰有秀兮菊有芳，怀佳人兮不能忘”。完整关系请求连续两次缺少关系对象，被校验器拒绝；随后明确缩小为基础意象模式，重新请求并通过，原来的失败记录保留。')
table([
 ['输入 / 请求','实际结果','token'],
 ['推荐句：完整关系第 1 次','关系缺少对象，未出图','2375'],
 ['推荐句：补强提示后第 2 次','仍未通过，未出图','2475'],
 ['推荐句：基础意象模式','菊花冠出图，兰和佳人留空','2274'],
 ['明月松间照，清泉石上流。','月、水、石组合，松形留空','2282']
],[180,240,57])
p(f'接口合计 {len(records)} 次请求、{total_tokens} token；费用以账单为准。基础模式要求关系列表为空，不是修改先前失败的回答。18 项本地检查通过；浏览器已检查透明图层、暂停、PNG 数据导出和 390 像素窄屏，不能据此声称全部设备或全部诗句都通过。')
blocks.append(('image',str(PACKAGE/'attachments/生成画面-月水石.png'),368,230,'图 1　实际生成试画：月、水、石；松树未制作，未用通用树替换。'))
page()
h('四、我与 AI 的分工和主要取舍')
p('这次编程实现主要交给 Codex。我负责说明想做的东西、提出修改意见和决定下一步做什么，也让它去找可以复用的代码。实践中采用“先检索轮子，再适配进自己的框架”的方式，来源和改动一起记录。')
table([
 ['我的要求或判断','落实到实现中的变化'],
 ['“模型只解释文字”','固定语义协议；本地规则选绘画工具，运行时不生成并执行代码。'],
 ['“月亮不是只有圆的”','月亮工具扩为五种形态，可以区分弯月及朝向。'],
 ['意象数量多，不能逐个手动找源码','由 Codex 检索、核对许可、做适配；原文件与来源登记保留。'],
 ['在一个表上标出进度','保留原统计的 60 项，区分基础可画、部分支持、待做与转交处理。'],
 ['先用已有绘画框架试一次','先验证基础意象模式，缺少兰、松等形态时留下缺口。']
],[132,345])
p('这次我觉得 AI 最有用的地方，是能把源码检索、重复修改和运行检查接起来。需要我持续判断的，是画面是否表达了想要的东西，以及当前实现算不算完成。月亮形态和意象进度表就是我在对话中提出的具体修改。完整关系连续失败也说明，接口能返回文字还不等于程序就能使用它，必须检查结构、保留失败，并明确缩小范围。')
p('当前仍是原型：20 个绘画工具对应的支持范围不同，原统计 60 项中基础可画 15 项、部分支持 9 项、待制作 27 项、转交其他处理 9 项。通路只验证了少量诗句，画面中的位置与微动来自本地规则，复杂关系和情感驱动尚未接通。')
h('五、Git 仓库启动情况')
p('项目已在本地建立 Git 仓库，并通过 AI 工具辅助执行了多次提交。最早记录为 2026-10-17 的 f60dac0（Initialize course project workspace）；随后保存了网页原型、语义实验、意象库和生成通路等改动。提交记录附在 attachments/Git提交记录.txt。本检查点不附代码仓库或 .git 历史包。')
p('已设置忽略规则，不提交本地 API Key、依赖目录和浏览器缓存。本材料包只包含报告、脱敏对话和选取的运行证据；密钥与含认证的配置文件不打包。')
h('六、交互记录与附件定位')
p('ai-records/ 中提供语义接口实验、意象库与生成通路两段实践的完整用户/助手可见文字对话，按原顺序保留失败与修改过程，另附导出清单。导出范围不含系统提示、隐藏推理、工具内部原始数据与图片二进制；API Key 和个人目录明确脱敏。')
p('attachments/ 中有实际月水石画面、意象工具与进度表预览、模型最终回答与结果、本地测试输出、浏览器验证和 Git 日志。程序调用模型的记录只用于证明接口实验，不当作 AI 编程助手对话。')
page()
h('七、参考来源、许可与本项目改动')
p('下面区分实际复用和资料参考。源码检索、适配与新代码编写由 Codex 辅助完成，采用的代码按原作者归属标注。检索到的完整原件、许可与适配记录保留在项目中；本包只提交报告和实践证据。')
table([
 ['来源 / 许可','实际取用和改动'],
 ['p5.js 2.3.3 / LGPL-2.1','作为绘图运行库，使用项目已有的本地版本；未修改库本体。'],
 ['Daniel Shiffman：The Nature of Code / MIT','参考递归树、正弦波、Boids 示例；改成固定树骨架、连续水纹、实例模式鸟群与同步更新，添加风和疏密参数。Boids 思路来自 Craig Reynolds。'],
 ['sxywu：Generative flower experiment #1 / MIT（原 .block 标注）','取 petalPath 的曲线控制点，去掉 D3/Lodash，改用本地 Canvas 绘制；茎叶和风响应另写。'],
 ['Lingdong Huang：Shan, Shui / MIT','取船体轮廓、石的极径与噪声外缘、亭的屋顶和栏杆几何；重写本地绘图与参数，未引入原作人物和整套自动场景。'],
 ['Niels Pichon：p5.Fresco / Apache-2.0','取 cloudGen.js 的圆弧、S 路径与水平段云形，改成数值点和有界重试；未引入 Fresco 运行库。'],
 ['今日诗词 / 官方接入文档','调用浏览器 SDK 获取诗句；模型分析与本地绘画通路由本项目连接。'],
 ['新华网全宋词意象统计 / 资料参考','保留原 60 个统计条目，用作本项目意象目录与进度表的基础。']
],[165,312])
p('草、露霜、竹、柳、雪、红黄叶、鱼、柳絮和新花冠结构由本项目在 Codex 辅助下编写。OpenProcessing 曾用作候选检索，但没有取得并引入其作品的完整源码；因此画面不标为这些候选作品的复刻。')
p('项目内逐项登记：experiments/imagery-library/drawing/sources.js；工具与改动说明：drawing/README.md；原文件及许可：sources/ 和 code-research/。随包附有“参考来源与改动.md”和涉及的许可原文。')
for label,url in [
 ('课程检查点 1','https://edu.cs.tsinghua.edu.cn/ai-prog/course/checkpoint-1/'),
 ('p5.js','https://p5js.org/'),
 ('The Nature of Code','https://github.com/nature-of-code/noc-examples-p5.js-archived'),
 ('sxywu 花瓣示例','https://gist.github.com/sxywu/56728e6cf17ad249ef232c49cd9a90ad'),
 ('Shan, Shui','https://github.com/LingDong-/shan-shui-inf'),
 ('p5.Fresco','https://github.com/NielsPichon/p5.Fresco'),
 ('今日诗词官方接入文档','https://www.jinrishici.com/doc/'),
 ('原始意象统计页面','https://fms.news.cn/swf/2018_sjxw/quansongci/index.html#/')]:
    blocks.append(('link',label,url))

md=[]
for b in blocks:
    if b[0]=='title':md+=['# '+b[1],'']
    elif b[0]=='h':md+=['## '+b[1],'']
    elif b[0]=='p':md+=[b[1],'']
    elif b[0]=='notice':md+=['> '+b[1],'']
    elif b[0]=='table':
        rows=b[1];md+=['| '+' | '.join(rows[0])+' |','| '+' | '.join(['---']*len(rows[0]))+' |']
        md+=['| '+' | '.join(row)+' |' for row in rows[1:]];md+=['']
    elif b[0]=='image':md+=['![实际生成画面](attachments/生成画面-月水石.png)',b[4],'']
    elif b[0]=='link':md+=['- ['+b[1]+']('+b[2]+')']
(PACKAGE/'report.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
reference_start=md.index('## 七、参考来源、许可与本项目改动')
(PACKAGE/'attachments/参考来源与改动.md').write_text('\n'.join(md[reference_start:])+'\n',encoding='utf-8')
license_dir=PACKAGE/'attachments/licenses'
license_dir.mkdir(exist_ok=True)
for src,dest in [
 ('poem-flow/vendor/p5-LICENSE.txt','p5-LGPL-2.1.txt'),
 ('experiments/imagery-library/sources/NOC-LICENSE.txt','The-Nature-of-Code-MIT.txt'),
 ('experiments/imagery-library/code-research/flower/.block','sxywu-flower.block'),
 ('experiments/imagery-library/code-research/shan-LICENSE.txt','Shan-Shui-MIT.txt'),
 ('experiments/imagery-library/code-research/fresco/LICENSE','p5-Fresco-Apache-2.0.txt')]:
    shutil.copy2(ROOT/src,license_dir/dest)

pdfmetrics.registerFont(TTFont('Song','C:/Windows/Fonts/simsun.ttc',subfontIndex=0))
pdfmetrics.registerFont(TTFont('Hei','C:/Windows/Fonts/simhei.ttf'))
INK=colors.HexColor('#243e48');BLUE=colors.HexColor('#356d87');MUTED=colors.HexColor('#65717b')
styles={
 'title':ParagraphStyle('title',fontName='Hei',fontSize=19,leading=28,textColor=INK,spaceAfter=12,wordWrap='CJK'),
 'h':ParagraphStyle('h',fontName='Hei',fontSize=12,leading=19,textColor=BLUE,spaceBefore=12,spaceAfter=7,wordWrap='CJK',keepWithNext=True),
 'p':ParagraphStyle('p',fontName='Song',fontSize=10.2,leading=16.5,textColor=INK,spaceAfter=8,wordWrap='CJK'),
 'cell':ParagraphStyle('cell',fontName='Song',fontSize=9.1,leading=14,textColor=INK,wordWrap='CJK'),
 'small':ParagraphStyle('small',fontName='Song',fontSize=8.3,leading=12.5,textColor=MUTED,spaceAfter=4,wordWrap='CJK'),
 'notice':ParagraphStyle('notice',fontName='Song',fontSize=9.4,leading=15,textColor=colors.HexColor('#8c4d2d'),backColor=colors.HexColor('#fff5e8'),borderPadding=8,spaceBefore=5,spaceAfter=12,wordWrap='CJK')}
story=[]
for b in blocks:
    typ=b[0]
    if typ in ['title','h','p','notice']:story.append(Paragraph(html.escape(b[1]),styles[typ]))
    elif typ=='page':story.append(PageBreak())
    elif typ=='table':
        rows=[[Paragraph(html.escape(str(c)),styles['cell']) for c in row] for row in b[1]]
        t=Table(rows,colWidths=b[2],hAlign='LEFT',repeatRows=1)
        t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#edf3f5')),('GRID',(0,0),(-1,-1),.35,colors.HexColor('#cad7dd')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
        story+=[t,Spacer(1,8)]
    elif typ=='image':story.append(KeepTogether([Image(b[1],width=b[2],height=b[3]),Spacer(1,4),Paragraph(html.escape(b[4]),styles['small'])]))
    elif typ=='link':story.append(Paragraph(html.escape(b[1])+'：<link href="'+html.escape(b[2],quote=True)+'" color="#356d87">'+html.escape(b[2])+'</link>',styles['small']))
def footer(c,doc):
    c.saveState();c.setStrokeColor(colors.HexColor('#c6d4db'));c.line(58,803,537,803);c.setFont('Hei',8);c.setFillColor(MUTED);c.drawString(58,815,'AI 编程进阶：方法与实践 / 检查点 1');c.setFont('Song',8);c.drawString(58,28,f'{NAME}  {STUDENT} · 流动诗');c.drawRightString(537,28,str(doc.page));c.restoreState()
doc=SimpleDocTemplate(str(PDFOUT),pagesize=(595.28,841.89),leftMargin=58,rightMargin=58,topMargin=54,bottomMargin=48,title='流动诗 - 检查点1报告',author=NAME)
doc.build(story,onFirstPage=footer,onLaterPages=footer)
reader=PdfReader(str(PDFOUT));assert len(reader.pages)>=3
shutil.copy2(PDFOUT,PACKAGE/'attachments/report.pdf')
checklist='''# 材料说明

姓名：刘阳；学号：2025011764。实践工具：Codex。

压缩包根目录包含 report.md、ai-records/、attachments/。

report.md 是报告正文；attachments/report.pdf 是同内容阅读版。ai-records/ 是实际编程助手对话；attachments/generation-results/ 是程序调用诗句模型的四次实验回答与校验结果，两类记录用途不同。

报告按实际分工整理：刘阳提出目标、修改意见与范围选择，Codex 检索和适配代码、实现程序并执行测试。参考来源、许可和取用范围见报告第七节及 attachments/参考来源与改动.md；相关许可原文见 attachments/licenses/。

本包未包含代码仓库、.git、API Key、含密钥配置或浏览器缓存。文件清单及 SHA-256 见 attachments/文件清单.json；清单不包含其自身哈希。

对话仅对密钥、个人目录和内部记忆来源标记作脱敏；导出范围和实践起止时间见 ai-records/记录说明.md、记录清单.json 及各对话文件开头。
'''
(PACKAGE/'attachments/材料说明.md').write_text(checklist,encoding='utf-8')
(PACKAGE/'ai-records/记录说明.md').write_text('''# AI 编程交互记录

本目录提供两段实际 Codex 编程实践的完整用户/助手可见文字对话，保留原顺序、失败与修改过程，不用摘要替代对话正文。

- codex-01：语义接口实验与设计讨论。
- codex-02：意象库、源码检索和基础生成通路；在课程提交要求讨论开始前结束。
- 记录清单.json：各文件的消息数量、模型标识、起止时间和原始日志快照哈希。

导出不包含系统/开发者提示、隐藏推理、自动注入的环境/界面状态、工具内部原始输入输出及图片二进制。代表性画面、自动测试和浏览器检查另存于 attachments/。密钥、个人目录及内部记忆来源标记已脱敏，位置有标记。两段记录对应本报告选取的开发实践，不包含之后整理报告和打包的讨论。
''',encoding='utf-8')

manifest=[]
for path in sorted(PACKAGE.rglob('*')):
    if not path.is_file():continue
    if path.name=='文件清单.json':continue
    assert path.name not in ['llm api.txt','.env']
    if path.suffix in ['.md','.txt','.json','.html']:
        text=path.read_text(encoding='utf-8')
        assert all(not key or key not in text for key in keys),str(path)
    manifest.append({'file':path.relative_to(PACKAGE).as_posix(),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
(PACKAGE/'attachments/文件清单.json').write_text(json.dumps({'student':STUDENT,'name':NAME,'status':'已按提供的提交目录整理','files':manifest,'visible_dialogue_exports':exports,'pdf_pages':len(reader.pages),'model_api_calls_during_packaging':0},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert {p.name for p in PACKAGE.iterdir()}=={'report.md','ai-records','attachments'}
assert not re.search(r'OpenCode|待补齐|待补充', (PACKAGE/'report.md').read_text(encoding='utf-8'), re.I)
archive=OUT/(PACKAGE.name+'.zip')
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for path in sorted(PACKAGE.rglob('*')):
        if path.is_file():z.write(path,PACKAGE.name+'/'+path.relative_to(PACKAGE).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert not any('/.git/' in n or '/.qa/' in n or n.endswith('/llm api.txt') for n in z.namelist())
print(json.dumps({'zip':str(archive),'pdf':str(PDFOUT),'pdf_pages':len(reader.pages),'files':len(manifest)+1,'bytes':archive.stat().st_size,'exports':exports},ensure_ascii=True))
