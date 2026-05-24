# Project Harness Profile Schema

Fields marked **required** must be present for `validate-profile.mjs` to pass.
Fields marked _optional_ are omitted from new templates but accepted when present.

```json
{
  "version": "3.0.0",            // required (string)
  "project": {                    // required (object)
    "name": "Unknown",
    "stage": "Unknown"
  },
  "aiWorkflow": {                 // required (object)
    "claude": false,
    "codex": false,
    "cursor": false
  },
  "stacks": [],                   // required (array) — e.g. ["node","nextjs"]
  "domainHypotheses": [],         // required (array) — {name, confidence, evidence[]}
  "confirmedDomains": [],         // required (array) — user-confirmed domain names
  "glossary": [],                 // required (array) — {term, definition}
  "domainModel": {                // required (object)
    "entities": [],
    "workflows": [],
    "stateMachines": []
  },
  "invariants": [],               // required (array) — {rule, rationale?, severity?}
  "riskModel": {                  // required (object)
    "redZones": [],
    "yellowZones": [],
    "escalationRules": []
  },
  "expertRoles": [],              // required (array) — {name, focus, reviewGuidance}
  "gates": [],                    // required (array) — {name, rule, enforcedBy?}
  "testOracles": [],              // required (array) — {description, test?}
  "evidenceRequirements": [],     // required (array) — {claim, evidence}
  "unknowns": [],                 // required (array) — open questions

  "aiWorkflow.speckit": false,    // optional — Spec Kit detection result
  "buildOutputs": [],             // optional — build artifact paths
  "monorepoPackages": [],         // optional — packages in a monorepo
  "learningHistory": []           // optional — evolution ledger (see below)
}
```

## Provenance on invariants and gates

Any `invariants[]` or `gates[]` entry may carry optional provenance fields:

```json
{
  "rule": "Webhook handlers must check idempotency key first",
  "rationale": "Prevents duplicate side effects on retry",
  "severity": "blocker",
  "source": "review:2026-05-24:payment-webhook-pr-142",
  "addedAt": "2026-05-24T10:32:00Z"
}
```

`source` and `addedAt` are written by `propose-evolution.mjs --confirm` when
an invariant or gate is added through the evolution loop. Manually authored
entries may omit them.

## learningHistory

Optional array of timestamped entries describing how the profile evolved:

```json
"learningHistory": [
  {
    "at": "2026-05-24T10:32:00Z",
    "trigger": "review of staged diff",
    "added": [{"type": "new-invariant", "rule": "..."}],
    "refined": [{"type": "refined-invariant", "from": "...", "to": "..."}],
    "retired": [{"type": "retired-invariant", "rule": "..."}],
    "newUnknowns": [{"type": "new-unknown", "question": "..."}]
  }
]
```

This ledger is append-only. `propose-evolution.mjs` reads it to detect duplicate
proposals (idempotency) and to retain the memory of retired invariants.

## Validation

Run `scripts/validate-profile.mjs [path/to/profile.json]` to check all required
fields are present and have the correct types. The script outputs a JSON report
(including a `nextAction` hint) and exits 1 on failure.

Optional fields (`learningHistory`, provenance on invariants) are accepted but
not required for validation to pass.

## See also

- `harness-synthesis.md` — how the profile is synthesized from evidence
- `harness-evolution.md` — how the profile evolves from review findings
- `validate-profile.mjs` — the script that enforces this schema
- `output-contract.md` — how to present profile creation results to the user
