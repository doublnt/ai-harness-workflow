import { table } from '../utils.js';

export function projectContext(scan, config) {
  const facts = scan.facts;
  const rows = [
    ['Purpose', 'Command', 'Source'],
    ['Dev', facts.devCommand, sourceFor(facts.devCommand)],
    ['Build', facts.buildCommand, sourceFor(facts.buildCommand)],
    ['Test', facts.testCommand, sourceFor(facts.testCommand)],
    ['Lint', facts.lintCommand, sourceFor(facts.lintCommand)],
    ['Format', facts.formatCommand, sourceFor(facts.formatCommand)],
    ['Type check', facts.typecheckCommand, sourceFor(facts.typecheckCommand)]
  ];

  return `# Project Context

## Project Summary

- Name: ${facts.projectName}
- Type: ${facts.projectType}
- Stage: ${config.stage}
- Primary users: ${config.primaryUsers}
- Core domain: ${config.coreDomain}
- Primary goal: ${config.primaryGoal}
- Risk profile: ${scan.riskProfile.level}

## Tech Stack

- Language: ${facts.primaryLanguage}
- Framework: ${facts.framework}
- Runtime: ${runtimeFor(facts)}
- Package manager: ${facts.packageManager}
- Database: ${facts.database}
- Auth: ${facts.auth}
- Deployment: ${facts.deployment}
- CI/CD: ${facts.cicd}

## Existing Commands

${table(rows)}

Unknown means the scanner could not confirm the command from repository files.

## Important Directories

${importantDirectories(scan.files)}

## Current Engineering Maturity

- Documentation: ${scan.docs.readme}
- Tests: ${scan.gates.unitTests.status}
- Lint: ${scan.gates.lint.status}
- CI: ${scan.gates.ci.status}
- Release: ${scan.docs.releaseDocs}
- Security: ${scan.docs.security}
- Observability: Unknown

## Known Risks

${bullet(scan.risks.length ? scan.risks : ['No major risk signals detected by shallow scan.'])}

## Unknowns

${bullet(scan.unknowns.length ? scan.unknowns : ['None from initial scan.'])}

## AI Workflow

- Target format: ${config.target}
- Claude Code detected: ${scan.workflows.claude.status}
- Codex detected: ${scan.workflows.codex.status}
- Spec Kit detected: ${scan.workflows.speckit.status}
- Other AI workflow detected: ${otherWorkflowSummary(scan)}
`;
}

export function engineeringConstitution() {
  return `# Engineering Constitution

These rules apply to all AI-assisted development in this project.

## Core Principles

1. Prefer simple solutions over clever abstractions.
2. No architecture decision without explicit constraints.
3. No implementation before requirement clarification.
4. No high-risk change without rollback plan.
5. No security-sensitive change without threat modeling.
6. No performance claim without measurement.
7. No generated code accepted without tests or explicit test rationale.
8. No hidden assumptions; assumptions must be listed.
9. Unknown must be marked as Unknown.
10. AI may propose; humans approve irreversible decisions.

## Simplicity Rule

默认选择最简单可工作的方案，除非有明确证据证明需要更复杂设计。

## Abstraction Rule

禁止为了“未来可能需要”而提前抽象。

只有满足以下条件时才允许引入抽象：

- 至少有两个真实用例
- 变化点明确
- 抽象减少重复或隔离不稳定依赖
- 抽象不会显著增加理解成本

## Dependency Rule

新增依赖必须说明：

- 为什么需要
- 可替代方案
- 维护状态
- 安全影响
- 包体积或运行成本
- 移除成本

## AI Output Rule

AI 每次输出实现方案时必须包含：

- Assumptions
- Constraints
- Proposed approach
- Alternatives considered
- Risks
- Tests required
- Rollback plan if applicable
- Unknowns

## Human Approval Required

以下改动必须人工批准：

- 数据库 schema
- 数据迁移
- 认证
- 授权
- 支付
- 生产数据
- 公共 API 破坏性变更
- 安全策略
- 部署配置
- CI/CD 行为
- 密钥和权限
- 大范围重构
`;
}

export function riskLevels() {
  return `# Risk Levels

## Level 0 — Low Risk

示例：

- UI 文案
- 样式微调
- 小型工具函数
- 非核心脚本
- 文档补充

要求：

- 不破坏现有行为
- 不修改核心数据结构
- 不引入新依赖
- 简单自测

## Level 1 — Normal Feature

示例：

- 新页面
- 新 API
- 普通 CRUD
- 普通业务逻辑
- 普通组件

要求：

- 需求说明
- 边界条件
- 实现计划
- 基础测试
- code review gate

## Level 2 — Core Feature

示例：

- 认证
- 授权
- 支付
- 文件上传
- 数据库 schema
- 核心业务流程
- 状态机
- 外部 API 集成
- AI tool calling

要求：

- feature spec
- design proposal
- ADR
- security checklist
- test plan
- rollback plan
- human approval

## Level 3 — Critical Change

示例：

- 架构迁移
- 数据迁移
- 生产数据修改
- 公共 API 破坏性变更
- 核心模型重构
- 权限模型变更
- 部署策略变更

要求：

- 完整设计文档
- 至少 3 个方案对比
- risk analysis
- migration plan
- rollback plan
- release checklist
- observability plan
- explicit human approval

## Escalation Rules

任何任务只要涉及以下内容，最低 Level 2：

- 用户数据
- 权限
- 认证
- 支付
- 文件上传
- 数据库变更
- 外部服务权限
- 安全边界
- 生产环境
- AI agent 工具权限

任何任务只要涉及不可逆数据修改，最低 Level 3。
`;
}

export function fileChangePolicy() {
  return `# File Change Policy

## Green Zone

AI 可以在普通任务中修改：

- 明确属于当前功能的源码文件
- 明确属于当前功能的测试文件
- 文档草稿
- 工具专属 governance 文件

## Yellow Zone

修改前需要说明理由：

- 共享工具函数
- 公共组件
- 公共类型
- 配置文件
- 构建脚本
- package manifest
- lock file
- CI 配置
- AI 工具配置

## Red Zone

修改前必须人工批准：

- 数据库 migration
- 认证代码
- 授权代码
- 支付代码
- 安全策略
- 生产配置
- secrets
- 部署配置
- 公共 API schema
- 大范围重构
- 删除文件
- 删除测试
- 改写 CLAUDE.md
- 改写 AGENTS.md
- 改写 .claude/settings.json
- 改写 .codex/config.toml
`;
}

export function workflowOverview() {
  return `# Workflow Overview

Every AI-assisted task should follow this order:

1. Understand the request.
2. Classify risk.
3. Read project context and relevant rules.
4. Clarify requirements.
5. Produce design options when required.
6. Produce implementation plan.
7. Wait for approval for Level 2 or Level 3 tasks.
8. Implement only approved scope.
9. Run or propose tests.
10. Review against gates.
11. Summarize risks, unknowns, and next actions.

## Default Output Contract

~~~text
Risk Level:
Assumptions:
Unknowns:
Required Gates:
Plan:
Files To Change:
Files Not To Touch:
Tests:
Security Considerations:
Rollback Plan:
Human Approval Required:
~~~
`;
}

export function requirementGate() {
  return `# Requirement Gate

在写代码前，必须完成需求澄清。

## Required Output

~~~text
Problem:
User:
Goal:
Non-goals:
Inputs:
Outputs:
Success criteria:
Edge cases:
Failure cases:
Risk level:
Unknowns:
~~~

## Pass Criteria

- 目标明确
- 非目标明确
- 输入输出明确
- 至少列出边界条件
- 至少列出失败场景
- 风险等级已判断

## Blockers

以下情况不得进入实现：

- 不知道用户是谁
- 不知道成功标准
- 不知道输入输出
- 涉及高风险但没有人工确认
`;
}

export function designGate() {
  return `# Design Gate

Level 1 以上任务必须执行设计门禁。

## Required Output

~~~text
Context:
Constraints:
Assumptions:
Option A:
Option B:
Option C if Level 2+:
Trade-off table:
Recommended option:
Why now:
Why not simpler:
Failure modes:
Rollback plan:
Unknowns:
~~~

## Pass Criteria

- 至少 2 个方案
- Level 2+ 至少 3 个方案
- 每个方案有优缺点
- 推荐方案有理由
- 明确牺牲了什么
- 明确失败模式
- 高风险任务有回滚方案
`;
}

export function implementationGate() {
  return `# Implementation Gate

写代码前必须生成实现计划。

## Required Output

~~~text
Files to modify:
Files to create:
Files not to touch:
Step-by-step plan:
Test files to add/update:
Dependencies:
Migration required:
Rollback:
~~~

## Rules

- 不做无关重构
- 不新增无必要依赖
- 不删除已有测试
- 不扩大任务范围
- 不修改 Red Zone 文件，除非已获批准
`;
}

export function codeReviewGate() {
  return `# Code Review Gate

每次实现后必须执行。

## Review Format

~~~text
Summary:
Risk level:
Requirement match:
Design issues:
Correctness issues:
Security issues:
Testing gaps:
Performance concerns:
Observability:
Rollback readiness:
Unknowns:
Verdict: Pass / Needs Changes / Blocked
~~~

## Verdict Rules

Pass 只能在以下条件满足时给出：

- 满足需求
- 没有已知阻塞问题
- 测试策略合理
- 高风险事项已处理
- Unknown 不影响当前决策

只要存在安全、权限、数据、迁移方面的 Unknown，必须是 Needs Changes 或 Blocked。
`;
}

export function testingGate(scan) {
  return `# Testing Gate

## Detected Test Command

${scan.facts.testCommand}

## Required Test Categories

### Level 0

- 基础自测
- 不破坏现有行为

### Level 1

- 正常路径
- 边界条件
- 失败路径

### Level 2

- Level 1 全部
- 集成测试
- 权限测试
- 回归测试
- 数据一致性测试

### Level 3

- Level 2 全部
- 迁移测试
- 回滚测试
- 压测或容量验证
- 生产观测计划

## Test Plan Format

~~~text
Test scope:
Unit tests:
Integration tests:
E2E tests:
Security tests:
Regression tests:
Manual checks:
Commands to run:
Untested risks:
Unknowns:
~~~
`;
}

export function securityGate() {
  return `# Security Gate

以下任务必须执行安全门禁：

- 认证
- 授权
- 用户输入
- 文件上传
- 外部 URL
- webhook
- 支付
- 用户数据
- secret
- token
- session
- cookie
- AI tool calling
- LLM input/output

## Required Output

~~~text
Assets:
Actors:
Trust boundaries:
Entry points:
Threats:
Abuse cases:
Required mitigations:
Security tests:
Unknowns:
Verdict:
~~~

## Common Checks

- 输入校验
- 输出编码
- 权限检查
- 认证检查
- SSRF
- SQL injection
- XSS
- CSRF
- path traversal
- insecure direct object reference
- secret leakage
- logging sensitive data
- dependency risk
- prompt injection
- tool permission abuse
`;
}

export function releaseGate() {
  return `# Release Gate

Level 2+ 任务发布前必须执行。

## Required Output

~~~text
Change summary:
User impact:
Data impact:
Migration:
Config changes:
Environment variables:
Feature flags:
Backward compatibility:
Monitoring:
Rollback plan:
Post-release checks:
Owner:
~~~

## Blockers

- 没有 rollback plan 的数据库变更
- 没有监控方案的关键路径变更
- 没有权限测试的授权变更
- 没有错误处理的外部服务集成
- 没有人工批准的 Level 3 改动
`;
}

export function architectureChecklist() {
  return `# Architecture Checklist

## Context

- 当前问题是什么？
- 约束是什么？
- 哪些需求稳定？
- 哪些需求可能变化？

## Alternatives

- 是否至少比较 2 个方案？
- Level 2+ 是否至少比较 3 个方案？
- 是否考虑最简单方案？

## Trade-offs

对比：

- 正确性
- 简单性
- 可维护性
- 可测试性
- 性能
- 安全
- 运维复杂度
- 回滚成本

## Failure Modes

- 这个方案最可能如何失败？
- 假设错了会怎样？
- 数据不一致会怎样？
- 外部服务失败会怎样？
- 用户量增长会怎样？

## Decision

- 为什么选择这个方案？
- 放弃了什么？
- 如何验证？
- 如何回滚？
`;
}

export function codeReviewChecklist() {
  return `# Code Review Checklist

## Correctness

- 是否满足需求？
- 是否覆盖边界条件？
- 是否处理失败路径？
- 是否处理空值、重复请求、异常输入？
- 是否有并发或时序问题？

## Simplicity

- 是否存在不必要抽象？
- 是否可以减少概念数量？
- 是否引入过重框架或依赖？

## Modularity

- 模块职责是否清晰？
- 业务逻辑是否放在正确层？
- 是否出现跨层依赖？
- 是否有循环依赖？

## Security

- 是否涉及用户输入？
- 是否涉及认证？
- 是否涉及授权？
- 是否可能泄露敏感信息？
- 是否正确处理 secret？

## Testing

- 是否有测试？
- 是否覆盖正常路径？
- 是否覆盖失败路径？
- 是否覆盖边界条件？
- 是否需要集成测试？

## Performance

- 是否有明显 N+1？
- 是否有不必要重复计算？
- 是否有大对象复制？
- 是否有未分页查询？
- 是否有无界循环或无界队列？

## Observability

- 错误是否可定位？
- 是否有必要日志？
- 是否避免记录敏感信息？
- 是否有关键指标？

## Verdict

~~~text
Pass / Needs Changes / Blocked
~~~

## Unknowns

列出所有无法确认的信息。
`;
}

export function testingChecklist(scan) {
  const rows = [
    ['Purpose', 'Command'],
    ['Unit tests', scan.facts.testCommand],
    ['Integration tests', 'Unknown'],
    ['E2E tests', scan.gates.e2eTests.status === 'Present' ? scan.facts.testCommand : 'Unknown'],
    ['Type check', scan.facts.typecheckCommand],
    ['Lint', scan.facts.lintCommand]
  ];
  return `# Testing Checklist

## Detected Test Tools

- Test framework: ${scan.facts.testFramework}
- Unit tests: ${scan.gates.unitTests.status}
- Integration tests: ${scan.gates.integrationTests.status}
- E2E tests: ${scan.gates.e2eTests.status}

## Commands

${table(rows)}

Unknown 必须明确写 Unknown。

## Required Coverage By Risk

参考 risk-levels.md。

## Test Case Categories

- Normal path
- Boundary conditions
- Invalid input
- Permission denied
- External failure
- Retry / idempotency
- Data consistency
- Regression
`;
}

export function securityChecklist() {
  return `# Security Checklist

## Authentication and Authorization

- Actor 是否明确？
- Resource 是否明确？
- Permission 是否明确？
- Denied cases 是否测试？
- 是否存在 insecure direct object reference？

## Input Handling

- 用户输入是否校验？
- 文件路径是否规范化？
- 外部 URL 是否限制？
- 是否可能 SSRF？
- 是否可能 SQL injection / command injection？

## Output Handling

- 是否可能 XSS？
- 是否泄露敏感字段？
- 错误信息是否过度暴露？

## Secrets

- 是否读取真实 .env？
- 是否记录 secret？
- 是否把 secret 传给外部模型或服务？

## Dependencies

- 新依赖是否必要？
- 是否有维护风险？
- 是否有供应链风险？
`;
}

export function releaseChecklist() {
  return `# Release Checklist

## Release Readiness

- Change summary 是否清楚？
- User impact 是否清楚？
- Data impact 是否清楚？
- 是否有 migration？
- 是否有 config/env 变更？
- 是否影响旧 API？
- 是否需要 feature flag？
- 是否有监控和日志？
- 是否有 rollback plan？
- 是否有 post-release checks？

## Blockers

- Level 2+ 没有 rollback plan
- 数据迁移没有验证计划
- 权限变更没有权限测试
- 外部服务集成没有失败处理
- 生产影响 Unknown
`;
}

export function dependencyChecklist() {
  return `# Dependency Checklist

新增依赖前必须回答：

- 这个依赖解决什么具体问题？
- 能否用标准库或现有依赖解决？
- 维护状态如何？
- license 是否兼容？
- 是否会影响 bundle size 或部署体积？
- 是否有安全风险？
- 如何移除？
`;
}

export function observabilityChecklist() {
  return `# Observability Checklist

## Logs

- 是否能定位失败位置？
- 是否包含 request/task identifier？
- 是否避免记录敏感信息？

## Metrics

- 是否需要成功率？
- 是否需要延迟？
- 是否需要错误率？
- 是否需要队列长度或重试次数？

## Tracing

- 是否涉及跨服务调用？
- 是否涉及外部 API？
- 是否需要 trace context？
`;
}

export function featureSpecTemplate() {
  return `# Feature Spec

## Problem

## User

## Goal

## Non-goals

## Inputs

## Outputs

## Success Criteria

## Edge Cases

## Failure Cases

## Risk Level

## Security Considerations

## Data Considerations

## Unknowns
`;
}

export function designProposalTemplate() {
  return `# Design Proposal

## Context

## Constraints

## Assumptions

## Option A — Simple

### Description

### Pros

### Cons

### Failure Modes

## Option B — Balanced

### Description

### Pros

### Cons

### Failure Modes

## Option C — Robust

Level 2+ required.

### Description

### Pros

### Cons

### Failure Modes

## Trade-off Table

| Option | Simplicity | Maintainability | Testability | Security | Performance | Rollback | Cost |
|---|---|---|---|---|---|---|---|

## Recommendation

## Why Not Simpler?

## Rollback Plan

## Unknowns
`;
}

export function adrTemplate() {
  return `# ADR-XXXX: Title

## Status

Proposed / Accepted / Superseded / Rejected

## Date

## Context

## Decision

## Alternatives Considered

## Consequences

### Positive

### Negative

### Risks

## Validation Plan

## Rollback Plan

## Related Documents
`;
}

export function implementationPlanTemplate() {
  return `# Implementation Plan

## Task

## Risk Level

## Approved Scope

## Files To Modify

| File | Reason |
|---|---|

## Files To Create

| File | Reason |
|---|---|

## Files Not To Touch

## Step-by-step Plan

## Dependencies

## Tests To Add Or Update

## Migration Required

Yes / No

## Rollback Plan

## Unknowns
`;
}

export function testPlanTemplate() {
  return `# Test Plan

## Scope

## Risk Level

## Test Matrix

| Case | Type | Expected Result |
|---|---|---|

## Unit Tests

## Integration Tests

## E2E Tests

## Security Tests

## Regression Tests

## Manual Checks

## Commands To Run

## Untested Risks

## Unknowns
`;
}

export function prReviewTemplate() {
  return `# PR Review

## Summary

## Risk Level

## Requirement Match

## Files Changed

## Review Results

| Area | Result | Notes |
|---|---|---|
| Correctness | Pass / Needs Changes / Blocked | |
| Simplicity | Pass / Needs Changes / Blocked | |
| Architecture | Pass / Needs Changes / Blocked | |
| Security | Pass / Needs Changes / Blocked | |
| Testing | Pass / Needs Changes / Blocked | |
| Performance | Pass / Needs Changes / Blocked | |
| Observability | Pass / Needs Changes / Blocked | |
| Rollback | Pass / Needs Changes / Blocked | |

## Critical Issues

## Non-blocking Suggestions

## Unknowns

## Verdict

Pass / Needs Changes / Blocked
`;
}

export function releasePlanTemplate() {
  return `# Release Plan

## Change Summary

## Risk Level

## User Impact

## Data Impact

## Migration

## Config Changes

## Feature Flags

## Deployment Steps

## Monitoring

## Rollback Plan

## Post-release Checks

## Owner

## Unknowns
`;
}

export function frontendChecklist() {
  return `# Frontend Checklist

## Component Design

- 组件职责是否单一？
- props 是否清晰？
- 状态是否放在合适层级？
- 是否避免不必要全局状态？

## UI States

必须考虑：

- loading
- error
- empty
- success
- disabled
- permission denied
- slow network

## Forms

- 输入校验
- 错误提示
- 提交中状态
- 重复提交防护
- 服务端错误展示

## Accessibility

- keyboard navigation
- focus states
- labels
- aria when needed
- color contrast

## Performance

- unnecessary re-render
- bundle size
- lazy loading
- image optimization
- pagination / virtualization

## Security

- XSS
- unsafe HTML
- token storage
- CSRF if applicable
`;
}

export function backendChecklist() {
  return `# Backend Checklist

## API

- 请求参数校验
- 响应格式稳定
- 错误码一致
- 分页
- rate limiting if needed
- backward compatibility

## Auth

- authentication
- authorization
- resource ownership
- permission denied tests

## Data

- transaction boundaries
- idempotency
- consistency
- migration safety
- rollback

## Failure Handling

- timeout
- retry
- external service failure
- partial failure
- compensation if applicable

## Observability

- structured logs
- metrics
- tracing if applicable
- no sensitive logs
`;
}

export function databaseChecklist() {
  return `# Database Checklist

## Schema

- 是否兼容旧数据？
- 是否需要 backfill？
- 是否需要默认值？
- 是否影响索引？
- 是否会锁表？
- 是否支持 rollback？

## Query

- 是否有 N+1？
- 是否需要索引？
- 是否分页？
- 是否可能全表扫描？
- 是否有事务边界？

## Migration

- migration plan
- rollback plan
- staging verification
- production risk
- data backup if needed

## Tests

- empty data
- existing data
- large data
- rollback
`;
}

export function rustChecklist() {
  return `# Rust Checklist

## Error Handling

- 是否正确使用 Result？
- 是否避免不必要 unwrap / expect？
- panic 边界是否明确？
- 错误类型是否清楚？

## Ownership

- 是否避免不必要 clone？
- 生命周期是否合理？
- 借用边界是否清楚？

## Concurrency

- Send / Sync 是否正确？
- 是否有死锁风险？
- 是否有数据竞争风险？
- async 是否有阻塞调用？

## Unsafe

- 是否存在 unsafe？
- unsafe 不变量是否文档化？
- 是否有安全边界测试？

## Performance

- allocation
- copy / clone
- iterator cost
- benchmark if claimed
`;
}

export function aiAgentChecklist() {
  return `# AI Agent Checklist

## Tool Permissions

- agent 可以调用哪些工具？
- 哪些工具需要人工确认？
- 是否能读写文件？
- 是否能访问网络？
- 是否能执行命令？
- 是否能访问用户数据？

## Prompt Injection

- 外部输入是否当作不可信数据？
- 工具结果是否可能包含恶意指令？
- 是否隔离 system instructions 和 retrieved content？
- 是否限制 agent 执行危险操作？

## Data Leakage

- 是否会泄露 secret？
- 是否会泄露用户数据？
- 是否会把敏感信息发给外部模型？

## Eval

- 是否有 golden cases？
- 是否有 regression eval？
- 是否有 failure cases？
- 是否记录成本和延迟？

## Human Approval

以下操作必须人工确认：

- 删除文件
- 修改权限
- 执行外部命令
- 发送敏感数据
- 生产环境操作
- 不可逆操作
`;
}

function sourceFor(command) {
  return command === 'Unknown' ? 'Unknown' : 'detected/inferred';
}

function runtimeFor(facts) {
  if (facts.primaryLanguage.includes('JavaScript') || facts.framework !== 'Unknown') return 'Node.js';
  if (facts.primaryLanguage === 'Rust') return 'Rust toolchain';
  if (facts.primaryLanguage === 'Python') return 'Python';
  if (facts.primaryLanguage === 'Go') return 'Go';
  return 'Unknown';
}

function importantDirectories(files) {
  const candidates = ['src/', 'app/', 'pages/', 'components/', 'lib/', 'server/', 'api/', 'routes/', 'tests/', 'test/', 'e2e/', 'migrations/', 'prisma/', 'db/'];
  const rows = [['Path', 'Purpose']];
  for (const dir of candidates) {
    if (files.some((file) => file.startsWith(dir))) rows.push([dir, purposeForDir(dir)]);
  }
  if (rows.length === 1) rows.push(['Unknown', 'No common source/test directories detected by shallow scan']);
  return table(rows);
}

function purposeForDir(dir) {
  if (['src/', 'lib/'].includes(dir)) return 'Source code';
  if (['app/', 'pages/', 'components/'].includes(dir)) return 'Application/UI code';
  if (['server/', 'api/', 'routes/'].includes(dir)) return 'Backend/API code';
  if (['tests/', 'test/', 'e2e/'].includes(dir)) return 'Tests';
  if (['migrations/', 'prisma/', 'db/'].includes(dir)) return 'Database/schema';
  return 'Unknown';
}

function otherWorkflowSummary(scan) {
  const names = ['cursor', 'windsurf', 'copilot'].filter((name) => scan.workflows[name]?.status === 'Detected');
  return names.length ? names.join(', ') : 'Missing';
}

function bullet(items) {
  return items.map((item) => `- ${item}`).join('\n');
}
