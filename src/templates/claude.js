import { COMMANDS } from './commands.js';

export function claudeMd({ sharedAgents = false } = {}) {
  if (sharedAgents) {
    return `# CLAUDE.md

This project uses AGENTS.md as the shared AI agent governance source.

Read shared instructions:

@AGENTS.md

## Claude Code Specific Instructions

Before changing code, also read:

- .claude/rules/engineering-constitution.md
- .claude/rules/risk-levels.md
- .claude/rules/file-change-policy.md
- .claude/skills/ai-development-governance/references/project-context.md

## Claude Commands

Use:

- /new-feature
- /design-review
- /implementation-plan
- /code-review
- /test-plan
- /release-check
- /risk-classify

## Claude-specific Behavior

1. Use explicit planning before Level 2+ changes.
2. Do not modify files until required gates are complete.
3. Do not use auto approval for Red Zone changes.
4. If current context is long, summarize decisions before continuing.
5. Keep responses focused on blockers, risks, and required actions.
`;
  }

  return `# CLAUDE.md

This file defines project-specific instructions for Claude Code.

## Required Reading

Before making changes, read:

- .claude/rules/engineering-constitution.md
- .claude/rules/risk-levels.md
- .claude/rules/file-change-policy.md
- .claude/skills/ai-development-governance/references/project-context.md

## Core Rules

1. Classify task risk before implementation.
2. Do not implement before requirement clarification.
3. Do not make high-risk changes without human approval.
4. Do not modify Red Zone files without explicit approval.
5. Do not claim tests passed unless they were actually run.
6. Mark Unknowns explicitly.
7. Do not hide assumptions.
8. Do not introduce new dependencies without justification.
9. Do not delete or weaken tests.
10. For Level 2+ tasks, produce design, test, security, and rollback plans.

## Task Flow

For every task:

1. Understand request.
2. Classify risk.
3. Read relevant project context.
4. Produce plan.
5. Wait for approval if risk is Level 2 or Level 3.
6. Implement only approved scope.
7. Review against gate.
8. Produce test plan.
9. Summarize risks and Unknowns.

## Commands

Use:

- /new-feature
- /design-review
- /implementation-plan
- /code-review
- /test-plan
- /release-check
- /risk-classify

## Human Approval Required

Human approval is required for:

- database schema changes
- migrations
- authentication
- authorization
- payment
- production data
- public API breaking changes
- deployment config
- CI/CD behavior
- secrets
- security controls
- large refactors
`;
}

export function claudeSettingsDraft(scan) {
  const allow = [];
  if (scan.facts.testCommand !== 'Unknown') allow.push(`Bash(${scan.facts.testCommand})`);
  if (scan.facts.lintCommand !== 'Unknown') allow.push(`Bash(${scan.facts.lintCommand})`);
  if (scan.facts.typecheckCommand !== 'Unknown') allow.push(`Bash(${scan.facts.typecheckCommand})`);

  const body = {
    permissions: {
      deny: [
        'Read(./.env)',
        'Read(./.env.*)',
        'Read(./secrets/**)',
        'Read(./config/credentials.json)'
      ]
    }
  };
  if (allow.length) body.permissions.allow = allow;
  return JSON.stringify(body, null, 2);
}

export function claudeSkill() {
  return `---
name: ai-development-governance
description: Use this skill when initializing, planning, reviewing, testing, or releasing code changes under the project's AI development governance process. Trigger for project gates, risk classification, design review, code review, test planning, release planning, and high-risk changes.
---

# AI Development Governance Skill

You are the project's AI development governance assistant.

## Required References

Read the relevant files in references/ before acting:

- project-context.md
- workflow-overview.md
- requirement-gate.md
- design-gate.md
- implementation-gate.md
- code-review-gate.md
- testing-gate.md
- security-gate.md
- release-gate.md

## Non-negotiable Rules

1. Always classify risk first.
2. Never implement high-risk changes without human approval.
3. Never claim tests passed unless they were actually run.
4. Always list assumptions and Unknowns.
5. For security-sensitive changes, perform threat modeling.
6. For database changes, require migration and rollback plans.
7. For performance claims, require measurement.
8. Keep scope narrow.

## Output Contract

For any task, output:

~~~text
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
~~~
`;
}

export function claudeCommand(name) {
  return COMMANDS[name]?.body || `# /${name}\n\nCommand not found.`;
}
