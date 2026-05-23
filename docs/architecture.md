# Architecture

AnyHarness has two planes.

## 1. Native prompt plane

This is what the LLM reads:

```text
CLAUDE.md                       # Claude Code
AGENTS.md                       # Codex
.cursor/rules/anyharness.mdc    # Cursor
skills/*/SKILL.md               # Claude/Codex plugins
prompts/*.md                    # printable prompt templates
```

AnyHarness 2.2 intentionally avoids a custom top-level `ANYHARNESS.md` file.

## 2. Execution harness plane

This is what checks, blocks, and records evidence:

```text
npx anyharness
agent hooks
Git hooks
CI gates
.anyharness/config.json
.anyharness/baselines/project-scan.json
.anyharness/gates/*.json
.anyharness/approvals/*.json
```

## Flow

```text
prompt/skill tells the agent what to do
        ↓
agent writes or proposes changes
        ↓
agent hooks catch unsafe tool use
        ↓
Git hooks validate staged changes and commit messages
        ↓
CI gates validate PRs and merge readiness
        ↓
gate artifacts and approvals preserve evidence
```

## Why native prompt surfaces?

Claude already loads `CLAUDE.md`; Codex already loads `AGENTS.md`; Cursor already loads `.cursor/rules/*.mdc`. Using these files lowers adoption friction and avoids requiring users to teach every agent about another top-level file.
