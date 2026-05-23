# LLM injection model

AnyHarness separates the prompt layer from the enforcement layer.

## Native prompt surfaces

AnyHarness 2.2 does not create a custom `ANYHARNESS.md` file. It injects rules through files that AI clients already know how to load:

| Client | Native file |
|---|---|
| Claude Code | `CLAUDE.md` or `.claude/CLAUDE.md` |
| Codex | `AGENTS.md` |
| Cursor | `.cursor/rules/anyharness.mdc` |
| Claude/Codex plugins | `skills/*/SKILL.md` |

The copy-paste prompt still exists:

```bash
npx anyharness prompt --target core
```

But `--target core --write` is intentionally disabled because there is no extra core prompt file to write.

## Enforcement layer

The execution harness uses:

```text
npx anyharness check
agent hooks
Git hooks
CI gates
.anyharness/gates/*.json
.anyharness/approvals/*.json
```

The LLM receives instructions; the harness checks evidence.
