---
name: security-review
description: "Run a security gate for auth, authorization, user input, file upload, secrets, webhooks, external URLs, or AI tool-calling changes."
---


# security-review

Use this skill for any security-sensitive work.

## Required references

- `../../resources/core-rules.md`
- `../../resources/risk-levels.md`
- `../../resources/gates.md`
- `../../resources/stack-checklists.md`

## Trigger conditions

Run this skill if the task touches:

- authentication
- authorization
- user input
- file upload
- external URLs
- webhooks
- payment
- user data
- secrets
- tokens
- sessions
- cookies
- AI tool calling
- LLM input/output

## Process

1. Identify assets.
2. Identify actors.
3. Identify trust boundaries.
4. Identify entry points.
5. Identify threats and abuse cases.
6. Identify mitigations.
7. Identify required security tests.
8. Produce verdict.

## Output

```text
Security Scope:
Risk Level:
Assets:
Actors:
Trust Boundaries:
Entry Points:
Threats:
Abuse Cases:
Required Mitigations:
Security Tests:
Logging/Data Leakage Concerns:
Unknowns:
Verdict: Pass / Needs Changes / Blocked
```

If security-critical Unknowns remain, do not return Pass.

## V2 Closed-loop Requirements

When this skill is used in a repository with Vibe Guardrails v2 initialized, also check:

- `.guardrails/config.json`
- `.guardrails/gates/*.json`
- `.guardrails/approvals/*.json`
- Git hook status via `vibe-guardrails doctor` when relevant

For Level 2 or Level 3 changes, produce or update a gate artifact. Do not mark the task complete until risk level, required gates, tests, docs impact, rollback plan, and Unknowns are recorded.
