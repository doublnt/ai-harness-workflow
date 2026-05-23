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
/anyharness:anyharness
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

## Claude Code 快速开始

1. 把这个仓库添加为 Claude plugin marketplace。
2. 安装 `anyharness` 插件。
3. 运行：

```text
/anyharness:anyharness adopt this repository safely
```

新项目：

```text
/anyharness:anyharness initialize this new project
```

review 当前改动：

```text
/anyharness:anyharness review the current staged diff
```

生成跨模型 review packet：

```text
/anyharness:anyharness create a security review packet for the staged diff
```

## Codex 快速开始

1. 把这个仓库添加为 Codex plugin marketplace。
2. 安装 `anyharness` 插件。
3. 直接说：

```text
Use AnyHarness to adopt this repository safely.
```

继续使用：

```text
Use AnyHarness to generate project-specific expert review roles.
Use AnyHarness to review this diff against the project harness.
Use AnyHarness to create a cross-model review packet.
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

1. 安装插件不会修改仓库。
2. 先扫描，再写入。
3. 已有 prompt 文件不覆盖，只生成 draft。
4. 领域示例不是权威规则。
5. 写入 profile 或 enforcement 文件前必须确认。
6. 生成的本地 scripts 必须可审查。
7. 硬门禁是可选的。

## 维护者验证

本仓库包含维护者验证脚本：

```bash
npm run check
```

这不是普通用户安装路径，只用于验证插件包结构。
