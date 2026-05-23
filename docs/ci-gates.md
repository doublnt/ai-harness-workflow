# CI Gates

Use `templates/project/github-actions/anyharness.yml` as a starting point.

CI should run:

```bash
npx anyharness check --ci
```

CI checks red zone changes, docs drift, secret patterns, gate artifacts, approvals, and release readiness.
