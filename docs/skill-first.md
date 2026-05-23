# Skill-first Design

The product is the skill/plugin, not a CLI.

Reasons:

1. Domain harness generation requires interaction.
2. Repository semantics must be confirmed with the user.
3. Static templates are too biased for project-specific domain rules.
4. One public entrypoint is easier for users.

The only user-facing command is to invoke AnyHarness in the AI client.
