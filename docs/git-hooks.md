# Git Hooks

Install local Git hooks:

```bash
vibe-guardrails install-hooks
```

This writes:

- `.githooks/pre-commit`
- `.githooks/commit-msg`
- `.githooks/pre-push`

and configures:

```bash
git config core.hooksPath .githooks
```

Client-side Git hooks can be bypassed. Use CI for enforcement.
