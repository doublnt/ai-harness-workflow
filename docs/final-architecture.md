# Final architecture

```text
Native prompt surfaces
  ├─ CLAUDE.md
  ├─ AGENTS.md
  ├─ .cursor/rules/anyharness.mdc
  └─ plugin skills

Execution harness
  ├─ npx anyharness
  ├─ agent hooks
  ├─ Git hooks
  ├─ CI gates
  ├─ docs drift checker
  ├─ commit message checker
  └─ .anyharness artifacts
```

AnyHarness does not require a custom top-level prompt file. The only project-specific AnyHarness directory is `.anyharness/`, which stores enforcement state and drafts.
