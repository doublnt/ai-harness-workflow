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
/anyharness:anyharness
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

## Quick start: Claude Code

1. Add this repository as a Claude plugin marketplace.
2. Install the `anyharness` plugin.
3. Run:

```text
/anyharness:anyharness adopt this repository safely
```

For a new project:

```text
/anyharness:anyharness initialize this new project
```

For review:

```text
/anyharness:anyharness review the current staged diff
```

For cross-model review:

```text
/anyharness:anyharness create a security review packet for the staged diff
```

## Quick start: Codex

1. Add this repository as a Codex plugin marketplace.
2. Install the `anyharness` plugin.
3. Use natural language:

```text
Use AnyHarness to adopt this repository safely.
```

Then continue:

```text
Use AnyHarness to generate project-specific expert review roles.
Use AnyHarness to review this diff against the project harness.
Use AnyHarness to create a cross-model review packet.
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

AnyHarness follows these rules:

1. Installation does not modify a repo.
2. Scanning happens before writing.
3. Existing prompt files are not overwritten; drafts are generated.
4. Domain examples are not authoritative.
5. User confirmation is required before writing profile or enforcement files.
6. Generated local scripts must be reviewable.
7. Hard enforcement is optional.

## Repository layout

```text
.claude-plugin/marketplace.json
.agents/plugins/marketplace.json
plugins/
  claude/anyharness/
    .claude-plugin/plugin.json
    skills/anyharness/
      SKILL.md
      references/
      scripts/
  codex/anyharness/
    .codex-plugin/plugin.json
    skills/anyharness/
      SKILL.md
      references/
      scripts/
standalone/
  skills/anyharness/
    SKILL.md
    references/
    scripts/
scripts/validate.mjs
test/run.mjs
```

## Development validation

This repository includes a validation script for maintainers:

```bash
npm run check
```

This is not the user installation path. It only validates the plugin package structure.
