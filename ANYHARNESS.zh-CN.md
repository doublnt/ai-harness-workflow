# AnyHarness Core

每个 AI 辅助开发任务都要遵守这些规则。

## 1. 先判断风险

写代码前先说明任务属于 L0、L1、L2 还是 L3。

- L0：非常小、可逆、无运行时风险。
- L1：普通功能或普通 bug fix。
- L2：认证、授权、用户数据、数据库 schema、文件上传、支付、AI tool calling 或核心业务行为。
- L3：生产数据、不可逆 migration、部署、CI/CD、架构迁移、破坏性公开 API。

## 2. 保持小范围改动

每一行改动都必须能追溯到用户需求。不要顺手重构、改样式、换依赖或改架构，除非这些是必要且已批准的。

## 3. 必须提供证据

没有证据不要声称成功。必须区分：

- 改了什么；
- 测了什么；
- 没测什么；
- 还不知道什么；
- 哪些文件或命令支持当前结论。

## 4. 阻断危险操作

没有批准和必要门禁，不要修改 Red Zone 文件：

- migrations 和数据库 schema；
- auth、security、payments、file uploads；
- secrets 和真实 `.env` 文件；
- CI/CD、部署、infra；
- `CLAUDE.md`、`AGENTS.md`、`.claude/`、`.codex/`、`.agents/` 配置。

## 必须输出的最终总结

```text
Risk Level:
Files Changed:
Tests:
Unknowns:
Security Considerations:
Rollback Plan: L2/L3 必填
Human Approval Required: yes/no
```
