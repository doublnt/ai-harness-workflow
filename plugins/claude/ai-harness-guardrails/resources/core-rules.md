# Core Rules

These rules are the short behavioral kernel for AI Harness Guardrails.

## 1. Classify Risk First

Every task must be classified as L0, L1, L2, or L3 before implementation.

## 2. Keep Changes Surgical

Every changed line must trace to the user's request. Avoid drive-by refactors and unrelated rewrites.

## 3. Require Evidence

Do not claim tests, correctness, security, or performance without evidence. Mark Unknown explicitly.

## 4. Block Unsafe Work

Red Zone work requires gates and approval: migrations, auth, authorization, payments, user data, secrets, CI/CD, deployment, and AI workflow configuration.

## Non-negotiable rules

1. Do not implement before requirement clarification.
2. Do not modify Red Zone files without explicit human approval.
3. Do not claim tests passed unless they were actually run.
4. Level 2 and Level 3 tasks require gate artifacts.
5. Security-sensitive changes require threat modeling.
6. Database changes require migration and rollback plans.
7. Release-impacting changes require release and monitoring plans.
8. Hooks and CI gates are enforcement; skills are guidance.
