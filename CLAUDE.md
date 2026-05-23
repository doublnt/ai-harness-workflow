# CLAUDE.md

This repository contains Vibe Coding Guardrails.

Before changing code, Claude Code should read:

- `README.md`
- `GUARDRAILS.md`
- `EXAMPLES.md`
- `docs/architecture.md`
- `docs/hooks.md`
- `src/lib/checks.mjs`
- `plugins/claude/vibe-coding-guardrails/README.md`

Rules for this repository:

1. Keep the project easy to explain: Lite, Project, Harness.
2. Preserve the closed-loop harness: skills + lifecycle hooks + Git hooks + CI gates + gate artifacts.
3. Any hook that can block execution must be deterministic, local, and auditable.
4. Do not add network calls to hooks or checks.
5. Do not read real `.env` files in tests or scanners.
6. Preserve Claude and Codex plugin structures.
7. Keep `guardrails-core` short and behavior-focused.
8. Run `npm run check` before claiming validation passed.
