# Vibe Coding Guardrails for Codex

这个插件提供 v2 闭环治理能力：

- init、风险分类、功能规划、设计评审、代码评审、测试计划、安全评审、发布检查等 skills
- lifecycle hooks，用于阻断危险命令和 Red Zone 文件操作
- risk levels、gates、file-change policy、project output templates 等资源文件

建议流程：

1. 安装插件。
2. 运行 init-project skill。
3. 审查生成的 `.guardrails/config.json` 和 gate 模板。
4. 安装 Git hooks。
5. 在 CI 中加入 `vibe-guardrails check --ci`。

v2 不包含 MCP server，也不默认连接外部服务。
