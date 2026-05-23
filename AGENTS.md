# AGENTS.md

This repository builds AI Harness Guardrails, an installable AI coding guardrails plugin plus optional closed-loop harness.

## Required context

Before changing this repository, read:

- `README.md`
- `GUARDRAILS.md`
- `EXAMPLES.md`
- `docs/architecture.md`
- `docs/safety-model.md`
- `plugins/claude/ai-harness-guardrails/`
- `plugins/codex/ai-harness-guardrails/`

## Development rules

1. Keep the lightweight surface simple: `guardrails-core`, `GUARDRAILS.md`, and examples must remain easy to understand.
2. Keep the enforcement core deterministic: hooks and CLI checks must not depend on network calls.
3. Do not read real `.env` files in scanners, tests, or hooks.
4. Preserve Claude and Codex plugin structures.
5. Keep Cursor support as a lightweight adapter unless a separate design document is added.
6. Do not add MCP servers, app connectors, or auto-running background services without explicit design review.
7. Run `npm run check` before claiming the repository is valid.

## Risk rules

- Plugin manifest, hook, CLI, and security-check changes are L2.
- Changes that alter blocking behavior are L2 or L3 depending on impact.
- Marketplace metadata and README changes are usually L1.
