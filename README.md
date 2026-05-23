# Vibe Coding Guardrails

AI coding guardrails that keep changes surgical, require evidence, and block unsafe work.

This repository contains the final version of Vibe Coding Guardrails: a lightweight behavioral skill plus an optional closed-loop governance harness for Claude Code, Codex, Cursor, Git hooks, and CI gates.

## The Problem

AI coding agents often:

- make hidden assumptions;
- over-engineer small tasks;
- touch unrelated files;
- claim tests passed without evidence;
- modify risky files without review;
- leave tests, docs, release plans, or rollback plans behind.

## The Four Rules

1. **Classify Risk First** — identify L0/L1/L2/L3 before coding.
2. **Keep Changes Surgical** — every changed line must trace to the user's request.
3. **Require Evidence** — tests, commands, files, gate artifacts, or explicit untested risks.
4. **Block Unsafe Work** — secrets, migrations, auth, payments, CI/deploy, and production changes require gates and approval.

## Choose Your Mode

| Mode | What it does | Best for |
|---|---|---|
| Lite | Installs the behavior skill only. No hooks, no repository writes. | Solo devs, low-risk repos, quick adoption |
| Project | Generates project-local `GUARDRAILS.md`, `AGENTS.md`/`CLAUDE.md` drafts, risk policy, and gate folders. | Existing projects that want consistent AI workflow |
| Harness | Adds agent hooks, Git hooks, CI gates, gate artifacts, docs drift detection, and commit-message enforcement. | Teams, production apps, high-risk systems |

## What Is Included

- Claude Code plugin with skills and lifecycle hooks.
- Codex plugin with skills and lifecycle hooks.
- Cursor Lite adapter via `.cursor/rules/vibe-guardrails.mdc`.
- `guardrails-core` skill for a concise behavioral entrypoint.
- Project initialization workflow.
- Risk classification, feature planning, design review, implementation planning, code review, test planning, security review, and release checks.
- CLI checker for Git hooks and CI.
- Gate artifacts and approval ledger.
- Docs drift detection.
- Bilingual documentation.

## Install: Claude Code

Add the local marketplace from this repository:

```text
/plugin marketplace add ./path/to/vibe-coding-guardrails-final
/plugin install vibe-coding-guardrails@vibe-guardrails
```

Then use:

```text
/vibe-coding-guardrails:guardrails-core
/vibe-coding-guardrails:init-project
/vibe-coding-guardrails:risk-classify
/vibe-coding-guardrails:new-feature
/vibe-coding-guardrails:design-review
/vibe-coding-guardrails:implementation-plan
/vibe-coding-guardrails:code-review
/vibe-coding-guardrails:test-plan
/vibe-coding-guardrails:security-review
/vibe-coding-guardrails:release-check
```

## Install: Codex

Add the local marketplace:

```text
codex plugin marketplace add ./path/to/vibe-coding-guardrails-final
```

Then install `vibe-coding-guardrails` from the marketplace and invoke naturally:

```text
Use Vibe Coding Guardrails Core for this coding task.
Use Vibe Coding Guardrails to initialize this repository.
Use Vibe Coding Guardrails to review this diff before commit.
```

## Use With Cursor

Copy the Lite rule into your project:

```bash
mkdir -p .cursor/rules
cp plugins/cursor/vibe-coding-guardrails/.cursor/rules/vibe-guardrails.mdc .cursor/rules/vibe-guardrails.mdc
```

Or print it from the CLI:

```bash
node bin/vibe-guardrails.mjs cursor-template
```

## CLI Quick Start

Run locally from this repository:

```bash
node bin/vibe-guardrails.mjs --help
node bin/vibe-guardrails.mjs init --profile project --target detect
node bin/vibe-guardrails.mjs check --staged
```

After npm publishing, use:

```bash
npx vibe-coding-guardrails init --profile harness --target detect --install-hooks
npx vibe-coding-guardrails check --ci
```

## Project Initialization

Recommended first run:

```bash
vibe-guardrails init --profile project --target detect --mode advisory
```

For a team/production repository:

```bash
vibe-guardrails init --profile harness --target both --mode enforcing --install-hooks
vibe-guardrails ci-template --write
```

Initialization creates or drafts:

- `GUARDRAILS.md`
- `.guardrails/config.json`
- `.guardrails/gates/`
- `.guardrails/approvals/`
- `.guardrails/baselines/project-scan.json`
- `AGENTS.md` or `.guardrails/drafts/AGENTS.append.md`
- `CLAUDE.md` or `.guardrails/drafts/CLAUDE.append.md`
- optional Git hooks and GitHub Actions workflow

Existing files are not overwritten. Conflicts are written to `.guardrails/drafts/`.

## Risk Levels

| Level | Meaning | Examples | Gates |
|---|---|---|---|
| L0 | Low risk | docs typo, label change, small style tweak | basic self-check |
| L1 | Normal feature | UI component, ordinary CRUD, local refactor | requirement, review, test |
| L2 | Core or sensitive | auth, authorization, payments, files, user data, external APIs, agent tool permissions | design, security, test, release, approval |
| L3 | Critical or irreversible | migrations, production data, deploy strategy, public API breakage, architecture migration | full design, migration, rollback, CI, explicit approval |

## Closed-loop Harness

The Harness mode adds four layers:

1. **Skills** — tell the AI how to work.
2. **Agent hooks** — block dangerous tool use and incomplete final summaries.
3. **Git hooks** — block bad commits locally.
4. **CI gate** — enforce guardrails at PR/merge time.

Local Git hooks:

```bash
vibe-guardrails install-hooks
```

CI template:

```bash
vibe-guardrails ci-template --write
```

## Commit Message Gate

Default format:

```text
feat(auth): rotate refresh tokens [risk:L2]
```

Level 2/3 commits require trailers:

```text
Risk-Level: L2
Gate-Review: .guardrails/gates/2026-05-23-refresh-token.json
Tests: npm test
Human-Approval: required
Rollback: docs/release/2026-05-23-refresh-token.md
```

## Gate Artifacts

Create a gate:

```bash
vibe-guardrails gate create --task "rotate refresh tokens" --risk L2 --gates design,security,test,release
```

Approve a gate:

```bash
vibe-guardrails gate approve 2026-05-23-rotate-refresh-tokens --notes "Approved after security review."
```

Check status:

```bash
vibe-guardrails gate status
```

## Repository Layout

```text
plugins/claude/vibe-coding-guardrails/   Claude plugin
plugins/codex/vibe-coding-guardrails/    Codex plugin
plugins/cursor/vibe-coding-guardrails/   Cursor Lite rule
src/                                      CLI and deterministic checks
templates/project/                        Git hooks, CI, config, gate schemas
docs/                                     implementation docs
EXAMPLES.md                               bad vs good examples
GUARDRAILS.md                             minimal core rules
```

## Validate This Repository

```bash
npm test
npm run validate
npm run check
```

Expected result:

```text
Validation passed. final Vibe Coding Guardrails layout is valid.
Unit tests passed.
```

## Safety Notes

- Installing the plugin should not modify a target repository.
- Repository files are only written after explicit initialization.
- Existing files are not overwritten; drafts are created instead.
- Hooks should be reviewed and trusted before enabling.
- Local Git hooks can be bypassed, so CI gates are the enforcement backstop.

## Related Files

- [GUARDRAILS.md](./GUARDRAILS.md)
- [EXAMPLES.md](./EXAMPLES.md)
- [README.zh-CN.md](./README.zh-CN.md)
- [docs/hooks.md](./docs/hooks.md)
- [docs/git-hooks.md](./docs/git-hooks.md)
- [docs/ci-gates.md](./docs/ci-gates.md)
