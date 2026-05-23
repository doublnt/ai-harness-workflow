# Native Prompt Surfaces

AnyHarness should use native files instead of a branded root prompt file.

## Supported surfaces

- `CLAUDE.md` for Claude Code
- `AGENTS.md` for Codex and compatible coding agents
- `.cursor/rules/anyharness.mdc` for Cursor

## Existing files

If a target file already exists:

1. Do not overwrite it.
2. Create a draft under `.anyharness/drafts/`.
3. Explain how to merge it.
