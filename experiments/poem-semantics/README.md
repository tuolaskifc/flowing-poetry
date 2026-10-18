# 古诗语义 API 实验

独立于网页的实验。模型只做语义分析；不生成、下载或执行绘图代码，不选择颜色、坐标或动画参数。

**当前固定协议为 3.0：**先读 [字段与解释约定](contract-v3/固定输出结构.md)。调用脚本默认使用 v3；以下 v1/v2 文件是历史实验，不代表当前接收格式。3.0 已做离线检查，尚未用接口验证模型遵守率。

```powershell
node --test experiments/poem-semantics/contract-v3/validate.test.mjs
node experiments/poem-semantics/contract-v3/offline-check.mjs
node experiments/poem-semantics/run.mjs --version v3 --run contract-v3-final-prepared --limit 7 --prepare-only
```

上述步骤没有 API 调用。需要实际请求时，另用新的 run 名称并去掉 `--prepare-only`；这会消耗接口额度，尚未在本轮执行。

- `cases.json`：用户提供的五句诗及审阅重点。**审阅重点不发送给模型。**
- `prompt-v1.txt`：共同提示词；未给出这五句的参考答案。
- `schema.json`：输出约定。保留意象、关系、气息、时间方式、原文依据与不确定性。
- `validate.mjs`：格式、原文引用、实体引用校验。通过不代表文学解释正确。
- `results/`：逐次请求、模型最终文本、解析结果、用量与中文汇总。不保存认证信息或隐藏推理字段。

需要 Node.js 22 或以上，无额外依赖。从课程项目根目录运行：

```powershell
node --test experiments/poem-semantics/validate.test.mjs
node experiments/poem-semantics/run.mjs --version v1 --run first-five-no-thinking --limit 1
node experiments/poem-semantics/run.mjs --version v1 --run first-five-no-thinking
```

已有结果会跳过，避免意外重复扣费。网络失败或校验失败会停止，不自动重试、不自动修复答案。要重复实验应使用新的 `--run` 名称，并留意调用额度。

默认请求 `thinking: {type: "disabled"}`。首次未指定该设置时，接口将 4096 个生成 token 全部用于推理，没有返回最终文本；失败记录保存在 `results/first-five/`。该参数的官方说明见 [DeepSeek 思考模式文档](https://api-docs.deepseek.com/guides/thinking_mode/)，具体在此服务商上的行为以实验结果为准。可使用 `--thinking default` 省略该参数，或 `--thinking enabled` 显式开启；这会产生新请求，须使用新的 run 名称保存。

默认读取根目录 `llm api.txt`，三行依次为 HTTPS 基础地址、API Key、模型名。也支持 `--credentials .env`，其中使用 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL`。配置文件只在本地读取，不作为模型输入，不把内容打印到终端。`llm api.txt` 和 `.env` 已由项目忽略规则排除。

本轮仅提供诗句节选，没有全文。情感标签是可修正的解释，不能视为标准答案；后续还需陌生诗句、否定与角色交换等样例，检验泛化和稳定性。

## 第二轮及离线重检

第二版新增动作、属性、时间标记，原始请求与回答均保存。除原五句外，增加一条古诗节选及一条自拟主客体测试句；并未进行重复采样，不能据此声称稳定性或普遍准确率。

```powershell
node experiments/poem-semantics/run.mjs --version v2 --run structured-v2 --limit 7 --continue-on-invalid
node experiments/poem-semantics/recheck.mjs
```

`--continue-on-invalid` 只在评估时收集其他样例，不会重试或修复失败答案；存在失败时退出码仍为 1。第二版原规则把船、人物等承载体排除在位置引用之外，也不允许属性修饰事件，过于狭窄。`recheck.mjs` 仅用已保存回答离线重检这两项，不修改原始数据，不增加 API 调用；这不表示第二版提示词已经让模型遵守了新的规则。原规则与修正规则的结果并列保留。
