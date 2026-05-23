# AGENTS.md

This repository contains pure skills for AI coding governance.

## Rules for agents working on this repo

1. Do not add hooks, MCP servers, app connectors, or plugin runtime scripts to v1.
2. Keep plugin roots skills-only.
3. Do not change marketplace paths without updating validation.
4. Every skill must include `name` and `description` frontmatter.
5. Do not claim validation passed unless `npm test` was actually run.
6. Treat all marketplace and plugin manifests as public install-surface content.
