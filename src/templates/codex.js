export function agentsMd({ shared = false } = {}) {
  return `# AGENTS.md

This file defines project-specific instructions for Codex and compatible coding agents.${shared ? '\n\nIt is the shared governance source for Claude Code and Codex compatible agents.' : ''}

## Required Reading

Before making changes, read:

- .agents/skills/ai-development-governance/references/project-context.md
- .agents/skills/ai-development-governance/references/engineering-constitution.md
- .agents/skills/ai-development-governance/references/risk-levels.md
- .agents/skills/ai-development-governance/references/file-change-policy.md

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

## Use Skill

Use the ai-development-governance skill for:

- project initialization
- new feature planning
- design review
- implementation planning
- code review
- test planning
- release check
- risk classification

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
${shared ? '\n## Tool-specific Instructions\n\nClaude Code users should also read CLAUDE.md.\nCodex users should use the ai-development-governance skill under .agents/skills/.\n' : ''}`;
}

export function codexConfigDraft() {
  return `# Project-local Codex configuration draft.
# Review before committing.

approval_policy = "on-request"
sandbox_mode = "workspace-write"
project_doc_max_bytes = 65536
`;
}

export function governanceRules(scan) {
  const rules = [
    ['git', 'push', 'Pushing code changes requires human confirmation.'],
    ['git', 'commit', 'Committing changes requires human confirmation.'],
    ['rm', '-rf', 'Recursive deletion is high risk.']
  ];
  if (scan.facts.packageManager === 'npm') rules.push(['npm', 'install', 'Installing dependencies changes project state and supply-chain risk.']);
  if (scan.facts.packageManager === 'pnpm') rules.push(['pnpm', 'add', 'Adding dependencies changes project state and supply-chain risk.']);
  if (scan.facts.packageManager === 'yarn') rules.push(['yarn', 'add', 'Adding dependencies changes project state and supply-chain risk.']);
  if (scan.tags.includes('rust')) rules.push(['cargo', 'add', 'Adding dependencies changes project state and supply-chain risk.']);

  return ['# Governance rules for high-risk shell commands.', '', ...rules.map(([a, b, reason]) => `prefix_rule(\n    pattern = ["${a}", "${b}"],\n    decision = "prompt",\n    justification = "${reason}"\n)\n`)].join('\n');
}

export function safetyRules() {
  return `# Safety rules for generated governance.

prefix_rule(
    pattern = ["cat", ".env"],
    decision = "deny",
    justification = "Do not read local secret files."
)

prefix_rule(
    pattern = ["printenv"],
    decision = "prompt",
    justification = "Environment variables may contain secrets."
)
`;
}

export function codexSkill() {
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
- engineering-constitution.md
- risk-levels.md
- file-change-policy.md
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
