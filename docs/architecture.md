# Architecture

AnyHarness v3 is skill-first.

```text
Plugin / Skill
  ├─ SKILL.md: public workflow and routing
  ├─ references/: deep instructions and schemas
  └─ scripts/: optional deterministic helpers

Project outputs
  ├─ CLAUDE.md / AGENTS.md / Cursor rule
  ├─ .anyharness/profile.json
  ├─ .anyharness/packets/
  └─ optional local enforcement files
```

The skill performs reasoning and synthesis. Scripts assist with scanning, diff collection, profile writing, packet generation, and optional local hooks.
