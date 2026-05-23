---
name: release-check
description: "Check release readiness for high-risk changes, including user impact, data impact, migrations, config, monitoring, rollback, and blockers."
---


# release-check

Use this skill before releasing Level 2+ or production-impacting changes.

## Required references

- `../../resources/core-rules.md`
- `../../resources/risk-levels.md`
- `../../resources/gates.md`

## Process

1. Summarize change.
2. Classify risk.
3. Identify user impact.
4. Identify data impact.
5. Identify migration and config changes.
6. Identify feature flags or rollout controls.
7. Identify monitoring and post-release checks.
8. Verify rollback plan.
9. List blockers and Unknowns.
10. Produce readiness verdict.

## Blockers

- Level 2+ without rollback plan.
- Database migration without validation plan.
- Security-sensitive release without security tests.
- Auth/permission changes without denied-case tests.
- Production changes without observability plan.

## Output

```text
Change Summary:
Risk Level:
User Impact:
Data Impact:
Migration:
Config Changes:
Feature Flags:
Backward Compatibility:
Monitoring:
Rollback Plan:
Post-release Checks:
Blockers:
Unknowns:
Verdict: Ready / Needs Changes / Blocked
```
