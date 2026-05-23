# CI Gates

Generate a GitHub Actions workflow:

```bash
vibe-guardrails ci-template --write
```

The CI gate runs:

```bash
npx vibe-coding-guardrails check --ci
```

Use it on pull requests to catch bypassed local hooks.
