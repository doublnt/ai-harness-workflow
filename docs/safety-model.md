# Safety Model

AnyHarness supports three enforcement modes.

- `advisory`: warn only except for obvious secrets and dangerous actions. Best first-install mode.
- `enforcing`: block dangerous commands, Red Zone changes, invalid commits, and missing L2/L3 gates.
- `strict`: also block docs drift, missing approvals, and incomplete gate summaries.

## Safety rules

- Plugin installation does not modify the repository.
- `init-project` scans first, reports, asks for confirmation, then writes files.
- Existing files are not overwritten; conflicts are written as drafts.
- Hooks are deterministic and local.
- Hooks do not contact the network.
- Real `.env` files are not read.
- Local Git hooks can be bypassed; CI gates are the enforcement backstop.

## Trust model

Hooks should be reviewed before being trusted. Marketplace users should inspect:

```text
plugins/claude/anyharness/hooks/hooks.json
plugins/claude/anyharness/hooks/scripts/anyharness-hook.mjs
plugins/codex/anyharness/hooks/hooks.json
plugins/codex/anyharness/hooks/scripts/anyharness-hook.mjs
```

No hook should execute network commands or silently mutate project state.
