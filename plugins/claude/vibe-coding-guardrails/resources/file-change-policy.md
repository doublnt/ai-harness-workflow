# File Change Policy

## Green Zone

AI may modify these after normal planning:

- source files clearly scoped to the task
- tests clearly scoped to the task
- generated draft docs
- local examples

## Yellow Zone

AI must explain why before modifying:

- shared utilities
- shared types
- public components
- package manifests
- lock files
- build config
- lint/format config
- AI instruction files

## Red Zone

AI must get explicit human approval before modifying:

- database migrations
- authn/authz code
- payment code
- production config
- secrets and credentials
- deployment config
- CI/CD behavior
- public API schema
- destructive deletes
- test removal
- large refactors
- `CLAUDE.md`
- `AGENTS.md`
- `.claude/settings.json`
- `.codex/config.toml`
