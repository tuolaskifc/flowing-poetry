/* Project provenance registry. Original downloaded files stay unchanged.
 * Paths are relative to the imagery-library directory, not fetched at runtime.
 */
window.PoemDrawingSources = Object.freeze({
  project: Object.freeze({
    id:'project',author:'本项目',license:null,url:null,
    originals:[],licenseFile:null,kind:'original',
    note:'本地新写的形态、运行与交互代码；不声称为社区作品。'
  }),
  'noc-tree': Object.freeze({
    id:'noc-tree',author:'Daniel Shiffman / The Nature of Code',license:'MIT',kind:'adapted',
    url:'https://github.com/nature-of-code/noc-examples-p5.js-archived/blob/master/chp08_fractals/NOC_8_06_Tree/sketch.js',
    originals:['sources/noc-tree.js'],licenseFile:'sources/NOC-LICENSE.txt',
    note:'递归分枝改为预先生成骨架、曲线枝条与局部风响应。'
  }),
  'noc-wave': Object.freeze({
    id:'noc-wave',author:'Daniel Shiffman / The Nature of Code',license:'MIT',kind:'adapted',
    url:'https://github.com/nature-of-code/noc-examples-p5.js-archived/blob/master/chp03_oscillation/NOC_3_09_wave/sketch.js',
    originals:['sources/noc-wave.js'],licenseFile:'sources/NOC-LICENSE.txt',
    note:'正弦波采样改为多层连续水纹；风与笔触疏密分别控制。'
  }),
  'noc-boids': Object.freeze({
    id:'noc-boids',author:'Daniel Shiffman / The Nature of Code；Boids 思路来自 Craig Reynolds',license:'MIT',kind:'adapted',
    url:'https://github.com/nature-of-code/noc-examples-p5.js-archived/blob/master/chp06_agents/NOC_6_09_Flocking/boid.js',
    originals:['sources/noc-boid.js'],licenseFile:'sources/NOC-LICENSE.txt',
    note:'实例绑定、固定步长、同步更新、分离间距参数与新鸟形；固定 22 个个体。'
  }),
  'sxywu-petals': Object.freeze({
    id:'sxywu-petals',author:'sxywu',license:'MIT（原 .block 标注）',kind:'adapted',
    url:'https://gist.github.com/sxywu/56728e6cf17ad249ef232c49cd9a90ad',
    originals:['code-research/flower/index.html','code-research/flower/.block'],licenseFile:'code-research/flower/.block',
    note:'取 petalPath 的曲线生成，改为数值控制点与 Canvas 绘制；去掉 D3/Lodash 依赖，预生成花瓣，茎叶和风响应由本项目编写。'
  }),
  'shan-boat': Object.freeze({
    id:'shan-boat',author:'Lingdong Huang',license:'MIT',kind:'adapted',
    url:'https://github.com/LingDong-/shan-shui-inf',
    originals:['code-research/shan-index.html'],licenseFile:'code-research/shan-LICENSE.txt',
    note:'只取 Arch.boat01 船体上下轮廓的正弦开方曲线，改为独立 Canvas 船体；不复制 Man.man、船夫、桨、随机笔触或自动场景。'
  })
});
