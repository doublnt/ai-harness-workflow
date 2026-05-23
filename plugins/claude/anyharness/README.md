# AnyHarness for Claude Code

AnyHarness is a Claude Code plugin that adds AI development guardrails through skills and optional lifecycle hooks.

## Commands

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

## Beginner path

1. Install the plugin.
2. Start with `/anyharness:harness-core`.
3. Ask Claude to keep changes surgical and show tests/Unknowns.
4. Run `/anyharness:init-project` only when you want project-local rules.

## New project

```text
/anyharness:init-project
```

Choose `Project` mode first, or `Harness` mode when you want hooks, Git hooks, CI gates, gate artifacts, approvals, and docs-drift checks.

## Existing project

Run `init-project`, review the scan report, and start in `advisory` mode. Existing `CLAUDE.md` files are not overwritten; AnyHarness creates draft append files.

## Safety

Installing the plugin does not modify your repository. Hooks should be reviewed and trusted before use.
