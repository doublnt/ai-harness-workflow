# AnyHarness 2.2

**AnyHarness** is an AI coding harness. It does two things:

1. **Injects rules into the LLM** through the native files your tools already read: `CLAUDE.md`, `AGENTS.md`, Cursor rules, and Claude/Codex skills.
2. **Enforces those rules** with `npx anyharness`, agent hooks, Git hooks, CI gates, gate artifacts, approval records, commit-message checks, and docs-drift checks.

The v2.2 usage model is intentionally simple:

```bash
# New project: one command
npx anyharness new

# Existing project: one safe command
npx anyharness adopt
```

Advanced commands still exist, but most users should start with `new` or `adopt`.

---

## Why `npx anyharness` is the key entry point

The prompt is what the LLM reads. The harness is what proves the project actually followed the prompt.

```text
Prompt surfaces       = CLAUDE.md / AGENTS.md / Cursor rules / plugin skills
npx anyharness        = scanner + installer + checker + gate runner
Agent hooks           = block unsafe AI tool use while the agent works
Git hooks             = block unsafe commits before they land
CI gates              = block unsafe PRs even if local hooks are bypassed
Gate artifacts        = machine-readable evidence for high-risk changes
```

You can use AnyHarness in three levels:

| Level | Main command | What it does | Best for |
|---|---|---|---|
| Lite | `npx anyharness prompt --target core` | Prints rules only; writes nothing | Trying the idea in one AI session |
| Project | `npx anyharness adopt` | Adds native prompt surfaces safely | Existing repos, solo projects |
| Harness | `npx anyharness new` or `npx anyharness adopt --enforce` | Adds prompts + hooks + CI + gates | New repos, teams, production systems |

---

## The four rules injected into the LLM

Every prompt surface installed by AnyHarness carries these rules:

1. **Classify Risk First**  
   Every task must be classified as L0, L1, L2, or L3 before implementation.

2. **Keep Changes Surgical**  
   Every changed line must trace back to the user's request. No opportunistic refactors.

3. **Require Evidence**  
   Do not claim success unless there is evidence: commands run, tests, files changed, gate artifacts, or explicit untested risks.

4. **Block Unsafe Work**  
   Secrets, migrations, authentication, authorization, payments, production data, CI/CD, deploy configs, and agent governance files require gates and approval.

---

## New project: one command

Use this when you are starting a repo and want AnyHarness active from day one.

```bash
npx anyharness new
```

This expands to a full harness setup:

```text
profile: harness
mode: enforcing
target: both
write prompts: CLAUDE.md + AGENTS.md
install Git hooks: yes
write CI template: yes
create .anyharness/config.json: yes
save scan baseline: yes
```

It creates or drafts:

```text
CLAUDE.md
AGENTS.md
.anyharness/config.json
.anyharness/baselines/project-scan.json
.anyharness/gates/
.anyharness/approvals/
.githooks/pre-commit
.githooks/commit-msg
.githooks/pre-push
.github/workflows/anyharness.yml
```

If a file already exists, AnyHarness does not overwrite it. It writes a draft under:

```text
.anyharness/drafts/
```

### New project example

```bash
mkdir my-app
cd my-app
git init
npm init -y
npx anyharness new
```

Then ask your AI coding agent:

```text
Read CLAUDE.md and AGENTS.md. Use AnyHarness rules to plan a password reset feature. Classify risk first, keep the change surgical, and include tests or untested risks.
```

Before committing:

```bash
npx anyharness check --staged
git commit -m "feat(auth): add password reset request [risk:L2]" \
  -m "Risk-Level: L2" \
  -m "Gate-Review: .anyharness/gates/password-reset.json" \
  -m "Tests: npm test" \
  -m "Human-Approval: required" \
  -m "Rollback: docs/release/password-reset.md"
```

---

## Existing project: one safe command

Use this when the repo already has code, docs, AI instructions, CI, or team conventions.

```bash
npx anyharness adopt
```

This is deliberately conservative:

```text
profile: project
mode: advisory
target: detect
write prompts: native files or drafts
install Git hooks: no
write CI template: no
overwrite existing files: never
```

It scans the repo and creates:

```text
.anyharness/config.json
.anyharness/baselines/project-scan.json
.anyharness/drafts/        # when CLAUDE.md or AGENTS.md already exists
```

If your repo already has `CLAUDE.md` or `AGENTS.md`, AnyHarness writes append drafts instead of overwriting:

```text
.anyharness/drafts/CLAUDE.append.md
.anyharness/drafts/AGENTS.append.md
```

You review and merge those manually.

### Existing project example

```bash
cd existing-repo
npx anyharness adopt
```

Then inspect:

```bash
cat .anyharness/baselines/project-scan.json
ls .anyharness/drafts
```

Ask your AI agent:

```text
Read the AnyHarness draft under .anyharness/drafts and propose the smallest safe merge into our existing CLAUDE.md or AGENTS.md. Do not overwrite existing instructions.
```

When the team is ready to enforce the rules:

```bash
npx anyharness adopt --enforce
```

`adopt --enforce` is the old-project equivalent of the full harness setup. It writes CI and installs Git hooks, but still refuses to overwrite existing prompt files.

---

## What happened to the old two-command setup?

Before v2.2, full harness setup was shown as two commands:

```bash
npx anyharness init --profile harness --target both --mode enforcing --install-hooks
npx anyharness ci-template --write
```

In v2.2, this is replaced by:

```bash
npx anyharness new
```

For existing projects, use:

```bash
npx anyharness adopt --enforce
```

The lower-level commands still exist for advanced use, but README examples now use the one-command presets.

---

## Quick command reference

### Recommended commands

```bash
npx anyharness new                 # New project, full harness
npx anyharness adopt               # Existing project, safe advisory adoption
npx anyharness adopt --enforce     # Existing project, full harness after review
```

### Prompt-only commands

```bash
npx anyharness prompt --target core
npx anyharness prompt --target claude --write
npx anyharness prompt --target codex --write
npx anyharness prompt --target cursor --write
npx anyharness prompt --target both --write
```

### Checker commands

```bash
npx anyharness scan --json
npx anyharness check --staged
npx anyharness check --push
npx anyharness check --ci
npx anyharness commit-msg .git/COMMIT_EDITMSG
npx anyharness doctor
```

### Advanced setup commands

```bash
npx anyharness init --profile project --target detect --mode advisory
npx anyharness init --profile harness --target both --mode enforcing --install-hooks
npx anyharness ci-template --write
npx anyharness install-hooks
npx anyharness uninstall-hooks
```

---

## Claude Code usage

Install the plugin from a local marketplace during development:

```text
/plugin marketplace add ./path/to/AnyHarness-v2.2
/plugin install anyharness@anyharness
```

Then use:

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

For most repos, still start with the CLI:

```bash
npx anyharness new       # new repo
npx anyharness adopt     # existing repo
```

The CLI installs the repo-local prompt surfaces and enforcement files. The plugin gives Claude interactive workflows.

---

## Codex usage

Install the plugin from a local marketplace during development:

```text
codex plugin marketplace add ./path/to/AnyHarness-v2.2
```

Then ask Codex:

```text
Use AnyHarness to initialize this repository.
Use AnyHarness to review this diff.
Use AnyHarness to prepare a release check.
```

For persistent project instructions, use:

```bash
npx anyharness prompt --target codex --write
```

This writes `AGENTS.md` or drafts `.anyharness/drafts/AGENTS.append.md` if `AGENTS.md` already exists.

---

## Cursor usage

Cursor support is lightweight by default:

```bash
npx anyharness prompt --target cursor --write
```

This writes:

```text
.cursor/rules/anyharness.mdc
```

Cursor rules inject the behavioral guardrails. Full enforcement still comes from the CLI, Git hooks, and CI:

```bash
npx anyharness new
# or
npx anyharness adopt --enforce
```

---

## Risk levels

| Level | Meaning | Examples | Gates |
|---|---|---|---|
| L0 | Low risk | docs, UI copy, small style changes | self-check |
| L1 | Normal feature | CRUD, ordinary UI/API work | requirement + test plan |
| L2 | Core/sensitive | auth, authorization, file upload, database schema, external API | design + security + tests + approval |
| L3 | Critical/irreversible | production data, migration, public API break, architecture shift | full design + migration + rollback + CI + explicit approval |

Any change touching secrets, migrations, auth, payments, CI/CD, deployment, public API, or production data is escalated.

---

## Commit message gate

AnyHarness expects commit messages to include a risk tag:

```text
feat(auth): rotate refresh tokens [risk:L2]
```

For L2/L3 changes, add trailers:

```text
Risk-Level: L2
Gate-Review: .anyharness/gates/refresh-token.json
Security-Review: .anyharness/gates/refresh-token-security.json
Tests: npm test
Human-Approval: required
Rollback: docs/release/refresh-token.md
```

The `commit-msg` hook blocks missing risk metadata when enforcement is enabled.

---

## Gate artifacts

High-risk changes need machine-readable evidence:

```text
.anyharness/gates/<change-id>.json
.anyharness/approvals/<change-id>.json
```

Example:

```bash
npx anyharness gate create --task "rotate refresh tokens" --risk L2 --gates design,security,test,release
npx anyharness gate approve <gate-id> --notes "Approved after design and security review."
```

These artifacts allow hooks and CI to verify that the AI did not merely claim the change was safe.

---

## Docs drift gate

AnyHarness checks whether code changes imply documentation updates.

Examples:

| Changed area | Expected evidence |
|---|---|
| API routes / OpenAPI / GraphQL / proto | API docs or docs-impact justification |
| database schema / migrations | migration plan, rollback plan, data docs |
| auth / security | security review artifact |
| `.env.example` / deploy config | deployment docs |
| `CLAUDE.md` / `AGENTS.md` / `.claude` / `.codex` | governance change note |

If docs do not need updating, record the reason in a gate artifact instead of silently skipping it.

---

## Safety model

AnyHarness intentionally separates prompt instructions from enforcement:

```text
LLM rules can guide.
Hooks and CI can block.
Gate artifacts can prove.
Humans still approve irreversible work.
```

Local Git hooks are convenience gates. CI is the final enforcement layer because local hooks can be bypassed.

---

## Development

```bash
npm run validate
npm test
npm run check
```

The validation script checks plugin manifests, skills, hooks, marketplace files, prompt surfaces, package metadata, and core project layout.
