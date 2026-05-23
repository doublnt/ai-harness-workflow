# Migration notes for AnyHarness 2.2

AnyHarness 2.2 keeps the native prompt surface model from 2.1 and adds one-command onboarding shortcuts.

## From 2.1 to 2.2

### New project

Before, the README showed a two-step harness setup:

```bash
npx anyharness init --profile harness --target both --mode enforcing --install-hooks
npx anyharness ci-template --write
```

Now use:

```bash
npx anyharness new
```

`new` is the new-project shortcut. It initializes harness mode, writes/drafts Claude and Codex native prompt surfaces, installs Git hooks, and writes/drafts the CI workflow.

### Existing project

Use:

```bash
npx anyharness adopt
```

`adopt` is intentionally safe by default. It uses project profile + advisory mode, scans the repo, writes `.anyharness/config.json`, stores a scan baseline, and drafts native prompt changes instead of overwriting existing `CLAUDE.md` or `AGENTS.md`.

Preview first:

```bash
npx anyharness adopt --dry-run
```

Enable harness mode for an existing project after review:

```bash
npx anyharness adopt --enforce
```

## Still supported

The low-level commands still exist:

```bash
npx anyharness init --profile harness --target both --mode enforcing --install-hooks
npx anyharness ci-template --write
```

However, `ci-template --write` is now an advanced regeneration command. Harness init writes or drafts the CI workflow by default unless `--no-ci` is used.
