# V2 Closed-loop Design

Vibe Coding Guardrails v2 adds enforcement to the v1 skills-only distribution.

## Layers

1. Agent lifecycle hooks block dangerous tool use and require closing summaries.
2. Git hooks block commits that skip risk tags, docs drift checks, gate artifacts, approval ledger, tests, or secret scanning.
3. CI gates provide server-side enforcement for pull requests and protected branches.
4. Skills remain the reasoning interface for requirements, design, review, test planning, security review, and release readiness.

## Why gate artifacts exist

Hooks need state. Gate artifacts are machine-readable records that tell the checker which gates are required and completed.
