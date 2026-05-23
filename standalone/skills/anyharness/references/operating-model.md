# Operating Model

AnyHarness v3 uses a skill-first model.

## Planes

1. **Reasoning plane**: the skill reads repository evidence, asks questions, and synthesizes a project harness.
2. **Prompt surface plane**: the skill writes native AI instructions such as `CLAUDE.md`, `AGENTS.md`, or Cursor rules after confirmation.
3. **Profile plane**: the skill writes `.anyharness/profile.json` and `.anyharness/profile.md` after confirmation.
4. **Optional enforcement plane**: the skill can generate local scripts, Git hooks, and CI workflows after explicit confirmation.

## No npx-first path

AnyHarness does not require a user-facing `npx` command. Scripts live inside the skill and are implementation details.
