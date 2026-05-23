---
name: risk-classify
description: "Classify the engineering risk of a requested change and list required gates before implementation."
---


# risk-classify

Use this skill when a user asks whether a task is safe, how risky a change is, or which review gates are required before implementation.

## Required references

- `../../resources/core-rules.md`
- `../../resources/risk-levels.md`
- `../../resources/file-change-policy.md`

## Process

1. Restate the task.
2. Identify touched domains: UI, API, database, auth, security, CI, deployment, production data, AI tools.
3. Apply escalation rules from `risk-levels.md`.
4. Identify red-zone files or decisions.
5. Output required gates.
6. State Unknowns and whether they affect the verdict.

## Output

```text
Risk Level:
Reason:
Required Gates:
Human Approval Required:
Likely Files Affected:
Red Zone Concerns:
Assumptions:
Unknowns:
Next Step:
```

Do not implement.

## V2 Closed-loop Requirements

When this skill is used in a repository with Vibe Guardrails v2 initialized, also check:

- `.guardrails/config.json`
- `.guardrails/gates/*.json`
- `.guardrails/approvals/*.json`
- Git hook status via `vibe-guardrails doctor` when relevant

For Level 2 or Level 3 changes, produce or update a gate artifact. Do not mark the task complete until risk level, required gates, tests, docs impact, rollback plan, and Unknowns are recorded.
