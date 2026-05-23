# Contributing

Run:

```bash
npm test
node bin/anyharness.mjs doctor
```

For hook changes, update:

- `docs/hooks.md`
- `docs/safety-model.md`
- plugin README files
- validation tests

Use Conventional Commits with a risk tag:

```text
feat(cli): add docs drift gate [risk:L1]
```
