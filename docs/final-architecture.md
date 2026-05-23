# Final Architecture

AnyHarness uses a simple surface and a closed-loop core.

## Surface

- `ANYHARNESS.md`
- `harness-core` skill
- `EXAMPLES.md`
- Lite adapters for Claude, Codex, and Cursor

## Core

- project initialization
- risk classification
- gate artifacts
- approval ledger
- agent lifecycle hooks
- Git hooks
- CI gates
- docs drift detection
- commit message validation

The design goal is to make the first interaction feel as simple as a coding guideline while allowing production teams to enable hard enforcement.
