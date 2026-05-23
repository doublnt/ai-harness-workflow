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
