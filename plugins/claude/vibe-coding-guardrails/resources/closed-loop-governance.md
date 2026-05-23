# Closed-loop Governance Model

Vibe Coding Guardrails v2 has four enforcement layers:

1. **Skills**: reasoning workflows for requirements, design, review, testing, security, and release readiness.
2. **Agent hooks**: lifecycle hooks that block dangerous tool use and require closing summaries.
3. **Git hooks**: pre-commit, commit-msg, and pre-push checks for all developers.
4. **CI gates**: deterministic checks that catch bypassed local hooks.

The system is intentionally conservative for Red Zone changes:

- database migrations
- authentication and authorization
- payment and production data
- security controls
- deployment and CI configuration
- AI workflow instructions and hook config

These changes require gate artifacts and, for L2/L3 risk, human approval records.
