# TUI 交互重构设计

## 概述

将 agent-start CLI 的终端交互从纯文本输出重构为基于 ink + @inkjs/ui 的全屏 TUI 界面，覆盖启动自检、需求输入、处理动画、结果浏览全流程。

## 架构

```
index.ts (TUI 入口, render <App />)
  └── App (根组件, 管理 screen 状态机)
        ├── WelcomeScreen (启动自检)
        ├── InputScreen (需求输入)
        ├── ProcessingScreen (步骤动画)
        ├── ResultsScreen (结果列表)
        └── DetailScreen (仓库详情)

agent.ts (纯业务逻辑, 保持不变)
repo-catalog.ts (仓库数据, 保持不变)
```

## 文件结构

```
src/
  tui/
    app.tsx          # 根组件, 屏幕状态机
    screens/
      welcome.tsx    # 启动自检屏
      input.tsx      # 需求输入屏
      processing.tsx # 处理中动画屏
      results.tsx    # 结果列表屏
      detail.tsx     # 仓库详情屏
    components/
      box-frame.tsx  # 带边框的卡片容器
      status-line.tsx # 步骤状态行 (✓/⠋/○)
```

## 屏幕状态流转

```
Welcome → Input → Processing → Results ↔ Detail
  ↑                                    ↓
  └────── q (退出进程) ←───────────────┘

Processing 出错 → 显示错误 → Enter 重试当前步骤 / q 退出
Results 无匹配 → 返回 Input 屏
```

## 屏幕设计

### Welcome 屏

- 标题 + 副标题
- 自检结果列表（环境变量、模型连通性）
- 按 Enter 进入输入屏

### Input 屏

- 提示文本 + 输入框
- 支持 Enter 提交、Esc 退出
- 历史记录选择（↑↓）不在本轮实现，后续迭代加入

### Processing 屏

- 三步状态行：分析意图 → 匹配仓库 → 生成总结
- 每步显示 ✓（完成）、⠋（进行中）、○（待执行）
- 自动推进，完成后进入 Results 屏
- 如果某步抛出错误，显示 ✗ 错误提示，底部显示 "按 Enter 重试，按 q 退出"

### Results 屏

- 标题显示推荐数量
- 可滚动列表，每项显示名称、描述、技术栈、评分
- ↑↓ 浏览，Enter 查看详情，q 退出
- 如果无匹配结果，显示 "未找到匹配的仓库，请尝试其他关键词" 并返回 Input 屏

### Detail 屏

- 完整仓库信息：描述、分类、技术栈、评分、推荐理由、使用场景、亮点
- b 返回列表，q 退出

## 关键设计决策

1. agent.ts 保持不变，TUI 只负责渲染和交互
2. 离线模式兼容，自检失败自动切换离线模式
3. CLI 参数保留（--offline、--debug 等）
4. 使用 @inkjs/ui 的 TextInput、Spinner 等现成组件
5. 自定义边框容器和步骤状态行组件

## 依赖

- ink (v6+)
- @inkjs/ui (v2+)
- react
- @types/react

## 测试策略

本轮不新增 TUI 自动化测试，保持现有 agent.ts 单元测试不变。TUI 组件通过手动验证和离线运行测试。
