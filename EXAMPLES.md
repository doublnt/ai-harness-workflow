# AnyHarness v3 Examples

## 1. Existing Java e-commerce project

```text
Use AnyHarness to adopt this existing repository safely.
```

AnyHarness runs `scan-project.mjs` and reports:

```text
Detected stack: Java / Spring Boot, SQL migrations
Domain hypotheses:
- ecommerce/payment: medium confidence
  Evidence: OrderService.java, PaymentCallbackController.java, docs/checkout.md
- inventory consistency: medium confidence
  Evidence: InventoryReservationRepository.java, migrations/

Unknowns:
- Whether payment callbacks can repeat
- Whether inventory is reserved at checkout or deducted at payment success
- Whether order final price is frozen at creation

Questions (5 of 12):
1. Can payment callbacks be delivered more than once?
2. Is order final price frozen at order creation?
3. Is inventory reserved at checkout or deducted at payment success?
4. What is the idempotency key for payment events?
5. What happens on partial payment failure?
```

After the user answers, AnyHarness:

1. Internally calls `write-profile.mjs` → draft lands at `.anyharness/drafts/profile.json`
2. Presents the draft; after user review and confirmation, calls `write-profile.mjs --confirm`
3. Internally calls `write-native-prompts.mjs --target both --profile .anyharness/profile.json`

Generated `CLAUDE.md` includes the project name, confirmed domains, and invariants pulled
from the profile rather than generic placeholder text.

> The user never types these commands. AnyHarness decides when and how to call its internal
> scripts based on the conversation.

---

## 2. Electron desktop client

```text
Use AnyHarness to adopt this existing repository safely.
```

AnyHarness discovers:

```text
Detected stack: node, electron
Domain hypotheses:
- electron-desktop-client: medium confidence
  Evidence: src/main.ts, src/preload.ts, src/renderer/, electron-builder.json

Questions:
1. Does the renderer process load remote URLs?
2. What preload APIs are exposed to the renderer?
3. Is IPC input validated and allowlisted?
4. Where are auth tokens stored?
5. Is the auto-updater using signed updates?
```

Generated expert roles include:

```text
Electron Security Reviewer
IPC Boundary Reviewer
Local Storage and Secrets Reviewer
Desktop Release Reviewer
```

---

## 3. C++ trading service

```text
Use AnyHarness to initialize this new project.
```

AnyHarness detects:

```text
Detected stack: cpp
Domain hypotheses:
- finance-trading-or-market-data: medium confidence
  Evidence: src/market_data/, src/order_book/, src/execution_report.h

Questions:
1. Is there a latency SLO? If so, what is it?
2. Is the hot path required to be allocation-free?
3. How are duplicate or out-of-order execution reports handled?
4. Where is the order state machine defined?
5. Where is risk checked before order routing?
```

Generated gates include:

```text
- no-heap-alloc-in-hot-path: changes to src/hot/ must be reviewed for allocations
- risk-check-before-route: every order path must pass through risk_check()
```

---

## 4. AI agent / LLM application

```text
Use AnyHarness to adopt this repository safely.
```

AnyHarness detects:

```text
Detected stack: node, frontend
Domain hypotheses:
- ai-agent-or-llm-app: medium confidence
  Evidence: src/agents/, src/tools/, anthropic dependency in package.json

Questions:
1. Are tool call results validated before the agent acts on them?
2. Can external data sources inject instructions into prompts?
3. Are LLM outputs treated as untrusted until validated?
4. How are model API failures and rate limits handled?
5. Is there a cost guard or token budget?
```

Generated expert roles include:

```text
Prompt Injection Reviewer
Tool Call Safety Reviewer
LLM Output Validation Reviewer
Agent Cost and Rate Limit Reviewer
```

---

## 5. Review the current diff

```text
Use AnyHarness to review the current staged diff.
```

AnyHarness internally:

1. Calls `collect-diff.mjs --mode staged` to get changed files and the diff.
2. Reads `.anyharness/profile.json` for confirmed invariants and gates.
3. Selects relevant expert roles from the profile.
4. Outputs:

```text
Summary: 3 files changed in payment processing path.
Selected Expert Roles: Payment Idempotency Reviewer, Order State Machine Reviewer
Scope: src/payment/PaymentService.java, src/order/OrderStateMachine.java
Blockers:
  - Payment handler does not check idempotency key before processing (invariant violation)
Needs Changes:
  - Missing test for duplicate callback scenario
Non-blocking Suggestions:
  - Consider extracting signature verification to a shared utility
Unknowns:
  - Whether the new retry logic interacts with the existing idempotency guard
Verdict: Blocked
```

---

## 6. Cross-model review packet

```text
Use AnyHarness to create a security review packet for the staged diff.
```

AnyHarness internally calls `generate-review-packet.mjs --role security-reviewer --mode both --max-diff-kb 500` and reports the packet location.

Generated packet at `.anyharness/packets/<id>/`:

```text
PROMPT.md            ← instructs the reviewing model to perform one role only
PROJECT_PROFILE.md   ← project harness with confirmed domains and invariants
CHANGED_FILES.txt    ← list of changed files
DIFF.patch           ← diff (truncated if > 500 KB; diffTruncated:true in output)
GATE_REQUIREMENTS.md ← real gates from profile.json, not placeholder text
DOMAIN_INVARIANTS.md ← real invariants from profile.json
RELEVANT_FILES.md    ← which files changed
UNKNOWN.md           ← for the reviewer to fill in
```

Give the packet directory to another model and ask:

```text
Review this packet as a security-reviewer. Do not implement code.
Output Blockers / Needs Changes / Pass with citations.
```

---

## 7. Enable local enforcement

```text
Use AnyHarness to enable local enforcement for this project.
```

AnyHarness first shows a dry-run (no files written):

```text
Would create:
- .anyharness/scripts/check.mjs
- .githooks/pre-commit
- .githooks/commit-msg
- .github/workflows/anyharness.yml
Would run: git config core.hooksPath .githooks
```

After the user confirms, AnyHarness internally calls `install-local-hooks.mjs --confirm`.

The generated `check.mjs` supports `--skip-if-no-profile` so CI does not fail on
repositories that have not set up a profile yet.

---

## 8. Evolve the harness from a review (feedback loop)

This is the closed loop that makes the harness a learning system. After a review,
findings that represent a class of bug — not just a one-off — become invariants
in the profile, so the next review is sharper.

```text
Use AnyHarness to review the current staged diff.
```

AnyHarness runs the review and ends with a Learning Candidates section:

```text
Verdict: Blocked

Learning Candidates:
- type: new-invariant
  proposed: Webhook handlers under src/webhooks/ must look up the idempotency
            key in payment_events before any side effect.
  evidence: src/webhooks/PaymentWebhook.java:42 (this PR),
            src/webhooks/RefundWebhook.java:31 (existing code with same flaw)
  rationale: Two handlers already exhibit the missing check; new handlers will
             repeat the pattern.

- type: new-gate
  proposed: Changes to src/webhooks/ require an idempotency-key test.
  evidence: recurring pattern across 3 prior PRs
  rationale: Generalizable check, not a one-off review note.

- type: new-unknown
  question: Does the retry queue interact with the idempotency guard?
  evidence: ambiguous in PaymentService.retry()

Apply any of these to the profile?
```

The user replies:

```text
Apply all three.
```

AnyHarness internally writes a findings JSON and calls
`propose-evolution.mjs --findings <path>` to draft the merged profile:

```text
Current profile invariants: 7
Proposed changes:
  + 1 new invariants
  ~ 0 refined invariants
  - 0 retired invariants
  ? 1 new unknowns
  + 1 new gates
Draft saved to: .anyharness/drafts/profile.evolved.json
Confirmation Needed: review the draft, then confirm to merge into profile.json.
```

After the user confirms, AnyHarness calls
`propose-evolution.mjs --findings <path> --confirm`:

```text
{
  "action": "evolved",
  "profile": ".anyharness/profile.json",
  "learningHistoryEntries": 1,
  "accepted": { "added": 1, "refined": 0, "retired": 0, "newUnknowns": 1, "newGates": 1 }
}
```

The next review now treats the new invariant as a hard rule. The profile carries
a `learningHistory` entry with timestamp, trigger, and what was learned —
the harness has visibly evolved.

Re-running the same findings is a no-op (idempotency). Refining or retiring
existing invariants works the same way (`type: refined-invariant` or
`type: retired-invariant`).

> See `references/harness-evolution.md` for the candidate-type schema and the
> filter for what counts as a real learning candidate vs a one-off comment.
