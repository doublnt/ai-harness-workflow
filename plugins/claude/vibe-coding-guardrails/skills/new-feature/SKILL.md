---
name: new-feature
description: "Plan a new feature with requirement clarification, risk classification, design options, implementation plan, and required tests."
---


# new-feature

Use this skill before building a new feature.

## Required references

- `../../resources/core-rules.md`
- `../../resources/risk-levels.md`
- `../../resources/file-change-policy.md`
- `../../resources/gates.md`
- `../../resources/stack-checklists.md`

## Process

1. Summarize the feature request.
2. Run the Requirement Gate.
3. Classify risk.
4. For Level 1+, produce at least 2 design options.
5. For Level 2+, produce at least 3 design options and an ADR draft.
6. Produce implementation plan.
7. Produce test plan outline.
8. Stop before modifying files unless the user explicitly approves.

## Output

```text
Feature Summary:
Requirement Gate:
Risk Level:
Assumptions:
Unknowns:
Design Options:
Trade-off Table:
Recommended Option:
Implementation Plan:
Tests Required:
Security Considerations:
Rollback Plan:
Human Approval Required:
```

## V2 Closed-loop Requirements

When this skill is used in a repository with Vibe Guardrails v2 initialized, also check:

- `.guardrails/config.json`
- `.guardrails/gates/*.json`
- `.guardrails/approvals/*.json`
- Git hook status via `vibe-guardrails doctor` when relevant

For Level 2 or Level 3 changes, produce or update a gate artifact. Do not mark the task complete until risk level, required gates, tests, docs impact, rollback plan, and Unknowns are recorded.
