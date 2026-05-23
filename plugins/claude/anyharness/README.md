# AnyHarness for Claude Code

AnyHarness adds native Claude Code prompt rules, skills, and optional hooks for safer AI-assisted coding.

## Native prompt surface

Claude Code uses `CLAUDE.md` or `.claude/CLAUDE.md`. AnyHarness does not require a separate `ANYHARNESS.md` file.

Write or draft Claude instructions:

```bash
npx anyharness prompt --target claude --write
```

## Skills

```text
/anyharness:harness-core
/anyharness:init-project
/anyharness:risk-classify
/anyharness:new-feature
/anyharness:design-review
/anyharness:implementation-plan
/anyharness:code-review
/anyharness:test-plan
/anyharness:security-review
/anyharness:release-check
```

## Closed-loop mode

```bash
npx anyharness new --target claude
```

This enables agent hooks, Git hooks, CI checks, gate artifacts, approvals, and docs drift gates.
