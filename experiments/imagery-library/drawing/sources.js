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
  'fresco-cloud': Object.freeze({
    id:'fresco-cloud',author:'Niels Pichon',license:'Apache-2.0',kind:'adapted',
    url:'https://github.com/NielsPichon/p5.Fresco/blob/main/demos/theatre/cloudGen.js',
    originals:['code-research/fresco/demos/theatre/cloudGen.js'],licenseFile:'code-research/fresco/LICENSE',
    note:'取圆弧/S 路径/水平段云形生成与归一化；实例化随机与点函数，返回数值点，递归改为有界重试；去掉 Fresco.Shape、随机配色与边框放置。'
  }),
  'shan-rock': Object.freeze({
    id:'shan-rock',author:'Lingdong Huang',license:'MIT',kind:'adapted',
    url:'https://github.com/LingDong-/shan-shui-inf',
    originals:['code-research/shan-index.html'],licenseFile:'code-research/shan-LICENSE.txt',
    note:'取 Mount.rock 的椭圆极径、噪声外缘、压扁底部与内缩轮廓思路；改为闭合周期噪声、种子预计算和 Canvas 纹理，不复制原 SVG texture/stroke。'
  }),
  'shan-pavilion': Object.freeze({
    id:'shan-pavilion',author:'Lingdong Huang',license:'MIT',kind:'adapted',
    url:'https://github.com/LingDong-/shan-shui-inf',
    originals:['code-research/shan-index.html'],licenseFile:'code-research/shan-LICENSE.txt',
    note:'取 Arch 内 hut 的幂函数屋顶展开、roof 的屋脊/檐角控制点，以及 rail 的菱形平面；亭继续使用 architecture.js 的折檐。楼在原适配基础上保留屋脊与檐的组织参考，曲檐墨面、断笔、楼层、窗影均由本项目重写；不复制 arch01 自动人物。'
  }),
  'shan-boat': Object.freeze({
    id:'shan-boat',author:'Lingdong Huang',license:'MIT',kind:'adapted',
    url:'https://github.com/LingDong-/shan-shui-inf',
    originals:['code-research/shan-index.html'],licenseFile:'code-research/shan-LICENSE.txt',
    note:'只取 Arch.boat01 船体上下轮廓的正弦开方曲线，改为独立 Canvas 船体；不复制 Man.man、船夫、桨、随机笔触或自动场景。'
  })
});
