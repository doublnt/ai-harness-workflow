# Usage

## Init a project

~~~bash
vibe-guardrails init --target detect
~~~

The command performs a read-only scan first, then reports:

- detected AI workflow
- recommended target
- project facts
- engineering gates
- risk signals
- unknowns
- proposed files

Unless `--yes` is provided, it asks for confirmation before writing files.

## Targets

### Claude

~~~bash
vibe-guardrails init --target claude
~~~

Creates Claude Code instructions, commands, rules, and skill files.

### Codex

~~~bash
vibe-guardrails init --target codex
~~~

Creates Codex-compatible `AGENTS.md`, `.agents/skills/`, `.codex/config.toml`, and `.codex/rules/`.

### Both

~~~bash
vibe-guardrails init --target both
~~~

Creates a shared `AGENTS.md` plus Claude adapter files.

### Spec Kit

~~~bash
vibe-guardrails init --target speckit
~~~

Creates governance addenda for existing Spec Kit projects.

## Existing files

Existing files are not overwritten. Generated replacement content is written into a draft file.
