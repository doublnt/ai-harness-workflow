# Hooks

The final harness includes Claude and Codex lifecycle hooks.

## Events

- `UserPromptSubmit`: adds guardrail context for high-risk prompts.
- `PreToolUse`: blocks or asks before dangerous commands and Red Zone file changes.
- `PermissionRequest`: repeats the same guard at permission time when supported.
- `Stop`: blocks final responses in enforcing/strict mode if they lack required gate summary sections.

## What hooks block

Examples:

```text
rm -rf
git push
installing dependencies
reading real .env files
editing migrations without approval
editing auth/security/payment files without gates
editing CLAUDE.md / AGENTS.md / agent config files without approval
```

## Safety

Hooks do not access the network. They read hook JSON from stdin and project-local `.anyharness/config.json` only.

## Modes

- `advisory`: warn.
- `enforcing`: block Red Zone and dangerous operations.
- `strict`: block missing summaries and unresolved gate state more aggressively.
