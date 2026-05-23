# Spec Kit Compatibility

This plugin should complement Spec Kit rather than replace it.

If Spec Kit is detected, install governance as an addendum:

- keep existing spec/plan/tasks workflow
- add risk level to specs
- add human approval requirement to tasks
- add security, testing, rollback, and release gates to plans
- add red-zone file policy to implementation review

Recommended wording:

```text
This project uses Spec Kit for spec-driven development and Vibe Coding Guardrails for AI governance. Specs define what to build. Guardrails define when AI must stop, ask, test, review, or escalate.
```
