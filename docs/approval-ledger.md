# Approval Ledger

Level 2 and Level 3 changes require approval records under:

```text
.guardrails/approvals/<gate-id>.approval.json
```

Example:

```json
{
  "gateId": "2026-05-23-auth-change",
  "status": "approved",
  "approvedBy": "human",
  "approvedAt": "2026-05-23T00:00:00Z",
  "scope": ["src/auth/**"],
  "notes": "Approved after design and security review."
}
```
