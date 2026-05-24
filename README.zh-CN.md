# AnyHarness v3

**安装插件，运行 AnyHarness，让它理解你的项目，然后生成项目专属的 AI 工程 harness。**

AnyHarness v3 是 **skill-first 自适应工程护栏**。它不是以 `npx` 为主的 CLI，也不是静态 checklist 库。普通用户路径是：

```text
安装插件 → 运行 AnyHarness → 扫描项目 → 确认领域细节 → 生成项目 harness
```

对外入口刻意保持简单：

```text
Use AnyHarness for this repository.
```

在 Claude Code 插件里，可能显示为命名空间 skill：

```text
/anyharness:run
```

在 Codex 里可以直接说：

```text
Use AnyHarness to adopt this repository.
```

## v3 解决什么问题

真正的问题不是“AI 需要一个通用 review checklist”。更难的问题是不同项目的领域风险完全不同：

- 低延迟 C++ 行情 / 交易服务端
- Electron 桌面客户端
- Java 电商后端
- AI agent 平台
- 支付系统
- 内部管理后台

通用规则有帮助，但不够。AnyHarness v3 会基于仓库证据和用户确认，生成 **Project Harness Profile**。

## 核心模型

```text
Skills 负责推理。
Scripts 负责辅助。
可选 hooks 负责执行。
```

AnyHarness 把 LLM 用在它擅长的地方：

- 阅读项目上下文
- 发现领域信号
- 向用户提问确认
- 生成项目专属规则
- 创建专家 review 角色
- 设计门禁和测试 oracle
- 生成跨模型 review packet

可选 skill scripts 负责确定性的辅助任务：

- 扫描仓库
- 收集 diff
- 写入原生 prompt 文件
- 写入并校验 profile
- 生成 review packet
- 可选安装本地 hooks

普通用户不需要全局 CLI。

## AnyHarness 会生成什么

默认情况下，AnyHarness 只在确认后写入原生 AI prompt 面：

```text
CLAUDE.md      # Claude Code 项目指令
AGENTS.md      # Codex / 通用 agent 指令
.cursor/rules/anyharness.mdc  # 可选 Cursor 规则
```

如果启用 Project Harness 模式，会生成：

```text
.anyharness/
  profile.json       # 机器可读项目 harness profile
  profile.md         # 人类可读项目 harness profile
  gates/             # 门禁产物
  packets/           # 跨模型 review packet
  evidence/          # 测试 / review 证据
```

如果启用硬门禁，会生成项目本地文件：

```text
.anyharness/scripts/check.mjs
.githooks/pre-commit
.githooks/commit-msg
.github/workflows/anyharness.yml
```

这些都只会在用户明确确认后生成。

## 使用教程：Claude Code

### 前提条件

- 已安装 [Claude Code](https://claude.ai/code)（CLI 或桌面版）
- Node.js 18 或更高版本
- 在本地克隆本仓库：

```bash
git clone https://github.com/doublnt/ai-harness-workflow.git ~/anyharness
# 也可以放到你习惯的位置
```

### 第一步 — 注册本地插件 marketplace

打开（或创建）Claude Code 用户配置文件：

```bash
# macOS / Linux
~/.claude/settings.json

# Windows
%APPDATA%\Claude\settings.json
```

在文件中加入 `plugins` 字段（如果文件已有内容，合并进去即可）：

```json
{
  "plugins": {
    "marketplaces": [
      {
        "url": "file:///Users/yourname/anyharness/.claude-plugin/marketplace.json"
      }
    ]
  }
}
```

> 把 `/Users/yourname/anyharness` 替换为你实际克隆的路径。
> 在克隆目录里执行 `pwd` 可以确认路径。

### 第二步 — 安装插件

在 Claude Code 中执行：

```text
/plugins install anyharness
```

也可以打开插件 marketplace 界面，找到 **anyharness**，点击安装。

### 第三步 — 验证安装

```text
/anyharness:run
```

你应该能看到 AnyHarness 响应并询问你想做什么。

### 第四步 — 在你的项目中使用

打开（或 `cd` 进入）你要分析的项目，然后：

**接管已有项目：**

```text
/anyharness:run adopt this repository safely
```

**初始化新项目：**

```text
/anyharness:run initialize this new project
```

**review 已暂存的改动：**

```text
/anyharness:run review the current staged diff
```

**生成跨模型 review packet：**

```text
/anyharness:run create a security review packet for the staged diff
```

AnyHarness 会全程交互引导你——扫描项目、提问确认，在写入任何文件前都会等你确认。

---

## 使用教程：Codex

### 前提条件

- 已启用插件支持的 Codex
- 本仓库已克隆到本地

### 第一步 — 注册本地插件 marketplace

在 Codex 配置中添加：

```json
{
  "plugins": {
    "marketplaces": [
      {
        "url": "file:///Users/yourname/anyharness/.agents/plugins/marketplace.json"
      }
    ]
  }
}
```

### 第二步 — 安装插件

```text
Install the anyharness plugin.
```

### 第三步 — 直接使用自然语言

```text
Use AnyHarness to adopt this repository safely.
```

继续对话：

```text
Use AnyHarness to generate project-specific expert review roles.
Use AnyHarness to review this diff against the project harness.
Use AnyHarness to create a cross-model review packet.
```

---

## 首次运行时发生什么

当你让 AnyHarness 接管或初始化项目时，它会按照如下顺序执行，**在你确认之前不会写入任何内容**：

1. **扫描** — 读取项目文件，识别技术栈和 AI workflow 文件
2. **假设** — 提出领域信号假设，附带证据和置信度
3. **提问** — 针对你项目的具体规则提 5–12 个聚焦问题
4. **提案** — 展示将要创建的文件（CLAUDE.md、profile.json 等）
5. **写入** — 每一步都在你确认后才执行

首次运行示例输出：

```text
Scan complete. 847 files scanned.

Stack: Node.js, React, PostgreSQL
AI workflow: CLAUDE.md detected

Domain hypotheses:
- ecommerce/payment: medium confidence
  Evidence: src/payment/, src/orders/, docs/checkout.md

Unknowns:
- Whether payment callbacks can repeat
- How inventory reservation works

Questions:
1. Can payment callbacks be delivered more than once?
2. Is order price frozen at checkout or at payment time?
3. Is inventory reserved immediately or only after payment?

(Reply to answer. I won't write anything until you confirm.)
```

## 新项目流程

输入：

```text
Use AnyHarness to initialize this new project.
```

AnyHarness 会：

1. 只读扫描项目
2. 检测 `CLAUDE.md`、`AGENTS.md`、`.cursor/rules` 等 AI workflow 文件
3. 检测 Java、C++、Rust、TypeScript、Electron、React、Spring 等技术栈信号
4. 从代码、文档、路由、schema、测试和命名中发现领域假设
5. 向用户提问确认
6. 生成原生 prompt 面
7. 生成项目专属 harness profile
8. 提供可选本地执行门禁

## 老项目流程

输入：

```text
Use AnyHarness to adopt this existing repository safely.
```

老项目默认行为：

- 先只读扫描
- 不覆盖文件
- 如果 `CLAUDE.md` 或 `AGENTS.md` 已存在，则生成 draft
- 生成带证据的领域假设
- 写入前必须用户确认
- 不主动安装 hooks

## 领域发现流程

AnyHarness 不提供权威静态领域包。它会先提出领域假设。

示例：

```text
Domain hypotheses:
- ecommerce/payment: confidence medium
- inventory consistency: confidence medium

Evidence:
- src/payment/PaymentCallbackController.java
- src/order/OrderService.java
- migrations/create_inventory_reservations.sql
- docs/checkout.md

Unknowns:
- payment callback 是否会重复
- inventory 是预留还是直接扣减
- 订单状态机在哪里定义
```

然后询问：

```text
1. 支付回调是否可能重复？
2. 订单最终价格是否在创建时冻结？
3. 库存是在 checkout 时预留，还是支付成功后扣减？
4. 支付成功后是否立即履约？
```

确认后才合成项目规则。

## 专家 review 角色

AnyHarness 会根据项目 harness profile 生成项目专属专家角色，例如：

```text
Payment Idempotency Reviewer
Inventory Consistency Reviewer
Electron IPC Boundary Reviewer
Low-Latency C++ Reviewer
Order State Machine Reviewer
Architecture Trade-off Reviewer
Performance and Memory Reviewer
Release Readiness Reviewer
```

这些角色不是标签，而是包含：

- 适用范围
- 所需上下文
- 项目不变量
- 阻断条件
- 证据要求
- 输出 schema

## Review packet

Review packet 用来解决“换模型 review 没上下文”的问题。

输入：

```text
Use AnyHarness to create a security review packet for the staged diff.
```

生成：

```text
.anyharness/packets/<id>/
  PROMPT.md
  PROJECT_PROFILE.md
  DIFF.patch
  CHANGED_FILES.txt
  RELEVANT_FILES.md
  GATE_REQUIREMENTS.md
  DOMAIN_INVARIANTS.md
  UNKNOWN.md
```

你可以把这个 packet 给另一个模型，让它只执行某个专家角色。

## 模式

| 模式 | 内容 | 适合 |
|---|---|---|
| Skill-only | LLM 交互、领域发现、prompt 面、review packet | 个人开发、探索 |
| Project Harness | 增加 `.anyharness/profile.json` 和 gates | 认真个人项目、小团队 |
| Enforcement | 增加本地 scripts、Git hooks、CI workflow | 团队和生产仓库 |

## 安全模型

AnyHarness 遵循十条规则，完整说明见 `plugins/claude/anyharness/skills/anyharness/references/safety.md`。

1. 安装插件不会修改仓库。
2. 先只读分析，再写入。
3. 已有 prompt 文件不覆盖，只生成 draft。
4. 领域示例不是权威规则。
5. 领域相关的结论必须附带证据和置信度。
6. 最终确定 invariant 之前必须提问。
7. 保持首次使用体验简单。
8. 未经明确确认不安装 hooks。
9. 生成的 enforcement 脚本必须在仓库内可审查。
10. 不读取 secrets 或 credentials 文件。

## 仓库布局

```text
.claude-plugin/marketplace.json       # Anthropic 插件 marketplace 入口
.agents/plugins/marketplace.json      # Codex 插件 marketplace 入口
plugins/
  claude/anyharness/
    .claude-plugin/plugin.json        # Anthropic 插件清单（skills 数组格式）
    skills/anyharness/
      SKILL.md                        # Claude skill（标准版）
      SKILL.codex.md                  # Codex overlay 源文件（轻量版，tool 调用视角）
      references/                     # 11 个 reference 文件（单一数据源）
      scripts/                        # 7 个确定性辅助脚本
  codex/anyharness/
    .codex-plugin/plugin.json         # Codex 插件清单（含 tools 数组）
    skills/anyharness/
      SKILL.md                        # ← 由 sync 脚本从 SKILL.codex.md 生成
      references/                     # ← 由 sync 脚本同步
      scripts/                        # ← 由 sync 脚本同步
standalone/
  skills/anyharness/
    SKILL.md                          # ← 由 sync 脚本同步
    references/                       # ← 由 sync 脚本同步
    scripts/                          # ← 由 sync 脚本同步
scripts/
  validate.mjs                        # 结构校验
  sync-distributions.mjs              # 单一源同步（含陈旧文件清理）
test/
  run.mjs
  fixtures/
```

`plugins/claude/anyharness/skills/anyharness/` 是**唯一需要编辑的目录**。
修改后运行 `node scripts/sync-distributions.mjs` 同步到其他两份分发。

## 维护者验证

```bash
npm run check
```

验证内容包括：必要文件、JSON 结构、skill frontmatter、Codex tools schema、
plugin.json 格式、分发同步状态、全部行为测试。这不是普通用户安装路径。
