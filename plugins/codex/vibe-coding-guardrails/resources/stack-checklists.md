# Stack-specific Checklists

## Frontend

- loading, error, empty, success, disabled, permission denied states
- keyboard navigation and focus states
- form validation and duplicate submit prevention
- XSS and unsafe HTML
- token storage and CSRF where applicable
- bundle size and unnecessary re-renders

## Backend

- input validation
- stable response format
- error code consistency
- authentication and authorization
- resource ownership checks
- transaction boundaries
- idempotency
- external service failure handling
- no sensitive logs

## Database

- migration plan
- rollback plan
- old-data compatibility
- default values and nullability
- indexes and query plan risks
- lock/table-scan risks
- large-data tests

## Rust

- no unnecessary `unwrap` or `expect`
- clear panic boundaries
- error types and Result propagation
- ownership and unnecessary clones
- concurrency and async blocking risks
- unsafe invariants documented and tested

## AI / LLM / Agent

- tool permission boundaries
- prompt injection handling
- retrieved content treated as untrusted data
- data leakage prevention
- eval cases and regression cases
- cost and latency tracking
- human approval for irreversible actions
