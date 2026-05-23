# AnyHarness for Codex

AnyHarness 为 Codex 提供原生 `AGENTS.md` 指令、skills 和可选 hooks，让 AI 编程更安全。

## 原生 prompt 入口

Codex 默认使用 `AGENTS.md`。AnyHarness 不再需要单独的 `ANYHARNESS.md`，默认也不生成 `CODEX.md`。

写入或生成 Codex 指令草案：

```bash
npx anyharness prompt --target codex --write
```

## Skills

可以自然语言调用 Codex：

```text
Use AnyHarness to initialize this repository.
Use AnyHarness to review this diff.
Use AnyHarness to prepare a release check.
```

## 闭环模式

```bash
npx anyharness new --target codex
```

这会开启 agent hooks、Git hooks、CI checks、gate artifacts、approvals 和 docs drift gates。
