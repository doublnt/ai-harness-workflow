# 示例

这些例子展示普通 AI 编程和 guardrail-driven AI 编程的区别。

## 1. 隐藏风险：用户数据导出

用户说：

```text
加一个用户 CSV 导出功能。
```

坏回答：

```text
我会加一个导出接口，把所有用户字段导出来。
```

问题：

- 涉及用户数据。
- 可能泄露 PII。
- 需要授权判断。
- 需要审计或至少明确是否不审计。
- 需要字段白名单。

AnyHarness 回答：

```text
Risk Level: L2
Reason: user data export and authorization boundary.
Required Gates: requirement, design, security, test, release.
Questions:
- 哪些字段允许导出？
- 哪些角色允许导出？
- 是否需要审计？
- 是否有大小限制？
```

## 2. 过度重构：小 bug fix

用户说：

```text
修复 email 为空时崩溃的问题。
```

坏回答：

```text
我会重写整个 validation 层，引入新的 schema abstraction。
```

AnyHarness 回答：

```text
Risk Level: L1
Plan:
- 增加 empty email 的回归测试。
- 只修改 email validation 分支。
- 不重构 validator framework。
```

## 3. 文档漂移：API 改动

改动文件：

```text
app/api/users/route.ts
```

坏 commit：

```text
feat: update users endpoint [risk:L1]
```

AnyHarness 结果：

```text
BLOCKED: Docs drift detected.
Reason: API route changed but no API docs, changelog, or gate artifact explains docs impact.
Fix: 更新 docs/api/*，或在 gate artifact 里写 Docs impact: none + 理由。
```

## 4. 不安全 commit：auth 改动

坏 commit：

```text
feat: update auth
```

AnyHarness 结果：

```text
BLOCKED: missing risk tag.
BLOCKED: auth files require L2 metadata.
Required:
- [risk:L2]
- Gate-Review
- Security-Review
- Tests
- Rollback
- Human-Approval
```

好 commit：

```text
feat(auth): rotate refresh tokens [risk:L2]

Risk-Level: L2
Gate-Review: .anyharness/gates/2026-05-23-refresh-token.json
Security-Review: .anyharness/gates/2026-05-23-refresh-token.json
Tests: npm test
Human-Approval: required
Rollback: docs/release/2026-05-23-refresh-token.md
```

## 5. 缺少发布回滚

改动文件：

```text
migrations/20260523_add_sessions.sql
```

AnyHarness 结果：

```text
BLOCKED: L3 database migration requires migration plan, rollback plan, release check, and approval artifact.
```

## 6. AI 没运行测试却说通过

坏总结：

```text
Tests passed.
```

AnyHarness 总结：

```text
Tests:
- Not run. Reason: no test dependencies installed in this environment.
- Recommended command: npm test
Untested Risks:
- empty email input 的回归覆盖仍未验证。
```
