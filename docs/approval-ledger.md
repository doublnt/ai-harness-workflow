# Approval Ledger

Level 2 and Level 3 tasks require human approval.

Approval records live in:

```text
.anyharness/approvals/<gate-id>.approval.json
```

Use:

```bash
anyharness gate approve <gate-id> --notes "Approved after security review"
```
