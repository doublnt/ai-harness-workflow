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
  "monorepoPackages": []          // optional — packages in a monorepo
}
```

## Validation

Run `scripts/validate-profile.mjs [path/to/profile.json]` to check all required
fields are present and have the correct types. The script outputs a JSON report
(including a `nextAction` hint) and exits 1 on failure.

## See also

- `harness-synthesis.md` — how the profile is synthesized from evidence
- `validate-profile.mjs` — the script that enforces this schema
- `output-contract.md` — how to present profile creation results to the user
