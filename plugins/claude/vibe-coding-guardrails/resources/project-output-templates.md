# Project-local Output Templates

The plugin itself is portable. The `init-project` skill creates project-local files only after user confirmation.

## Claude target

```text
CLAUDE.md                         # create only if missing; otherwise draft append
.claude/rules/engineering-constitution.md
.claude/rules/risk-levels.md
.claude/rules/file-change-policy.md
.claude/skills/ai-development-governance/SKILL.md
.claude/skills/ai-development-governance/references/project-context.md
.claude/_drafts/CONTRIBUTING.draft.md
.claude/_drafts/PULL_REQUEST_TEMPLATE.draft.md
```

## Codex target

```text
AGENTS.md                         # create only if missing; otherwise draft append
.agents/skills/ai-development-governance/SKILL.md
.agents/skills/ai-development-governance/references/project-context.md
.codex/rules/governance.rules
.agents/_drafts/CONTRIBUTING.draft.md
.agents/_drafts/PULL_REQUEST_TEMPLATE.draft.md
```

## Both target

Use `AGENTS.md` as shared source and `CLAUDE.md` as Claude adapter.

## Spec Kit compatible target

```text
.specify/governance/guardrails.md
.specify/governance/project-context.md
.specify/governance/risk-levels.md
.specify/governance/file-change-policy.md
.specify/commands/governance-check.md
```

## Conflict rule

Never overwrite existing project files. If a file exists, generate a draft patch or append draft in a `_drafts/` folder.
