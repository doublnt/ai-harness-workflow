# AGENTS.md

This repository is **AnyHarness v2.2**.

AnyHarness has two planes:

```text
Native prompt surfaces = instructions the LLM reads
npx anyharness        = deterministic scanner, installer, checker, and gate runner
```

## Main user-facing commands

- `npx anyharness new` — one-command setup for a new project: native prompt surfaces, Git hooks, CI gate, `.anyharness` state.
- `npx anyharness adopt` — one-command safe adoption for an existing project: advisory mode, draft-first, no hooks or CI.
- `npx anyharness adopt --enforce` — full harness setup for an existing project after review.

## Native prompt surfaces

AnyHarness deliberately avoids a custom top-level `ANYHARNESS.md` file. Use the instruction file that your AI client already loads:

- Codex: `AGENTS.md`
- Claude Code: `CLAUDE.md` or `.claude/CLAUDE.md`
- Cursor: `.cursor/rules/anyharness.mdc`
- Plugin clients: AnyHarness skills

## Development rules

1. Keep changes surgical.
2. Update both English and Chinese docs when changing user-facing behavior.
3. If adding a CLI command, update README, README.zh-CN, CLI help, tests, and REPO_CONTENTS.
4. Do not weaken Red Zone, commit, docs-drift, or gate artifact checks without explaining the trade-off.
5. Run `npm run check` before finalizing.
