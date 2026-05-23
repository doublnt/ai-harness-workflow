# Project Harness Profile Schema

Minimal shape:

```json
{
  "version": "3.0.0",
  "project": {
    "name": "Unknown",
    "stage": "Unknown"
  },
  "aiWorkflow": {
    "claude": false,
    "codex": false,
    "cursor": false
  },
  "stacks": [],
  "domainHypotheses": [],
  "confirmedDomains": [],
  "glossary": [],
  "domainModel": {
    "entities": [],
    "workflows": [],
    "stateMachines": []
  },
  "invariants": [],
  "riskModel": {
    "redZones": [],
    "yellowZones": [],
    "escalationRules": []
  },
  "expertRoles": [],
  "gates": [],
  "testOracles": [],
  "evidenceRequirements": [],
  "unknowns": []
}
```
