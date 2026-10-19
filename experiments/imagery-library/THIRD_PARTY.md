> 2026-10-19 更新：二十八个独立工具。本轮兰意、静态马意、莲花茎叶与共用淡墨笔触均由本项目编写，无新外部代码或图片下载。既有三方署名继续保留，49 个保存原件／依赖的哈希核对不变。详见 [工具结构与来源](drawing/README.md)。

# 意象试画室：第三方来源与改动

2026-10-19 本批补充：露霜共用绘制层、叶／枝／石载体、莺形均由本项目编写，无新下载外部代码或鸟类图片。莺形是黄身深翼的写意约定，未完成具体物种核验，不把它标为任何社区作品的复刻。原九项来源记录与 49 个保存来源／依赖文件不变。

记录日期：2026-10-18。这个目录是独立实验，不表示已接入流动诗正式绘图流程。

**当前结构更新：**各试画迁移到 `drawing/tools/`；NOC 原件保持不变。花已改用 sxywu `petalPath()` 数值曲线的本地适配，新舟取用 Lingdong Huang `Arch.boat01` 的船体轮廓。当前来源登记见 `drawing/sources.js`，取用范围与改动见 [绘画结构记录](drawing/README.md)。下文“花为本项目新写”的描述仅指第一轮旧花瓣版本；现在的茎叶和运动仍为本项目编写。

第二轮新增的山水、花瓣、Fresco 与笔触源码及其依赖，来源与许可证见 [代码检索记录](code-research/README.md)。下面保留第一轮来源，不把第二轮源码误记为 OpenProcessing 下载。

## 实际使用

### p5.js 2.3.3

复用项目已有 `../../poem-flow/vendor/p5.min.js`，来源和 LGPL-2.1 许可证见 [正式项目第三方说明](../../poem-flow/THIRD_PARTY.md)。未重新下载或更改该库。

### The Nature of Code / Daniel Shiffman

- 原项目：[noc-examples-p5.js-archived](https://github.com/nature-of-code/noc-examples-p5.js-archived)。这是 2012 版配套示例的归档仓库，不宣称是最新版本。
- 许可证：MIT，Copyright (c) 2021 The Nature of Code；完整文本保存于 [sources/NOC-LICENSE.txt](sources/NOC-LICENSE.txt)。本地改编保留该通知。
- 原作者、示例出处、许可文件与源文件均已实际读取。
- 原始文件及 SHA-256 对照见 `sources/manifest.json`；下载原文件保留，未用改编覆盖原文。

| 原始文件 | 本地文件 | 实际使用与改动 |
| --- | --- | --- |
| `chp06_agents/NOC_6_09_Flocking/boid.js` | `sources/noc-boid.js` → `boid-adapter.js` | 改为 p5 instance 绑定，分离距离随笔触疏密调整；试画中另行覆写鸟形与边界，固定 22 只鸟，同时计算群体转向后再更新位置；采用固定步长累积更新 |
| `chp06_agents/NOC_6_09_Flocking/flock.js` | `sources/noc-flock.js` | 供对照，没有直接载入页面 |
| `chp08_fractals/NOC_8_06_Tree/sketch.js` | `sources/noc-tree.js` → `studies.js` 的 tree | 保留递归分枝思路，改为预先生成固定骨架、曲线枝条、细叶与局部风响应 |
| `chp03_oscillation/NOC_3_09_wave/sketch.js` | `sources/noc-wave.js` → `studies.js` 的 water | 从正弦波采样改为多层连续水纹，添加相位和叠加波；不再绘制一列圆形 |

`prepare-adapter.py` 从已保存的原始 Boid 生成实例模式适配文件；后续如修改生成规则，应同步重新生成并重新验证。

树、水、鸟群的适配文件沿用 MIT 条件；许可证文本与归属信息需随复制内容保留。

## 本项目新写

花的花瓣轮廓、茎叶细线，以及云雾的柔边色层与平移，是本次新写的通用技术试作。没有从 OpenProcessing 下载或复制这两类作品的代码，也不声称重现了某件社区作品的视觉效果。界面、共用控制与候选目录亦为本项目新写。

## OpenProcessing 候选：尚未引入代码

完整候选见 [候选与实验记录](README.md) 以及 `catalog.js`。这批 10 个条目只作为后续选择依据，本地画面不应标成它们的复刻或派生版本。

- 直接请求作品页遇到 `Validating Connection — OpenProcessing`，未取得原作完整源码。
- 搜索索引部分能显示标题、说明、许可和少量代码。例如 `Ink Mountains` 只读到主绘图入口，缺 `clouds`、`fade`、`drawMT` 定义，不能作为可运行的完整代码。
- 大量页面提取同时包含“归档”“源码隐藏”和未替换的模板字段。这些不是当前作品运行或隐私状态的可靠证据，不据此认定作品失效或作者隐藏源码。
- `Generative Flowers` 的说明指向 Creativeguru97 的公开 GitHub 教程。已查看该链接，但本轮未核实完整许可，因此没有复制其代码到试画。
- `Flocking` 的说明注明 Shiffman / Reynolds。本轮使用的是 NOC 原作者 MIT 示例，没有宣称它与某件 OP 派生作品的源码完全一致。
- 许可按条目分别核实；不能因为平台默认 CC BY-NC-SA 就认定所有作品同一种许可。尚未核实版本的条目保留“待核”。

平台说明：[许可选择](https://intercom.help/openprocessing/en/articles/5714786-choosing-a-license-for-your-sketches)；[源码访问设置](https://intercom.help/openprocessing/en/articles/3380515-sketch-privacy-settings)。
