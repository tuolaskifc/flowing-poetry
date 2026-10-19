# 第三方资源

- p5.js 2.3.3，Processing Foundation 及贡献者。
- 来源：https://cdn.jsdelivr.net/npm/p5@2.3.3/lib/p5.min.js
- 官方下载说明：https://p5js.org/download/
- 使用 LGPL-2.1 许可证，随附完整文本：`vendor/p5-LICENSE.txt`。
- 本项目将库保存在本地，页面运行时无需请求第三方 CDN。

当前入口复用的绘画算法、作者、许可证及本地改编说明见 [绘画来源登记](../experiments/imagery-library/drawing/README.md) 与 `drawing/sources.js`；页面也根据实际绘制的工具展示对应来源。p5 外的工具依赖没有因主入口整合而变更。

诗句可由用户输入、今日诗词官方 SDK 推荐，或从本地精选列表选择；本地推荐会明确标注，未声称来自在线接口。本地服务与页面、图层组合及交互由本项目编写。旧固定作品中的句子由用户提供，本项目不主张句子的著作权。
