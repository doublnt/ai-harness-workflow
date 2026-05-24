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

## 核心模型：三循环 harness

```text
Skills 负责推理。
Scripts 负责辅助。
可选 hooks 负责执行。
```

让 AnyHarness 真正区别于"一次性生成 CLAUDE.md 的工具"的，是它的**反馈循环**。一份静态 CLAUDE.md 会过期，AnyHarness 把工作组织成三个连接的循环：

```text
┌─────────┐    ┌────────┐    ┌────────┐
│ INIT    │ ─► │ REVIEW │ ─► │ EVOLVE │ ──┐
│ (接管)  │    │ (diff) │    │  演化  │   │
└─────────┘    └────────┘    └────────┘   │
                   ▲                       │
                   └───────────────────────┘
                       profile 越来越精准
```

- **Init**：从仓库证据 + 用户回答，搭建项目 harness profile。
- **Review**：用 profile 找 Blocker、Needs Changes 以及 **Learning Candidates（学习候选）**。
- **Evolve**：把用户确认的 Learning Candidates 写进 profile，附带来源和 `learningHistory` 日志。

没有 evolve 循环，AnyHarness 只是一份快照。有了它，harness 变成一个学习系统——每次 review 都能让下一次更准。

## 深度架构分析

`scan-project.mjs` 只能看文件名和目录结构，看不到架构。这条**深度分析路径**才是真正的 harness engineering。

### 一条命令搞定

```bash
node analyze.mjs --stack auto --path <项目目录>
```

`--stack auto` 自动从项目文件识别技术栈，然后走对应的分析路径。加 `--save` 可以把完整 JSON 报告写入 `.anyharness/reports/`。

底层管道：

```text
analyze.mjs  →  extract-architecture.mjs  →  derive-risk-topology.mjs  →  propose-evolution.mjs
  (入口)             (解析源码)                   (推导风险边界)               (写入 profile)
```

### 三条分析路径

| 路径 | 触发条件 | 执行方式 |
|---|---|---|
| **A — 确定性** | 栈是 java-spring、rust-tauri、csharp-avalonia、cpp-sdk | 内置提取器 + 拓扑规则 → 精确 `file:line` 发现 |
| **B — LLM 分析** | 任意其他栈 | 文件采样器挑选高价值文件 → 你阅读文件 + 应用 `llm-extractor.md` |
| **C — 用户配置** | 项目根目录存在 `.anyharness/stack-config.json` | 你的正则规则 + 通用拓扑 → 确定性 |

**B→C 升级路径**：Path B 分析后，运行 `suggest-stack-config.mjs` 可以为你的语言生成一份 `stack-config.json` 模板。编辑并保存后，下次 `analyze.mjs` 就走确定性路径，不需要 LLM 读文件了。

```bash
node suggest-stack-config.mjs --path <dir> --save    # 生成 draft 到 .anyharness/drafts/
node suggest-stack-config.mjs --path <dir> --confirm # 直接激活 Path C
```

AnyHarness 内置了 4 个技术栈的完整链路（提取器 + 风险拓扑 + 失效模式知识库）：

### java-spring

解析 `.java` 源码——识别 controller/service/repository/entity、`@Transactional` 方法（含 propagation）、Kafka send/listener、外部 HTTP 调用、self-invocation、JPA `@Query` 修改语句。

风险模式（所有发现均带 `file:line` 引用）：
- **state-mutation-safety**：dual-write（`@Transactional` 里 send Kafka）、`this.foo()` 绕过 Spring 代理、Kafka at-least-once 未保幂等
- **missing-modifying**：`@Query` 写语句没加 `@Modifying`（运行时静默失败）**→ blocker**
- **resource-lifetime**：`REQUIRES_NEW` 在并发下耗尽连接池
- **external-interaction**：外部 HTTP 调用没有超时/熔断/重试
- **trust-boundary**：HTTP 端点未校验输入

### rust-tauri

解析 `.rs` 源码——识别 `#[tauri::command]`、`tauri::generate_handler![]`、`unsafe {}` 块、`std::fs`/`std::process` 调用、`tokio::spawn`。

风险模式：
- **trust-boundary**：未注册的 `#[tauri::command]`（死代码或插件路由暴露）、fs 路径遍历（renderer 控制路径）
- **external-interaction**：`Command::new("sh").arg("-c").arg(&user_input)` 命令注入
- **trust-boundary (blocker)**：`unsafe {}` 块在已注册的 Tauri command 里——JS 可触发任意内存读写
- **resource-lifetime**：`tokio::spawn` 捕获 raw pointer、async command 无取消路径

### csharp-avalonia

解析 `.cs` 源码——识别 `async void`、`ObservableCollection` 跨线程写入、`HttpClient`、`Process.Start`、`[DllImport]`/`[LibraryImport]`、`unsafe` 块、`IDisposable` 字段。

风险模式：
- **error-propagation**：`async void` 异常无法被捕获，直接崩溃
- **threading-discipline**：`ObservableCollection` 在 `Task.Run` 里 `Add/Clear` → 跨线程访问崩溃
- **resource-lifetime**：每次调用 `new HttpClient()` → socket 耗尽；`IDisposable` 字段未 Dispose
- **trust-boundary**：`Process.Start(UseShellExecute=true, fileName=userInput)` → OS 选 handler 执行任意文件；P/Invoke 错误 marshaling

### cpp-sdk

解析 `.h`/`.cpp` 源码——识别公开 API 签名（指针+长度、`void* ctx`、`char*` 返回值）、`memcpy`/`sprintf`/`strcpy`、`new`/`delete`、`std::thread` 创建/detach/join、全局可变状态。

风险模式：
- **trust-boundary (blocker)**：`memcpy(out, data, len)` 无 `len <= out_len` 检查 → 堆溢出
- **trust-boundary**：`sprintf` 无长度限制；公开 API 接受指针+长度但实现不验证
- **api-stability**：`char*` 返回值所有权不明（谁 free？）；`void* ctx` 生命周期无文档
- **resource-lifetime**：`std::thread::detach()` → 孤儿线程、use-after-free
- **threading-discipline**：lambda 捕获 raw pointer 后跨线程访问、全局 mutex 锁序未定义

---

每个发现都带：`file:line` 引用、严重等级（blocker/high/medium/low）、**预制的 Learning Candidate**——可以直接喂给 evolve 循环写进 profile。

这是和"通用代码 review checklist"的本质区别：**结构化提取 + 栈特定知识库 = 找到的是这类项目的真实风险，而不是泛泛的代码风格问题。**

> 提取器当前是正则实现（PoC 级），未来可换成 tree-sitter / Roslyn / libclang 而不改下游契约。
> 新增栈只需一个提取器模块 + 一个拓扑规则模块 + 一个知识库文件，见 `references/probe-architecture.md`。

### 任意技术栈（Path B + Path C）

AnyHarness 不只支持上面四个栈——它能分析**任意项目**。

**Path B（LLM 分析）**：`analyze.mjs --stack auto` 可识别 15+ 种技术栈。对于不支持的栈，它会采样最有价值的源文件，并配合 `references/llm-extractor.md` 指引你完成分析。你阅读采样文件，按 7 个通用失效模式生成 Risk[] 发现。

**Path C（确定性配置）**：在项目根目录放一个 `.anyharness/stack-config.json`，无需写代码。为你的栈定义以下正则规则：
- `trustBoundaryMarkers` — 路由装饰器 / 注解
- `externalCallPatterns` — 子进程、HTTP、文件 I/O 调用
- `unsafePatterns` — 危险操作
- `asyncPatterns` — 异步函数形式
- `errorSwallowPatterns` — 静默吞掉错误的模式

`analyze.mjs --stack auto` 会自动识别配置文件并走 Path C。Schema 和 Python/FastAPI、Go/Gin、Node/Express 的示例配置见 `references/stack-config-schema.md`。

详见 `references/probe-architecture.md`、`references/universal-failure-modes.md`、`references/stacks/<stack>.md`。

AnyHarness 把 LLM 用在它擅长的地方：

- 阅读项目上下文
- 发现领域信号
- 向用户提问确认
- 生成项目专属规则
- 创建专家 review 角色
- 设计门禁和测试 oracle
- 生成跨模型 review packet

可选 skill scripts 负责确定性的辅助任务：

- `analyze.mjs` — 统一架构分析管道（提取 + 拓扑 + 报告）
- `suggest-stack-config.mjs` — 为 Path C 生成 `stack-config.json` 模板
- `scan-project.mjs` — 仓库文件扫描
- `collect-diff.mjs` — git diff 收集
- `extract-architecture.mjs` — 按栈提取架构
- `derive-risk-topology.mjs` — 从提取结果推导风险拓扑
- `sample-for-llm.mjs` — 为不支持的栈采样高价值文件（Path B）
- `write-native-prompts.mjs` — 生成 CLAUDE.md / AGENTS.md / Cursor 规则
- `write-profile.mjs` — 写入或草稿 profile
- `validate-profile.mjs` — 校验 profile JSON
- `generate-review-packet.mjs` — 跨模型 review packet
- `propose-evolution.mjs` — 把 learning candidates 合并进 profile
- `install-local-hooks.mjs` — 可选 Git hooks 和 CI workflow

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
                     # 每次演化后会追加 learningHistory 日志
  profile.md         # 人类可读项目 harness profile
  drafts/            # --confirm 之前的安全草稿
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
/anyharness:run onboard this existing repository
```

底层跑 `onboard.mjs`——一条命令把"项目扫描 + 架构分析"合并成一次，在**一次确认**内完成 profile 写入并同时植入真实风险发现。

**执行流程：**

1. **扫描 + 分析同步进行** — 读取目录结构、检测技术栈和领域信号，然后立即对源码做深度架构提取。
2. **合并展示** — 把领域假设和架构风险发现（带 `file:line` 引用）放在一起呈现，而不是分两步走。
3. **更少的问题** — 架构分析已经能回答部分领域问题；AnyHarness 只追问代码里推断不出来的内容。
4. **一次写入** — 确认后，一次性写入 `CLAUDE.md`、`AGENTS.md` 和 `.anyharness/profile.json`，profile 里同时包含领域 invariant 和来自架构风险的 invariant。

**安全规则（不变）：**

- 先只读扫描和分析，你确认前不写任何文件
- 已有的 `CLAUDE.md` / `AGENTS.md` 绝不覆盖，只生成 draft
- 不主动安装 hooks，除非你明确要求

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

## Harness 演化循环

每次 review 结束都会输出一个 **Learning Candidates（学习候选）** 段落：结构化地提议要怎么更新项目 harness。这是 profile 持续保鲜的机制。

```text
Verdict: Blocked

Learning Candidates:
- type: new-invariant
  proposed: src/webhooks/ 下的 webhook 处理器，在任何副作用之前必须先查
            payment_events 表中的 idempotency key。
  evidence: src/webhooks/PaymentWebhook.java:42, src/webhooks/RefundWebhook.java:31
  rationale: 已经有两个 handler 缺这个检查，新 handler 会重复这个模式。

Apply any of these to the profile?
```

候选类型：

- `new-invariant`——项目应该一直遵守的新规则
- `refined-invariant`——细化已有 invariant 的措辞或范围
- `retired-invariant`——移除不再适用的 invariant
- `new-unknown`——reviewer 没足够上下文回答的问题
- `new-gate`——每次改动都该自动跑的检查

用户确认后，AnyHarness 把已接受的候选合并进 `.anyharness/profile.json`，并在 `learningHistory` 里追加一条带时间戳的记录（trigger、added、refined、retired、newUnknowns、newGates）。这个合并是**幂等的**——同一份 findings 重跑是 no-op。

判断"是不是真的 learning candidate"的过滤很严格：单文件 bug fix 不是 invariant；能预防一类未来 bug 的规则才是。详见 `references/harness-evolution.md`。

## 模式

| 模式 | 内容 | 适合 |
|---|---|---|
| Skill-only | LLM 交互、领域发现、prompt 面、review packet | 个人开发、探索 |
| Project Harness | 增加 `.anyharness/profile.json` 和 gates | 认真个人项目、小团队 |
| Learning Harness | Project Harness + 演化循环（Learning Candidates → profile.json + learningHistory） | 希望 harness 随时间复利增长的团队 |
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
      references/                     # 14 个 reference 文件（单一数据源）
      scripts/                        # 13 个确定性辅助脚本
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
