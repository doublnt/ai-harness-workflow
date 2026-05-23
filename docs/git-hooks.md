# Git Hooks

Install local hooks:

```bash
vibe-guardrails init --mode enforcing
vibe-guardrails install-hooks
```

Hooks:

- `pre-commit`: runs `vibe-guardrails check --staged`
- `commit-msg`: enforces risk tags and L2/L3 trailers
- `pre-push`: runs stronger checks before push

Local Git hooks can be bypassed with `--no-verify`; CI gates are the final enforcement layer.
