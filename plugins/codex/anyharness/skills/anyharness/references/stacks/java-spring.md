# Java + Spring Boot — Failure Mode Knowledge Pack

This is a deep knowledge pack, not a list of seed questions. Each failure mode
includes: **detection signal** (what the extractor can find), **why it bites**
(the production failure mode), **how to verify** (so the reviewer can confirm
or rule out), and **how to fix** (the canonical resolution).

This pack is the basis the LLM should reason from when reviewing Spring code.

## 1. `@Transactional` self-invocation silently disabled

**Detection signal**: extractor `selfInvocations[]` entry where the target
method carries `@Transactional` (also `@Async`, `@Cacheable`, `@PreAuthorize`).

**Why it bites**: Spring wraps `@Transactional` methods with an AOP proxy. The
proxy is the public Spring bean; the method on `this` is the raw class. Calling
`this.foo()` from another method of the same class bypasses the proxy entirely.
The annotation appears to be in effect but is silently inactive — no new
transaction, no rollback semantics, no read-only optimization.

**How to verify**: open the file at the cited line. Confirm the call uses
`this.` (or implicit this) rather than a constructor-injected reference to a
separate bean. If using AspectJ weaving (`@EnableAspectJAutoProxy(mode = ASPECTJ)`)
the bypass does not happen — check `pom.xml`/`build.gradle`.

**How to fix**:
- Split the inner method into a separate `@Service` bean injected via constructor.
- Or extract the logic to a private method that doesn't claim to be transactional.
- Or call through `applicationContext.getBean(MyService.class).foo()` as a workaround (smell).

## 2. Dual-write: DB commit + Kafka send in one `@Transactional` block

**Detection signal**: extractor `kafkaSends[]` entry whose `method` matches an
entry in `transactionalMethods[]`.

**Why it bites**: the DB commit and the Kafka send are independent operations.
Four scenarios:
1. DB commits, Kafka send succeeds → fine
2. DB commits, Kafka send fails (network, broker down) → DB has the state, downstream consumers don't
3. DB rolls back, Kafka send succeeded before the rollback → consumers see an event for a row that doesn't exist
4. Process dies between commit and send → indeterminate

**How to verify**: read the method body. If `kafkaTemplate.send` (or `producer.send`)
is called inside or after a DB write within `@Transactional`, it is dual-write.
Check for compensating logic (DLQ, reconciliation job) — these reduce the impact
but do not solve the problem.

**How to fix**: transactional outbox pattern.
- Persist the event row in the same transaction.
- Have a separate poller publish from the outbox table.
- Or use Debezium / change-data-capture as the publisher.

## 3. `@Query` mutating without `@Modifying`

**Detection signal**: extractor `modifyingIssues[]` (repository with
`@Query` containing UPDATE/DELETE/INSERT but no `@Modifying`).

**Why it bites**: without `@Modifying`, Spring Data treats the JPQL as a select.
At runtime you get either `InvalidDataAccessApiUsageException` (newer Spring
Data) or silent no-op (older). Either way the update doesn't apply.

**How to verify**: open the cited method. Confirm the annotation list contains
`@Modifying`. Also confirm a write transaction context exists (the caller must
be `@Transactional`).

**How to fix**: add `@Modifying` (and `@Transactional` at the caller). Consider
`@Modifying(clearAutomatically = true, flushAutomatically = true)` if the
session has dirty managed entities.

## 4. `REQUIRES_NEW` connection pool starvation

**Detection signal**: extractor `transactionalMethods[]` entry with
`propagation: "REQUIRES_NEW"`.

**Why it bites**: `REQUIRES_NEW` suspends the outer transaction and opens a new
DB connection. The outer connection is held throughout. Under concurrent load
that calls this method while inside an outer transaction, you double-consume
the connection pool. Pool exhaustion blocks all DB activity, including health
checks.

**How to verify**: look at the calling paths. Are they inside `@Transactional`
methods that are called concurrently (e.g., from controllers)? Check pool size
(`spring.datasource.hikari.maximum-pool-size`) vs peak concurrency.

**How to fix**:
- Use `Propagation.NESTED` (savepoints) if rollback isolation is the only goal.
- Move the inner work to an `@Async` method with its own pool.
- Or restructure so the outer scope doesn't need to span both operations.

## 5. JPA N+1 (Lazy + collection traversal)

**Detection signal**: the extractor doesn't catch this directly. Signals to look
for in review: `findAll()` followed by accessing a `@OneToMany`/`@ManyToMany`
collection on each result; `@OneToOne(fetch = LAZY)` referenced in a loop.

**Why it bites**: each lazy collection access fires a separate SELECT. For
100 results, you get 1 + 100 queries. Latency and DB load scale with row count.

**How to verify**: enable `spring.jpa.show-sql=true` in test, run the code path,
count queries. Or use `Hibernate.unproxy()`/Hibernate statistics.

**How to fix**:
- `@EntityGraph` on the repository method.
- `JOIN FETCH` in the JPQL.
- Dedicated DTO projections (`interface XProjection { ... }`).

## 6. Lazy-loading outside transaction

**Detection signal**: not directly extracted yet. Pattern: an entity with
`@OneToMany(fetch = LAZY)` returned from a `@Transactional` service and the
collection is accessed in a controller or view.

**Why it bites**: the transaction (and thus the Hibernate Session) closes when
the service method returns. Accessing the lazy collection after that throws
`LazyInitializationException`.

**How to verify**: trace from the entity to where the collection is accessed.
If the access is outside any `@Transactional` boundary, it will fail.

**How to fix**:
- Fetch eagerly with `JOIN FETCH` for the specific use case.
- Map to a DTO inside the transaction.
- Use `@Transactional(readOnly = true)` at the controller boundary (open-session-in-view, but be wary of perf).

## 7. `@Async` losing security/request context

**Detection signal**: a method annotated `@Async` accessing
`SecurityContextHolder` or `RequestContextHolder`.

**Why it bites**: the async task runs on a different thread; the inherited
thread-local context (security principal, request scope, MDC) is not propagated.

**How to verify**: open the `@Async` method body. Look for any read from a
thread-local context.

**How to fix**:
- Configure `DelegatingSecurityContextAsyncTaskExecutor`.
- Pass the principal/locale/MDC explicitly as method arguments.

## 8. Kafka listener — at-least-once requires idempotency

**Detection signal**: extractor `kafkaListeners[]` entry. Every entry is a
candidate; PoC does not yet inspect whether the body checks for duplicates.

**Why it bites**: Kafka redelivers on rebalance, broker failover, or consumer
failure between processing and offset commit. A non-idempotent handler causes
duplicate side effects (double charge, double notification).

**How to verify**: open the handler. Look for the dedupe key — typically
event-id or aggregate-id — stored in a `processed_events` table or a Redis set.
If there is no check before the side effect, it is non-idempotent.

**How to fix**:
- Store an idempotency key (event-id) before performing the side effect; short-circuit on duplicate.
- Or use an idempotent destination (UPSERT semantics).

## 9. Hibernate dirty checking surprise

**Detection signal**: not directly extracted. Pattern: a method retrieves an
entity, modifies its fields, then does NOT call `repository.save()`, expecting
nothing to change.

**Why it bites**: inside a `@Transactional` method, modified managed entities
are auto-flushed at commit. The code looks like a no-op but persists changes.

**How to verify**: review entity mutations inside `@Transactional`. If a
mutation is intentional, calling `save()` documents intent; if unintentional,
detach the entity first or refetch read-only.

**How to fix**: use `@Transactional(readOnly = true)` for read paths; explicit
`entityManager.detach(entity)` if mutating temporarily for projection.

## 10. Trust boundary at `@RestController`

**Detection signal**: extractor produces `trust-boundary` risk for every
POST/PUT/PATCH endpoint; PoC doesn't yet parse parameter annotations.

**Why it bites**: an HTTP endpoint is where untrusted data enters the system.
Without `@Valid` plus bean-validation constraints on the DTO, malformed input
(null where required, oversize strings, negative amounts) reaches the service
layer, which often does not re-validate.

**How to verify**: open the handler. Look for `@Valid` on the `@RequestBody`
parameter. Open the DTO. Look for `@NotNull`, `@Size`, `@Min`, `@Max`,
`@Pattern`, etc.

**How to fix**:
- Add `@Valid` to the `@RequestBody` parameter and an `@ExceptionHandler` for `MethodArgumentNotValidException`.
- Add field-level constraints on the DTO.
- Validate cross-field invariants in a `@Service` before any side effect.

## What this pack does NOT cover (yet)

- Reactive (`WebFlux`, `Mono`/`Flux`) — different concurrency model
- Spring Security — auth/authz misconfigurations
- Spring Cloud — service discovery, config server pitfalls
- Spring Batch — chunk/skip/retry semantics
- Spring Data MongoDB / Redis / R2DBC — different consistency models

Future iterations should add stack-specific packs per major sub-framework.

## See also

- `architecture-extraction.md` — how the extractor finds these signals
- `risk-topology.md` — how findings are converted to risk topology
- `output-contract.md` — Learning Candidates schema (so risks → profile)
- `harness-evolution.md` — how proposed invariants land in the project profile
