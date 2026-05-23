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
