# LLM Extractor Guide

When `extract-architecture.mjs --stack auto` outputs `needsLLMAnalysis: true`,
there is no deterministic extractor for this stack. You (the LLM) become the
extractor. Follow this guide to produce structured risk findings.

## Your output format

Produce a JSON object identical to what `derive-risk-topology.mjs` normally outputs:

```json
{
  "stack": "<detected stack name>",
  "source": "llm-analysis",
  "extractionMethod": "llm",
  "componentCount": <n>,
  "riskCount": <n>,
  "counts": { "blocker": 0, "high": 0, "medium": 0, "low": 0 },
  "risks": [
    {
      "kind": "<universal failure mode — see below>",
      "severity": "blocker | high | medium | low",
      "title": "<one line: what the risk is, where it is>",
      "evidence": ["<file>:<line>"],
      "candidate": {
        "type": "new-invariant | new-unknown",
        "proposed": "<invariant text if new-invariant>",
        "question": "<question if new-unknown>",
        "rationale": "<why this matters>"
      }
    }
  ],
  "poc": true,
  "nextAction": "present_to_user: surface findings and ask which Learning Candidates to apply via propose-evolution.mjs"
}
```

If you cannot determine an exact line number, use `"<file>:~<approximate>"` and
note it is an estimate (e.g., `"src/handlers/users.py:~45"`).

## Step-by-step process

1. **Read the files** listed in `sampledFiles` using your file-reading tool. Read
   all of them before starting analysis — cross-file patterns (like a trust boundary
   defined in one file and used without validation in another) are the most important.

2. **Identify the trust boundary**. Ask: where does untrusted data enter the
   application? (HTTP request body, WebSocket message, IPC message, CLI argument,
   file read from user-supplied path, callback from external library, etc.)

3. **Walk each universal failure mode** (see below). For each one, ask "does this
   codebase show signs of this failure mode?"

4. **Emit only high-confidence findings**. If you are uncertain, emit it as
   `new-unknown` with a question rather than a speculative `new-invariant`. Prefer
   precision over recall — 3 precise findings beat 10 vague ones.

5. **Cite evidence**. Every risk must have at least one `file:line` reference.
   Do not emit risks without evidence.

## Universal failure modes

### trust-boundary
**What to look for**: Input from the outside world (HTTP, IPC, CLI, file, socket)
used without validation before it reaches sensitive operations (file system,
subprocess, database query, memory operation).

Key patterns by language:
- Python: `request.json()`, `request.args`, `request.form` → used in `open()`,
  `subprocess.run()`, `os.system()`, SQL query without parameterization
- Node/TS: `req.body`, `req.params`, `req.query` → `exec()`, `fs.readFile()`,
  string interpolated into SQL
- Go: `r.URL.Query()`, `r.Body` → `exec.Command()`, `os.Open()`, database/sql
- Rust: function arguments in `#[tauri::command]` → `fs::read`, `Command::new()`

Severities:
- **blocker**: input reaches subprocess with shell execution (`sh -c`, `cmd /c`)
- **high**: input reaches file path without canonicalize+root-check, SQL without parameterization
- **medium**: input reaches external API call, logging, or structured query with mild validation
- **low**: input used in UI rendering only (XSS risk in web, low in desktop)

### threading-discipline
**What to look for**: Shared mutable state accessed from multiple threads/goroutines/tasks
without proper synchronization.

Key patterns:
- Python: shared dict/list modified from `threading.Thread` without `threading.Lock`
- Node: shared module-level variable modified across async callbacks (Node is single-threaded
  so true races are rare, but async interleaving of reads-then-writes is a common bug)
- Go: shared variable accessed in `go func(){}()` without `sync.Mutex` or `sync.RWMutex`
- Rust: `Arc<Mutex<T>>` held across `.await` point (deadlock), or `unsafe` with shared state
- C#/Avalonia: `ObservableCollection` modified from `Task.Run` (cross-thread UI mutation)

### resource-lifetime
**What to look for**: Resources opened but not reliably closed; objects that outlive
the scope that holds the resource they reference.

Key patterns:
- Files/sockets opened in try block without finally/defer/with/using
- HTTP clients created per-request rather than shared (socket exhaustion)
- Background goroutines/tasks/threads that capture references to short-lived objects
- `CancellationTokenSource` / `sync.WaitGroup` not signalled on shutdown path
- Go: `defer` inside a loop (defers pile up, not released until function returns)
- Python: generator/iterator left open (file handle held)

### external-interaction
**What to look for**: Calls to external services (HTTP, database, message queue,
subprocess) without timeout, retry, or error handling.

Key patterns:
- HTTP call with no timeout: `requests.get(url)` (Python default = no timeout),
  `fetch(url)` (no AbortController), `http.Get(url)` (Go no timeout on default client)
- Subprocess with no output size limit (can OOM if output is large)
- Database query with no query timeout
- Message queue consumer with no dead-letter handling

### error-propagation
**What to look for**: Errors silently swallowed; exceptions caught and ignored;
fire-and-forget async without error handling.

Key patterns:
- Python: `except: pass` or `except Exception as e: logger.debug(e)` in a path that
  should propagate
- Go: `err` returned from function but caller ignores it (`_ = someFunc()` or just
  `someFunc()` with no error check)
- Node/TS: unhandled Promise rejection (`async () => { await foo() }` without try/catch
  in a fire-and-forget context)
- C#: `async void` method (exceptions go to SynchronizationContext, crash app)
- Rust: `.unwrap()` on `Result` in a `#[tauri::command]` (panics the process)

### state-mutation-safety
**What to look for**: State that should be consistent across multiple operations
mutated non-atomically; at-least-once delivery patterns without idempotency.

Key patterns:
- Two stores written in sequence with no rollback: `db.save(x); queue.publish(e)` —
  if publish fails after save, state is inconsistent
- Kafka/RabbitMQ/SQS listener that does not check for duplicate message IDs before
  processing (at-least-once delivery means retries happen)
- In-memory cache updated without clearing dependent cache entries

### api-stability
**What to look for**: Public interfaces that are fragile or break callers silently
on change.

Key patterns:
- Public function signature change (added required parameter) without version bump
- Serialized struct field renamed (JSON/Protobuf) without migration
- Enum value added to a switch statement that has no default case
- C API returning `char*` with ambiguous ownership
- Callback signature changed in a registered callback (caller not recompiled)

## Calibration

Be honest about what you can and cannot tell from the sampled files:
- If you only saw 8 of 200 files, say so in the output
- If a risk "probably exists" but you didn't see direct evidence, emit it as
  `new-unknown` with a question
- Do not fabricate line numbers — use `~` estimates or omit if truly unknown
- A finding with `"evidence": []` is not acceptable; if you can't cite it, drop it

## Example output (Python FastAPI)

```json
{
  "stack": "python-fastapi",
  "source": "llm-analysis",
  "extractionMethod": "llm",
  "componentCount": 5,
  "riskCount": 3,
  "counts": { "blocker": 0, "high": 2, "medium": 1, "low": 0 },
  "risks": [
    {
      "kind": "trust-boundary",
      "severity": "high",
      "title": "User-supplied 'path' param passed to open() in /api/files endpoint without path validation",
      "evidence": ["src/routes/files.py:34"],
      "candidate": {
        "type": "new-invariant",
        "proposed": "In the /api/files endpoint, resolve the path with pathlib.Path.resolve() and assert it is under settings.ALLOWED_ROOT before calling open(). Return HTTP 400 if it escapes the root.",
        "rationale": "A '../'-traversal path in the 'path' query parameter allows any authenticated user to read arbitrary files the process can access."
      }
    },
    {
      "kind": "external-interaction",
      "severity": "high",
      "title": "requests.get() in PaymentService.charge() has no timeout — unbounded blocking call",
      "evidence": ["src/services/payment.py:~67"],
      "candidate": {
        "type": "new-invariant",
        "proposed": "All requests.get/post calls in PaymentService must pass timeout=(connect_timeout, read_timeout). Recommended: timeout=(3, 10).",
        "rationale": "A slow payment gateway hangs the FastAPI worker thread indefinitely. Under load, all workers exhaust and the entire service becomes unavailable."
      }
    }
  ]
}
```
