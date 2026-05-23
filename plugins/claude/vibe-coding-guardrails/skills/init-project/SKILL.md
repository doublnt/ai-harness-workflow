---
name: init-project
description: Initialize project-local guardrails after read-only scan, user confirmation, and target workflow detection.
---


# init-project

You initialize Vibe Coding Guardrails in the current repository.

Process:

1. Read resources: scan protocol, core rules, risk levels, file policy, project output templates.
2. Read-only scan current repository.
3. Detect Claude, Codex, both, or Spec Kit workflows.
4. Produce a scan report with Unknowns.
5. Ask the user to confirm target format and enforcement mode: advisory, enforcing, or strict.
6. After confirmation, create project-local governance files: `.guardrails/config.json`, gate directories, optional Git hooks, CI draft, and workflow-specific `CLAUDE.md`/`AGENTS.md` drafts.
7. Do not overwrite existing files; create drafts or patches.

Required final sections: Risk Level, Unknowns, Files Changed, Tests, Human Approval Required.

## Required Resources

Read relevant files under `../../resources/` before acting.
