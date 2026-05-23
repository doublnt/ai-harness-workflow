# Architecture

Vibe Coding Guardrails has a simple surface and a closed-loop enforcement core.

```text
Lite skill          -> improve AI behavior without repo changes
Project rules       -> generate CLAUDE.md / AGENTS.md / GUARDRAILS.md
Agent hooks         -> interrupt risky tool use and incomplete turns
Git hooks           -> block bad commits locally
CLI checker         -> deterministic policy engine
Gate artifacts      -> machine-readable governance state
CI gates            -> PR / merge enforcement backstop
```

The design separates model reasoning from deterministic enforcement.

- Skills help the agent think, plan, review, test, and explain.
- Hooks interrupt unsafe agent actions while work is happening.
- Git hooks catch issues before local commit or push.
- CI gates catch issues even if local hooks are bypassed.
- Gate artifacts and approval records make L2/L3 decisions auditable.

## Layers

### Layer 1 — Lite

A compact `guardrails-core` skill and `GUARDRAILS.md` file.

Use this when you only need behavioral guidance:

```text
Classify Risk First
Keep Changes Surgical
Require Evidence
Block Unsafe Work
```

### Layer 2 — Project

Project-local AI instructions:

```text
CLAUDE.md
AGENTS.md
GUARDRAILS.md
.guardrails/config.json
```

Use this when a repository needs stable rules across coding agents.

### Layer 3 — Harness

Closed-loop enforcement:

```text
Agent lifecycle hooks
Git hooks
CI gate
Gate artifacts
Approval ledger
Docs drift checker
```

Use this for teams, production systems, and sensitive code.
