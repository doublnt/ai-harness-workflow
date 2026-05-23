# Vibe Coding Guardrails v2

Closed-loop governance guardrails for AI-assisted coding.

V2 upgrades the v1 pure-skills package into a **governance harness**:

- Claude Code plugin with skills and lifecycle hooks
- Codex plugin with skills and lifecycle hooks
- deterministic `vibe-guardrails` CLI checker
- Git hooks: `pre-commit`, `commit-msg`, `pre-push`
- CI gate template
- machine-readable `.guardrails/gates/*.json` artifacts
- human approval ledger under `.guardrails/approvals/`
- docs drift, Red Zone, secret, tests, and commit-message gates

## Scope

V2 intentionally does not ship MCP servers or app connectors. It is a local governance and enforcement layer.

## Install as a Claude plugin

Add this repository as a marketplace and install the plugin:

```text
/plugin marketplace add ./path/to/vibe-coding-guardrails-v2
/plugin install vibe-coding-guardrails@vibe-guardrails
```

Then use:

```text
/vibe-coding-guardrails:init-project
/vibe-coding-guardrails:code-review
/vibe-coding-guardrails:test-plan
/vibe-coding-guardrails:release-check
```

## Install as a Codex plugin

```text
codex plugin marketplace add ./path/to/vibe-coding-guardrails-v2
```

Then install `vibe-coding-guardrails` from the `vibe-guardrails` marketplace and ask Codex:

```text
Use Vibe Coding Guardrails to initialize this repository.
Use Vibe Coding Guardrails to review this diff.
```

## CLI usage

```bash
npm install -g vibe-coding-guardrails
vibe-guardrails init
vibe-guardrails install-hooks
vibe-guardrails check --staged
vibe-guardrails commit-msg .git/COMMIT_EDITMSG
vibe-guardrails check --ci
```

Local development:

```bash
node ./bin/vibe-guardrails.js init --dry-run
node ./bin/vibe-guardrails.js check --staged
```

## Gate artifacts

Level 2 and Level 3 changes require `.guardrails/gates/*.json` artifacts. Example:

```json
{
  "id": "2026-05-23-auth-change",
  "task": "Rotate refresh tokens",
  "riskLevel": "L2",
  "changedFiles": ["src/auth/session.ts"],
  "requiredGates": ["design", "security", "test"],
  "completedGates": ["design", "security", "test"],
  "humanApprovalRequired": true,
  "humanApprovalStatus": "approved",
  "tests": { "planned": ["unit", "integration"], "commands": ["npm test"], "status": "passed" },
  "docsImpact": { "status": "none", "justification": "Internal token logic only; public docs unchanged." },
  "rollbackPlan": "docs/release/2026-05-23-auth-change.md",
  "unknowns": []
}
```

## Risk levels

- `L0`: docs, copy, simple style-only changes
- `L1`: normal code changes and ordinary features
- `L2`: auth, authorization, security, database, payments, AI workflow, release-sensitive changes
- `L3`: irreversible data, production, architecture, deployment, or migration changes

## Commit messages

Use conventional commits with a risk tag:

```text
feat(auth): rotate refresh tokens [risk:L2]

Risk-Level: L2
Gate-Review: .guardrails/gates/2026-05-23-auth-change.json
Tests: npm test
Human-Approval: required
Rollback: docs/release/2026-05-23-auth-change.md
```

## Validation

```bash
npm test
npm run validate
npm run check
```

## Safety model

Agent hooks are helpful but not sufficient. Git hooks are local and can be bypassed with `--no-verify`. CI gates are the final enforcement layer. Vibe Guardrails v2 is designed around all three.
