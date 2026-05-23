# CI Gates

Use `templates/project/github-actions/vibe-guardrails.yml` as a starting point.

CI should run:

```bash
npx vibe-coding-guardrails check --ci
```

CI checks red zone changes, docs drift, secret patterns, gate artifacts, approvals, and release readiness.
