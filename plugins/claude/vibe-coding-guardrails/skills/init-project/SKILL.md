---
name: init-project
description: "Initialize project-specific AI development governance after a read-only scan, workflow detection, and user confirmation."
---


# init-project

Use this skill when the user asks to initialize Vibe Coding Guardrails, set up AI development governance, create Claude/Codex project rules, or adapt this project to an AI coding workflow.

## Required references

Read these plugin resources before acting:

- `../../resources/core-rules.md`
- `../../resources/risk-levels.md`
- `../../resources/file-change-policy.md`
- `../../resources/scan-protocol.md`
- `../../resources/project-output-templates.md`
- `../../resources/spec-kit-compatibility.md`

## Operating mode

Start read-only. Do not create or modify files until the user confirms.

## Process

1. Scan the current repository in read-only mode.
2. Detect AI workflow: Claude, Codex, both, Spec Kit, or other.
3. Detect project facts: stack, build/test/lint commands, CI, docs, database, auth, deployment, and tests.
4. Produce `Project Scan Report` using `scan-protocol.md`.
5. Recommend target format: `claude`, `codex`, `both`, or `speckit-compatible`.
6. Ask at most 10 confirmation questions with recommended defaults.
7. Stop and wait unless the user explicitly provided a yes/auto-confirm mode.
8. After confirmation, generate project-local files using `project-output-templates.md`.
9. Never overwrite existing files. Generate draft patches for conflicts.
10. Print final installation report.

## Confirmation output

Use this structure:

```text
Confirmation Required
Target format:
Project stage:
Risk tolerance:
Data sensitivity:
AI autonomy:
Test gate strictness:
Security gate strictness:
Release gate strictness:
Existing AI files policy:
Generated scope:
```

## Final report

```text
AI Development Governance Installed
Target Format:
Created Files:
Draft Files:
Existing Files Not Modified:
Project Risk Profile:
Required Gates:
Detected Commands:
How To Use:
Remaining Unknowns:
Warning:
```

## V2 Closed-loop Requirements

When this skill is used in a repository with Vibe Guardrails v2 initialized, also check:

- `.guardrails/config.json`
- `.guardrails/gates/*.json`
- `.guardrails/approvals/*.json`
- Git hook status via `vibe-guardrails doctor` when relevant

For Level 2 or Level 3 changes, produce or update a gate artifact. Do not mark the task complete until risk level, required gates, tests, docs impact, rollback plan, and Unknowns are recorded.
