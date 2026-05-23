# Risk Levels

## Level 0 — Low Risk

Examples:

- copy changes
- small style adjustments
- documentation edits
- small utility function changes

Required gates:

- brief requirement check
- basic self-check
- no red-zone files

## Level 1 — Normal Feature

Examples:

- new UI component
- new endpoint
- ordinary CRUD logic
- ordinary business rule

Required gates:

- requirement gate
- implementation plan
- code review gate
- normal-path and failure-path tests

## Level 2 — Core Feature

Examples:

- authentication
- authorization
- payments
- file upload
- database schema
- core business state
- external service integration
- AI tool calling

Required gates:

- feature spec
- design proposal with at least 3 options
- ADR draft
- security gate
- test plan
- rollback plan
- human approval

## Level 3 — Critical Change

Examples:

- production data changes
- data migrations
- architecture migration
- public API breaking change
- permissions model change
- deployment strategy change
- CI/CD behavior change

Required gates:

- complete design doc
- at least 3 alternatives
- risk analysis
- migration plan
- rollback plan
- release checklist
- observability plan
- explicit human approval

## Escalation rules

If a task touches any of these, minimum Level 2:

- user data
- credentials or secrets
- authn/authz
- payment
- file upload
- database schema
- external service permissions
- security boundary
- production environment
- AI agent tool permissions

If a task involves irreversible production data changes, minimum Level 3.
