# agent-start

一个 Node.js AI Agent demo：根据用户输入识别需求，匹配合适的仓库信息，再按分类汇总并生成面向用户的最终展示文案。

## 当前流程

1. 启动自检（环境变量、模型连通性）
2. 用户输入自然语言需求
3. 使用大模型或规则模式提取结构化意图
4. 基于仓库目录进行匹配打分
5. 将结果按分类整理，并输出推荐结论
6. 浏览推荐仓库详情

## 快速开始

### TUI 交互模式（推荐）

```bash
pnpm start
```

如果还没有配置模型 Key，也可以先离线运行：

```bash
pnpm start -- --offline
```

### 命令行直接传参

```bash
pnpm start -- "帮我推荐适合做 AI Agent 的 TypeScript 仓库"
pnpm start -- --offline --debug "我想找适合做 Vue 前端架构参考的仓库"
```

## 环境变量

参考 [.env.example](.env.example)：

- `OPENROUTER_API_KEY`: OpenRouter API Key
- `OPENROUTER_MODEL`: 可选，指定模型名称；默认会使用 `openrouter/free`

## 下一步可扩展

- 把本地仓库目录替换成你们自己的 JSON、数据库或搜索服务
- 为仓库增加更多元数据，比如负责人、业务线、维护状态、星标、最近更新时间
- 在匹配层增加向量检索或全文检索
- 将结果输出接到 Web 页面或聊天界面
