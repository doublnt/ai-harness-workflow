# Risk Levels

## L0 — Low Risk
Docs, copy, style-only changes, tiny local helpers.

## L1 — Normal Feature
Ordinary feature work, non-critical API/UI changes, normal bug fixes.

## L2 — Core / Sensitive
Auth, authorization, payments, file upload, AI tool calling, external service permissions, user data, database schema.

## L3 — Critical / Irreversible
Production data changes, migrations with data loss risk, public API breaking changes, deployment/CI behavior, security policy, architecture migration.

## Escalation
Any task touching Red Zone files is at least L2. Deployment or migration changes are L3 by default.
