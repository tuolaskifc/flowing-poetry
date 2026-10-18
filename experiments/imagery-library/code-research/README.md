# 绘画代码检索：第二轮

日期：2026-10-18。方向：按基础绘画方法检索能直接取得、许可可核实的代码，由本地完成依赖收集和试跑。

入口：[八项本地样例与实际截图](index.html)。所有「本地运行」入口均可直接从本机打开，不需要 OpenProcessing 账户或运行时联网。原项目链接仍需联网。

## 实际结果

取得四组来源中所选示例的完整运行代码：Shan, Shui、sxywu 的花瓣实验、p5.Fresco 的五个示例、p5.brush 独立运行包。八项本地页面均出图，无 JavaScript 运行异常，没有 HTTP/HTTPS 外部依赖请求。原始文件、许可和固定版本依赖保存在本目录，没有要求用户逐件找代码或下载。

这不是取得了四个仓库的全部文件：Fresco 只取所选五个示例及运行依赖；p5.brush 取独立运行包和文档；山水单页与花瓣 Gist 则保留完整原始入口。八项检查记录见 [verification.json](verification.json)。

## 来源与推荐

| 来源 | 已取得内容／可覆盖能力 | 许可依据 | 本轮判断 |
| --- | --- | --- | --- |
| [Lingdong Huang / Shan, Shui](https://github.com/LingDong-/shan-shui-inf) | 单页生成器：树、山、石、水纹、舟、建筑、人物；完整 index.html | [原许可](shan-LICENSE.txt)：MIT，2018 Lingdong Huang | 最值得优先拆形态。SVG 路线，与现有 Canvas 绘图有适配成本；长卷生成不等于物体持续运动 |
| [sxywu / Generative flower experiment #1](https://gist.github.com/sxywu/56728e6cf17ad249ef232c49cd9a90ad) | 三个完整 Gist 文件，贝塞尔花瓣、不对称轮廓与叠瓣 | 原 `.block` 明确写 `license: mit`；保留 [API 原始响应](flower-gist.json) 和 [.block](flower/.block) | 值得抽取 petalPath，换成统一接口与配色；原例是静态通用花，不是菊、梅等花种的辨识方案 |
| [Niels Pichon / p5.Fresco](https://github.com/NielsPichon/p5.Fresco) | 核心运行文件及 Theatre、Sailors、Fruit Trees、Butterfly、Sunflower Spiral 五项完整示例和依赖 | [原许可](fresco/LICENSE)：Apache-2.0 | Theatre 的云、水波，Fruit Trees 的抽象分枝最值得研究；其余作为水面留白、轮廓组织的备选 |
| [Alejandro Campos Uribe / p5.brush](https://github.com/acamposuribe/p5.brush) | `dist/brush.js` 完整独立浏览器运行包、许可和独立 API 文档 | [原许可](brush/LICENSE.md)：MIT，2023–2026 Alejandro Campos Uribe | 可用于统一笔触；本轮做了实际调用小样，未把笔触库接入所有意象；依赖 WebGL2 |

鸟群继续使用上轮已取得、已运行的 [NOC Boids](../sources/noc-boid.js) 及 [MIT 许可](../sources/NOC-LICENSE.txt)。本轮不重复下载，不把它计入四组新来源。

## 原代码定位

| 需要研究什么 | 文件及入口 |
| --- | --- |
| 八种树形变体 | `shan-index.html` 的 `Tree.tree01` 至 `Tree.tree08`，约第 744–1582 行；这些名称不直接对应已核实的树种 |
| 岩石 | `shan-index.html` 的 `Mount.rock`，约第 2433 行 |
| 建筑／亭阁 | `shan-index.html` 的 `Arch.arch01` 至 `arch04`，约第 3002 行起 |
| 舟及舟上人物 | `shan-index.html` 的 `Arch.boat01`，约第 3209 行 |
| 花瓣轮廓 | `flower/index.html` 的 `petalPath()`，第 77 行起 |
| 云轮廓与场景 | `fresco/demos/theatre/cloudGen.js` 和 `theatre.js` |
| 舟形留白、水面线条 | `fresco/demos/sailors/sailors.js` 的 `draw()`、`isInShape()`、`isInBoat()` |
| 抽象枝蔓生长 | `fresco/demos/fruitTrees/sketch.js` 的 `Walker` 和 `spawnCluster()` |
| 波动的多层轮廓 | `fresco/demos/butterfly/butterfly.js` |
| 重复形状的螺旋组织 | `fresco/demos/sunflowerSpiral/sunflowerSpiral.js` |
| 笔触与填色调用 | `brush/local.html` 是本项目调用小样；原运行包是 `brush/brush.js`，API 见 `brush/standalone.md` |

## 本轮怎样保留原作

- 原始脚本未为适配 p5.js 2.x 而改写。旧示例使用自己的 p5.js 版本，在独立页面运行，不与正式网页共享全局变量。
- `flower/index.html` 和 Fresco 各示例的 `index.html` 是下载原文；`local.html` 仅替换运行依赖为本地路径。Fresco 本地入口额外加显示尺寸 CSS，原画布分辨率与绘图代码不变。
- `shan-index.html` 是原始完整单页；并未将其中的水、树或舟改成独立动画单元。
- `brush/local.html` 是新写的 API 调用小样，不能标为作者原作；其运行库未改写。
- 花瓣预览截图只截取原画左上 230×230 区域，原始页面仍是作者的 960×500 布局。
- Fruit Trees 原例必须点击画布才生长，验证中实际执行了一次画布点击；Sailors 等待原程序主动停止逐行绘制后再截图。
- 下载原文件的 SHA-256 见 `source-manifest.json`；Fresco 原件额外与 GitHub API 的 Git blob SHA-1 核对一致。`prepare.py` 重新生成本地启动入口和清单，不发网络请求。

## 第三方依赖

| 依赖 | 用途 | 许可保存 |
| --- | --- | --- |
| p5.js 0.6.0 | 花瓣原例 | `vendor/P5-0.6.0-LICENSE.txt`，LGPL-2.1 |
| p5.js 1.2.0 | Fresco 原例；从原仓库配套文件取得 | `vendor/P5-1.2.0-LICENSE.txt`，LGPL-2.1 |
| D3 4.13.0 | 花瓣原例 | `vendor/D3-LICENSE.txt`，BSD-3-Clause |
| Lodash 4.17.5 | 花瓣原例 | `vendor/LODASH-LICENSE.txt`，MIT；保留原例版本 |
| p5.js-svg 1.1.1 | 原例 SVG 支持 | `vendor/P5-SVG-LICENSE.txt`，MIT |
| CCapture | 原示例声明的录制依赖，未启用录制 | 原仓库配套 bundle 及 `vendor/CCAPTURE-LICENSE.txt`，MIT；保留 bundle 内通知 |

Fresco 库内保留作者与所参考项目的原始注释；其 `shapes3D.js` 中注明了 `fogleman/ln` 来源。后续真正拆取功能时须跟着所取文件保留对应声明。山水中的噪声模块亦保留其 p5.js 来源注释。

## 能力与边界

**这轮已经证明：可以由我直接检索、取得并运行一组绘画代码，无需用户逐个下载。**

本轮尚未证明跨库统一风格、每种花鸟的辨识度、任意诗句驱动、逻辑和时间映射、安卓性能或所有设备的兼容性。代码与许可可取得只是进入候选库的条件，仍需对实际画面做选择。

优先建议：山水项目拆树、石、舟、亭；花瓣实验拆可参数化花瓣；Theatre 拆云轮廓和弧形波浪；鸟群沿用已有 NOC；确定基础风格后再评估是否加入 p5.brush 的笔触。
