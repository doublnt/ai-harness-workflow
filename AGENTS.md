# AGENTS.md

This repository builds an AI development governance bootstrapper.

## Core rules for agents working in this repo

1. Do not add external runtime dependencies without a specific reason.
2. Keep the CLI dependency-free unless the trade-off is justified.
3. Do not generate a `.ai/` directory in target projects.
4. Preserve target-specific output formats for Claude Code, Codex, and Spec Kit.
5. Treat scanner output as best-effort inference; unknowns must remain `Unknown`.
6. Do not overwrite existing files in generated target repositories.
7. Tests must cover scanner and generator behavior.
8. Do not claim generated output was tested unless tests were actually run.

## Red-zone files in this repository

Changes to these require careful review:

- `src/generator.js`
- `src/templates/*.js`
- `src/scanner.js`
- `bin/vibe-guardrails.js`
- `package.json`
- `.github/workflows/ci.yml`

## Expected checks

Run:

~~~bash
npm test
npm run lint
~~~
