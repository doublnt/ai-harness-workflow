export function speckitGovernanceAddendum() {
  return `# Spec Kit Governance Addendum

This project uses Spec Kit for spec-driven development and Vibe Coding Guardrails for AI engineering governance.

## Relationship

- Spec Kit answers: what are we building, how will we plan it, what tasks must be done?
- Governance answers: what risk level is this, what can AI modify, what tests/security/release gates are required?

## Required Additions To Every Spec

Every spec should include:

- Risk Level
- Human Approval Required
- Red Zone Files
- Security Considerations
- Data/Migration Impact
- Rollback Plan for Level 2+
- Unknowns

## Required Additions To Every Plan

Every plan should include:

- Required gates
- File change policy impact
- Testing strategy
- Security gate result if applicable
- Release gate result if applicable

## Required Additions To Every Tasks File

Tasks should include explicit tasks for:

- tests
- code review gate
- security review when applicable
- migration validation when applicable
- rollback plan when applicable
- release checklist for Level 2+
`;
}

export function speckitCommand() {
  return `# /speckit-governance-check

Use this command after /speckit.plan or before /speckit.implement.

Output:

~~~text
Risk Level:
Spec Completeness:
Required Gates:
Red Zone Files:
Security Concerns:
Testing Gaps:
Release/Rollback Requirements:
Unknowns:
Verdict: Pass / Needs Changes / Blocked
~~~

Rules:

- A Level 2+ feature without rollback plan is Blocked.
- A security-sensitive feature without threat model is Blocked.
- A data migration without validation plan is Blocked.
`;
}
