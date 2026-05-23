---
name: test-plan
description: "Generate a risk-aware test plan with unit, integration, E2E, security, regression, manual checks, and untested risks."
---


# test-plan

Use this skill to plan tests for a task, feature, diff, or release.

## Required references

- `../../resources/core-rules.md`
- `../../resources/risk-levels.md`
- `../../resources/gates.md`
- `../../resources/stack-checklists.md`

## Process

1. Define test scope.
2. Classify risk.
3. Identify existing test tools and commands if available.
4. Build a test matrix.
5. Include normal, boundary, invalid input, failure, regression, and manual checks.
6. For Level 2+, include integration/security/data consistency checks.
7. For Level 3, include migration/rollback/observability checks.
8. List untested risks.

## Output

```text
Test Scope:
Risk Level:
Detected Test Commands:
Test Matrix:
Unit Tests:
Integration Tests:
E2E Tests:
Security Tests:
Regression Tests:
Manual Checks:
Commands To Run:
Untested Risks:
Unknowns:
```

## V2 Closed-loop Requirements

When this skill is used in a repository with Vibe Guardrails v2 initialized, also check:

- `.guardrails/config.json`
- `.guardrails/gates/*.json`
- `.guardrails/approvals/*.json`
- Git hook status via `vibe-guardrails doctor` when relevant

For Level 2 or Level 3 changes, produce or update a gate artifact. Do not mark the task complete until risk level, required gates, tests, docs impact, rollback plan, and Unknowns are recorded.
