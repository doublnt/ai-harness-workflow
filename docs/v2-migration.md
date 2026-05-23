# Migration Notes

Previous iterations separated the project into two ideas:

- v1: pure skills, no hooks, no repository enforcement.
- v2: closed-loop harness with hooks, Git hooks, CI gates, gate artifacts, and deterministic checks.

The final package keeps the v2 enforcement core but adds a simpler surface:

```text
harness-core skill
ANYHARNESS.md
EXAMPLES.md
Lite / Project / Harness modes
Cursor lightweight adapter
```

## Migration from skills-only

1. Install the final plugin.
2. Start with `harness-core` for Lite mode.
3. Run `init-project` when you want project-local rules.
4. Enable Harness mode only after reviewing hooks and generated policy.
5. Install Git hooks and CI gates when ready.

## Migration from earlier closed-loop versions

1. Replace old package references such as `anyharness-v2` with `anyharness`.
2. Add `harness-core` to plugin skills.
3. Add `ANYHARNESS.md` and `EXAMPLES.md` to docs.
4. Review hook behavior and `.anyharness/config.json` mode.
5. Run `npm run check`.
