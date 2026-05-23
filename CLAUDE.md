# CLAUDE.md

This repository contains AnyHarness v3, a skill-first adaptive engineering harness.

When working in this repo:

1. Preserve the one-skill public surface: users should start with AnyHarness.
2. Do not reintroduce `npx anyharness` as the normal user path.
3. Domain rules must be generated from repository evidence and user confirmation;
   examples are only seeds, not authoritative rules.
4. Keep scripts optional and invoked from the skill workflow.
5. Plugin installation must not modify the user's repository.
6. If local enforcement is enabled, generated scripts must be repo-local and reviewable.
