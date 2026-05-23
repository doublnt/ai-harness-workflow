# Git Hooks

Install local hooks:

```bash
anyharness init --mode enforcing
anyharness install-hooks
```

Hooks:

- `pre-commit`: runs `anyharness check --staged`
- `commit-msg`: enforces risk tags and L2/L3 trailers
- `pre-push`: runs stronger checks before push

Local Git hooks can be bypassed with `--no-verify`; CI gates are the final enforcement layer.
