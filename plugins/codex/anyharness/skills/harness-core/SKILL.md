---
name: harness-core
description: Core behavioral guardrails for AI coding. Use when writing, reviewing, or refactoring code to classify risk, keep changes surgical, surface assumptions, require evidence, and block unsafe work.
---


# AnyHarness Core

Use these rules for every AI-assisted coding task.

## The Four Rules

1. **Classify Risk First**  
   Before coding, identify whether the task is L0, L1, L2, or L3. Escalate automatically for auth, authorization, payment, database migrations, production data, deployment, CI, secrets, or AI tool permissions.

2. **Keep Changes Surgical**  
   Every changed line must trace back to the user's request. Do not refactor adjacent code, reorganize files, rename public APIs, or introduce abstractions unless the task explicitly requires it and the trade-off is documented.

3. **Require Evidence**  
   Do not claim success without evidence. Evidence means tests actually run, commands executed, files reviewed, gate artifacts created, or an explicit statement of untested risk.

4. **Block Unsafe Work**  
   Do not modify Red Zone files, secrets, migrations, auth/security/payment code, CI/deploy configuration, or agent governance files without the required gates and human approval.

## Required Output Contract

For non-trivial work, end with:

```text
Risk Level:
Assumptions:
Unknowns:
Files Changed:
Tests:
Security Considerations:
Rollback Plan:
Human Approval Required:
```

For L0 work, `Rollback Plan` and `Human Approval Required` may be `Not required`.

## Red Flags

Block or pause when:

- The task touches auth, authorization, payment, migrations, secrets, CI, deploy, or production data.
- The requested change is vague but implementation would be broad.
- Tests are missing but the change is non-trivial.
- The model wants to edit unrelated files.
- The model claims tests passed without running or citing them.
- Documentation/API/schema/config changes drift from the implementation.


## How To Use With Other Skills

- Use `risk-classify` when risk is unclear.
- Use `new-feature` before implementing non-trivial work.
- Use `code-review` before accepting generated changes.
- Use `test-plan` before claiming quality.
- Use `security-review` for any security-sensitive change.
- Use `release-check` before Level 2 or Level 3 release-impacting changes.
