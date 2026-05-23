---
name: code-review
description: "Review current diff or provided code for correctness, design, security, testing, performance, observability, rollback, and unknowns."
---


# code-review

Use this skill to review a diff, PR, patch, or AI-generated code before accepting it.

## Required references

- `../../resources/core-rules.md`
- `../../resources/risk-levels.md`
- `../../resources/file-change-policy.md`
- `../../resources/gates.md`
- `../../resources/stack-checklists.md`

## Process

1. Identify what changed.
2. Classify risk.
3. Check requirement match.
4. Check correctness and edge cases.
5. Check simplicity and module boundaries.
6. Check security and data handling.
7. Check testing gaps.
8. Check performance risks.
9. Check observability and rollback readiness.
10. Produce verdict.

## Verdict rules

- Security, auth, data, migration, or production Unknowns prevent Pass.
- Missing tests for Level 2+ prevent Pass.
- Red-zone file modifications without approval are Blocked.
- Do not claim tests passed unless they were actually run.

## Output

```text
Summary:
Risk Level:
Critical Issues:
Correctness Issues:
Design Issues:
Security Issues:
Testing Gaps:
Performance Concerns:
Observability:
Rollback Readiness:
Unknowns:
Verdict: Pass / Needs Changes / Blocked
```
