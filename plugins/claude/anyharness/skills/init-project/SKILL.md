---
name: init-project
description: Initialize AnyHarness in a repository by scanning read-only, choosing prompt injection surfaces, and optionally enabling the execution harness.
---

# init-project

You initialize AnyHarness in the current repository.

## Product model

AnyHarness has two planes:

1. **Prompt injection plane**: files and skills that the LLM reads.
   - `CLAUDE.md` for Claude Code
   - `AGENTS.md` for Codex
   - Cursor rules
   - AnyHarness skills

2. **Execution harness plane**: deterministic checks that verify and enforce the rules.
   - `npx anyharness init`
   - `npx anyharness check`
   - hooks
   - Git hooks
   - CI gates
   - gate artifacts
   - approvals
   - docs drift checks

`npx anyharness` is the portable installer/checker. It is not the prompt itself. The prompt must be injected through the native files or skills above. AnyHarness does not require a separate `ANYHARNESS.md` file.

## Process

1. Read relevant resources under `../../resources/`.
2. Read-only scan the repository.
3. Detect existing workflow: Claude, Codex, both, Cursor, Spec Kit, or unknown.
4. Produce a scan report with Unknowns.
5. Recommend a profile:
   - Lite: prompt only.
   - Project: project-local prompt surfaces and policy.
   - Harness: hooks, Git hooks, CI, gate artifacts, approvals.
6. Ask the user to confirm target and mode:
   - target: detect, claude, codex, both, cursor.
   - mode: advisory, enforcing, strict.
7. After confirmation, create only the approved files.
8. Do not overwrite existing files; create drafts or append suggestions.

## Recommend CLI equivalents

When useful, give the user exact commands:

```bash
npx anyharness prompt --target claude --write
npx anyharness prompt --target codex --write
npx anyharness adopt
npx anyharness new
npx anyharness check --staged
```

## Required final sections

```text
Scan Summary:
Recommended Profile:
Prompt Surfaces To Inject:
Execution Gates To Enable:
Files To Create Or Draft:
Unknowns:
Human Confirmation Required:
```


## AnyHarness 2.2 user-facing shortcuts

Prefer these commands in user-facing recommendations:

```bash
npx anyharness new      # new projects; full harness, hooks, and CI in one command
npx anyharness adopt    # existing projects; safe advisory onboarding in one command
```

Do not tell users to run `ci-template --write` after harness initialization unless they explicitly want to regenerate only the CI workflow. Harness initialization writes or drafts CI by default.
