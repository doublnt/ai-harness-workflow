# Spec Kit Compatibility

Spec Kit focuses on spec-driven development:

~~~text
specify -> plan -> tasks -> implement
~~~

Vibe Coding Guardrails focuses on AI engineering governance:

~~~text
risk -> permissions -> gates -> review -> tests -> release -> rollback
~~~

When `--target speckit` is used, this tool creates:

~~~text
.specify/governance/guardrails.md
.specify/commands/governance-check.md
.specify/governance/project-context.md
.specify/governance/risk-levels.md
.specify/governance/file-change-policy.md
~~~

It does not replace existing Spec Kit templates. It adds required governance fields to specs, plans, and tasks.
