# AnyHarness

**AnyHarness** is an installable AI development harness for Claude Code, Codex, Cursor, Git hooks, and CI.

It gives AI coding agents a simple behavioral surface and, when you need it, a closed-loop enforcement layer:

1. **Classify Risk First**
2. **Keep Changes Surgical**
3. **Require Evidence**
4. **Block Unsafe Work**

AnyHarness is designed for both new and existing repositories. A beginner can start with one lightweight skill. A production team can enable hooks, commit gates, CI gates, gate artifacts, approval records, and docs-drift checks.

> Package name: `anyharness`  
> Display name: `AnyHarness`  
> CLI command: `anyharness`  
> Claude command namespace: `/anyharness:*`

---

## What problem does AnyHarness solve?

AI coding tools can generate code quickly, but they often fail in predictable ways:

- They make hidden assumptions.
- They over-engineer simple tasks.
- They touch unrelated files.
- They modify authentication, migrations, CI, or deployment files without enough review.
- They claim tests passed even when tests were not run.
- They update code but forget tests, docs, release notes, or rollback plans.

AnyHarness turns soft AI coding guidelines into an operational harness:

```text
Skills -> Agent hooks -> Git hooks -> CI gates -> Gate artifacts
```

This means AI can still move fast, but risky work gets classified, reviewed, tested, documented, and blocked when necessary.

---

## Choose an adoption mode

| Mode | What it does | Best for | Repo changes |
|---|---|---|---|
| **Lite** | Uses the `harness-core` skill only. No hooks. No generated project files. | Beginners, experiments, solo projects | None |
| **Project** | Generates project-local AI instructions such as `ANYHARNESS.md`, `AGENTS.md`, and `CLAUDE.md` drafts. | New projects, brownfield repos, teams adopting AI workflow rules | Low |
| **Harness** | Adds `.anyharness/`, lifecycle hooks, Git hooks, CI gate templates, gate artifacts, approvals, and docs-drift checks. | Production projects, team repos, security-sensitive systems | Medium |

Recommended path:

```text
Start with Lite -> initialize Project mode -> enable Harness mode when the team trusts the workflow.
```

---

## Install for Claude Code

From a local checkout:

```text
/plugin marketplace add ./path/to/AnyHarness
/plugin install anyharness@anyharness
```

After installation, Claude Code exposes namespaced commands:

```text
/anyharness:harness-core
/anyharness:init-project
/anyharness:risk-classify
/anyharness:new-feature
/anyharness:design-review
/anyharness:implementation-plan
/anyharness:code-review
/anyharness:test-plan
/anyharness:security-review
/anyharness:release-check
```

Start with:

```text
/anyharness:harness-core
```

Then initialize a repository:

```text
/anyharness:init-project
```

---

## Install for Codex

From a local checkout:

```text
codex plugin marketplace add ./path/to/AnyHarness
```

Then install `anyharness` from the local marketplace.

Use natural language prompts:

```text
Use AnyHarness core rules for this change.
Use AnyHarness to initialize this repository.
Use AnyHarness to review this diff before commit.
Use AnyHarness to prepare a release check.
```

---

## Install for Cursor

Cursor support is Lite-only. It gives the model the core behavioral rules, but does not provide lifecycle hooks.

Copy the adapter into a project:

```bash
mkdir -p .cursor/rules
cp adapters/cursor/anyharness.mdc .cursor/rules/anyharness.mdc
```

Or generate it through the CLI:

```bash
npx anyharness cursor-template --write
```

---

## Install the CLI

During development, run it locally:

```bash
node bin/anyharness.mjs --help
node bin/anyharness.mjs scan --json
node bin/anyharness.mjs init --dry-run
```

After publishing or linking the package:

```bash
npx anyharness --help
npx anyharness scan --json
npx anyharness init --profile project --target detect
```

The CLI is deterministic. It performs local checks and does not call external services.

---

# Usage case 1: new project, solo developer, lowest friction

Use Lite mode first.

### Step 1: Install the plugin

Claude:

```text
/plugin marketplace add ./path/to/AnyHarness
/plugin install anyharness@anyharness
```

Codex:

```text
codex plugin marketplace add ./path/to/AnyHarness
```

### Step 2: Use the core skill

Claude:

```text
/anyharness:harness-core
```

Codex:

```text
Use AnyHarness core rules while implementing this feature.
```

### Step 3: Ask AI to build normally, but with constraints

Example:

```text
Use AnyHarness core rules. Add a basic settings page with name and email fields. Keep the change surgical and tell me what tests I should run.
```

Expected AI output should include:

```text
Risk Level:
Assumptions:
Unknowns:
Files Changed:
Tests:
Security Considerations:
Human Approval Required:
```

Use this mode when you do not want repository files changed yet.

---

# Usage case 2: new project, create project-local AI rules

Use Project mode when you want every future AI session to understand the project rules.

### Step 1: Dry-run first

```bash
npx anyharness init --profile project --target detect --dry-run
```

This prints what would be created without writing files.

### Step 2: Initialize Project mode

```bash
npx anyharness init --profile project --target detect --mode advisory
```

This creates or drafts:

```text
.anyharness/config.json
.anyharness/baselines/project-scan.json
ANYHARNESS.md
AGENTS.md or .anyharness/drafts/AGENTS.append.md
CLAUDE.md or .anyharness/drafts/CLAUDE.append.md
```

Existing `AGENTS.md` or `CLAUDE.md` files are not overwritten. AnyHarness writes draft files instead.

### Step 3: Review and commit

```bash
git diff
git add ANYHARNESS.md AGENTS.md CLAUDE.md .anyharness/config.json .anyharness/baselines/project-scan.json
git commit -m "chore(ai): initialize AnyHarness [risk:L1]"
```

### Step 4: Start using feature workflows

Claude:

```text
/anyharness:new-feature Add password reset by email
```

Codex:

```text
Use AnyHarness new-feature workflow to plan password reset by email.
```

The AI should produce a requirement summary, risk classification, design options, implementation plan, tests, Unknowns, and approval requirements before coding.

---

# Usage case 3: new project, production-ready harness

Use Harness mode when you want checks to block unsafe work.

### Step 1: Initialize Harness mode

```bash
npx anyharness init --profile harness --target both --mode enforcing --install-hooks
```

This creates or drafts:

```text
.anyharness/config.json
.anyharness/gates/
.anyharness/approvals/
.anyharness/baselines/project-scan.json
.anyharness/drafts/
ANYHARNESS.md
AGENTS.md or draft append
CLAUDE.md or draft append
.github/workflows/anyharness.yml or draft
.githooks/pre-commit
.githooks/commit-msg
.githooks/pre-push
```

It also sets:

```bash
git config core.hooksPath .githooks
```

### Step 2: Check the repository

```bash
npx anyharness doctor
npx anyharness check --staged
```

### Step 3: Use gate artifacts for risky work

For Level 2 or Level 3 work:

```bash
npx anyharness gate create --task "Add refresh token rotation" --risk L2 --gates design,security,test,release
```

After human review:

```bash
npx anyharness gate approve 2026-05-23-add-refresh-token-rotation --notes "Approved after design and security review"
```

### Step 4: Commit with risk metadata

Level 2/3 commits need a risk tag and trailers:

```text
feat(auth): rotate refresh tokens [risk:L2]

Risk-Level: L2
Gate-Review: .anyharness/gates/2026-05-23-add-refresh-token-rotation.json
Human-Approval: required
Tests: npm test
Rollback: docs/release/refresh-token-rollback.md
```

If this metadata is missing, `commit-msg` blocks the commit.

---

# Usage case 4: existing project / brownfield repo

For an old project, do not enable strict enforcement immediately.

### Recommended rollout

```text
Day 1: scan and dry-run
Week 1: Project mode, advisory
Week 2: Harness mode, advisory
Week 3: enforcing for Red Zone and commit messages
Later: strict mode for docs drift and release gates
```

### Step 1: Scan without changing anything

```bash
npx anyharness scan --json
npx anyharness init --profile project --target detect --dry-run
```

Look for:

```text
Detected AI workflows
Detected package manager
Detected tests and lint commands
Risk signals
Unknowns
Files that would be created
```

### Step 2: Start in advisory mode

```bash
npx anyharness init --profile project --target detect --mode advisory
```

Advisory mode reports risks but does not aggressively block normal work.

### Step 3: Review drafts instead of overwriting files

If the repo already has `AGENTS.md` or `CLAUDE.md`, AnyHarness writes:

```text
.anyharness/drafts/AGENTS.append.md
.anyharness/drafts/CLAUDE.append.md
```

Manually merge only the parts you want.

### Step 4: Enable harness gradually

```bash
npx anyharness init --profile harness --target detect --mode advisory
npx anyharness install-hooks
```

After a few successful commits:

```json
{
  "mode": "enforcing"
}
```

in `.anyharness/config.json`.

Move to strict mode only after CI and team habits are stable.

---

# Usage case 5: existing Claude Code project

If your project already has Claude Code files:

```text
CLAUDE.md
.claude/
.claude/settings.json
.claude/commands/
.claude/skills/
```

Run:

```text
/anyharness:init-project
```

Or CLI:

```bash
npx anyharness init --profile project --target claude --mode advisory
```

AnyHarness will not overwrite existing Claude files. It creates draft append files under `.anyharness/drafts/` when conflicts exist.

Recommended next steps:

1. Merge the short AnyHarness rules into `CLAUDE.md`.
2. Keep `ANYHARNESS.md` as the concise project-local rule file.
3. Use `/anyharness:code-review` before accepting large AI diffs.
4. Enable Harness mode later if you want hooks and commit blocking.

---

# Usage case 6: existing Codex project

If your project already has Codex files:

```text
AGENTS.md
.codex/
.agents/skills/
```

Run:

```bash
npx anyharness init --profile project --target codex --mode advisory
```

Or ask Codex:

```text
Use AnyHarness to initialize this repository for Codex only.
```

Recommended next steps:

1. Merge `.anyharness/drafts/AGENTS.append.md` into your existing `AGENTS.md`.
2. Keep AnyHarness skills installed globally or as a repo marketplace.
3. Add CI only after local checks are understood.

---

# Usage case 7: Spec Kit project

If your project already uses Spec Kit, AnyHarness should not replace the Spec Kit workflow. Use it as the governance layer.

Suggested flow:

```text
Spec Kit: specify -> plan -> tasks -> implement
AnyHarness: risk classify -> design/security/test/release gates -> commit/CI enforcement
```

Initialize in advisory mode first:

```bash
npx anyharness init --profile project --target detect --mode advisory
```

For high-risk specs, require gate artifacts:

```bash
npx anyharness gate create --task "Spec: user data export" --risk L2 --gates design,security,test,release
```

---

# Usage case 8: AI-generated diff review before commit

Claude:

```text
/anyharness:code-review
```

Codex:

```text
Use AnyHarness to review the current diff before commit.
```

Expected review output:

```text
Summary:
Risk Level:
Critical Issues:
Security Issues:
Testing Gaps:
Design Issues:
Performance Concerns:
Docs Drift:
Unknowns:
Verdict: Pass / Needs Changes / Blocked
```

If the diff touches authentication, migrations, CI, deployment, payment, secrets, or production data, expect Level 2 or Level 3.

---

# Usage case 9: docs drift protection

AnyHarness checks whether code changes imply documentation updates.

Examples:

| Changed files | Expected documentation |
|---|---|
| `app/api/**`, `src/routes/**`, `openapi.*` | `docs/api/**`, `README.md`, or gate justification |
| `prisma/schema.prisma`, `migrations/**` | database docs, migration notes, or gate artifact |
| `.env.example`, `Dockerfile`, deployment configs | deployment docs or README |
| `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.codex/**` | AI/governance docs or changelog |

If docs were intentionally not changed, add a gate artifact explaining why:

```json
{
  "docsImpact": "No public behavior change. Internal refactor only."
}
```

---

# Usage case 10: commit and CI enforcement

Local check:

```bash
npx anyharness check --staged
```

Commit message check:

```bash
npx anyharness commit-msg .git/COMMIT_EDITMSG
```

CI check:

```bash
npx anyharness ci-template --write
git add .github/workflows/anyharness.yml
git commit -m "ci: add AnyHarness gate [risk:L1]"
```

The generated GitHub Actions workflow runs:

```bash
npx anyharness check --ci
```

CI is the merge-time backstop. Local Git hooks are helpful, but they can be bypassed, so teams should use CI for real enforcement.

---

## CLI reference

```bash
anyharness scan [--json]
anyharness init [--profile lite|project|harness] [--mode advisory|enforcing|strict] [--target detect|claude|codex|both] [--install-hooks] [--dry-run]
anyharness check [--staged|--push|--ci] [--json]
anyharness commit-msg <message-file>
anyharness install-hooks
anyharness uninstall-hooks
anyharness ci-template [--write]
anyharness cursor-template [--write]
anyharness gate create --task <text> --risk L2 --gates design,security,test
anyharness gate approve <gate-id> --notes <text>
anyharness gate status
anyharness doctor
```

---

## Enforcement modes

| Mode | Behavior |
|---|---|
| `advisory` | Warns about problems. Best for adoption and old projects. |
| `enforcing` | Blocks clear unsafe work such as Red Zone changes without required gates. |
| `strict` | Blocks missing docs, missing gate artifacts, missing approval, and incomplete high-risk workflows. |

Default:

```text
Project mode -> advisory
Harness mode -> enforcing
```

---

## Risk levels

| Level | Meaning | Examples | Required gates |
|---|---|---|---|
| L0 | Low risk | copy change, style tweak, comments | basic self-check |
| L1 | Normal feature | small feature, normal bug fix, simple API | requirement, implementation plan, tests |
| L2 | Core or sensitive change | auth, permissions, uploads, database schema, external API, user data | design, security, tests, rollback, approval |
| L3 | Critical or irreversible change | production data, architecture migration, breaking API, deployment strategy | full design, migration, release, rollback, observability, explicit approval |

---

## Files created by Project mode

```text
.anyharness/config.json
.anyharness/baselines/project-scan.json
.anyharness/drafts/
ANYHARNESS.md
AGENTS.md or .anyharness/drafts/AGENTS.append.md
CLAUDE.md or .anyharness/drafts/CLAUDE.append.md
```

## Files created by Harness mode

```text
.anyharness/config.json
.anyharness/gates/
.anyharness/approvals/
.anyharness/baselines/project-scan.json
.anyharness/drafts/
ANYHARNESS.md
AGENTS.md / CLAUDE.md drafts when needed
.githooks/pre-commit
.githooks/commit-msg
.githooks/pre-push
.github/workflows/anyharness.yml or draft
```

---

## Safety model

AnyHarness is intentionally conservative:

- Installing the plugin does not modify your repository.
- `init` supports dry-run.
- Existing files are not overwritten; drafts are created instead.
- Hooks are local and deterministic.
- Hooks do not call external services.
- Real `.env` files are treated as sensitive.
- High-risk work requires human approval.
- CI should be used as the final merge gate.

---

## Repository layout

```text
plugins/claude/anyharness/      Claude Code plugin
plugins/codex/anyharness/       Codex plugin
plugins/cursor/anyharness/      Cursor Lite adapter
src/                            CLI and deterministic checker
templates/project/              Git hooks, CI, gate schemas, config templates
docs/                           Design and operational docs
ANYHARNESS.md                   Compact core rules
EXAMPLES.md                     Bad vs good AI coding examples
```

---

## Validate this repository

```bash
npm install
npm run validate
npm test
npm run check
```

Expected result:

```text
Validation passed. final AnyHarness layout is valid.
Unit tests passed.
```

---

## FAQ

### Is AnyHarness only for Claude or Codex?

No. Claude and Codex get plugin support. Cursor gets a Lite adapter. The CLI, Git hooks, and CI gates are tool-agnostic.

### Does AnyHarness replace Spec Kit?

No. Spec Kit helps drive specs, plans, tasks, and implementation. AnyHarness adds governance: risk levels, review gates, security gates, commit rules, CI checks, docs-drift checks, and approval records.

### Does Lite mode modify my repo?

No. Lite mode is just the installed skill behavior.

### Why is the npm package lowercase?

The project display name is **AnyHarness**. The package name is `anyharness` for package-manager compatibility.

### Can hooks be too strict?

Yes. Start in `advisory`, move to `enforcing`, then use `strict` only after the workflow is stable.

### Can developers bypass Git hooks?

Yes, local Git hooks can be bypassed. Use CI gates for real enforcement.

---

## License

MIT
