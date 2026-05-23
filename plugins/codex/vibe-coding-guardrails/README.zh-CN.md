# Vibe Coding Guardrails for Codex

中文说明 | [English](./README.md)

这是一个面向 Codex 的纯 skills 插件。它为 AI 辅助开发提供工程治理流程，不包含 hooks、MCP servers、app connectors、runtime scripts，也不会在安装时自动修改项目文件。

## Skills

插件包含：

```text
init-project
risk-classify
new-feature
design-review
implementation-plan
code-review
test-plan
security-review
release-check
```

可以在 Codex 中用自然语言调用，例如：

```text
Use Vibe Coding Guardrails to initialize this repository.
Use Vibe Coding Guardrails to classify the risk of this task.
Use Vibe Coding Guardrails to review this diff.
Use Vibe Coding Guardrails to prepare a test plan.
Use Vibe Coding Guardrails to run a release check.
```

## 第一次使用

在目标仓库中让 Codex 执行：

```text
Use Vibe Coding Guardrails to initialize this repository.
```

这个 skill 会：

1. 以只读模式扫描仓库。
2. 检测已有 Claude、Codex、Spec Kit 和其他 AI workflow 文件。
3. 输出扫描报告。
4. 推荐目标格式：`claude`、`codex`、`both` 或 `speckit-compatible`。
5. 向用户确认。
6. 用户确认后才生成本地治理文件。
7. 避免覆盖已有文件。

## v1 约束

这个插件故意只包含 skills 和 markdown resources。

不包含：

- hooks
- MCP servers
- app connectors
- runtime scripts
- 自动批准行为
- 安装时自动修改仓库

## 安全模型

高风险工作必须要求人工批准，包括认证、授权、支付、数据库迁移、生产数据、安全策略、部署配置、CI/CD 行为、公共 API 破坏性变更、secrets 和大范围重构。
