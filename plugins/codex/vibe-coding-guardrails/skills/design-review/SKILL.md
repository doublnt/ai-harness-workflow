---
name: design-review
description: "Review a proposed design or architecture for assumptions, alternatives, trade-offs, failure modes, security, and rollback readiness."
---


# design-review

Use this skill when reviewing architecture, design proposals, API design, module boundaries, database design, or AI-generated design advice.

## Required references

- `../../resources/core-rules.md`
- `../../resources/risk-levels.md`
- `../../resources/gates.md`
- `../../resources/stack-checklists.md`

## Process

1. Extract the design goal and constraints.
2. List assumptions.
3. Identify risk level.
4. Require alternatives.
5. Compare trade-offs.
6. Identify failure modes.
7. Check testability, security, observability, and rollback.
8. Produce verdict.

## Verdict rules

- No alternatives means cannot Pass.
- Level 2+ requires at least 3 options.
- High-risk design without rollback plan is Blocked.
- Security/data/auth Unknowns prevent Pass.

## Output

```text
Design Summary:
Risk Level:
Assumptions:
Constraints:
Alternatives:
Trade-off Table:
Failure Modes:
Security Considerations:
Testability:
Observability:
Rollback Plan:
Unknowns:
Verdict: Pass / Needs Changes / Blocked
```

## V2 Closed-loop Requirements

When this skill is used in a repository with Vibe Guardrails v2 initialized, also check:

- `.guardrails/config.json`
- `.guardrails/gates/*.json`
- `.guardrails/approvals/*.json`
- Git hook status via `vibe-guardrails doctor` when relevant

For Level 2 or Level 3 changes, produce or update a gate artifact. Do not mark the task complete until risk level, required gates, tests, docs impact, rollback plan, and Unknowns are recorded.
