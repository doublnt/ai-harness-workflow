# Architecture

## Product shape

Vibe Coding Guardrails v1 is a pure skills distribution:

```text
Marketplace catalog -> installable plugin -> skills -> references
```

The plugin contributes workflows. It does not contribute runtime automation.

## Responsibilities

| Layer | Responsibility |
|---|---|
| Marketplace | Discovery and installation metadata |
| Plugin manifest | Namespacing and component paths |
| Skill | Reusable workflow instructions |
| Resources | Governance rules, gates, templates, and checklists |
| Validation script | Repository quality checks only |

## Safety model

The safest boundary is to make installation side-effect free. Installation only exposes skills. A skill can ask the AI client to inspect or edit a repository, but the skill instructions require read-only scanning first and explicit user confirmation before writes.
