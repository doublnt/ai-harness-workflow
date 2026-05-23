# Claude Code 版 AnyHarness

AnyHarness 是 Claude Code 插件，通过 skills 和可选生命周期 hooks 为 AI 开发增加工程护栏。

## 命令

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

## 新手路径

1. 安装插件。
2. 先用 `/anyharness:harness-core`。
3. 要求 Claude 保持小范围改动，并输出测试和 Unknowns。
4. 只有想生成项目本地规则时，再运行 `/anyharness:init-project`。

## 新项目

```text
/anyharness:init-project
```

建议先选 `Project` 模式；如果需要 hooks、Git hooks、CI gates、gate artifacts、审批记录和文档漂移检查，再选 `Harness`。

## 老项目

运行 `init-project`，先看扫描报告，从 `advisory` 模式开始。已有 `CLAUDE.md` 不会被覆盖，AnyHarness 会生成 draft append 文件。

## 安全

安装插件不会修改 repo。启用 hooks 前应先 review 并信任 hooks 定义。
