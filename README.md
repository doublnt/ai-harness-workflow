# AnyHarness v3

**Install the plugin. Run AnyHarness. Let it learn your project and generate a project-specific engineering harness for AI-assisted development.**

AnyHarness v3 is a **skill-first adaptive harness**. It is not an `npx`-first CLI and it is not a static checklist library. The normal user path is:

```text
Install plugin → run AnyHarness → scan repo → confirm domain details → generate project harness
```

The public surface is intentionally small:

```text
Use AnyHarness for this repository.
```

In Claude Code, the installed plugin may expose the namespaced skill as:

```text
/anyharness:run
```

In Codex, you can use natural language:

```text
Use AnyHarness to adopt this repository.
```

## Why v3 exists

The original problem is not only that AI-generated code needs a generic review checklist. The harder problem is that every project has different domain risks:

- a low-latency C++ market-data or trading service
- an Electron desktop client
- a Java e-commerce backend
- an AI agent platform
- a payment system
- an internal admin tool

Generic guardrails are useful, but they are not enough. AnyHarness v3 derives a **Project Harness Profile** from repository evidence and user confirmation.

## Core idea

```text
Skills reason.
Scripts assist.
Optional hooks enforce.
```

AnyHarness uses the LLM where it is strongest:

- reading project context
- discovering domain signals
- asking focused questions
- synthesizing project-specific rules
- creating expert review roles
- designing gates and test oracles
- generating cross-model review packets

Optional skill scripts handle deterministic support tasks:

- repository scanning
- diff collection
- native prompt file writing
- profile writing and validation
- review packet generation
- optional local hook installation

No global CLI is required for normal usage.

## What AnyHarness generates

By default, AnyHarness writes only native AI prompt surfaces after confirmation:

```text
CLAUDE.md      # Claude Code project instructions
AGENTS.md      # Codex and agent instructions
.cursor/rules/anyharness.mdc  # optional Cursor rule
```

If you enable Project Harness mode, it also writes:

```text
.anyharness/
  profile.json       # machine-readable project harness profile
  profile.md         # human-readable project harness profile
  gates/             # gate artifacts
  packets/           # cross-model review packets
  evidence/          # test/review evidence, if generated
```

If you enable hard enforcement, it can generate repo-local files:

```text
.anyharness/scripts/check.mjs
.githooks/pre-commit
.githooks/commit-msg
.github/workflows/anyharness.yml
```

These are generated only after explicit confirmation.

## Getting started: Claude Code

### Prerequisites

- [Claude Code](https://claude.ai/code) installed (CLI or desktop app)
- Node.js 18 or later
- This repository cloned locally:

```bash
git clone https://github.com/doublnt/ai-harness-workflow.git ~/anyharness
# or wherever you prefer
```

### Step 1 — Register as a local plugin marketplace

Open (or create) your Claude Code user settings file:

```bash
# macOS / Linux
~/.claude/settings.json

# Windows
%APPDATA%\Claude\settings.json
```

Add the `plugins` section (merge with existing content if the file already exists):

```json
{
  "plugins": {
    "marketplaces": [
      {
        "url": "file:///Users/yourname/anyharness/.claude-plugin/marketplace.json"
      }
    ]
  }
}
```

> Replace `/Users/yourname/anyharness` with the actual path where you cloned this repo.
> You can verify the path with `pwd` inside the cloned directory.

### Step 2 — Install the plugin

In Claude Code, run:

```text
/plugins install anyharness
```

Or open the plugin marketplace UI, find **anyharness**, and click Install.

### Step 3 — Verify installation

```text
/anyharness:run
```

You should see AnyHarness respond and ask what you'd like to do.

### Step 4 — Use it on your project

Open (or `cd` into) the project you want to analyze. Then:

**Adopt an existing project:**

```text
/anyharness:run adopt this repository safely
```

**Initialize a new project:**

```text
/anyharness:run initialize this new project
```

**Review staged changes:**

```text
/anyharness:run review the current staged diff
```

**Generate a cross-model review packet:**

```text
/anyharness:run create a security review packet for the staged diff
```

AnyHarness will guide you through the rest interactively — scanning, asking questions,
and confirming before writing any files.

---

## Getting started: Codex

### Prerequisites

- Codex with plugin support enabled
- This repository cloned or accessible locally

### Step 1 — Register as a local plugin marketplace

In your Codex configuration, add:

```json
{
  "plugins": {
    "marketplaces": [
      {
        "url": "file:///Users/yourname/anyharness/.agents/plugins/marketplace.json"
      }
    ]
  }
}
```

### Step 2 — Install the plugin

```text
Install the anyharness plugin.
```

### Step 3 — Use natural language

```text
Use AnyHarness to adopt this repository safely.
```

Then continue the conversation:

```text
Use AnyHarness to generate project-specific expert review roles.
Use AnyHarness to review this diff against the project harness.
Use AnyHarness to create a cross-model review packet.
```

---

## What happens during first run

When you ask AnyHarness to adopt or initialize a project, it follows this sequence
**without writing anything until you confirm**:

1. **Scan** — reads your project files, detects stack and AI workflow files
2. **Hypothesize** — proposes domain signals with evidence and confidence levels
3. **Ask** — poses 5–12 focused questions about your project's specific rules
4. **Propose** — shows what files it would create (CLAUDE.md, profile.json, etc.)
5. **Write** — only writes after you confirm each step

Example first-run output:

```text
Scan complete. 847 files scanned.

Stack: Node.js, React, PostgreSQL
AI workflow: CLAUDE.md detected

Domain hypotheses:
- ecommerce/payment: medium confidence
  Evidence: src/payment/, src/orders/, docs/checkout.md

Unknowns:
- Whether payment callbacks can repeat
- How inventory reservation works

Questions:
1. Can payment callbacks be delivered more than once?
2. Is order price frozen at checkout or at payment time?
3. Is inventory reserved immediately or only after payment?

(Reply to answer. I won't write anything until you confirm.)
```

## New project workflow

Ask:

```text
Use AnyHarness to initialize this new project.
```

AnyHarness will:

1. perform a read-only scan
2. detect AI workflow files such as `CLAUDE.md`, `AGENTS.md`, `.cursor/rules`
3. detect stack signals such as Java, C++, Rust, TypeScript, Electron, React, Spring, etc.
4. detect domain hypotheses from code, docs, routes, schema, tests, and names
5. ask focused questions
6. generate native prompt surfaces
7. generate a project-specific harness profile
8. offer optional local enforcement

## Existing project workflow

Ask:

```text
Use AnyHarness to adopt this existing repository safely.
```

Default behavior for existing projects:

- read-only scan first
- no overwrite
- draft native prompt changes if `CLAUDE.md` or `AGENTS.md` already exists
- generate domain hypotheses with evidence
- ask for confirmation before writing
- do not install hooks unless explicitly requested

## Domain discovery workflow

AnyHarness does not ship authoritative domain packs. Instead, it produces domain hypotheses.

Example output:

```text
Domain hypotheses:
- ecommerce/payment: confidence medium
- inventory consistency: confidence medium

Evidence:
- src/payment/PaymentCallbackController.java
- src/order/OrderService.java
- migrations/create_inventory_reservations.sql
- docs/checkout.md

Unknowns:
- whether payment callbacks can repeat
- whether inventory is reserved or deducted immediately
- where order state transitions are defined
```

Then it asks focused questions:

```text
1. Can payment callbacks be delivered more than once?
2. Is order final price frozen at order creation?
3. Is inventory reserved at checkout or deducted at payment success?
4. Does fulfillment happen immediately after payment success?
```

Only after user confirmation does it synthesize project rules.

## Expert review roles

AnyHarness creates project-specific roles from the project harness profile.

Examples:

```text
Payment Idempotency Reviewer
Inventory Consistency Reviewer
Electron IPC Boundary Reviewer
Low-Latency C++ Reviewer
Order State Machine Reviewer
Architecture Trade-off Reviewer
Performance and Memory Reviewer
Release Readiness Reviewer
```

The roles are not just labels. Each one includes:

- scope
- required context
- project-specific invariants
- blocker criteria
- required evidence
- output schema

## Review packets

A review packet solves the common problem: another model reviews code without enough context.

Ask:

```text
Use AnyHarness to create a security review packet for the staged diff.
```

Generated packet:

```text
.anyharness/packets/<id>/
  PROMPT.md
  PROJECT_PROFILE.md
  DIFF.patch
  CHANGED_FILES.txt
  RELEVANT_FILES.md
  GATE_REQUIREMENTS.md
  DOMAIN_INVARIANTS.md
  UNKNOWN.md
```

You can give that packet to another model and ask it to perform one expert role only.

## Modes

| Mode | What it does | Best for |
|---|---|---|
| Skill-only | LLM interaction, domain discovery, prompt surfaces, review packets | solo developers, exploration |
| Project Harness | Adds `.anyharness/profile.json` and gates | serious personal projects, small teams |
| Enforcement | Adds local scripts, Git hooks, CI workflow | teams and production repositories |

## Safety model

AnyHarness follows ten rules. See `plugins/claude/anyharness/skills/anyharness/references/safety.md` for the full rationale.

1. Installation does not modify a repo.
2. Start with read-only analysis.
3. Existing prompt files are not overwritten; drafts are generated.
4. Domain examples are not authoritative rules.
5. Domain-sensitive conclusions must include evidence and confidence.
6. Ask focused questions before finalizing invariants.
7. Keep the first user experience simple.
8. Do not install hooks without explicit confirmation.
9. Generated enforcement scripts must be repo-local and reviewable.
10. Do not read secrets or credentials files.

## Repository layout

```text
.claude-plugin/marketplace.json       # Anthropic plugin marketplace entry
.agents/plugins/marketplace.json      # Codex plugin marketplace entry
plugins/
  claude/anyharness/
    .claude-plugin/plugin.json        # Anthropic plugin manifest (skills array format)
    skills/anyharness/
      SKILL.md                        # Claude skill (standard version)
      SKILL.codex.md                  # Codex overlay source (lighter, tool-calling focus)
      references/                     # 11 reference files (single source of truth)
      scripts/                        # 7 deterministic helper scripts
  codex/anyharness/
    .codex-plugin/plugin.json         # Codex plugin manifest (includes tools array)
    skills/anyharness/
      SKILL.md                        # ← generated from SKILL.codex.md by sync script
      references/                     # ← synced from claude source
      scripts/                        # ← synced from claude source
standalone/
  skills/anyharness/
    SKILL.md                          # ← synced from claude source
    references/                       # ← synced from claude source
    scripts/                          # ← synced from claude source
scripts/
  validate.mjs                        # structural validation
  sync-distributions.mjs              # single-source sync (with stale file cleanup)
test/
  run.mjs
  fixtures/
    profile.valid.json
    profile.invalid.json
```

The `plugins/claude/anyharness/skills/anyharness/` directory is the **single source of truth**.
All changes must be made there; run `node scripts/sync-distributions.mjs` to propagate to the
other two distributions. The Codex distribution automatically receives `SKILL.codex.md` as its
`SKILL.md` (if present), giving it a lighter tool-calling–focused skill file.

## Development validation

```bash
npm run check
```

This validates: required files, JSON structure, skill frontmatter, Codex tools schema,
plugin.json formats, distribution drift, and all behavioral tests. This is not the user
installation path.
