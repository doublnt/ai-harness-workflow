# Operating Model

AnyHarness v3 uses a skill-first model.

## Planes

1. **Reasoning plane**: the skill reads repository evidence, asks questions, and synthesizes a project harness.
2. **Prompt surface plane**: the skill writes native AI instructions such as `CLAUDE.md`, `AGENTS.md`, or Cursor rules after confirmation.
3. **Profile plane**: the skill writes `.anyharness/profile.json` and `.anyharness/profile.md` after confirmation.
4. **Optional enforcement plane**: the skill can generate local scripts, Git hooks, and CI workflows after explicit confirmation.

## Three loops

A static harness rots. AnyHarness is structured as three connected loops, and the
**evolve loop** is the one that distinguishes it from a one-shot CLAUDE.md generator.

```text
        ┌──────────────────────────────────────────────────┐
        │                                                  │
        ▼                                                  │
   ┌─────────┐     ┌────────┐     ┌────────┐     ┌─────────┴───┐
   │ INIT    │ ──► │ REVIEW │ ──► │ EVOLVE │ ──► │ profile.json│
   │ (adopt) │     │ (diff) │     │        │     │ + ledger    │
   └─────────┘     └────────┘     └────────┘     └─────────────┘
```

### 1. Init loop (`initialize` / `adopt`)
- Read-only scan → hypotheses → focused questions → user confirmation → profile + native prompts.
- Runs once per project, then occasionally on major architecture changes.

### 2. Review loop (`review` / `review packet`)
- Diff + profile → expert roles → Blockers / Needs Changes / Suggestions / **Learning Candidates**.
- Runs every time AI-generated code is about to land.

### 3. Evolve loop (`harness-evolution.md`)
- Learning Candidates → user confirms → `propose-evolution.mjs --confirm` → profile gets sharper.
- Closes the feedback loop: next review uses a profile shaped by what previous reviews found.
- Every confirmed evolution appends a `learningHistory` entry, giving the profile an audit trail.

The init loop bootstraps the profile. The review loop uses it. The evolve loop
keeps it alive. **Without evolution, AnyHarness is a snapshot — with it, it is a
learning system.**

## No npx-first path

AnyHarness does not require a user-facing `npx` command. Scripts live inside the skill and are implementation details.
