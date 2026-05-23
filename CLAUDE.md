# CLAUDE.md

This repository is **AnyHarness v2.2**.

AnyHarness uses native AI client instruction files instead of a custom `ANYHARNESS.md` file:

- Claude Code reads this `CLAUDE.md`.
- Codex reads `AGENTS.md`.
- Cursor reads `.cursor/rules/anyharness.mdc`.
- Plugins provide AnyHarness skills.

AnyHarness is npx-first for enforcement: `npx anyharness` scans, writes native prompt surfaces, installs Git hooks, runs CI gates, validates commit messages, checks docs drift, and manages gate artifacts.

## Main user-facing commands

- `npx anyharness new` — new project, full harness in one command.
- `npx anyharness adopt` — existing project, safe advisory adoption in one command.
- `npx anyharness adopt --enforce` — existing project, full harness after review.

Required behavior:

1. Classify risk first.
2. Keep changes surgical.
3. Do not claim tests passed unless they were actually run.
4. Update bilingual docs for user-facing changes.
5. Run `npm run check` before completion.
