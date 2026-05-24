# Contributing

AnyHarness v3 optimizes for a small user-facing surface and a strong internal
harness generation workflow.

## Guidelines

1. Keep the public interface simple: one main skill, AnyHarness.
2. Put advanced behavior in references and scripts, not in extra user commands.
3. Do not add mandatory CLI setup for normal users.
4. Do not bake in authoritative business domain packs. Domain rules should be
   discovered from the project and confirmed by the user.
5. Deterministic enforcement must read the project-generated harness profile.

## Single-source distribution model

`plugins/claude/anyharness/skills/anyharness/` is the **only directory you edit**.

After making changes, run:

```bash
node scripts/sync-distributions.mjs
```

This propagates `SKILL.md`, all `references/`, and all `scripts/` to the codex and
standalone distributions. Stale files (present in a target but removed from the source)
are automatically deleted.

**Codex SKILL.md override**: if `SKILL.codex.md` exists in the claude source, the sync
script uses it as `SKILL.md` for the codex distribution. This lets the Codex skill be
lighter and tool-calling–focused without forking the reference and script files.

## Adding a new reference file

1. Create it in `plugins/claude/anyharness/skills/anyharness/references/`.
2. Add `## See also` cross-references to related files.
3. Add it to the `## Reference loading` and `## Reference index` sections in `SKILL.md`.
4. Run `node scripts/sync-distributions.mjs`.
5. Run `npm run check`.

## Adding a new script

1. Create it in `plugins/claude/anyharness/skills/anyharness/scripts/`.
2. Follow the I/O contract: JSON to stdout, JSON errors to stderr, exit codes 0/1/2.
3. Write operations must default to draft/dry-run; require `--confirm` to commit.
4. Add the tool declaration to `plugins/codex/anyharness/.codex-plugin/plugin.json` `tools` array.
5. Add the script to the `## Script index` section in `SKILL.md`.
6. Run `node scripts/sync-distributions.mjs`.
7. Add a test case in `test/run.mjs`.
8. Run `npm run check`.

## Validation

`npm run check` runs:
- `scripts/validate.mjs` — structural checks (required files, JSON format, plugin.json schema, distribution sync)
- `test/run.mjs` — behavioral tests (dry-run safety, output contracts, edge cases)
