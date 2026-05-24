# Harness Synthesis

The Project Harness Profile is generated from repository evidence and user confirmation.

## Required sections

- Project summary
- AI workflow
- Stack profile
- Domain hypotheses and confirmed domains
- Glossary
- Domain model
- Workflows and state machines
- Invariants
- Risk model
- Red zones and yellow zones
- Expert review roles
- Gates
- Test oracles
- Evidence requirements
- Unknowns

## Rule

Do not finalize a critical domain invariant without either repository evidence or user confirmation.

## See also

- `domain-discovery.md` — how to gather evidence and form hypotheses
- `profile-schema.md` — required fields and types for the output profile JSON
- `expert-review.md` — schema for the `expertRoles` section of the profile
- `gate-runtime.md` — how `gates` are enforced at runtime
