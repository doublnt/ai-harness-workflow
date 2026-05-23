# Codex 版 AnyHarness

AnyHarness 是 Codex 插件，通过 skills 和可选生命周期 hooks 为 AI 开发增加工程护栏。

## 示例 prompt

```text
Use AnyHarness core rules for this change.
Use AnyHarness to initialize this repository.
Use AnyHarness to review this diff before commit.
Use AnyHarness to prepare a release check.
```

## 新手路径

1. 从本地 marketplace 安装插件。
2. 先让 Codex 使用 AnyHarness core rules。
3. 只有需要项目本地规则时，再初始化 repo。
4. Harness 模式建议在 advisory 稳定后再启用。

## 新项目

可以说：

```text
Use AnyHarness to initialize this repository in Project mode.
```

## 老项目

从 advisory 模式开始。已有 `AGENTS.md` 不会被覆盖，AnyHarness 会生成 draft append 文件。

## 安全

安装插件不会修改 repo。启用插件 hooks 前应先 review 并信任 hooks 定义。
