// Repository-native diagram. SVG stays editable; PNG is rendered in browser QA.
import {writeFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const text=(x,y,s,size=19,color='#38564e',weight=400)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${esc(s)}</text>`;
function box(x,y,w,h,title,lines,{fill='#fffdf7',stroke='#b8cac0',small=false}={}){
 return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="15" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`+text(x+24,y+37,title,small?21:24,'#294b42',600)+lines.map((line,i)=>text(x+24,y+72+i*29,line,small?17:19)).join('');
}
const arrow=(path,color='#78958b',dashed=false)=>`<path d="${path}" fill="none" stroke="${color}" stroke-width="2.2" ${dashed?'stroke-dasharray="6 5"':''} marker-end="url(#arrow)"/>`;
let body=text(40,52,'流动诗 · 当前架构',32,'#294b42',600)+text(40,83,'语义 3.3 贯通版  /  2026-10-23',16,'#79887e');
body+=box(40,112,1200,85,'诗句输入',['手动输入 / 人工精选库 / 今日诗词候选初筛；选择与浏览不调用模型']);
body+=arrow('M 310 197 V 240')+text(326,224,'点击生成；命中最近成功缓存则复用',15);
body+=box(40,240,540,204,'DeepSeek · 结构化语义解释',['意象、数量、在场与比喻','整体环境、主次、群落与远近','必要依托、主导动作、可见气息','每项保留原文依据与推断标记']);
body+=box(700,240,540,204,'本地校验',['字段、实体、数量与原文依据','可受限展开相邻原句引用，标记待复核','不改变解释；未通过时不画新图','原始请求、回答和失败保持可追溯']);
body+=arrow('M 580 337 H 700')+text(597,321,'语义 JSON',15);
body+=arrow('M 970 444 V 480 H 640 V 511')+text(982,476,'校验通过',15);
body+=`<rect x="40" y="511" width="1200" height="232" rx="15" fill="#e8f0e8" stroke="#a4bfae" stroke-width="1.5"/>`+text(64,550,'本地视觉策略与场景组织',25,'#294b42',600);
body+=box(61,573,365,148,'语义 → 画面组织',['32 类画笔与数量策略','主次、群落、远近 → 比例分布','推断环境单列，不增加原文实体'],{small:true});
body+=box(449,573,365,148,'依托 → 合理布局',['地面、水域、山体与局部附着','区域提案 / 三个通用布局','检查数量依托；最多两轮修正'],{small:true});
body+=box(837,573,381,148,'状态与气息 → 视觉参数',['支持的姿态、微动与定性节奏','照明配色、迷蒙时远景淡化','逐项记录应用、空缺与保留'],{small:true});
body+=arrow('M 640 743 V 776 H 310 V 807');
body+=box(40,807,540,147,'p5 画笔 + Canvas 合成',['共享笔触源；图层、裁切、透明度','画笔时钟与有限观看运动','本地规则决定坐标、尺寸、笔触与配色']);
body+=box(700,807,540,147,'网页观看与调整',['22 套配色 / 动态程度 / 风力 / 月形','暂停 / 拖动与附着 / 沉浸 / PNG','这些调整不新增模型调用']);
body+=arrow('M 580 878 H 700');
body+=box(40,991,756,112,'贯穿记录与自查',['原始回答 + 语义消费记录 + 绘画缺口 + 浏览器重放','自动检查和字段被使用，均不等于诗意与审美已经正确'],{small:true,fill:'#eff3ee'});
body+=box(836,991,404,112,'失败保持可见',['校验失败：保存原因，不画新图','未支持的语义：保留解释与空缺'],{small:true,fill:'#f4eee5',stroke:'#c4b5a2'});
body+=arrow('M 1240 337 H 1262 V 975 H 1040 V 991','#b5a38c',true);
body+=`<rect x="40" y="1135" width="1200" height="109" rx="15" fill="#f6f2e9" stroke="#baa88d" stroke-width="1.5" stroke-dasharray="7 5"/>`;
body+=text(64,1171,'仍待实现',22,'#8c7656',600)+text(64,1201,'完整因果与多阶段时间 · 完整情绪自动配色 · 整首诗分镜',20,'#796c59')+text(64,1227,'本版仍面向短句或节选；人物采用简洁写意点景，优先完善整体风景、色彩与动态。',16,'#887d6c');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1280" viewBox="0 0 1280 1280" role="img" aria-labelledby="title desc"><title id="title">流动诗当前架构，语义3.3贯通版</title><desc id="desc">诗句输入，经DeepSeek结构化语义和本地校验，进入视觉策略、场景组织、绘画合成和交互。失败记录、未支持语义与后续规划单列。</desc><defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M 0 0 L 9 4.5 L 0 9 Z" fill="#78958b"/></marker></defs><rect width="1280" height="1280" fill="#f7f7ef"/><g font-family="Microsoft YaHei, PingFang SC, sans-serif">${body}</g></svg>`;
await writeFile(new URL('poem-flow/architecture.svg',root),svg+'\n');
await writeFile(new URL('poem-flow/architecture.html',root),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>流动诗 · 当前架构</title><style>body{margin:0;background:#f7f7ef;color:#38564e;font:16px/1.8 system-ui}main{max-width:1280px;margin:auto;padding:22px}nav{display:flex;flex-wrap:wrap;gap:20px}img{display:block;width:100%;height:auto}details{border-top:1px solid #cad5c9;margin:20px 0;padding:18px 0}code{font-size:13px}a{color:inherit}@media(max-width:650px){main{padding:14px}}</style><main><nav><a href="/">← 生成器</a><a href="semantic-review.html">语义贯通实测</a><a href="architecture.svg" download="流动诗-当前架构.svg">下载 SVG</a></nav><img src="architecture.svg" alt="流动诗当前架构：输入、DeepSeek语义、本地校验、场景组织、绘画与交互"><details><summary>对应的实现模块</summary><p>请求与记录：<code>service.mjs</code>；协议检查：<code>composition-contract.mjs</code>；语义转视觉：<code>semantic-policy.mjs</code>；数量与场景：<code>composition.mjs / scene-organization.mjs</code>；绘制与时钟：<code>drawing/core.js / scene.js</code>；主网页：<code>app.js / poem-flow/index.html</code>。</p><p>模型只接收原句，不接收本地编辑目标。作者与出处作为记录元数据保留。模型不给坐标或可执行绘图代码；具体视觉参数由项目本地策略决定。</p></details></main></html>`);
console.log(JSON.stringify({svg:'poem-flow/architecture.svg',page:'poem-flow/architecture.html'}));
