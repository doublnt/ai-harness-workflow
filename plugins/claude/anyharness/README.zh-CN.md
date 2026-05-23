# AnyHarness for Claude Code

AnyHarness 为 Claude Code 提供原生项目指令、skills 和可选 hooks，让 AI 编程更安全。

## 原生 prompt 入口

Claude Code 使用 `CLAUDE.md` 或 `.claude/CLAUDE.md`。AnyHarness 不再需要单独的 `ANYHARNESS.md`。

写入或生成 Claude 指令草案：

```bash
npx anyharness prompt --target claude --write
```

## Skills

```text
/anyharness:harness-core
/anyharness:init-project
/anyharness:risk-classify
/anyharness:new-feature
/anyharness:design-review
/anyharness:implementation-plan
/anyharness:code-review
/anyharness:test-plan
/anyharness:security-review
/anyharness:release-check
```

## 闭环模式

```bash
npx anyharness new --target claude
```

这会开启 agent hooks、Git hooks、CI checks、gate artifacts、approvals 和 docs drift gates。
