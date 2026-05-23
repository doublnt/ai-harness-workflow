# Vibe Coding Guardrails for Claude Code

[中文说明](./README.zh-CN.md) | English

Pure skills plugin for Claude Code. It provides engineering governance workflows for AI-assisted development without hooks, MCP servers, app connectors, runtime scripts, or automatic file modification during installation.

## Skills

After installation, use the namespaced Claude commands:

```text
/vibe-coding-guardrails:init-project
/vibe-coding-guardrails:risk-classify
/vibe-coding-guardrails:new-feature
/vibe-coding-guardrails:design-review
/vibe-coding-guardrails:implementation-plan
/vibe-coding-guardrails:code-review
/vibe-coding-guardrails:test-plan
/vibe-coding-guardrails:security-review
/vibe-coding-guardrails:release-check
```

## First run

In the target repository, run:

```text
/vibe-coding-guardrails:init-project
```

The skill will:

1. Scan the repository in read-only mode.
2. Detect existing Claude, Codex, Spec Kit, and other AI workflow files.
3. Produce a scan report.
4. Recommend a target format: `claude`, `codex`, `both`, or `speckit-compatible`.
5. Ask for confirmation.
6. Generate local governance files only after confirmation.
7. Avoid overwriting existing files.

## v1 constraints

This plugin intentionally contains only skills and markdown resources.

It does not contain:

- hooks
- MCP servers
- app connectors
- runtime scripts
- automatic approval behavior
- automatic repository modification during installation

## Safety model

High-risk work must require human approval, including auth, authorization, payment, database migrations, production data, security policy, deployment configuration, CI/CD behavior, public API breaking changes, secrets, and large refactors.
