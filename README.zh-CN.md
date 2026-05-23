# AnyHarness 2.2

**AnyHarness** 是一个 AI 编程 harness。它做两件事：

1. **把规则注入给 LLM**：通过工具原生会读取的 `CLAUDE.md`、`AGENTS.md`、Cursor rules、Claude/Codex skills。
2. **把规则变成可执行门禁**：通过 `npx anyharness`、agent hooks、Git hooks、CI gates、gate artifacts、approval records、commit message 检查和 docs drift 检查。

v2.2 的使用模型非常简单：

```bash
# 新项目：一个命令
npx anyharness new

# 老项目：一个安全命令
npx anyharness adopt
```

高级命令仍然保留，但大多数用户从 `new` 或 `adopt` 开始即可。

---

## 为什么 `npx anyharness` 是关键入口

Prompt 是 LLM 读取的规则；harness 是证明项目真的遵守规则的执行层。

```text
Prompt surfaces       = CLAUDE.md / AGENTS.md / Cursor rules / plugin skills
npx anyharness        = 扫描器 + 安装器 + 检查器 + 门禁执行器
Agent hooks           = AI 工作过程中阻断不安全 tool use
Git hooks             = commit 前阻断不安全改动
CI gates              = 即使本地 hook 被绕过，也在 PR/merge 前兜底
Gate artifacts        = 高风险改动的机器可读证据
```

AnyHarness 有三种使用层级：

| 层级 | 主命令 | 做什么 | 适合场景 |
|---|---|---|---|
| Lite | `npx anyharness prompt --target core` | 只打印规则，不写文件 | 单次 AI 会话试用 |
| Project | `npx anyharness adopt` | 安全写入原生 prompt surface | 老项目、个人项目 |
| Harness | `npx anyharness new` 或 `npx anyharness adopt --enforce` | prompts + hooks + CI + gates | 新项目、团队、生产系统 |

---

## 注入给 LLM 的四条核心规则

AnyHarness 安装的所有 prompt surface 都会注入这四条规则：

1. **先判断风险等级**  
   每个任务在实现前必须判断为 L0、L1、L2 或 L3。

2. **保持修改精准**  
   每一行改动都必须能追溯到用户需求，不做顺手重构。

3. **用证据说话**  
   不要声称“完成了”或“测试通过”，除非有命令、测试、文件变更、gate artifact 或明确的未测风险说明。

4. **阻断不安全工作**  
   secrets、migration、认证、授权、支付、生产数据、CI/CD、部署配置和 agent 治理文件必须走门禁和批准。

---

## 新项目：一个命令

你启动新 repo，并希望 AnyHarness 从第一天就生效：

```bash
npx anyharness new
```

它等价于完整 harness 初始化：

```text
profile: harness
mode: enforcing
target: both
写入 prompts: CLAUDE.md + AGENTS.md
安装 Git hooks: 是
写入 CI template: 是
创建 .anyharness/config.json: 是
保存扫描 baseline: 是
```

会创建或生成草案：

```text
CLAUDE.md
AGENTS.md
.anyharness/config.json
.anyharness/baselines/project-scan.json
.anyharness/gates/
.anyharness/approvals/
.githooks/pre-commit
.githooks/commit-msg
.githooks/pre-push
.github/workflows/anyharness.yml
```

如果目标文件已经存在，AnyHarness 不会覆盖，而是写入：

```text
.anyharness/drafts/
```

### 新项目示例

```bash
mkdir my-app
cd my-app
git init
npm init -y
npx anyharness new
```

然后对 AI coding agent 说：

```text
Read CLAUDE.md and AGENTS.md. Use AnyHarness rules to plan a password reset feature. Classify risk first, keep the change surgical, and include tests or untested risks.
```

提交前：

```bash
npx anyharness check --staged
git commit -m "feat(auth): add password reset request [risk:L2]" \
  -m "Risk-Level: L2" \
  -m "Gate-Review: .anyharness/gates/password-reset.json" \
  -m "Tests: npm test" \
  -m "Human-Approval: required" \
  -m "Rollback: docs/release/password-reset.md"
```

---

## 老项目：一个安全命令

已有代码、文档、AI 指令、CI 或团队约定的项目，不要一上来强制接管。用：

```bash
npx anyharness adopt
```

它默认很保守：

```text
profile: project
mode: advisory
target: detect
写入 prompts: 原生文件或 draft
安装 Git hooks: 否
写入 CI template: 否
覆盖已有文件: 永不覆盖
```

它会扫描项目并创建：

```text
.anyharness/config.json
.anyharness/baselines/project-scan.json
.anyharness/drafts/        # 当 CLAUDE.md 或 AGENTS.md 已存在时
```

如果项目已有 `CLAUDE.md` 或 `AGENTS.md`，AnyHarness 会生成追加草案：

```text
.anyharness/drafts/CLAUDE.append.md
.anyharness/drafts/AGENTS.append.md
```

你人工 review 后再合并。

### 老项目示例

```bash
cd existing-repo
npx anyharness adopt
```

检查结果：

```bash
cat .anyharness/baselines/project-scan.json
ls .anyharness/drafts
```

然后对 AI 说：

```text
Read the AnyHarness draft under .anyharness/drafts and propose the smallest safe merge into our existing CLAUDE.md or AGENTS.md. Do not overwrite existing instructions.
```

当团队准备好启用强制门禁：

```bash
npx anyharness adopt --enforce
```

`adopt --enforce` 是老项目的完整 harness 模式：会写 CI、安装 Git hooks，但仍然不会覆盖已有 prompt 文件。

---

## 之前两个命令现在怎么用？

v2.2 之前，完整 harness README 中是两个命令：

```bash
npx anyharness init --profile harness --target both --mode enforcing --install-hooks
npx anyharness ci-template --write
```

v2.2 中，新项目直接用：

```bash
npx anyharness new
```

老项目强制接入用：

```bash
npx anyharness adopt --enforce
```

底层命令仍然存在，但 README 主路径已经改成一条命令。

---

## 快速命令参考

### 推荐命令

```bash
npx anyharness new                 # 新项目，完整 harness
npx anyharness adopt               # 老项目，安全 advisory 接入
npx anyharness adopt --enforce     # 老项目，review 后启用完整 harness
```

### Prompt-only 命令

```bash
npx anyharness prompt --target core
npx anyharness prompt --target claude --write
npx anyharness prompt --target codex --write
npx anyharness prompt --target cursor --write
npx anyharness prompt --target both --write
```

### 检查命令

```bash
npx anyharness scan --json
npx anyharness check --staged
npx anyharness check --push
npx anyharness check --ci
npx anyharness commit-msg .git/COMMIT_EDITMSG
npx anyharness doctor
```

### 高级初始化命令

```bash
npx anyharness init --profile project --target detect --mode advisory
npx anyharness init --profile harness --target both --mode enforcing --install-hooks
npx anyharness ci-template --write
npx anyharness install-hooks
npx anyharness uninstall-hooks
```

---

## Claude Code 使用

开发时可以从本地 marketplace 安装：

```text
/plugin marketplace add ./path/to/AnyHarness-v2.2
/plugin install anyharness@anyharness
```

可调用：

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

大多数 repo 仍建议先用 CLI：

```bash
npx anyharness new       # 新 repo
npx anyharness adopt     # 老 repo
```

CLI 负责安装项目本地 prompt surfaces 和执行门禁；plugin 提供 Claude 中的交互式工作流。

---

## Codex 使用

开发时可以从本地 marketplace 安装：

```text
codex plugin marketplace add ./path/to/AnyHarness-v2.2
```

然后对 Codex 说：

```text
Use AnyHarness to initialize this repository.
Use AnyHarness to review this diff.
Use AnyHarness to prepare a release check.
```

写入 Codex 项目指令：

```bash
npx anyharness prompt --target codex --write
```

这会写入 `AGENTS.md`，如果已有则生成 `.anyharness/drafts/AGENTS.append.md`。

---

## Cursor 使用

Cursor 默认使用轻量接入：

```bash
npx anyharness prompt --target cursor --write
```

会写入：

```text
.cursor/rules/anyharness.mdc
```

Cursor rule 只注入行为规范；完整强制门禁仍由 CLI、Git hooks、CI 完成：

```bash
npx anyharness new
# 或
npx anyharness adopt --enforce
```

---

## 风险等级

| 等级 | 含义 | 示例 | 门禁 |
|---|---|---|---|
| L0 | 低风险 | 文档、文案、小样式 | 自检 |
| L1 | 普通功能 | CRUD、普通 UI/API | 需求 + 测试计划 |
| L2 | 核心/敏感 | auth、授权、文件上传、数据库 schema、外部 API | 设计 + 安全 + 测试 + 批准 |
| L3 | 关键/不可逆 | 生产数据、migration、公共 API 破坏、架构变化 | 完整设计 + 迁移 + 回滚 + CI + 明确批准 |

只要涉及 secrets、migration、认证、支付、CI/CD、部署、公共 API 或生产数据，就会升级风险。

---

## Commit message 门禁

AnyHarness 要求 commit message 带风险标签：

```text
feat(auth): rotate refresh tokens [risk:L2]
```

L2/L3 需要 trailers：

```text
Risk-Level: L2
Gate-Review: .anyharness/gates/refresh-token.json
Security-Review: .anyharness/gates/refresh-token-security.json
Tests: npm test
Human-Approval: required
Rollback: docs/release/refresh-token.md
```

enforcing 模式下，`commit-msg` hook 会阻断缺失风险元数据的提交。

---

## Gate artifacts

高风险改动需要机器可读证据：

```text
.anyharness/gates/<change-id>.json
.anyharness/approvals/<change-id>.json
```

示例：

```bash
npx anyharness gate create --task "rotate refresh tokens" --risk L2 --gates design,security,test,release
npx anyharness gate approve <gate-id> --notes "Approved after design and security review."
```

这些 artifact 能让 hooks 和 CI 验证 AI 不是只“声称安全”。

---

## Docs drift 门禁

AnyHarness 检查代码变更是否需要同步文档。

| 改动区域 | 需要的证据 |
|---|---|
| API routes / OpenAPI / GraphQL / proto | API 文档或 docs-impact 说明 |
| database schema / migrations | migration plan、rollback plan、数据文档 |
| auth / security | security review artifact |
| `.env.example` / deploy config | 部署文档 |
| `CLAUDE.md` / `AGENTS.md` / `.claude` / `.codex` | governance 变更说明 |

如果无需更新文档，要在 gate artifact 中说明理由，而不是默默跳过。

---

## 安全模型

AnyHarness 有意把 prompt instruction 和 enforcement 分开：

```text
LLM rules can guide.
Hooks and CI can block.
Gate artifacts can prove.
Humans still approve irreversible work.
```

本地 Git hooks 是开发体验层；CI 才是最终兜底，因为本地 hooks 可以被绕过。

---

## 开发

```bash
npm run validate
npm test
npm run check
```

验证脚本会检查 plugin manifests、skills、hooks、marketplace 文件、prompt surfaces、package metadata 和核心项目结构。
