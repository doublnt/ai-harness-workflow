# Gate Runtime

AnyHarness can optionally generate local runtime files. This is not required for skill-only use.

## Optional generated files

```text
.anyharness/scripts/check.mjs
.githooks/pre-commit
.githooks/commit-msg
.github/workflows/anyharness.yml
```

## Principle

The skill generates project-specific rules. Runtime scripts enforce those rules deterministically.

## Confirmation required

Never generate or install local hooks, Git hooks, or CI workflows without explicit user confirmation.
