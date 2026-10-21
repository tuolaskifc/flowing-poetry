# 流动诗

中文诗句驱动的动态生成艺术课程项目。

## 文档入口

- **[设计规范](docs/设计规范.md)**：当前统一的职责、六个设计指标与完成状态。
- **[模块职能树](docs/assets/模块职能树.png)**：一张图说明各部分做什么，以及已实现／待实现的区别。
- [文档索引](docs/README.md)：技术协议、实验记录、资料与历史归档。

日常设计优先更新主规范；旧的单指标文档已归档，不再作为并行的当前定义。

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

当前主要来源是 [20 组精选诗句库](http://127.0.0.1:4173/poem-flow/library.html)：逐项列出原句出处、意象线索、画面目标、当前缺口与效果进度，首批 5 组优先改画。主网页可直接选择或“换一句精选”，总表也可带入指定诗句。仍保留当前画不了的候选；编入精选库不代表效果已完成。数据与维护说明见 [精选库说明](experiments/poem-generation/curated-library.md)。

“今日诗词取句（可选）”仍使用官方 SDK，每轮最多逐次取 5 句、间隔 1 秒，在本地去重并按不同可画类型排序，自动填入优先候选，也可手动改选。筛选不调用 DeepSeek，在线候选只留在当前页面内存。取句失败时停止本轮，无匹配时保留原输入。字符匹配只是线索，仍可能包含缺席、比喻或尚未支持的物象。

无匹配形态时明确提示并展示解读与缺口，不用别的物象补画。当前是可运行的基础意象生成版，尚未实现全部意象、完整关系、16 类自动情感配色、逻辑时间编排和安卓。

生成已增加[场景骨架与有限空间关系](experiments/poem-generation/scene-generation.md)：修复自然景物漏画，补山岸、地面与树群，按语义组织部分相对位置。可在[二十句对照页](http://127.0.0.1:4173/poem-flow/scene-review.html)逐幅查看缺口；页面使用手工语义测试样例，不调用模型。

此前的[数量解释与群落构图](experiments/poem-generation/quantity-composition.md)：区分明确数量、少量、繁多及范围，由本地规则组织近远与疏密。“接天莲叶”可以铺展开，“孤舟”仍只画一舟；页面分别标注提取数量和本地显示份数。局部计数、雨雪内部颗粒与完整空间关系尚未全部适配。

真实通路记录见 [生成实验](experiments/poem-generation/README.md)，主网页浏览器证据在 `poem-flow/verification/`。旧的固定诗句作品保留于 http://127.0.0.1:4173/poem-flow/legacy.html 。

## 独立的诗句语义实验

模型接口已接入主网页。完整实验保留 [冻结语义协议 3.0](experiments/poem-semantics/contract-v3/固定输出结构.md)，此前两次完整关系请求未通过；生成页面现默认使用 [3.2 场景扩展](experiments/poem-generation/scene-generation.md)，完整动作关系仍为空，空间关系使用单独的有限字段，不让模型生成绘图代码。16 类情感、空间和完整逻辑尚未贯通，不能将旧字段直接换名使用。

协议说明、提示词、校验器和既往记录在 `experiments/poem-semantics/`；历次真实请求、失败及覆盖缺口保留在 `experiments/poem-generation/runs/`，不随网页更新改写。

## 开发结构

- `poem-flow/index.html`、`main.css`：当前主入口和自适应布局。
- `poem-flow/library.html`、`library.js`、`library.css`：精选诗句与改画进度总表。
- `experiments/poem-generation/curated-poems.json`：20 组人工精选的唯一数据源；`curated-library.js` 负责检查与选择，编辑目标不进入模型请求。
- `poem-flow/tools/serve.mjs`：主入口服务，复用生成实验后端；静态资源采用允许列表。
- `experiments/poem-generation/app.js`、`scene.js`：主网页与实验页共用的交互、透明图层组合。
- `experiments/poem-generation/service.mjs`、`planner.mjs`：后端模型请求、记录和本地绘画规则。
- `experiments/poem-generation/imagery-lexicon.js`、`recommendation.js`：筛选与绘画共用词表、候选排序及有上限的取句流程。
- `experiments/imagery-library/drawing/`：29 个可复用绘画工具及来源登记。
- `poem-flow/THIRD_PARTY.md`：依赖来源及许可。

旧作品的 `app.js`、`scene.js` 和 `styles.css` 留给 `legacy.html`；旧入口的 `?seed=42` 只适用于固定诗句作品。新入口由诗句确定初始种子，可点击“换一组形态”重画；交互调整不新增模型调用。

## 记录方式

- 完成一个可核对的小步骤后，保存一次 Git 提交，并说明改动。
- AI 交互记录和运行结果分别保存；报告中的判断应有实际记录支持。
- 代码、数据的来源与个人改动需注明；记录共享前移除密钥等凭据。

## 课程资料

- [课程首页](https://edu.cs.tsinghua.edu.cn/ai-prog/)
- [第一次检查点](https://edu.cs.tsinghua.edu.cn/ai-prog/course/checkpoint-1/)
