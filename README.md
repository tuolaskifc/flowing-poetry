# 流动诗

中文诗句驱动的动态生成艺术课程项目。

## 文档入口

- **[检查点 2 运行与复核说明](docs/checkpoint2-运行与复核.md)**：实际环境、启动、离线回放、无密钥配置示例和检查命令。

- **[设计规范](docs/设计规范.md)**：当前统一的职责、六个设计指标与完成状态。
- **[模块职能树](docs/assets/模块职能树.png)**：一张图说明各部分做什么，以及已实现／待实现的区别。
- [文档索引](docs/README.md)：技术协议、实验记录、资料与历史归档。

日常设计优先更新主规范；旧的单指标文档已归档，不再作为并行的当前定义。

## 生成稳定性

融合和抽象通路已增加分级交付：修复比喻参照被当成动作主体的误拒，整理无歧义的光照包装和原文引用；仅局部联系、分组或动作失败时，绘制其他已核验内容并说明未采用部分。主体、数量或核心格式不可靠时继续拦截，保留旧画并提供明确的重试提示。新增“回看最近生成”，可直接[回看当前融合结果](http://127.0.0.1:4173/poem-flow/expression.html?latest=1)，不请求模型。同句、同协议及配置的成功结果可跨其他诗句复用。

十一份历史融合失败已本地恢复；四次新请求原始通过 3/4、最终可用 4/4，其中一份部分出图，未自动重试。154 项检查、真实浏览器回放与 169 份历史文件哈希核对通过；文学解释和审美仍需复核。见[处理边界与验证](experiments/poem-generation/generation-reliability.md)。

## 景意交融

新增[放开画幅：六句前后对照与十三类满幅笔触](http://127.0.0.1:4173/poem-flow/expanse-review.html)。融合与抽象试画均有“铺展程度”：自由笔势可以横穿画面、覆盖景物、越出边缘；风景优先保持局部纹理，景意交融适量加入，抽象优先充分展开。沿用已有解读，新增模型请求为零。见[满幅笔势说明](experiments/poem-generation/canvas-gestures.md)。

打开[融合试画](http://127.0.0.1:4173/poem-flow/expression.html)：一次解读后可在风景优先、景意交融、抽象优先之间切换。三档共用景物数量、位置与依托，水纹、树冠和山石纹理依附已有区域与轮廓；月、舟、人物保留可辨点景。支持新句输入、自动推荐表达倾向、十三类笔触、八套配色、点击／触摸回应、暂停与 PNG。[六句／18 张对照](http://127.0.0.1:4173/poem-flow/expression-review.html)包括三次新协议真实请求及三份历史适配；首轮结构检查 3/3，文学解释和审美仍待复核。135 项测试通过，详情见[统一构图与表达控制](experiments/poem-generation/shared-expression.md)。

## 抽象诗句试验

打开[抽象试画](http://127.0.0.1:4173/poem-flow/abstract.html)：可以输入新句，也可直接观看七份已有真实解读。十三类笔触、五种空间分布、八套色组与种子可组合变化；新增涡流、浸染、裂隙、游丝，以及点击／触摸扰动、回应强度和键盘可用的“轻拨画面”。支持单体拖动留痕、暂停、重放、PNG 与月楼叠加。[新增 40 张对照](http://127.0.0.1:4173/poem-flow/abstract-extension-review.html)和[原 32 张](http://127.0.0.1:4173/poem-flow/abstract-review.html)均可进入对应动态图，旧预设保留原画笔选择。首批结构检查 3/4，原失败保留；新增三句首次检查 3/3，但词义与逻辑问题另外标注。124 项检查通过，文学解释与新画面仍待审阅。见[协议与来源](experiments/poem-generation/abstract-expression.md)、[本次扩展记录](experiments/poem-generation/abstract-extension.md)。主风景协议继续使用 3.3。

## 当前状态

- 选题：以诗句与意象为起点的动态生成艺术。
- 路线：先实现电脑网页原型，后续视效果与需求适配安卓。
- 开发方式：使用 Codex 辅助，保留实际发生的交互记录。
- 版本管理：Git 本地仓库。

## 运行流动诗

在终端运行：

```powershell
cd poem-flow
npm start
```

随后打开 **http://127.0.0.1:4173/**。无需安装 npm 依赖，p5.js 已随项目保存。生成需要本地后端，请通过此地址打开，不能双击 HTML 直接调用模型。后端沿用根目录已忽略的 `llm api.txt` 配置。

现已统一为：**精选库选句／手动输入 → DeepSeek 解读 → 本地检查与映射 → 已有绘画工具组成动态图 → 调整与保存**。可暂停、换形态、调风力、切配色与月形、拖动可见笔触调整构图、还原构图、沉浸观看、导出 PNG。打开网页默认选中精选库的第一组，不自动调用模型，也不自动展开上次画面；旧结果可点击“回看上次结果”。点击“生成画面”才分析。

最新修正[构图、自动光色与单体交互](http://127.0.0.1:4173/poem-flow/composition-review.html)：通用组合新增横江、环池、曲溪等空间结构，夜景自动使用暗底，原文颜色线索参与局部用色；修复“小楼”漏画与鸟的错误落点、重叠及过小问题。鸟、船等可以逐个拖动，竹林默认成组，Shift 可移动同层整组；人物与炊烟跟随所属实例。十份真实回答作改前／改后重放，111 项检查及浏览器交互通过，本轮无新增模型调用，审美待观看。见[实现与限制](experiments/poem-generation/display-regression.md)。

此前加入[五类风景、十五种构图](http://127.0.0.1:4173/poem-flow/landscape-review.html)：山溪、深林、村舍、江雪、水田各有三种本地布局。该页为当轮保留的画面；当前生成器使用上方修正规则。

此前的[色彩与动态](http://127.0.0.1:4173/poem-flow/color-motion-review.html)：22 套手动配色、六张快捷色卡，以及 0–200% 的独立动态程度，默认 140%。增强水纹、飞鸟和局部风响应，固定场景依托保持稳定；人物保持基本写意，优先整体风景。点击“回看上次结果”即可直接调整，无需再次调用模型。该轮 98 项检查及实际浏览器切色、动画、暂停和窄屏检查通过。详细边界见[实现说明](experiments/poem-generation/color-motion.md)。

2026-10-23 已贯通 [3.3 整体场景语义](experiments/poem-generation/composition-semantics.md)：整体环境、主次群落、远近、依托、主导动作与定性节奏、照明和迷蒙度进入本地构图与绘画时钟。每项解释有应用或缺口记录；完整因果和多阶段时间未完成。[当前架构图](http://127.0.0.1:4173/poem-flow/architecture.html)与[同回答开关对照](http://127.0.0.1:4173/poem-flow/semantic-review.html)已连接主网页。当轮六次真实调用原始校验 4/6 通过，另两份仅展开相邻原句引用后重放，原始失败保留；95 项检查通过，审美仍待观看。

此前的[场景组织层与自查](experiments/poem-generation/scene-organization.md)：未匹配组合先安排地面、水域、群落与主体，比较三种布局并作有限几何修正，检查仍无画法的线索。[26 组前后对照](http://127.0.0.1:4173/poem-flow/organization-review.html)分别标注人工练习、旧回答重放及当轮新诗真实调用；旧数字保持为历史记录，原二十张参考图保留。

当前主要来源是 [20 组精选诗句库](http://127.0.0.1:4173/poem-flow/library.html)：逐项列出原句出处、意象线索、画面目标、当前缺口与效果进度，首批 5 组优先改画。主网页可直接选择或“换一句精选”，总表也可带入指定诗句。仍保留当前画不了的候选；编入精选库不代表效果已完成。数据与维护说明见 [精选库说明](experiments/poem-generation/curated-library.md)。

这二十句的基础构图已获用户基本认可并冻结为回归基线。[十二句新组合](http://127.0.0.1:4173/poem-flow/generalization-review.html)另走真实 API，保留首轮失败、修订与当前图片；主网页可选“新句试验”。自然景物的修饰词匹配、村落、竹林、两岸水路、绕田水道和芦穗已接入通用规则。严格场景模式同批 11/12 结构有效，白鸟另列数量模式对照，未冒充空间输出通过。详情见[试验记录](experiments/poem-generation/generalization-trial.md)。

“今日诗词取句（可选）”仍使用官方 SDK，每轮最多逐次取 5 句、间隔 1 秒，在本地去重并按不同可画类型排序，自动填入优先候选，也可手动改选。筛选不调用 DeepSeek，在线候选只留在当前页面内存。取句失败时停止本轮，无匹配时保留原输入。字符匹配只是线索，仍可能包含缺席、比喻或尚未支持的物象。

无匹配形态时明确提示并展示解读与缺口，不用别的物象补画。当前是可运行的基础意象生成版，尚未实现全部意象、完整关系、16 类自动情感配色、逻辑时间编排和安卓。

当前加入[场景区域与依托](experiments/poem-generation/regional-composition.md)：先划分山溪、地面、岸面、林带与田面，再安排数量、比例、远近和落点；补疏花树与淡墨人物，钓者可随舟拖动。背景推断单独标记，不冒充原文明示物象。可打开[新的二十句对照](http://127.0.0.1:4173/poem-flow/expressive-review.html)直接看变化，不调用模型。此前[写意归类](experiments/poem-generation/expressive-generation.md)记录保留。

此前增加的[场景骨架与有限空间关系](experiments/poem-generation/scene-generation.md)：修复自然景物漏画，补山岸、地面与树群，按语义组织部分相对位置。可在[二十句对照页](http://127.0.0.1:4173/poem-flow/scene-review.html)逐幅查看缺口；页面使用手工语义测试样例，不调用模型。

此前的[数量解释与群落构图](experiments/poem-generation/quantity-composition.md)：区分明确数量、少量、繁多及范围，由本地规则组织近远与疏密。“接天莲叶”可以铺展开，“孤舟”仍只画一舟；页面分别标注提取数量和本地显示份数。局部计数、雨雪内部颗粒与完整空间关系尚未全部适配。

真实通路记录见 [生成实验](experiments/poem-generation/README.md)，主网页浏览器证据在 `poem-flow/verification/`。旧的固定诗句作品保留于 http://127.0.0.1:4173/poem-flow/legacy.html 。

## 独立的诗句语义实验

模型接口已接入主网页。完整实验保留 [冻结语义协议 3.0](experiments/poem-semantics/contract-v3/固定输出结构.md)，此前两次完整关系请求未通过；生成页面现默认使用 [3.3 整体场景语义](experiments/poem-generation/composition-semantics.md)，以 scene.actions 表达有限主导状态，完整 relations 仍为空，空间关系沿用 spatial。不让模型生成绘图代码；16 类情感、完整因果与时间编排尚未贯通。

协议说明、提示词、校验器和既往记录在 `experiments/poem-semantics/`；历次真实请求、失败及覆盖缺口保留在 `experiments/poem-generation/runs/`，不随网页更新改写。

## 开发结构

- `poem-flow/index.html`、`main.css`：当前主入口和自适应布局。
- `poem-flow/library.html`、`library.js`、`library.css`：精选诗句与改画进度总表。
- `experiments/poem-generation/curated-poems.json`：20 组人工精选的唯一数据源；`curated-library.js` 负责检查与选择，编辑目标不进入模型请求。
- `poem-flow/tools/serve.mjs`：主入口服务，复用生成实验后端；静态资源采用允许列表。
- `experiments/poem-generation/app.js`、`scene.js`：主网页与实验页共用的交互、透明图层组合。
- `experiments/poem-generation/service.mjs`、`planner.mjs`：后端模型请求、记录和本地绘画规则。
- `experiments/poem-generation/imagery-lexicon.js`、`recommendation.js`：筛选与绘画共用词表、候选排序及有上限的取句流程。
- `experiments/imagery-library/drawing/`：32 个可复用绘画工具及来源登记。
- `poem-flow/THIRD_PARTY.md`：依赖来源及许可。

旧作品的 `app.js`、`scene.js` 和 `styles.css` 留给 `legacy.html`；旧入口的 `?seed=42` 只适用于固定诗句作品。新入口由诗句确定初始种子，可点击“换一组形态”重画；交互调整不新增模型调用。

## 记录方式

- 完成一个可核对的小步骤后，保存一次 Git 提交，并说明改动。
- AI 交互记录和运行结果分别保存；报告中的判断应有实际记录支持。
- 代码、数据的来源与个人改动需注明；记录共享前移除密钥等凭据。

## 课程资料

- [课程首页](https://edu.cs.tsinghua.edu.cn/ai-prog/)
- [第一次检查点](https://edu.cs.tsinghua.edu.cn/ai-prog/course/checkpoint-1/)
