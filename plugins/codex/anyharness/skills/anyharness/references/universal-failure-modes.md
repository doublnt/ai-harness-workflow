# Universal Failure Modes

A small set of failure mode concepts that recur across stacks. Each stack's
extractor + topology can map findings to these universal kinds when applicable,
so cross-stack reasoning is possible.

This is a **catalog of concepts**, not a list of detection rules. The detection
is stack-specific (see `stacks/<stack>.md`).

## `trust-boundary`

**Concept**: a place where untrusted data enters the system. Without explicit
validation at the boundary, the rest of the system inherits the trust deficit.

**Where it appears**:
- HTTP / RPC endpoint (web backend)
- IPC message (desktop client with web view; cross-process call)
- Public SDK API (caller may be malicious or buggy)
- Plugin/extension entry point
- Deserialization of any external format

**Universal fix shape**: validate at the boundary, treat post-boundary data as
trusted. Reject early. Never re-derive trust later.

## `threading-discipline`

**Concept**: code that must run on a specific thread (or must not block one) is
violated, leading to UI freezes, races, or subtle ordering bugs.

**Where it appears**:
- UI frameworks: paint/event must be on UI thread (Avalonia Dispatcher, JavaFX
  Application Thread, AWT EDT, Electron renderer)
- Async runtimes: long-running CPU work on the executor thread blocks all tasks
- Database connections: many drivers are not thread-safe
- Hardware drivers: must call from owning thread

**Universal fix shape**: explicit thread affinity in the type system or contract;
dispatcher/post mechanism for cross-thread work; no synchronous wait on the
owning thread.

## `resource-lifetime`

**Concept**: a resource (memory, file, handle, lock, connection) is acquired
but the path to release is unclear, missing, or runs after the resource is
gone.

**Where it appears**:
- C++: `new` without matching `delete`, missing virtual destructor on
  polymorphic base, dangling reference
- Rust: `Drop` impl that touches an external resource without flushing
- C# / Java: `IDisposable`/`Closeable` not disposed, `using` missing
- DB: connection leak under exception
- ORM: lazy-load after session close

**Universal fix shape**: RAII (or language equivalent — `with`, `using`,
`defer`); ownership documented in the API contract; no path can skip the
release.

## `external-interaction`

**Concept**: a call to something the process doesn't control (network, file
system, subprocess, broker) with no timeout, retry strategy, circuit-breaker,
or failure mode plan.

**Where it appears**:
- HTTP client without timeout / retry / circuit-breaker
- Subprocess without timeout
- File I/O without size limit
- Message broker publish that can block
- DNS lookup on hot path

**Universal fix shape**: explicit timeout; bounded retry with backoff; circuit
breaker for repeated failure; failure path defined (DLQ, fallback, fail-fast).

## `error-propagation`

**Concept**: errors are silently swallowed, or escape a boundary they
shouldn't cross.

**Where it appears**:
- `try { ... } catch { /* nothing */ }`
- `async void` in C# that throws (cannot be awaited)
- `Result<T>` returned but `.unwrap()` panics
- Exception escaping `extern "C"` boundary in C++
- Promise rejection unhandled in JS
- panic across FFI boundary

**Universal fix shape**: errors are either handled, propagated as values, or
explicitly logged + alerted; never silently discarded; never cross language /
ABI boundaries as exceptions.

## `state-mutation-safety`

**Concept**: a write to shared state is visible in a way that breaks an
expected invariant — atomicity, ordering, or notification.

**Where it appears**:
- Dual-write (DB commit + message publish in same scope)
- Shared `Mutex` held across `await` (deadlock potential)
- UI binding to non-observable property (changes invisible)
- `const` method that modifies logical state (lying about purity)
- Race on shared collection without synchronization

**Universal fix shape**: identify the atomic unit; use the right primitive
(transactional outbox, lock-free data structure, observable property,
immutability); document the invariant.

## `api-stability`

**Concept**: a change to a public API breaks callers, often silently.

**Where it appears**:
- Default arg added in a non-source-compatible position (C++)
- New required method on a public trait/interface (Rust/Java/C#)
- Field reordered or type changed in a serialized struct
- Removed field that consumers still read
- ABI break in a shared library (vtable layout, struct size)

**Universal fix shape**: semver discipline; deprecation cycle before removal;
public API surface explicitly enumerated and reviewed.

## How stacks reference these

A stack's topology entry should set `kind` to one of these universal kinds when
the finding maps cleanly. If not, use a stack-specific kind (e.g.,
`missing-modifying` for Spring Data, `unsafe-in-command` for Tauri).

```json
{
  "kind": "trust-boundary",
  "severity": "high",
  "title": "Tauri command `read_secret_file` accepts a path from JS without validation",
  "evidence": ["src-tauri/src/commands.rs:42"],
  "candidate": {
    "type": "new-invariant",
    "proposed": "Every #[tauri::command] taking a path/URL must validate it against an allowlist before file system or network use.",
    "rationale": "Tauri IPC is a trust boundary; the renderer is treated as untrusted in Tauri's threat model."
  }
}
```

This lets the LLM (and the user) recognize "oh, this is the same kind of risk
as that Spring controller — they're both trust-boundary violations, just in
different languages."

## See also

- `probe-architecture.md` — how stacks plug in
- `stacks/*.md` — concrete failure modes per stack
- `risk-topology.md` — how findings are presented
