# Safety Model

## v1 constraints

- Skills only.
- No hooks.
- No MCP servers.
- No app connectors.
- No runtime scripts inside plugin roots.
- No default command allowlists.

## Runtime flow

1. User installs plugin.
2. Nothing in the target repository changes.
3. User invokes `init-project`.
4. Skill performs read-only analysis through the host AI client.
5. Skill outputs a scan report and confirmation questions.
6. Only after confirmation may the host AI client create or update project-local files.

## High-risk operations

The skills must block or require explicit human approval for:

- database migrations
- authentication and authorization
- payments
- production data
- CI/CD behavior
- secrets and credentials
- deployment config
- public API breaking changes
- large refactors
- destructive file operations
