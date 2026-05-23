# Skill Contract

Every skill must provide:

```yaml
---
name: <skill-name>
description: <short trigger description>
---
```

Every governance output must include:

```text
Risk Level:
Assumptions:
Unknowns:
Required Gates:
Plan:
Files To Change:
Files Not To Touch:
Tests:
Security Considerations:
Rollback Plan:
Human Approval Required:
```

A skill must never claim that tests, linters, builds, or security scans passed unless the host client actually ran them and captured results.
