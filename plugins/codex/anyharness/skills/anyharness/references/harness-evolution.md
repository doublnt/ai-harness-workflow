# Harness Evolution

The core problem this solves: a project harness generated once is a snapshot.
Codebases evolve, new failure modes appear, and the profile drifts out of date.
AnyHarness closes the loop by treating **each review as a learning opportunity**.

```text
review → learning candidates → user confirms → profile evolves → next review is sharper
```

## What is a learning candidate

A learning candidate is a finding from a review that could prevent **a class of
future bugs**, not just the one in front of you. It is the difference between:

- "This PR forgot to check the idempotency key." → fix the PR
- "Every payment handler in this repo must check the idempotency key." → invariant

The second is a learning candidate. The first is just a code change.

## Five candidate types

| Type | When to propose | Where it lands in profile |
|---|---|---|
| `new-invariant` | A rule the project should always follow but doesn't yet enforce | `invariants[]` |
| `refined-invariant` | An existing invariant needs more precise wording or scope | replaces existing entry in `invariants[]` |
| `new-unknown` | A question the reviewer couldn't answer without more context | `unknowns[]` |
| `new-gate` | A check that should run automatically on every change | `gates[]` |
| `retired-invariant` | An existing invariant no longer applies (code removed, design changed) | removed from `invariants[]` |

## Filter: is this actually a learning candidate?

Before proposing, ask yourself:

1. **Would this rule have prevented the bug, not just patched it?** If only this
   one file is affected and the rule wouldn't transfer to similar code paths,
   it's not an invariant — it's a code review comment.
2. **Is the rule testable or checkable?** "Be careful with money" is not an
   invariant; "all monetary calculations use Decimal, never float" is.
3. **Does it conflict with an existing invariant?** If so, propose `refined-invariant`,
   not `new-invariant`.
4. **Is the project's current behavior actually the desired one?** Don't codify
   a current mistake just because the code looks that way today.

If any of these is "no," demote the candidate to a `Non-blocking Suggestion` in
the review output instead of a Learning Candidate.

## How to phrase a good invariant

Bad: `Handle errors properly in PaymentService.`
Good: `Every PaymentService method that calls the gateway must return Result<T, PaymentError>; no exception may propagate to the caller.`

Bad: `Use idempotency keys.`
Good: `Webhook handlers under src/webhooks/ must look up the request idempotency key in payment_events table before any side effect, and short-circuit if seen.`

Properties of a good invariant:
- **Scoped**: states where it applies (file path, layer, function shape)
- **Mechanical**: a reviewer can check it without arguing about intent
- **Stated positively**: what must hold, not just what to avoid
- **One sentence**: if it takes a paragraph, split it

## Provenance

Each invariant and gate added through evolution should carry source metadata:

```json
{
  "rule": "Webhook handlers must check idempotency key first",
  "source": "review:2026-05-24:payment-webhook-pr-142",
  "addedAt": "2026-05-24T10:32:00Z"
}
```

This lets the next reviewer trust (or question) where the rule came from.

## Retiring invariants

Invariants can become stale: a feature is removed, an architecture changes, or
the rule is replaced by something stronger. When a reviewer notices that an
invariant in the profile no longer matches the code, propose `retired-invariant`
with evidence (commits or file paths showing the change).

A retired invariant goes into `learningHistory` so the project remembers it once
existed, then is removed from the active `invariants[]` array.

## The learningHistory ledger

Every confirmed evolution appends an entry to `profile.json` → `learningHistory[]`:

```json
{
  "at": "2026-05-24T10:32:00Z",
  "trigger": "review of staged diff",
  "added": [{"type": "new-invariant", "rule": "..."}],
  "refined": [],
  "retired": [],
  "newUnknowns": []
}
```

This ledger:
- prevents duplicate proposals (re-running with the same findings is a no-op)
- gives audit trail for why the harness looks the way it does
- helps onboarding ("here is how we learned what we know")

## Idempotency

`propose-evolution.mjs` must be idempotent: re-running with the same findings
file produces the same draft and never duplicates entries already present in
the profile. Detection key: invariant `rule` text (case-insensitive, trimmed).

## When NOT to evolve

Do not propose evolution when:
- The review found only style or readability issues
- The diff is too small to generalize from (single-line fixes)
- The reviewer flagged Unknowns but did not actually find a class of bugs
- The user has not yet confirmed they want learnings persisted

Default: present learning candidates in the review output, but **never write to
profile.json without explicit user confirmation** (same safety rule as initial
profile creation).

## See also

- `output-contract.md` — Learning Candidates section in review output
- `profile-schema.md` — `learningHistory` and provenance fields
- `expert-review.md` — how reviewers identify candidates during review
- `propose-evolution.mjs` — the script that drafts profile updates
