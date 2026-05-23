export function contributingDraft(scan) {
  return `# Contributing

## Development Setup

Install dependencies: ${installCommand(scan)}

## Project Commands

- Dev: ${scan.facts.devCommand}
- Build: ${scan.facts.buildCommand}
- Test: ${scan.facts.testCommand}
- Lint: ${scan.facts.lintCommand}
- Format: ${scan.facts.formatCommand}

## AI Usage Policy

AI-generated changes must follow project governance:

1. Classify task risk.
2. Complete required gates.
3. Do not modify Red Zone files without approval.
4. Do not claim tests passed unless actually run.
5. List Unknowns explicitly.

## Review Policy

Level 2 and Level 3 changes require human approval before implementation and release.
`;
}

export function pullRequestTemplateDraft() {
  return `# Summary

## Risk Level

- [ ] Level 0
- [ ] Level 1
- [ ] Level 2
- [ ] Level 3

## What Changed

## Why

## Tests

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Manual checks
- [ ] Not applicable, reason:

## Security

- [ ] No security impact
- [ ] Auth/authz reviewed
- [ ] Input validation reviewed
- [ ] Sensitive data reviewed

## Data / Migration

- [ ] No data impact
- [ ] Migration included
- [ ] Rollback plan included

## Release

- [ ] No release risk
- [ ] Feature flag used
- [ ] Monitoring plan included
- [ ] Rollback plan included

## Unknowns
`;
}

export function ciGatesDraft(scan) {
  return `# CI Gates Draft

## Detected Commands

- Build: ${scan.facts.buildCommand}
- Test: ${scan.facts.testCommand}
- Lint: ${scan.facts.lintCommand}
- Format: ${scan.facts.formatCommand}
- Type check: ${scan.facts.typecheckCommand}

## Recommended Gates

Use only commands that are confirmed to work locally.

1. lint
2. typecheck
3. test
4. build

## Unknown Commands

${unknownCommands(scan).map((item) => `- ${item}`).join('\n') || '- None'}
`;
}

function installCommand(scan) {
  switch (scan.facts.packageManager) {
    case 'pnpm': return 'pnpm install';
    case 'yarn': return 'yarn install';
    case 'npm': return 'npm install';
    case 'bun': return 'bun install';
    case 'cargo': return 'cargo build';
    case 'go': return 'go mod download';
    default: return 'Unknown';
  }
}

function unknownCommands(scan) {
  return [
    ['Build', scan.facts.buildCommand],
    ['Test', scan.facts.testCommand],
    ['Lint', scan.facts.lintCommand],
    ['Format', scan.facts.formatCommand],
    ['Type check', scan.facts.typecheckCommand]
  ].filter(([, value]) => value === 'Unknown').map(([name]) => name);
}
