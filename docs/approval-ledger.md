# Approval Ledger

Level 2 and Level 3 tasks require human approval.

Approval records live in:

```text
.guardrails/approvals/<gate-id>.approval.json
```

Use:

```bash
vibe-guardrails gate approve <gate-id> --notes "Approved after security review"
```
