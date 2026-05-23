# Gates

## Requirement Gate
Problem, user, goal, non-goals, inputs, outputs, success criteria, edge cases, failure cases, risk level, Unknowns.

## Design Gate
At least two options for L1, three options for L2+, trade-off table, failure modes, rollback plan.

## Implementation Gate
Files to modify, files to create, files not to touch, dependencies, tests, migration impact, rollback.

## Code Review Gate
Correctness, simplicity, modularity, security, tests, performance, observability, rollback, Unknowns, verdict.

## Testing Gate
Normal path, boundary, failure path. L2+ also integration, security, regression. L3 also rollback and release validation.

## Security Gate
Assets, actors, trust boundaries, entry points, threats, mitigations, tests, Unknowns.

## Release Gate
Change summary, user impact, data impact, config, env vars, feature flags, monitoring, rollback, post-release checks.
