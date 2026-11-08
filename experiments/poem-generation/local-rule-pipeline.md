# 诗句规则的执行路径与离线试验

本文件记录当前代码的执行路径，以及独立的本地规则试验。它不替换现有的模型生成入口，也不改变保存的回答。

## 现有生成路径

1. 网页将原句和 expression 模式提交给 `server.mjs` 的 `/api/analyze`；`service.mjs` 使用同句、提示、协议与模型等条件查找可复用回答，未命中时请求模型。接口配置目前在缓存查找之前读取。
2. `expression-contract.mjs` 校验原文、主体、数量、关系、依据和场景结构。`generation-recovery.mjs` 只整理允许的无歧义格式或隔离可选错误；主体等核心错误仍失败，原回答和有效视图分开。
3. `expression-plan.mjs` 将有效语义投影到场景协议；`planner.mjs` 先调用 `source-resolution.mjs` 对原文明确数量和肯定同指作有限复核，再结合 `source-drawing.mjs`、意象词表、`physical-mapping.mjs` 和 `expressive-mapping.mjs` 选择已有画法或保留缺口。
4. `semantic-policy.mjs`、`composition.mjs`、`scene-layout.mjs` 和 `scene-organization.mjs` 处理语义层、候选构图、区域和依托；`landscape-development.mjs`、`scene-integrity.mjs` 补充风景候选和检查。程序中的推断支撑不是原文主体。
5. `drawing-policy.mjs` 把颜色、依托、可见度、主体避让和候选检查应用到主画面与候选；`expression-plan.mjs` 形成景物、抽象表达及推荐倾向。最终网页由 `scene.js`、`expression-layout.js`、`gesture-field.js` 和 `abstract-scene.js` 绘制。缺画法、局部恢复和语义不确定性保留在结果中。

上述模块并不等于能从任意原文独立解析：许多数量、逻辑、关系和时间判断仍依赖模型给出的结构化解释。已有共用绘画规则以其输入为基础，不能把它们误称为完整的离线自然语言解析器。

## 独立本地试验

`local-rule-pipeline.mjs` 只读原句，复用推荐词表进行保守线索扫描；暂缓带否定、假设、比喻、感官或歧义线索的句段，单字匹配和重复称谓也不强行补画。其余有限词语作为**需复核的本地候选**进入同一结构检查和 `buildExpressionPlan`，再复用数量、构图与绘画策略。没有明确动作解析时关闭原生景物默认动作。所有未采用线索保留在 `deferred`；无主体时只有标记为本地艺术选择的抽象兜底。

调用（项目根目录）：

```powershell
node experiments/poem-generation/local-rule-cli.mjs '两只白鹭临清泉。'
node --test experiments/poem-generation/local-rule-pipeline.test.mjs
```

命令输出 JSON：包含原句、试验性语义、检查结果、未判断线索和绘画计划；它不连接模型、不读已保存回答、不写历史文件。本轮提供的是可独立调用的分析与计划接口，尚未接入网页，也没有完成网页绘制或逐图审美检查。输出计划可供现有绘制器适配；不能把有效结构当成对诗句的完整理解。

## 当前边界

- 此扫描器刻意牺牲覆盖率；它不会解决跨句指代、完整否定范围、动词、时间和复杂比喻。未命中词以及同句中未识别的部分仍可能丢失，不能把 `deferred` 看成完整的遗漏清单。
- 词表原本用于粗筛，不足以可靠判断复合词或是否在场；即使通过结构检查，也可能有误判。它只能作为试验，不应自动替代 API 结果。
- 暂缓整个句段会遗漏句段中本来可以绘制的主体。抽象兜底属于本地画法，不表示识别了具体主体。
- 本地实验未修改线上服务、旧入口或历史答案；回归测试不能证明像素和审美完全相同。需要下一轮固定独立诗句，逐幅评估误画、漏画、数量及实际视觉效果，再考虑接入交互界面。
