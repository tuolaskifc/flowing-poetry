"""Generate matching Mermaid/SVG sources for the documentation tree (no API)."""
from pathlib import Path
import xml.etree.ElementTree as ET

ASSETS = Path(__file__).resolve().parent
DOCS = ASSETS.parent
BRANCHES = [
    ('input', '1  输入与意图', '规划 · 待接入', 'planned', [
        ('原句与节选', '古诗起步，现代诗与歌词后续'),
        ('用户解读', '保留特别的艺术选择'),
        ('诗库与随机选句', '来源后续探索，尚未接入'),
    ]),
    ('semantic', '2  语义分析与检查', '独立实验 · 未连网页', 'partial', [
        ('LLM 语义解释', '意象、联系、原文依据'),
        ('固定输出协议', '3.0 已离线检查，待接口实测'),
        ('依据与引用检查', '保留歧义，不执行模型代码'),
    ]),
    ('visual', '3  视觉规则', '已有规范 · 待实现', 'planned', [
        ('意象 → 形态线索', '主体、轮廓与比喻参照'),
        ('情感 → 配色', '16 类色彩组合与使用'),
        ('强度 → 空间', '紧密度、利用率，档位待定'),
        ('关系 → 图形联系', '连接、靠近、包围、排斥等'),
        ('逻辑 → 成立方式', '否定、可能、条件与范围'),
        ('时间 → 变化过程', '先后、反复、未然与留痕'),
    ]),
    ('render', '4  绘画与交互', '固定诗句原型已实现', 'ready', [
        ('持续绘图', 'p5.js 动态画面'),
        ('观看与交互', '重演、暂停、导出、沉浸'),
        ('任意诗句接入', '尚未贯通语义与绘图'),
        ('安卓适配', '后续方向，尚未实现'),
    ]),
    ('records', '5  记录与验证', '已有记录 · 持续验证', 'ready', [
        ('Git 版本记录', '保存可回查的小步骤'),
        ('API 实验与失败', '原始回答保留，不改写'),
        ('技术与审美检查', '结构通过仍需人工判断'),
    ]),
]

mermaid = ['flowchart TD', '  root["流动诗<br/>诗句 → 意象 → 图形 → 意境"]']
for node, title, status, kind, leaves in BRANCHES:
    mermaid += [f'  root --> {node}["{title}<br/>{status}"]']
    for index, (label, detail) in enumerate(leaves, 1):
        mermaid += [f'  {node} --> {node}{index}["{label}<br/>{detail}"]']
mermaid += [
    '  classDef root fill:#244B46,color:#ffffff,stroke:#244B46',
    '  classDef planned fill:#F4EBDD,stroke:#D6C39C,color:#3D4543',
    '  classDef partial fill:#E7EFF1,stroke:#A3B9C1,color:#3D4543',
    '  classDef ready fill:#E7EEE8,stroke:#A7BBA9,color:#3D4543',
    '  class root root',
]
for kind in ['planned', 'partial', 'ready']:
    nodes = ','.join(node for node, _, _, state, _ in BRANCHES if state == kind)
    mermaid += [f'  class {nodes} {kind}']
mermaid_text = '\n'.join(mermaid) + '\n'
(ASSETS / '模块职能树.mmd').write_text(mermaid_text, encoding='utf-8')

NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
svg = ET.Element(f'{{{NS}}}svg', {'width': '1660', 'height': '1110', 'viewBox': '0 0 1660 1110', 'role': 'img', 'aria-labelledby': 'title description'})
ET.SubElement(svg, f'{{{NS}}}title', {'id': 'title'}).text = '流动诗模块职能树'
ET.SubElement(svg, f'{{{NS}}}desc', {'id': 'description'}).text = '五个主要部分，其中视觉规则展开为意象、情感、强度、关系、逻辑、时间六个指标。图中标注已实现、独立实验和待实现。'

def element(tag, **attrs):
    return ET.SubElement(svg, f'{{{NS}}}{tag}', {key.replace('_', '-'): str(value) for key, value in attrs.items()})

def rect(x, y, w, h, fill, stroke='none', radius=12):
    element('rect', x=x, y=y, width=w, height=h, rx=radius, fill=fill, stroke=stroke)

def text(x, y, content, size=20, fill='#2E413C', weight='normal', anchor='start'):
    node = element('text', x=x, y=y, font_size=size, font_family='Microsoft YaHei', fill=fill, font_weight=weight, text_anchor=anchor)
    node.text = content

def path(d, color='#B3BDB4', width=2):
    element('path', d=d, fill='none', stroke=color, stroke_width=width, stroke_linecap='round', stroke_linejoin='round')

rect(0, 0, 1660, 1110, '#F6F3EC', radius=0)
text(40, 53, '流动诗 · 模块与职能树', 34, weight='bold')
text(40, 86, '目标结构与当前进度  /  2026-10-18', 18, '#748076')
rect(640, 112, 380, 104, '#244B46')
text(830, 155, '流动诗', 32, '#FFFFFF', 'bold', 'middle')
text(830, 187, '诗句 → 意象 → 图形 → 意境', 20, '#E5EDE4', anchor='middle')
path('M 830 216 V 245 M 190 245 H 1470', '#9DADA1')

colors = {'planned': ('#F4EBDD', '#8B7548'), 'partial': ('#E7EFF1', '#557785'), 'ready': ('#E7EEE8', '#58735E')}
for index, (node, title, status, state, leaves) in enumerate(BRANCHES):
    x = 40 + 320 * index
    center = x + 150
    path(f'M {center} 245 V 276', '#9DADA1')
    fill, tag = colors[state]
    rect(x, 276, 300, 100, fill, '#D6DBD1')
    text(x + 18, 314, title, 24, weight='bold')
    text(x + 18, 346, status, 18, tag)
    last_y = 420 + (len(leaves) - 1) * 88 + 38
    path(f'M {center} 376 V 398 H {x + 8} V {last_y}')
    for leaf_index, (label, detail) in enumerate(leaves):
        y = 420 + leaf_index * 88
        path(f'M {x + 8} {y + 38} H {x + 24}')
        rect(x + 24, y, 276, 76, '#FFFDFA', '#D8DED4', radius=8)
        text(x + 38, y + 30, label, 21, weight='bold')
        text(x + 38, y + 56, detail, 16, '#748076')

path('M 40 1006 H 1620', '#D6DDD2', 1)
text(40, 1041, '现状：固定句网页可用；LLM 为独立实验；六指标驱动绘图尚未贯通。', 22)
text(40, 1077, '职责：LLM 解释文字，本地规则决定画法，用户判断诗意与审美。', 20, '#748076')
(ASSETS / '模块职能树.svg').write_text(ET.tostring(svg, encoding='unicode') + '\n', encoding='utf-8')

main = DOCS / '设计规范.md'
content = main.read_text(encoding='utf-8')
if '<!-- SYSTEM_TREE -->' in content:
    content = content.replace('<!-- SYSTEM_TREE -->', '```mermaid\n' + mermaid_text + '```')
else:
    start = content.index('```mermaid\n')
    end = content.index('```', start + len('```mermaid\n'))
    content = content[:start] + '```mermaid\n' + mermaid_text + '```' + content[end + 3:]
main.write_text(content, encoding='utf-8')
print('Generated matching Mermaid and SVG sources; no network or API requests.')
