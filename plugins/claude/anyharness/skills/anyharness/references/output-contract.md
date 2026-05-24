# Output Contract

## initialize/adopt

```text
Project Scan Summary:
AI Workflow:
Stack Hypotheses:
Domain Hypotheses:
Evidence:
Unknowns:
Questions:
Proposed Harness:
Files Proposed:
Confirmation Needed:
```

**Success example**: All sections present; Questions contains 5–12 targeted items; Unknowns lists anything that couldn't be inferred.
**Failure / partial example**: If scan returned zero files, note it in Unknowns and ask the user to confirm the root path.

## review

```text
Summary:
Selected Expert Roles:
Scope:
Evidence:
Blockers:
Needs Changes:
Non-blocking Suggestions:
Unknowns:
Required Tests / Evidence:
Verdict:
Learning Candidates:
```

**Success example**: Blockers section is empty or lists specific findings with file+line citations; Verdict is Pass or Blocked with reasoning.
**Failure example**: If diff is empty, report it as an error and ask the user to stage changes or provide a diff manually.

### Learning Candidates section

Every review output ends with a `Learning Candidates` section. Each entry is a
proposed update to the project harness profile. See `harness-evolution.md` for
when something qualifies as a candidate vs a one-off code review comment.

Each candidate has this structured form:

```text
- type: new-invariant | refined-invariant | retired-invariant | new-unknown | new-gate
  proposed: <one-sentence rule, scoped and testable>
  evidence: <file paths, line numbers, or finding ID from this review>
  rationale: <why this is a class of bug, not a one-off>
```

**Success example** (review found a generalizable rule):
```text
Learning Candidates:
- type: new-invariant
  proposed: Webhook handlers under src/webhooks/ must look up the idempotency key in payment_events before any side effect.
  evidence: src/webhooks/PaymentWebhook.java:42 (this PR), src/webhooks/RefundWebhook.java:31 (existing code with same flaw)
  rationale: Two handlers already exhibit the missing check; new handlers will repeat the pattern.
```

**Skip example** (nothing generalizable):
```text
Learning Candidates:
- (none — findings were code-specific; see Non-blocking Suggestions)
```

After presenting candidates, ask the user: *"Apply any of these to the profile?"*
Only call `propose-evolution.mjs --confirm` after explicit user agreement.

## evolve (harness learning)

```text
Current profile invariants: N
Proposed changes:
  + N new invariants
  ~ N refined invariants
  - N retired invariants
  ? N new unknowns
  + N new gates
Draft saved to: .anyharness/drafts/profile.evolved.json
Diff:
  <unified diff against current profile.json>
Confirmation Needed:
```

**Success example**: Draft contains every confirmed candidate, no duplicates of
existing invariants, and a `learningHistory` entry would be appended on confirm.
**Failure example**: If proposed candidates duplicate existing invariants, list
them under "Already in profile" rather than dropping silently.

## review packet

```text
Packet created: .anyharness/packets/<id>/
Files: PROMPT.md PROJECT_PROFILE.md CHANGED_FILES.txt DIFF.patch GATE_REQUIREMENTS.md DOMAIN_INVARIANTS.md RELEVANT_FILES.md UNKNOWN.md
Next step: Give the packet directory to another model and ask it to perform one role only.
```

**Success example**: GATE_REQUIREMENTS.md and DOMAIN_INVARIANTS.md contain real project content from profile.json (not placeholder text).
**Failure example**: If diff is empty, exit with code 1 and explain how to stage changes.

## writes

```text
Files Created:
Files Drafted:
Files Not Modified:
Remaining Unknowns:
Next Steps:
```

**Success example**: Files Drafted lists `.anyharness/drafts/` paths when target files already existed; no existing file was silently overwritten.
**Failure example**: If `--confirm` is missing, report "drafted" and include the path to review the draft.
