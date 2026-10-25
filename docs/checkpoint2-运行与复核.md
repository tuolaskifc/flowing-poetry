# 检查点 2：运行与复核说明

整理日期：2026-10-25。实际检查环境为 Windows、Node.js v24.18.0、Git 2.55.0.windows.2。项目使用 Node.js 内置模块和随仓库保存的 p5.js，无需安装 npm 依赖。本次没有验证其他 Node.js 版本或安卓。

## 1. 启动

从项目根目录运行：

```text
npm --prefix poem-flow start
```

浏览器打开 `http://127.0.0.1:4173/`。生成和回放依赖本地服务，不使用双击 HTML 的方式。端口被占用时可先停止自己已有的预览服务，或设置环境变量 `PORT` 后重新启动。

## 2. 不配置密钥也可检查的内容

- `http://127.0.0.1:4173/poem-flow/rule-review.html`：12 组手工语义与本地绘画规则的 24 张对照，页面明确标注手工校准性质。
- `http://127.0.0.1:4173/poem-flow/refinement-review.html`：13 组既有解读的前后画面对照。
- `http://127.0.0.1:4173/poem-flow/expanse-review.html`：局部与满幅抽象笔势对照。
- `http://127.0.0.1:4173/poem-flow/expression.html?latest=1`：读取已有可用融合结果，无需新模型调用。
- 以下自动检查使用本地样例和模拟提供方，不需要真实服务密钥：

```text
npm --prefix poem-flow run check
npm --prefix poem-flow test
```

已有结果回放不等于一次新的真实生成。不要把 `capture-*` 脚本作为日常离线检查运行；这类脚本可能请求外部模型并产生费用。

## 3. 新诗句的真实生成

复制根目录的 `llm api.example.txt` 为 `llm api.txt`，填写自己的 HTTPS 接口地址、API Key 和服务商模型名。配置支持 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL` 三个名称。示例地址和占位符不能用于真实请求。

新请求需要外部网络和可用的提供方账户。原作者的真实配置不随包提交。打开网页本身不自动请求模型；点击生成才可能产生请求。同句缓存与已有结果回看是否命中，以页面提示和记录为准。

## 4. 人工复核建议

在同一份已有结果中切换表达模式、配色与铺展，检查主体数量和依托是否保留，再尝试暂停与 PNG 导出。对错误情形可检查空输入提示，或观察已有失败样例的错误说明。记录实际输入、操作、预期、结果及本人判断，不能以助手执行的自动检查代替本人操作。

## 5. 当前限制

结构通过不代表古义、指代、数量或审美正确。局部恢复的结果可能只完成部分表达；复杂时序、完整因果、16 类自动情感配色和安卓尚未贯通。历史文档中的测试数量属于各自阶段，当前结果请查看提交包附件中的本次测试日志。

原始请求与失败见 `experiments/poem-generation/runs/`；各轮图片与验证见 `poem-flow/verification/`。来源与许可见 `poem-flow/THIRD_PARTY.md` 和 `experiments/imagery-library/drawing/README.md`。
