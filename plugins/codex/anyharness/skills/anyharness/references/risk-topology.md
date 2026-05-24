# Risk Topology

Risk topology is the layer that converts an **architecture extraction** into
**named risk findings** that can be presented to the user and (with consent)
turned into project invariants via the evolution loop.

This is what makes AnyHarness an **architectural cognition aid**, not just a
review checklist organizer.

```text
extract-architecture.mjs        derive-risk-topology.mjs       propose-evolution.mjs
       │                                │                              │
       ▼                                ▼                              ▼
  components[]    ─────────►     risks[]               ─────►   profile.json
  (annotated +    (correlated +    (severity +                   (invariants,
   method calls)   stack-aware     citations +                    gates,
                   reasoning)      Learning                       unknowns)
                                   Candidate)
```

## Why this is the load-bearing piece

The extractor sees "OrderService has a `@Transactional` method and a
`kafkaTemplate.send`". The risk topology layer is the one that says:

> Those two facts together are a **dual-write** — a class of bug that warrants
> a project-wide rule (the transactional outbox pattern), not a one-off code
> review comment.

Without this layer, the extraction is just data. With it, the data becomes
**knowledge about the system's failure modes**.

## Findings shape

```json
{
  "kind": "dual-write | tx-self-invocation | requires-new-pool | external-no-retry-hint | missing-modifying | kafka-no-idempotency | trust-boundary | ...",
  "severity": "blocker | high | medium | low",
  "title": "<short, scoped sentence>",
  "evidence": ["file:line", "file:line"],
  "candidate": {
    "type": "new-invariant | new-unknown | new-gate | refined-invariant | retired-invariant",
    "proposed" | "question": "<text>",
    "rationale": "<why this is a class of bug>"
  }
}
```

The `candidate` field is **pre-formatted to feed directly into
`propose-evolution.mjs`**. The skill workflow:

1. Run extraction.
2. Run topology derivation.
3. Show the user the risks (grouped by severity).
4. Ask which Learning Candidates to apply.
5. Pass the agreed candidates as a findings JSON to
   `propose-evolution.mjs --confirm` to merge them into `.anyharness/profile.json`.

This closes the loop: **the architecture analysis directly produces invariants
the project will be measured against going forward**.

## Severity rubric

- **blocker**: silent failure mode or correctness-critical (e.g., missing `@Modifying`)
- **high**: known production-incident pattern (dual-write, self-invocation, non-idempotent Kafka)
- **medium**: needs verification by reading more context (REQUIRES_NEW, external call without visible retry)
- **low**: stylistic or low-impact

The PoC currently emits 8 risk kinds for `java-spring`. The full set will grow
as the knowledge packs deepen.

## Why not just ask the LLM directly?

A skilled developer with the right prompt can get an LLM to find many of these
risks. The value of the topology layer is:

1. **Deterministic, reproducible findings.** The same code produces the same
   findings every time, regardless of model or prompt variation.
2. **Citations.** Every finding has `file:line`. The reviewer can verify.
3. **Composable with the evolve loop.** Each finding produces a
   ready-to-merge Learning Candidate.
4. **Stack expertise scales.** Adding a new failure mode is a few lines of code
   plus a knowledge pack entry, not a prompt rewrite.

## Limits

This layer reasons over what the extractor finds. If the extractor misses a
pattern (e.g., multi-line annotations), the risk layer misses the
corresponding finding. The PoC is conservative — false negatives are accepted.

The LLM remains responsible for:
- Reviewing extraction-derived findings against actual source
- Catching patterns the extractor cannot see (subtle invariants, business logic)
- Asking the user when the extraction can't determine intent

## See also

- `architecture-extraction.md` — the input layer
- `stacks/java-spring.md` — the knowledge pack the risk rules draw from
- `harness-evolution.md` — how candidates become project invariants
- `derive-risk-topology.mjs` — the script
