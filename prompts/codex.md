# AGENTS.md

This repository uses AnyHarness.

Codex reads `AGENTS.md` as its project-native instruction surface. Do not require a separate `ANYHARNESS.md` file. If a team wants another filename, configure Codex fallback filenames explicitly; the default Codex path is `AGENTS.md`.

## Product model

AnyHarness has two planes:

1. **Prompt injection plane**: this `AGENTS.md`, Codex skills, and project instructions tell the LLM how to behave.
2. **Execution harness plane**: `npx anyharness`, hooks, Git hooks, CI checks, gate artifacts, and approvals verify and enforce the rules.

## Core behavior

Before implementation:

1. Classify risk: L0 / L1 / L2 / L3.
2. Keep changes surgical and avoid unrelated refactors.
3. State assumptions and Unknowns.
4. Do not modify Red Zone files without approval.
5. Do not claim tests passed unless they were actually run.
6. For L2/L3 work, create or reference gate artifacts under `.anyharness/gates/`.

Use AnyHarness skills for planning, design review, implementation planning, code review, test planning, security review, and release checks.

For non-trivial work, end with:

```text
Risk Level:
Assumptions:
Unknowns:
Files Changed:
Tests:
Security Considerations:
Docs Impact:
Rollback Plan:
Human Approval Required:
```
