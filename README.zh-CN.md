# Vibe Coding Guardrails

一套面向 AI 编程的工程护栏：让改动更小、更可审查、必须给证据，并且在高风险操作时可以阻断。

这是最终版：它同时包含一个很轻的行为 skill，以及可选的闭环治理 harness，支持 Claude Code、Codex、Cursor、Git hooks 和 CI gates。

## 它解决什么问题

AI coding agent 经常会：

- 隐藏假设；
- 小问题大重构；
- 顺手改无关文件；
- 没跑测试却说通过；
- 未经 review 修改高风险文件；
- 漏掉测试、文档、发布计划和回滚计划。

## 四条核心规则

1. **先判断风险**：写代码前先分 L0/L1/L2/L3。
2. **保持外科手术式改动**：每一行改动都要能对应用户请求。
3. **必须提供证据**：测试命令、实际运行结果、文件、gate artifact，或者明确说明未测试风险。
4. **阻断危险操作**：secrets、migration、认证、支付、CI/deploy、生产数据等必须有门禁和人工批准。

## 三种使用模式

| 模式 | 做什么 | 适合谁 |
|---|---|---|
| Lite | 只安装行为 skill，不加 hooks，不改 repo | 个人、小项目、低风险项目 |
| Project | 生成项目本地 `GUARDRAILS.md`、`AGENTS.md`/`CLAUDE.md` 草案、风险策略和 gate 目录 | 已有项目想统一 AI 工作流 |
| Harness | 加上 agent hooks、Git hooks、CI gates、gate artifacts、docs drift 和 commit message 门禁 | 团队、生产项目、高风险系统 |

## 包含内容

- Claude Code plugin：skills + lifecycle hooks。
- Codex plugin：skills + lifecycle hooks。
- Cursor Lite 适配：`.cursor/rules/vibe-guardrails.mdc`。
- `guardrails-core` 简洁入口 skill。
- 项目初始化流程。
- 风险分类、新功能规划、设计评审、实现计划、代码评审、测试计划、安全评审、发布检查。
- Git hooks / CI 使用的确定性 checker。
- Gate artifacts 和 approval ledger。
- Docs drift 检测。
- 中英文 README。

## Claude Code 安装

添加本地 marketplace：

```text
/plugin marketplace add ./path/to/vibe-coding-guardrails-final
/plugin install vibe-coding-guardrails@vibe-guardrails
```

然后使用：

```text
/vibe-coding-guardrails:guardrails-core
/vibe-coding-guardrails:init-project
/vibe-coding-guardrails:risk-classify
/vibe-coding-guardrails:new-feature
/vibe-coding-guardrails:design-review
/vibe-coding-guardrails:implementation-plan
/vibe-coding-guardrails:code-review
/vibe-coding-guardrails:test-plan
/vibe-coding-guardrails:security-review
/vibe-coding-guardrails:release-check
```

## Codex 安装

添加本地 marketplace：

```text
codex plugin marketplace add ./path/to/vibe-coding-guardrails-final
```

安装 `vibe-coding-guardrails` 后，可以自然语言调用：

```text
Use Vibe Coding Guardrails Core for this coding task.
Use Vibe Coding Guardrails to initialize this repository.
Use Vibe Coding Guardrails to review this diff before commit.
```

## Cursor 使用

复制 Lite 规则到项目：

```bash
mkdir -p .cursor/rules
cp plugins/cursor/vibe-coding-guardrails/.cursor/rules/vibe-guardrails.mdc .cursor/rules/vibe-guardrails.mdc
```

或者通过 CLI 打印：

```bash
node bin/vibe-guardrails.mjs cursor-template
```

## CLI 快速开始

在本仓库内运行：

```bash
node bin/vibe-guardrails.mjs --help
node bin/vibe-guardrails.mjs init --profile project --target detect
node bin/vibe-guardrails.mjs check --staged
```

发布为 npm 包后：

```bash
npx vibe-coding-guardrails init --profile harness --target detect --install-hooks
npx vibe-coding-guardrails check --ci
```

## 项目初始化

普通项目推荐：

```bash
vibe-guardrails init --profile project --target detect --mode advisory
```

团队/生产项目推荐：

```bash
vibe-guardrails init --profile harness --target both --mode enforcing --install-hooks
vibe-guardrails ci-template --write
```

初始化会创建或生成草案：

- `GUARDRAILS.md`
- `.guardrails/config.json`
- `.guardrails/gates/`
- `.guardrails/approvals/`
- `.guardrails/baselines/project-scan.json`
- `AGENTS.md` 或 `.guardrails/drafts/AGENTS.append.md`
- `CLAUDE.md` 或 `.guardrails/drafts/CLAUDE.append.md`
- 可选 Git hooks 和 GitHub Actions workflow

已有文件不会被覆盖，冲突内容会写入 `.guardrails/drafts/`。

## 风险等级

| 等级 | 含义 | 示例 | 门禁 |
|---|---|---|---|
| L0 | 低风险 | 文档错字、按钮文案、小样式调整 | 基础自检 |
| L1 | 普通功能 | UI 组件、普通 CRUD、局部重构 | 需求、review、测试 |
| L2 | 核心或敏感 | 认证、授权、支付、文件、用户数据、外部 API、agent 工具权限 | 设计、安全、测试、发布、批准 |
| L3 | 关键或不可逆 | migration、生产数据、部署策略、公共 API 破坏性变更、架构迁移 | 完整设计、迁移、回滚、CI、明确人工批准 |

## 闭环 Harness

Harness 模式有四层：

1. **Skills**：告诉 AI 应该如何工作。
2. **Agent hooks**：AI 操作过程中阻断危险工具调用和不完整总结。
3. **Git hooks**：提交前阻断。
4. **CI gate**：PR / merge 前兜底。

安装本地 Git hooks：

```bash
vibe-guardrails install-hooks
```

生成 CI 模板：

```bash
vibe-guardrails ci-template --write
```

## Commit message 门禁

默认格式：

```text
feat(auth): rotate refresh tokens [risk:L2]
```

L2/L3 需要 trailers：

```text
Risk-Level: L2
Gate-Review: .guardrails/gates/2026-05-23-refresh-token.json
Tests: npm test
Human-Approval: required
Rollback: docs/release/2026-05-23-refresh-token.md
```

## Gate artifacts

创建 gate：

```bash
vibe-guardrails gate create --task "rotate refresh tokens" --risk L2 --gates design,security,test,release
```

批准 gate：

```bash
vibe-guardrails gate approve 2026-05-23-rotate-refresh-tokens --notes "安全评审后批准。"
```

查看状态：

```bash
vibe-guardrails gate status
```

## 仓库结构

```text
plugins/claude/vibe-coding-guardrails/   Claude plugin
plugins/codex/vibe-coding-guardrails/    Codex plugin
plugins/cursor/vibe-coding-guardrails/   Cursor Lite 规则
src/                                      CLI 和确定性检查
templates/project/                        Git hooks、CI、config、gate schema
docs/                                     实现文档
EXAMPLES.md                               坏例子 vs 好例子
GUARDRAILS.md                             最小核心规则
```

## 验证本仓库

```bash
npm test
npm run validate
npm run check
```

预期结果：

```text
Validation passed. final Vibe Coding Guardrails layout is valid.
Unit tests passed.
```

## 安全说明

- 安装 plugin 不应该修改目标 repo。
- 只有用户明确初始化后才写入项目文件。
- 已有文件不会被覆盖，只会生成草案。
- 启用 hooks 前应该 review 并 trust。
- 本地 Git hooks 可以被绕过，所以 CI gate 才是最终兜底。

## 相关文件

- [GUARDRAILS.md](./GUARDRAILS.md)
- [EXAMPLES.md](./EXAMPLES.md)
- [README.md](./README.md)
- [docs/hooks.md](./docs/hooks.md)
- [docs/git-hooks.md](./docs/git-hooks.md)
- [docs/ci-gates.md](./docs/ci-gates.md)
