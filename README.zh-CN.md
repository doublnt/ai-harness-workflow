# AnyHarness

**AnyHarness** 是一套面向 AI 编程的工程治理 harness，适用于 Claude Code、Codex、Cursor、Git hooks 和 CI。

它可以从一个轻量 skill 开始：让 AI 在写代码前判断风险、说明假设、保持小范围改动，并给出证据。需要更强控制时，它可以为项目初始化一套本地闭环：hooks、commit 检查、CI gate、gate artifact、docs drift 检查和人工批准记录。

npm 包名和 CLI 命令使用小写，便于包管理器兼容：

```bash
npx anyharness --help
```

产品名是 **AnyHarness**。

---

## AnyHarness 解决什么问题

AI coding agent 很快，但也容易带来工程风险：

- 需求没澄清就开始写代码；
- 隐藏关键假设；
- 小问题做成大重构；
- 顺手改无关文件；
- 没有实际跑测试却声称通过；
- 未经 review 修改认证、支付、migration、CI、部署等高风险文件；
- 漏掉文档、测试、发布计划或回滚计划。

AnyHarness 把这些问题变成一个可重复执行的流程：

```text
判断风险 → 计划 → 小范围实现 → review → 测试 → 留证据 → 阻断危险操作
```

---

## 四条核心规则

1. **先判断风险**  
   每个任务在实现前先分成 L0、L1、L2 或 L3。

2. **保持外科手术式改动**  
   每一行改动都必须能对应用户请求，禁止顺手大重构。

3. **必须提供证据**  
   AI 必须说明实际运行的测试、修改过的文件、gate artifact、执行过的命令，或者明确列出未测试风险。

4. **阻断危险操作**  
   secrets、migration、认证、授权、支付、CI/deploy、生产数据和 agent 治理文件必须经过门禁和批准。

这些规则在 [`ANYHARNESS.md`](./ANYHARNESS.md) 中，也可以通过 `harness-core` skill 使用。

---

## 选择使用模式

| 模式 | 安装内容 | 是否修改仓库 | 适合场景 |
|---|---|---:|---|
| **Lite** | 只安装行为 skill | 否 | 新手、个人开发者、快速试用、低风险项目 |
| **Project** | `ANYHARNESS.md`、`AGENTS.md`/`CLAUDE.md` 草案、`.anyharness/config.json`、gate 目录 | 是，确认后写入 | 老项目想统一 AI 工作流 |
| **Harness** | Project 模式 + agent hooks + Git hooks + CI gates + gate artifacts + docs drift 检查 | 是，确认后写入 | 团队、生产项目、敏感系统、高风险项目 |

建议先从 **Lite** 或 **Project** 开始。等你希望“不满足门禁就不能提交 / 不能合并”时，再启用 **Harness**。

---

## 包含内容

- Claude Code plugin：skills + lifecycle hooks。
- Codex plugin：skills + lifecycle hooks。
- Cursor Lite 适配：`.cursor/rules/anyharness.mdc`。
- `harness-core`：简洁行为入口 skill。
- `init-project`：扫描当前 repo 并初始化项目本地规范。
- 风险分类、新功能规划、设计评审、实现计划、代码评审、测试计划、安全评审、发布检查。
- 用于 Git hooks 和 CI 的 CLI checker。
- Commit message gate。
- Red Zone 文件策略。
- Gate artifacts 和 approval ledger。
- Docs drift 检查。
- 中英文文档。

---

## Claude Code 安装和使用

把本仓库添加为 Claude 本地 marketplace：

```text
/plugin marketplace add ./path/to/AnyHarness
/plugin install anyharness@anyharness
```

安装后 Claude 命令会在 `anyharness` 命名空间下：

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

第一次试用只需要运行：

```text
/anyharness:harness-core
```

需要初始化项目时运行：

```text
/anyharness:init-project
```

`init-project` 会先只读扫描，输出报告，向用户确认，然后才写入文件。

---

## Codex 安装和使用

把本仓库添加为 Codex plugin marketplace：

```text
codex plugin marketplace add ./path/to/AnyHarness
```

然后在插件列表中安装 `anyharness`。

自然语言调用即可：

```text
Use AnyHarness core rules for this change.
Use AnyHarness to initialize this repository.
Use AnyHarness to review this diff before commit.
Use AnyHarness to create a test plan for this feature.
Use AnyHarness to perform a release check.
```

---

## Cursor 使用

Cursor 支持的是 Lite 模式：给 AI 核心行为规则，但不提供 lifecycle hooks。

复制规则到目标项目：

```bash
mkdir -p .cursor/rules
cp plugins/cursor/anyharness/.cursor/rules/anyharness.mdc .cursor/rules/anyharness.mdc
```

或者通过 CLI 打印规则：

```bash
node bin/anyharness.mjs cursor-template
```

写入当前 repo：

```bash
node bin/anyharness.mjs cursor-template --write
```

---

## CLI 快速开始

在本仓库中运行：

```bash
node bin/anyharness.mjs --help
node bin/anyharness.mjs scan --json
node bin/anyharness.mjs init --profile project --target detect --mode advisory
node bin/anyharness.mjs check --staged
```

发布到 npm 后：

```bash
npx anyharness --help
npx anyharness init --profile project --target detect --mode advisory
npx anyharness check --staged
```

安装本地 Git hooks：

```bash
npx anyharness install-hooks
```

生成 GitHub Actions CI gate：

```bash
npx anyharness ci-template --write
```

---

## 新手 5 分钟上手

这个路径适合不想马上理解 hooks、CI、gate artifact 的新用户。

### 第 1 步：在 Claude 或 Codex 安装插件

Claude：

```text
/plugin marketplace add ./path/to/AnyHarness
/plugin install anyharness@anyharness
```

Codex：

```text
codex plugin marketplace add ./path/to/AnyHarness
```

然后在插件列表中安装 `anyharness`。

### 第 2 步：使用核心行为 skill

Claude：

```text
/anyharness:harness-core
```

Codex：

```text
Use AnyHarness core rules for the next change.
```

### 第 3 步：让 AI 做一个小改动

例子：

```text
Fix the empty state message on the dashboard. Use AnyHarness rules.
```

理想输出应该包含：

```text
Risk Level: L0 or L1
Assumptions: ...
Files Changed: ...
Tests: ...
Unknowns: ...
```

这就是 Lite 模式。它不会修改你的仓库配置。

---

## 新项目如何使用

适合刚启动一个 app、CLI、library 或 service。

### 推荐路径

先使用 Project 模式：

```bash
npx anyharness init --profile project --target detect --mode advisory
```

使用 Claude/Codex 插件时：

```text
/anyharness:init-project
```

初始化时建议选择：

```text
Target format: detect or both
Project stage: dev
AI autonomy: medium
Test gate: normal
Security gate: normal
Release gate: light
Generated scope: standard
```

### 会创建什么

```text
ANYHARNESS.md
.anyharness/config.json
.anyharness/gates/
.anyharness/approvals/
.anyharness/baselines/project-scan.json
AGENTS.md 或 .anyharness/drafts/AGENTS.append.md
CLAUDE.md 或 .anyharness/drafts/CLAUDE.append.md
```

已有文件不会被覆盖。如果 `AGENTS.md` 或 `CLAUDE.md` 已存在，AnyHarness 会把建议内容写入 `.anyharness/drafts/`。

### 初始化后如何开发功能

每个新功能先运行：

```text
/anyharness:new-feature Add password reset email flow.
```

AI 应输出：

```text
Risk Level:
Assumptions:
Unknowns:
Design Options:
Recommended Option:
Implementation Plan:
Tests Required:
Human Approval Required:
```

写代码前生成实现计划：

```text
/anyharness:implementation-plan
```

接受 AI 代码前做 review：

```text
/anyharness:code-review
```

生成测试计划：

```text
/anyharness:test-plan
```

当项目开始面向真实用户或生产环境时，升级到 Harness 模式：

```bash
npx anyharness init --profile harness --target detect --mode enforcing --install-hooks
npx anyharness ci-template --write
```

---

## 老项目如何使用

适合已经有代码、文档、测试、CI、`CLAUDE.md`、`AGENTS.md` 或团队规范的项目。

### 第 1 步：先 dry-run 扫描

```bash
npx anyharness init --profile project --target detect --dry-run
```

或者在 Claude 中：

```text
/anyharness:init-project
```

扫描报告会显示：

```text
检测到的 AI 工作流：Claude / Codex / both / unknown
技术栈
测试命令
Lint 命令
Build 命令
CI/CD
数据库或 migrations
Auth/security/payment 风险信号
已有 README / CONTRIBUTING / SECURITY / ADR 文档
项目风险画像
Unknowns
将创建哪些文件
哪些已有文件需要生成 merge draft
```

### 第 2 步：先用安全的 Project 模式

```bash
npx anyharness init --profile project --target detect --mode advisory
```

这只会创建本地规则和草案，不会阻断 commit。

重点 review：

```text
ANYHARNESS.md
.anyharness/config.json
.anyharness/baselines/project-scan.json
.anyharness/drafts/*
```

### 第 3 步：谨慎合并已有 AI 指令

如果项目已经有 `AGENTS.md` 或 `CLAUDE.md`，请对比：

```text
.anyharness/drafts/AGENTS.append.md
.anyharness/drafts/CLAUDE.append.md
```

只合并符合团队习惯的部分。

### 第 4 步：团队确认后启用 Harness

```bash
npx anyharness init --profile harness --target both --mode enforcing --install-hooks
npx anyharness ci-template --write
```

把生成的 policy 和 CI 文件提交到仓库。

### 第 5 步：用 CI 作为最终兜底

本地 Git hooks 可以提前发现问题，但可以被绕过。真正的合并门禁应该在 CI 中：

```bash
npx anyharness check --ci
```

---

## 团队 / 生产项目工作流

当项目涉及用户、金钱、数据、权限、合规或生产稳定性时，建议使用 Harness 模式。

```bash
npx anyharness init --profile harness --target both --mode enforcing --install-hooks
npx anyharness ci-template --write
```

推荐团队策略：

```text
L0: 基础自检
L1: 需求 + review + test plan
L2: 设计 + 安全 + 测试 + 发布 + 批准
L3: 完整设计 + 迁移/回滚 + CI + 明确人工批准
```

高风险任务在实现前创建 gate artifact：

```bash
npx anyharness gate create \
  --task "rotate refresh tokens" \
  --risk L2 \
  --gates design,security,test,release
```

人工 review 后批准：

```bash
npx anyharness gate approve 2026-05-23-rotate-refresh-tokens \
  --notes "Approved after design and security review."
```

合并前检查：

```bash
npx anyharness check --ci
```

---

## 常见任务示例

### 添加普通功能

```text
/anyharness:new-feature Add user profile avatar upload.
```

预期判断：

```text
Risk Level: L2 because file upload and user data are involved.
Required Gates: design, security, test, release.
Human Approval Required: yes.
```

### Review AI 生成的代码

```text
/anyharness:code-review Review the current diff.
```

预期输出：

```text
Summary:
Risk Level:
Critical Issues:
Security Issues:
Testing Gaps:
Design Issues:
Performance Concerns:
Unknowns:
Verdict: Pass / Needs Changes / Blocked
```

### 生成测试计划

```text
/anyharness:test-plan Create a test plan for this change.
```

预期输出：

```text
Unit Tests:
Integration Tests:
E2E Tests:
Security Tests:
Regression Tests:
Manual Checks:
Commands To Run:
Untested Risks:
```

### 安全敏感改动

```text
/anyharness:security-review Review this password reset implementation.
```

如果 auth、token、rate limit、secret、用户数据仍然 Unknown，就不应该 Pass。

### 发布检查

```text
/anyharness:release-check Prepare a release check for this migration.
```

L2/L3 发布需要包含：

```text
用户影响
数据影响
迁移计划
配置变更
监控
回滚计划
发布后检查
```

---

## 风险等级

| 等级 | 含义 | 示例 | 必要门禁 |
|---|---|---|---|
| L0 | 低风险 | 错字、文案、小样式调整 | 基础自检 |
| L1 | 普通功能 | UI 组件、普通 CRUD、局部重构 | 需求、review、测试 |
| L2 | 核心或敏感 | 认证、授权、支付、文件、用户数据、外部 API、agent 工具权限 | 设计、安全、测试、发布、批准 |
| L3 | 关键或不可逆 | migration、生产数据、部署策略、公共 API 破坏性变更、架构迁移 | 完整设计、迁移、回滚、CI、明确批准 |

涉及以下内容时自动升到 L2：

```text
认证、授权、支付、文件上传、用户数据、数据库 schema、外部服务权限、生产环境、AI agent 工具权限
```

涉及不可逆生产数据修改或重大架构/部署变更时自动升到 L3。

---

## 闭环 Harness

Harness 模式包含四层。

### 1. Skills

Skills 指导 AI 如何工作：

```text
harness-core
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

### 2. Agent hooks

Claude/Codex lifecycle hooks 可以阻断：

```text
读取 .env 或 secrets
rm -rf
git push
直接 git commit
未经批准安装依赖
修改 Red Zone 文件
结束时缺少 gate summary
```

### 3. Git hooks

安装本地 hooks：

```bash
npx anyharness install-hooks
```

生成：

```text
.githooks/pre-commit
.githooks/commit-msg
.githooks/pre-push
```

### 4. CI gate

生成 GitHub Actions：

```bash
npx anyharness ci-template --write
```

CI 命令：

```bash
npx anyharness check --ci
```

---

## Commit message 门禁

默认格式：

```text
feat(auth): rotate refresh tokens [risk:L2]
```

L2/L3 commit 需要 trailers：

```text
Risk-Level: L2
Gate-Review: .anyharness/gates/2026-05-23-refresh-token.json
Tests: npm test
Human-Approval: required
Rollback: docs/release/2026-05-23-refresh-token.md
```

示例：

```text
fix(ui): handle empty dashboard state [risk:L1]
feat(auth): rotate refresh tokens [risk:L2]
chore(ci): add deployment gate [risk:L2]
```

---

## Gate artifacts 和人工批准

创建 gate：

```bash
npx anyharness gate create \
  --task "rotate refresh tokens" \
  --risk L2 \
  --gates design,security,test,release
```

批准 gate：

```bash
npx anyharness gate approve 2026-05-23-rotate-refresh-tokens \
  --notes "Approved after security review."
```

查看状态：

```bash
npx anyharness gate status
```

Gate artifact 写入：

```text
.anyharness/gates/
.anyharness/approvals/
```

它们让 hooks 和 CI 可以进行确定性检查。

---

## Docs drift 门禁

当代码变化意味着文档也应该变化时，AnyHarness 可以阻断提交。

示例：

| 修改文件 | 预期文档或 artifact |
|---|---|
| `app/api/**`、`openapi.*`、`*.graphql`、`*.proto` | API docs、changelog，或 gate artifact 中说明 docs impact |
| `prisma/schema.prisma`、`migrations/**` | migration docs、data model docs、rollback plan |
| `src/auth/**`、`src/security/**` | security review artifact |
| `.github/workflows/**`、`deploy/**`、`Dockerfile` | deployment/CI docs 或 release gate |
| `AGENTS.md`、`CLAUDE.md`、`.claude/**`、`.codex/**` | governance notes 或 gate artifact |

如果文档不需要更新，请在 gate artifact 中写明原因。

---

## 仓库结构

```text
plugins/claude/anyharness/     Claude plugin
plugins/codex/anyharness/      Codex plugin
plugins/cursor/anyharness/     Cursor Lite 规则
adapters/cursor/               Cursor rule 模板
bin/anyharness.mjs             CLI 入口
src/                            确定性 checker 实现
templates/project/             Git hooks、CI、config、schemas
docs/                           实现文档
ANYHARNESS.md                   精简核心规则
EXAMPLES.md                     坏例子 vs 好例子
README.md                       英文 README
```

---

## 验证本仓库

```bash
npm test
npm run validate
npm run check
```

预期结果：

```text
Validation passed. final AnyHarness layout is valid.
Unit tests passed.
```

---

## 安全说明

- 安装 plugin 不应该修改目标仓库。
- 只有用户明确初始化后才写入项目文件。
- 已有文件不会被覆盖，只会生成草案。
- 启用 hooks 前应该 review 并 trust。
- 本地 Git hooks 可以被绕过，CI gates 才是合并前兜底。
- AnyHarness 是治理 harness，不替代人的最终判断。

---

## 相关文件

- [ANYHARNESS.md](./ANYHARNESS.md)
- [EXAMPLES.md](./EXAMPLES.md)
- [README.md](./README.md)
- [docs/hooks.md](./docs/hooks.md)
- [docs/git-hooks.md](./docs/git-hooks.md)
- [docs/ci-gates.md](./docs/ci-gates.md)
- [docs/docs-drift.md](./docs/docs-drift.md)
- [docs/approval-ledger.md](./docs/approval-ledger.md)
