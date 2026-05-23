# Vibe Coding Guardrails for Codex

[中文说明](./README.zh-CN.md) | English

Pure skills plugin for Codex. It provides engineering governance workflows for AI-assisted development without hooks, MCP servers, app connectors, runtime scripts, or automatic file modification during installation.

## Skills

The plugin includes:

```text
init-project
risk-classify
new-feature
design-review
implementation-plan
code-review
test-plan
security-review
release-check
```

Use the skills naturally in Codex, for example:

```text
Use Vibe Coding Guardrails to initialize this repository.
Use Vibe Coding Guardrails to classify the risk of this task.
Use Vibe Coding Guardrails to review this diff.
Use Vibe Coding Guardrails to prepare a test plan.
Use Vibe Coding Guardrails to run a release check.
```

## First run

In the target repository, ask Codex:

```text
Use Vibe Coding Guardrails to initialize this repository.
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
