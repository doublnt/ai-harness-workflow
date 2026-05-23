# CLAUDE.md

This repository uses AnyHarness.

Claude Code should read this file as the project-native instruction surface. Do not require a separate `ANYHARNESS.md` file.

## Product model

AnyHarness has two planes:

1. **Prompt injection plane**: this `CLAUDE.md`, Claude plugin skills, and optional `.claude/` rules tell the LLM how to behave.
2. **Execution harness plane**: `npx anyharness`, hooks, Git hooks, CI checks, gate artifacts, and approvals verify and enforce the rules.

## Core behavior

Before changing code:

1. Classify risk: L0 / L1 / L2 / L3.
2. Keep changes surgical.
3. State assumptions and Unknowns.
4. Do not modify Red Zone files without approval.
5. Do not claim tests passed unless they were actually run.
6. For L2/L3 work, create or reference gate artifacts under `.anyharness/gates/`.

Use AnyHarness plugin skills when installed:

```text
/anyharness:harness-core
/anyharness:risk-classify
/anyharness:new-feature
/anyharness:design-review
/anyharness:implementation-plan
/anyharness:code-review
/anyharness:test-plan
/anyharness:security-review
/anyharness:release-check
```

For non-trivial work, end with:

```text
Risk Level:
Assumptions:
Unknowns:
Files Changed:
Tests:
Security Considerations:
Docs Impact:
Rollback Plan:
Human Approval Required:
```
