# Docs Drift Gate

The docs drift gate checks whether API, database, security, configuration, or AI workflow changes need documentation updates.

A change passes if:

- related docs changed, or
- a gate artifact contains `docsImpact.status = "none"` with a justification.
