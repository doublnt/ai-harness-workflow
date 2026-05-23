# Vibe Coding Guardrails v2

面向 AI 辅助编程的闭环工程治理护栏。

v2 从 v1 的纯 skills 升级成 **governance harness**：

- Claude Code plugin：skills + lifecycle hooks
- Codex plugin：skills + lifecycle hooks
- deterministic `vibe-guardrails` CLI 检查器
- Git hooks：`pre-commit`、`commit-msg`、`pre-push`
- CI gate 模板
- 机器可读 `.guardrails/gates/*.json` 门禁产物
- `.guardrails/approvals/` 人工批准台账
- docs drift、Red Zone、secret、测试、commit message 门禁

## 范围

v2 不包含 MCP server，也不包含 app connector。它的定位是本地项目治理和门禁执行层。

## Claude 插件安装

```text
/plugin marketplace add ./path/to/vibe-coding-guardrails-v2
/plugin install vibe-coding-guardrails@vibe-guardrails
```

使用：

```text
/vibe-coding-guardrails:init-project
/vibe-coding-guardrails:code-review
/vibe-coding-guardrails:test-plan
/vibe-coding-guardrails:release-check
```

## Codex 插件安装

```text
codex plugin marketplace add ./path/to/vibe-coding-guardrails-v2
```

然后从 `vibe-guardrails` marketplace 安装 `vibe-coding-guardrails`，自然语言调用：

```text
Use Vibe Coding Guardrails to initialize this repository.
Use Vibe Coding Guardrails to review this diff.
```

## CLI 使用

```bash
npm install -g vibe-coding-guardrails
vibe-guardrails init
vibe-guardrails install-hooks
vibe-guardrails check --staged
vibe-guardrails commit-msg .git/COMMIT_EDITMSG
vibe-guardrails check --ci
```

本地开发：

```bash
node ./bin/vibe-guardrails.js init --dry-run
node ./bin/vibe-guardrails.js check --staged
```

## 门禁产物

Level 2 和 Level 3 改动需要 `.guardrails/gates/*.json`。示例：

```json
{
  "id": "2026-05-23-auth-change",
  "task": "Rotate refresh tokens",
  "riskLevel": "L2",
  "changedFiles": ["src/auth/session.ts"],
  "requiredGates": ["design", "security", "test"],
  "completedGates": ["design", "security", "test"],
  "humanApprovalRequired": true,
  "humanApprovalStatus": "approved",
  "tests": { "planned": ["unit", "integration"], "commands": ["npm test"], "status": "passed" },
  "docsImpact": { "status": "none", "justification": "Internal token logic only; public docs unchanged." },
  "rollbackPlan": "docs/release/2026-05-23-auth-change.md",
  "unknowns": []
}
```

## 风险等级

- `L0`：文档、文案、简单样式调整
- `L1`：普通代码改动和普通功能
- `L2`：认证、授权、安全、数据库、支付、AI workflow、发布敏感改动
- `L3`：不可逆数据、生产环境、架构、部署或迁移改动

## Commit message 规范

使用 conventional commits + 风险标签：

```text
feat(auth): rotate refresh tokens [risk:L2]

Risk-Level: L2
Gate-Review: .guardrails/gates/2026-05-23-auth-change.json
Tests: npm test
Human-Approval: required
Rollback: docs/release/2026-05-23-auth-change.md
```

## 验证

```bash
npm test
npm run validate
npm run check
```

## 安全模型

Agent hooks 有用，但不是唯一边界。Git hooks 是本地门禁，可以被 `--no-verify` 绕过。CI gates 才是最终兜底。v2 的闭环设计就是把三者组合起来。
