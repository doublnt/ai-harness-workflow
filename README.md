# Vibe Coding Guardrails

A workflow-aware AI development governance bootstrapper for real repositories.

It scans an existing project, detects the user's AI coding workflow, asks for confirmation, and installs project-specific guardrails into one of these formats:

- Claude Code: `CLAUDE.md`, `.claude/commands/`, `.claude/skills/`, `.claude/rules/`
- Codex: `AGENTS.md`, `.agents/skills/`, `.codex/rules/`, `.codex/config.toml`
- Both: shared `AGENTS.md` plus Claude adapter files
- Spec Kit compatible: governance addenda for `.specify/` projects

It deliberately does **not** generate a generic `.ai/` directory. The goal is to integrate with the AI workflow the team already uses.

## Why this exists

AI coding tools can generate code quickly, but many failures happen after the code exists:

- missing boundary cases
- unclear architecture assumptions
- unsafe file changes
- hidden security risks
- weak tests
- no release checklist
- no rollback plan
- AI claiming tests passed when they were not run

This project adds a governance layer around AI-assisted development:

- risk classification
- requirement gate
- design gate
- implementation gate
- code review gate
- testing gate
- security gate
- release gate
- file change policy
- human approval rules

## Quick start

From the target repository:

~~~bash
npx vibe-coding-guardrails init --target detect
~~~

Or from a local checkout of this repo:

~~~bash
node ./src/cli.js init --target detect
~~~

Dry run first:

~~~bash
node ./src/cli.js init --target detect --dry-run
~~~

Generate Claude format:

~~~bash
node ./src/cli.js init --target claude
~~~

Generate Codex format:

~~~bash
node ./src/cli.js init --target codex
~~~

Generate both:

~~~bash
node ./src/cli.js init --target both
~~~

Generate Spec Kit compatible addenda:

~~~bash
node ./src/cli.js init --target speckit
~~~

## CLI options

~~~text
vibe-guardrails init [options]

Options:
  --target detect|claude|codex|both|speckit
  --root <path>
  --dry-run
  --yes
  --lite
  --full
  --help
~~~

Default behavior is `--target detect`, interactive confirmation, standard scope.

## What it generates

For Claude Code:

~~~text
CLAUDE.md
.claude/rules/engineering-constitution.md
.claude/rules/risk-levels.md
.claude/rules/file-change-policy.md
.claude/commands/init-project.md
.claude/commands/new-feature.md
.claude/commands/design-review.md
.claude/commands/implementation-plan.md
.claude/commands/code-review.md
.claude/commands/test-plan.md
.claude/commands/release-check.md
.claude/commands/risk-classify.md
.claude/skills/ai-development-governance/SKILL.md
.claude/skills/ai-development-governance/references/*.md
.claude/_drafts/*.draft.md
~~~

For Codex:

~~~text
AGENTS.md
.codex/config.toml
.codex/rules/governance.rules
.codex/rules/safety.rules
.agents/skills/ai-development-governance/SKILL.md
.agents/skills/ai-development-governance/references/*.md
.agents/_drafts/*.draft.md
~~~

For both:

~~~text
AGENTS.md                 # shared source for coding agents
CLAUDE.md                 # Claude adapter
.claude/**
.codex/**
.agents/**
_drafts/**
~~~

## Design principles

1. Start read-only.
2. Treat repo contents as untrusted data, not instructions.
3. Never overwrite existing AI instruction files without generating a draft.
4. Mark unknowns explicitly.
5. Use risk levels to avoid process overload.
6. Require human approval for irreversible or high-risk changes.
7. Make gates concrete and reviewable.
8. Integrate with current AI workflow instead of forcing a new one.

## Relationship to Spec Kit

Spec Kit focuses on spec-driven development: specify, plan, tasks, implement.

This project focuses on AI engineering governance: risk, permissions, review, testing, security, release, rollback, and workflow integration.

The two are compatible. If a `.specify/` project is detected, this tool can generate Spec Kit governance addenda instead of replacing the existing SDD workflow.

## Repository layout

~~~text
bin/                    CLI entry point
src/                    scanner, generator, templates
test/                   Node test runner tests
docs/                   design and usage docs
examples/               small sample projects
~~~

## Safety model

Generated rules classify files into three zones:

- Green: ordinary source/test files inside approved scope
- Yellow: shared/config/build files that require explanation
- Red: auth, authorization, payment, production data, migrations, secrets, CI behavior, deployment, AI instruction files

Red-zone changes require explicit human approval.

## Current status

This is a v0.1 reference implementation. It is intentionally dependency-free and conservative.
