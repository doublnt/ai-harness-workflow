# Examples

These examples show the difference between ordinary vibe coding and guardrail-driven AI coding.

## 1. Hidden Risk: user export

User asks:

```text
Add a CSV export for users.
```

Bad behavior:

```text
The agent exports every user field, including email and internal notes, without asking about permissions, audit logs, rate limits, or privacy.
```

Guardrails behavior:

```text
Risk Level: L2
Reason: user data export, authorization, privacy, potential abuse.
Required gates: requirement, design, security, test, release.
Questions: Which fields? Who can export? Is this audited? Is there a data retention or compliance requirement?
```

## 2. Over-refactor: small bug fix becomes architecture change

User asks:

```text
Fix the crash when email is empty.
```

Bad behavior:

```text
The agent rewrites the entire validation layer, changes public types, and updates unrelated form components.
```

Guardrails behavior:

```text
Risk Level: L1
Scope: only email empty handling and regression test.
Files not to touch: unrelated validators, unrelated form components, public API types.
Evidence: add one failing regression test, implement minimal fix, run the relevant test command.
```

## 3. Docs drift: API changed but documentation did not

Changed files:

```text
app/api/users/route.ts
openapi.yaml
```

Bad behavior:

```text
Commit succeeds without updating API docs or explaining docs impact.
```

Guardrails behavior:

```text
pre-commit blocks with Docs drift detected.
Fix by updating docs/api/*, CHANGELOG.md, or adding a gate artifact with Docs Impact: none and justification.
```

## 4. Unsafe commit: auth change without risk metadata

Bad commit:

```text
feat: update auth
```

Guardrails behavior:

```text
commit-msg blocks.
Required format: feat(auth): rotate refresh tokens [risk:L2]
Required trailers for L2/L3: Risk-Level, Gate-Review, Tests, Human-Approval, Rollback.
```

## 5. Red Zone file change

Changed file:

```text
src/auth/session.ts
```

Guardrails behavior:

```text
Agent hook blocks direct edit unless a security/design/test gate is created and human approval is recorded.
Git hook and CI also check the same condition.
```

## 6. L0 happy path

User asks:

```text
Change the button label from Submit to Save.
```

Guardrails behavior:

```text
Risk Level: L0
Scope: one UI text change.
Tests: manual visual check or existing snapshot if available.
No gate artifact required.
```
