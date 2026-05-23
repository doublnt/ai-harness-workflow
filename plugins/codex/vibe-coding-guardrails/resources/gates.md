# Gates

## Requirement Gate

Required output:

```text
Problem:
User:
Goal:
Non-goals:
Inputs:
Outputs:
Success Criteria:
Edge Cases:
Failure Cases:
Risk Level:
Unknowns:
```

Pass criteria:

- goal is clear
- non-goals are clear
- inputs and outputs are clear
- success criteria are testable
- at least one failure case is listed

## Design Gate

Required for Level 1+.

Required output:

```text
Context:
Constraints:
Assumptions:
Option A:
Option B:
Option C if Level 2+:
Trade-off Table:
Recommended Option:
Failure Modes:
Rollback Plan:
Unknowns:
```

Pass criteria:

- Level 1 has at least 2 options
- Level 2+ has at least 3 options
- recommendation states what it sacrifices
- failure modes are explicit
- high-risk tasks have rollback plan

## Implementation Gate

Required output:

```text
Files To Modify:
Files To Create:
Files Not To Touch:
Step-by-step Plan:
Dependencies:
Tests To Add Or Update:
Migration Required:
Rollback:
Unknowns:
```

Rules:

- no unrelated refactors
- no unnecessary dependencies
- no deleting tests
- no red-zone changes without approval

## Code Review Gate

Required output:

```text
Summary:
Risk Level:
Requirement Match:
Correctness Issues:
Design Issues:
Security Issues:
Testing Gaps:
Performance Concerns:
Observability:
Rollback Readiness:
Unknowns:
Verdict: Pass / Needs Changes / Blocked
```

Verdict rules:

- Security, auth, data, or migration Unknowns prevent Pass.
- Missing tests for Level 2+ prevent Pass.
- No rollback plan for high-risk changes is Blocked.

## Testing Gate

Required output:

```text
Test Scope:
Unit Tests:
Integration Tests:
E2E Tests:
Security Tests:
Regression Tests:
Manual Checks:
Commands To Run:
Untested Risks:
Unknowns:
```

## Security Gate

Required for security-sensitive work.

Required output:

```text
Assets:
Actors:
Trust Boundaries:
Entry Points:
Threats:
Abuse Cases:
Required Mitigations:
Security Tests:
Unknowns:
Verdict:
```

## Release Gate

Required for Level 2+ releases.

Required output:

```text
Change Summary:
User Impact:
Data Impact:
Migration:
Config Changes:
Feature Flags:
Monitoring:
Rollback Plan:
Post-release Checks:
Blockers:
Unknowns:
Verdict: Ready / Needs Changes / Blocked
```
