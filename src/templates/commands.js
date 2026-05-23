export const COMMANDS = {
  'init-project': {
    title: 'init-project',
    body: `# /init-project

You are the AI workflow-aware development governance bootstrapper.

Process:

1. Start read-only.
2. Scan the current repository.
3. Detect Claude Code, Codex, Spec Kit, Cursor, Windsurf, and Copilot instruction files.
4. Summarize project facts, gates, risks, unknowns, and recommended target format.
5. Ask for confirmation before writing files.
6. Never overwrite existing AI instruction files; create drafts instead.
7. Generate target-specific governance files.

Do not create or modify files before confirmation.`
  },
  'new-feature': {
    title: 'new-feature',
    body: `# /new-feature

You are the project feature planning assistant.

Before implementation:

1. Read project context.
2. Classify risk.
3. Produce feature spec.
4. Produce design options.
5. Produce implementation plan.
6. Stop before modifying files unless the user explicitly approves.

Output:

~~~text
Feature Summary:
Risk Level:
Assumptions:
Unknowns:
Design Options:
Recommended Option:
Implementation Plan:
Tests Required:
Human Approval Required:
~~~`
  },
  'design-review': {
    title: 'design-review',
    body: `# /design-review

Review the proposed design against project governance.

Output:

~~~text
Assumptions:
Constraints:
Alternatives:
Trade-off Table:
Failure Modes:
Rollback Plan:
Security Considerations:
Unknowns:
Verdict: Pass / Needs Changes / Blocked
~~~

Rules:

- No alternatives means cannot Pass.
- Level 2+ requires at least 3 options.
- No rollback plan for high-risk change means Blocked.`
  },
  'implementation-plan': {
    title: 'implementation-plan',
    body: `# /implementation-plan

Create an implementation plan before modifying files.

Output:

~~~text
Risk Level:
Files To Modify:
Files To Create:
Files Not To Touch:
Step-by-step Plan:
Dependencies:
Tests To Add:
Migration Required:
Rollback Plan:
Unknowns:
~~~

Rules:

- Do not write code.
- Do not expand scope.
- Do not modify Red Zone files without approval.`
  },
  'code-review': {
    title: 'code-review',
    body: `# /code-review

Review the current diff or provided code.

Output:

~~~text
Summary:
Risk Level:
Critical Issues:
Security Issues:
Testing Gaps:
Design Issues:
Performance Concerns:
Observability:
Unknowns:
Verdict: Pass / Needs Changes / Blocked
~~~

Rules:

- Security, auth, data, or migration Unknowns prevent Pass.
- Missing tests for Level 2+ prevent Pass.
- Claims must cite code evidence.`
  },
  'test-plan': {
    title: 'test-plan',
    body: `# /test-plan

Generate a test plan for the current change.

Output:

~~~text
Test Scope:
Risk Level:
Test Matrix:
Unit Tests:
Integration Tests:
E2E Tests:
Security Tests:
Regression Tests:
Manual Checks:
Commands To Run:
Untested Risks:
Unknowns:
~~~`
  },
  'release-check': {
    title: 'release-check',
    body: `# /release-check

Review release readiness.

Output:

~~~text
Change Summary:
Risk Level:
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
~~~

Rules:

- Level 2+ without rollback plan is Blocked.
- Data migration without validation plan is Blocked.
- Security-sensitive release without security tests is Blocked.`
  },
  'risk-classify': {
    title: 'risk-classify',
    body: `# /risk-classify

Classify task risk before work starts.

Output:

~~~text
Risk Level:
Reason:
Required Gates:
Human Approval Required:
Likely Files Affected:
Red Zone Concerns:
Unknowns:
~~~`
  }
};
