---
name: implementation-plan
description: "Create a scoped implementation plan before editing files, including files to change, files not to touch, dependencies, tests, and rollback."
---


# implementation-plan

Use this skill before modifying files.

## Required references

- `../../resources/core-rules.md`
- `../../resources/risk-levels.md`
- `../../resources/file-change-policy.md`
- `../../resources/gates.md`

## Process

1. Restate task and approved scope.
2. Classify risk.
3. Identify green/yellow/red-zone files.
4. List files to modify and why.
5. List files not to touch.
6. List dependencies and migrations, if any.
7. List tests to add or update.
8. Identify rollback strategy.

## Rules

- Do not write code.
- Do not expand scope.
- Do not modify red-zone files without approval.
- Do not introduce dependencies without justification.

## Output

```text
Task:
Risk Level:
Approved Scope:
Files To Modify:
Files To Create:
Files Not To Touch:
Step-by-step Plan:
Dependencies:
Migration Required:
Tests To Add Or Update:
Rollback Plan:
Unknowns:
Human Approval Required:
```

## V2 Closed-loop Requirements

When this skill is used in a repository with Vibe Guardrails v2 initialized, also check:

- `.guardrails/config.json`
- `.guardrails/gates/*.json`
- `.guardrails/approvals/*.json`
- Git hook status via `vibe-guardrails doctor` when relevant

For Level 2 or Level 3 changes, produce or update a gate artifact. Do not mark the task complete until risk level, required gates, tests, docs impact, rollback plan, and Unknowns are recorded.
