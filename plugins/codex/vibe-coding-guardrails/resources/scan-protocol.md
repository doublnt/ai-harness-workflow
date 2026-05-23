# Init Project Scan Protocol

Use this protocol for the `init-project` skill.

## Read-only scan

Inspect, but do not modify:

- README and docs
- project manifests
- package manager files
- build config
- tests
- CI workflows
- database/migration directories
- AI instruction files
- Spec Kit files

Do not read secret values from `.env` or credential files. `.env.example` is allowed.

## Detect AI workflows

Claude signals:

- `CLAUDE.md`
- `.claude/`
- `.claude/skills/`
- `.claude/commands/`
- `.claude/settings.json`

Codex signals:

- `AGENTS.md`
- `.codex/`
- `.agents/skills/`
- `.agents/plugins/marketplace.json`

Spec Kit signals:

- `.specify/`
- `specs/`
- `.specify/memory/constitution.md`
- `/speckit.*` command files

Other AI workflow signals:

- `.cursor/`
- `.cursorrules`
- `.windsurf/`
- `.github/copilot-instructions.md`

## Scan report format

```text
Project Scan Report
1. Detected AI Workflow
2. Recommended Target Format
3. Detected Project Facts
4. Existing Documentation
5. Existing Engineering Gates
6. Risk Signals
7. Inferred Project Risk Profile
8. Unknowns
9. Proposed Files To Create
10. Existing Files That Need Draft Patches
```

## Confirmation

Ask at most 10 questions and provide recommended defaults. Stop before writing unless the user explicitly confirms.
