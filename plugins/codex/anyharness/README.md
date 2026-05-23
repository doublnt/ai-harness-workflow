# AnyHarness for Codex

AnyHarness adds Codex-native `AGENTS.md` instructions, skills, and optional hooks for safer AI-assisted coding.

## Native prompt surface

Codex uses `AGENTS.md` by default. AnyHarness does not require a separate `ANYHARNESS.md` file and does not generate `CODEX.md` by default.

Write or draft Codex instructions:

```bash
npx anyharness prompt --target codex --write
```

## Skills

Ask Codex naturally:

```text
Use AnyHarness to initialize this repository.
Use AnyHarness to review this diff.
Use AnyHarness to prepare a release check.
```

## Closed-loop mode

```bash
npx anyharness new --target codex
```

This enables agent hooks, Git hooks, CI checks, gate artifacts, approvals, and docs drift gates.
