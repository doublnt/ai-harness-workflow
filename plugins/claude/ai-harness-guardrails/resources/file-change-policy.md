# File Change Policy

## Green Zone
Feature-local source files, feature-local tests, non-sensitive documentation.

## Yellow Zone
Shared utilities, package manifests, lock files, config files, build scripts, AI workflow files.

## Red Zone
Migrations, auth, authorization, payments, security policy, deployment/CI config, secrets, production config, public API schema, `CLAUDE.md`, `AGENTS.md`, `.claude/settings.json`, `.codex/config.toml`.

Red Zone changes require a gate artifact and human approval.
