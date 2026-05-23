# Optional Local Enforcement

AnyHarness can generate repo-local scripts, Git hooks, and CI workflows. This is optional.

No global `npx` command is required. Generated hooks can run:

```bash
node .anyharness/scripts/check.mjs
```

This keeps enforcement portable and reviewable in the repository.
