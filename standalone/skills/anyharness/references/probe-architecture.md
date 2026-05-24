# Probe Architecture

How AnyHarness supports multiple stacks without unbounded maintenance burden.

## The problem

The original Spring PoC put all extraction logic in one file and all topology
rules in another. Adding stacks naively meant duplicating the whole pipeline.
Three stacks = three pipelines = unsustainable.

## The split

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Universal layer (stack-agnostic)                                   │
│                                                                      │
│  - Risk schema: { kind, severity, evidence[], candidate }            │
│  - Universal failure mode catalog (see universal-failure-modes.md)   │
│  - Output contract (file:line, Learning Candidate)                   │
│  - Dispatcher (extract-architecture --stack <id>)                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
       ┌──────────────────────┼──────────────────────┬─────────────┐
       ▼                      ▼                      ▼             ▼
┌─────────────┐        ┌─────────────┐       ┌─────────────┐ ┌──────────┐
│ java-spring │        │ rust-tauri  │       │ csharp-     │ │ cpp-sdk  │
│             │        │             │       │ avalonia    │ │          │
│ - extractor │        │ - extractor │       │ - extractor │ │ - ...    │
│ - topology  │        │ - topology  │       │ - topology  │ │          │
│ - knowledge │        │ - knowledge │       │ - knowledge │ │          │
└─────────────┘        └─────────────┘       └─────────────┘ └──────────┘
```

Adding a stack = writing one extractor + one topology rule set + one knowledge
pack. The dispatcher, schema, and universal failure mode catalog are reused.

## The extractor contract

Every per-stack extractor is a single ES module that exports one function:

```js
// scripts/extractors/<stack>.mjs
export function extract(rootDir) {
  // walk source files, parse, return:
  return {
    stack: '<stack-id>',
    components: [...],   // Component[]
    fileCount: N,
  };
}
```

A **Component** has a stable outer shape (file, package/namespace, name, kind,
methods) plus stack-specific fields (e.g., `transactionalMethods[]` for Spring,
`tauriCommands[]` for Rust Tauri, `uiThreadCalls[]` for Avalonia).

Stack-specific fields are documented in the stack's knowledge pack.

## The topology contract

```js
// scripts/topology/<stack>.mjs
export function deriveRisks(extraction) {
  // input: result of extract()
  // output: Risk[]
  return [
    {
      kind: '<stack-specific-or-universal-kind>',
      severity: 'blocker | high | medium | low',
      title: '<short scoped sentence>',
      evidence: ['file:line', ...],
      candidate: {  // Learning Candidate, ready for propose-evolution.mjs
        type: 'new-invariant | new-unknown | new-gate | refined-invariant | retired-invariant',
        proposed: '...',   // or `question` for new-unknown
        rationale: '...',
      },
    },
  ];
}
```

## Universal failure modes

Some failure modes appear in many stacks with the same essential structure even
if the detection signal differs. These live in `universal-failure-modes.md` and
each stack's topology can reference them by kind:

| Universal kind | Spring | Tauri | Avalonia | C++ SDK |
|---|---|---|---|---|
| `trust-boundary` | HTTP endpoint w/o @Valid | `#[tauri::command]` w/o validation | (n/a, no IPC) | Public API w/o input check |
| `threading-discipline` | `@Async` losing context | UI op outside event loop | Update from non-UI thread | Race on shared state |
| `resource-lifetime` | LazyInitializationException | `Drop` on `Window` handle | `IDisposable` not disposed | RAII miss / leak |
| `external-interaction` | `RestTemplate` no retry | `std::process::Command` | `HttpClient` no retry | Callback without `user_data` |
| `error-propagation` | unchecked exception swallow | `Result` ignored | `async void` swallow | Exception from `extern "C"` |
| `state-mutation-safety` | dual-write (Tx + Kafka) | shared `Mutex` held across await | non-INotifyPropertyChanged binding | non-const method on logical const data |

Stack-specific failure modes that don't map (e.g., `missing-modifying` is pure
Spring Data JPA) stay as stack-only kinds.

## Why this scales

- **Adding a stack** = ~600 lines (extractor + topology + knowledge pack +
  fixture + tests). Bounded.
- **Universal concepts** carry across — once you understand `trust-boundary`,
  you can read any stack's report.
- **The LLM can reason cross-stack** — "this Tauri command and this Spring
  controller have the same trust-boundary risk."
- **Extractors are disposable** — when tree-sitter or AST tools become
  attractive, swap one stack's extractor without touching the others.

## What is NOT shared

- **Parsers**: each stack uses its own regex / AST approach. We do not
  pretend there is a universal AST.
- **Knowledge packs**: deep failure modes are stack-specific. Universal
  failure modes are concepts, not text.
- **Detection thresholds**: severity calibration is per-stack (a missing
  destructor in C++ is blocker; a missing dispose in C# is medium).

## When NOT to add a stack

- The user does not have an active project in that stack.
- Existing tools (clang-tidy, ESLint, Roslyn) already enforce what AnyHarness
  would flag — no need to duplicate.
- The stack is too small to justify the knowledge pack (e.g., a one-off DSL).

## See also

- `universal-failure-modes.md` — the cross-stack concept catalog
- `architecture-extraction.md` — extraction contract overview
- `risk-topology.md` — topology layer overview
- `stacks/*.md` — per-stack knowledge packs
