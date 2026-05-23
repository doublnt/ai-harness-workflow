# Modes

AnyHarness has three adoption modes.

## Lite

Lite mode is one behavioral layer: `harness-core` plus optional Cursor rule. It does not install hooks and does not modify the repository during plugin install.

Use Lite when:

- the project is exploratory;
- risk is low;
- you only want better AI behavior;
- you are not ready for hard gates.

## Project

Project mode adds repository-local instructions such as `CLAUDE.md`, `AGENTS.md`, and governance references.

Use Project mode when:

- multiple agents or developers work in the same repo;
- you need consistent AI behavior;
- you want the rules committed to the project.

## Harness

Harness mode adds enforcement:

- agent lifecycle hooks;
- Git hooks;
- CI checks;
- docs drift detection;
- commit message gates;
- gate artifacts;
- approval ledger.

Use Harness mode when:

- the project is production-facing;
- the AI may touch user data, auth, payments, migrations, or deployment;
- the team needs auditability.
