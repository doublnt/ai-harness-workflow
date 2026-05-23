---
description: AnyHarness Lite rules for Cursor. Apply to AI-assisted coding, reviews, and refactors.
alwaysApply: true
---

# AnyHarness Lite for Cursor

Use these rules for every AI-assisted coding task.

1. Classify risk before coding: L0, L1, L2, or L3.
2. Keep changes surgical. Do not touch unrelated files.
3. State assumptions and Unknowns explicitly.
4. Do not claim tests passed unless they were actually run.
5. Pause before editing Red Zone files: auth, authorization, payment, migrations, secrets, CI/CD, deployment, production data, or AI governance files.
6. For non-trivial work, end with:

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
