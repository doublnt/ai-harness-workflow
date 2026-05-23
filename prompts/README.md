# AnyHarness Prompts

These files are LLM-facing prompt surfaces.

They are meant to be injected into coding agents through one of these mechanisms:

- Claude Code: `CLAUDE.md` or `/anyharness:*` plugin skills.
- Codex and compatible agents: `AGENTS.md` or AnyHarness skills.
- Cursor: `.cursor/rules/anyharness.mdc`.
- Manual use: copy the core prompt into a chat or agent instruction field.

`npx anyharness` is not the prompt. It is the portable bootstrapper and deterministic checker that installs these prompt surfaces and enforces them with hooks, Git hooks, CI gates, gate artifacts, approvals, and docs drift checks.

Useful commands:

```bash
npx anyharness prompt --target core
npx anyharness prompt --target claude --write
npx anyharness prompt --target codex --write
npx anyharness prompt --target cursor --write
npx anyharness prompt --target all --write
```
