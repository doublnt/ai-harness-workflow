# AI Harness Guardrails 插件

面向 AI coding agent 的工程护栏插件，包含：

- `guardrails-core`：简洁行为规则。
- 工作流 skills：初始化、风险分类、功能规划、设计评审、实现计划、代码评审、测试计划、安全评审、发布检查。
- lifecycle hooks：可选执行层，用于阻断危险工具调用和不完整总结。

Lite 模式先用 `guardrails-core`。需要项目级规范或闭环门禁时运行 `init-project`。
