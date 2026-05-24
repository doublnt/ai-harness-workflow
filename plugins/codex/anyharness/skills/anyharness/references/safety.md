# Safety

AnyHarness is safe-by-construction. The ten non-negotiable rules and their rationale:

## Rule 1 — Installation does not modify the repository

**Why**: Users must be able to install the plugin without risk of side-effects to their codebase.
**How to apply**: Plugin installation is read-only. No files are created or modified until the user explicitly asks AnyHarness to write something.

## Rule 2 — Start with read-only analysis

**Why**: Scanning before writing prevents overwriting existing work and lets the user understand what AnyHarness will do before committing.
**How to apply**: Always run `scan-project.mjs` (or equivalent read-only inspection) before proposing any writes.

## Rule 3 — Draft before modifying existing prompt files

**Why**: Existing `CLAUDE.md`, `AGENTS.md`, and Cursor rules represent the user's established workflow. Overwriting them silently would destroy work.
**How to apply**: When a target file already exists, write an `.append.md` draft under `.anyharness/drafts/` and tell the user where to find it.

## Rule 4 — Domain examples are seeds, not authoritative rules

**Why**: Generic domain examples from training data may not match the project. Applying them as facts causes hallucinated constraints.
**How to apply**: Treat all built-in domain examples as interview seeds. Only promote a rule to authoritative after the user confirms it with repository evidence.

## Rule 5 — For domain-sensitive conclusions, produce hypotheses with evidence and confidence

**Why**: Overconfident domain assertions can cause misguided review decisions.
**How to apply**: Always include an `evidence` list and a `confidence` level (low/medium/high) when presenting domain hypotheses.

## Rule 6 — Ask focused questions before finalizing project-specific invariants

**Why**: Invariants derived without confirmation are guesses. Wrong invariants produce wrong review verdicts.
**How to apply**: Before writing `profile.json`, present 5–12 targeted questions and wait for user answers.

## Rule 7 — Keep the first user experience simple

**Why**: A complex first-run experience discourages adoption.
**How to apply**: Sequence is always: scan → summarize → ask → propose writes. Never write without summarizing first.

## Rule 8 — Do not install hooks or scripts without explicit confirmation

**Why**: Git hooks and CI scripts change developer workflow. Installing them silently is a significant side-effect.
**How to apply**: `install-local-hooks.mjs` defaults to dry-run. Require `--confirm` before writing any hook or CI file.

## Rule 9 — Generated scripts must be repo-local and reviewable

**Why**: Scripts that run automatically (hooks, CI) must be auditable by the team.
**How to apply**: All generated enforcement scripts are written to `.anyharness/scripts/` inside the user's repository, not to global locations.

## Rule 10 — Do not read secrets or credentials files

**Why**: `.env`, `.env.*`, and credential files may contain sensitive data that must not be included in scan output or review packets.
**How to apply**: The `ignore` set in `scan-project.mjs` always includes any file or directory starting with `.env`. Never read credential files.
