# Final design

AnyHarness 2.2 is a native-prompt, npx-enforced AI coding harness.

It consists of:

- native instruction files: `CLAUDE.md`, `AGENTS.md`, Cursor rules;
- plugin skills for Claude and Codex;
- optional agent hooks;
- a deterministic `npx anyharness` CLI;
- Git hooks and CI gates;
- gate artifacts and approval records under `.anyharness/`.

The design intentionally avoids a separate top-level AnyHarness prompt file. Prompt injection should happen through the AI client's native mechanism.
