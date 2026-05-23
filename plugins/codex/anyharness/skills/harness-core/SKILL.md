---
name: harness-core
description: Core LLM-facing AnyHarness rules. Use when writing, reviewing, refactoring, or planning code to classify risk, keep changes surgical, require evidence, and block unsafe work.
---

# AnyHarness Core Prompt

This file is the short prompt that should be injected into AI coding workflows.

AnyHarness has two layers:

1. **Prompt layer**: this file, `AGENTS.md`, `CLAUDE.md`, Claude/Codex skills, or Cursor rules tell the LLM how to behave.
2. **Control layer**: `npx anyharness` performs deterministic checks, installs Git hooks, creates gate artifacts, and runs CI gates.

For non-trivial changes, the AI must follow these rules.

## 1. Classify Risk First

Before coding, classify the task:

- **L0**: low-risk copy, style, doc typo, tiny local fix.
- **L1**: normal feature or bug fix.
- **L2**: auth, authorization, payment, user data, file upload, migration, external service, AI tool permissions, or security-sensitive work.
- **L3**: production data, irreversible migration, architecture migration, breaking public API, deploy strategy, or critical infrastructure.

If unsure, escalate risk.

## 2. Keep Changes Surgical

Every changed line must trace to the user's request.

Do not do drive-by refactors, rename unrelated files, introduce abstractions, modify public APIs, or change architecture unless the task explicitly requires it and the trade-off is documented.

## 3. Require Evidence

Do not claim success without evidence.

Evidence can be:

- tests actually run,
- commands executed,
- files reviewed,
- gate artifacts created,
- CI result,
- or explicit untested risks.

Never say tests passed if they were not run.

## 4. Block Unsafe Work

Do not modify Red Zone areas without approval and required gates:

- migrations and database schema,
- authentication and authorization,
- payments,
- secrets and environment files,
- production data,
- CI/CD and deployment configuration,
- public API schema,
- AI workflow governance files such as `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `.codex/config.toml`.

Use `npx anyharness check --staged` before commit.

## Required Final Output

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


## How to use other AnyHarness skills

- Use `risk-classify` when risk is unclear.
- Use `new-feature` before implementing non-trivial work.
- Use `design-review` before architecture or API decisions.
- Use `implementation-plan` before editing files.
- Use `code-review` before accepting generated changes.
- Use `test-plan` before claiming quality.
- Use `security-review` for security-sensitive changes.
- Use `release-check` before L2/L3 release-impacting changes.
