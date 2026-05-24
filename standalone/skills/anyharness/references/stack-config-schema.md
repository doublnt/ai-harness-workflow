# Stack Config Schema

Drop `.anyharness/stack-config.json` in any project to get deterministic
architecture extraction without writing code. AnyHarness reads it automatically
when you run `--stack auto`.

## Schema

```json
{
  "stack": "python-fastapi",
  "language": "python",
  "framework": "fastapi",
  "fileExtensions": [".py"],

  "trustBoundaryMarkers": [
    {
      "pattern": "@app\\.(get|post|put|delete|patch)\\b",
      "description": "FastAPI route — all params are untrusted"
    }
  ],

  "externalCallPatterns": [
    { "pattern": "subprocess\\.run\\s*\\(", "kind": "process" },
    { "pattern": "requests\\.get\\s*\\(",  "kind": "net" },
    { "pattern": "\\bopen\\s*\\(",         "kind": "fs" }
  ],

  "unsafePatterns": [
    { "pattern": "eval\\s*\\(", "kind": "code-injection" }
  ],

  "asyncPatterns": [
    { "pattern": "async def\\s+\\w+" }
  ],

  "errorSwallowPatterns": [
    { "pattern": "except\\s*:", "description": "bare except" }
  ]
}
```

## Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `stack` | string | yes | Stack name shown in risk output (e.g. `python-fastapi`) |
| `language` | string | yes | Source language: `python`, `go`, `javascript`, `typescript`, `rust`, `csharp`, `cpp` |
| `framework` | string | no | Framework name for documentation |
| `fileExtensions` | string[] | yes | Extensions to scan: `[".py"]`, `[".go"]`, `[".ts", ".tsx"]` |
| `trustBoundaryMarkers` | pattern[] | recommended | Decorators/annotations that mark trust boundary entry points |
| `externalCallPatterns` | pattern[] | recommended | Patterns for external interactions (process, net, fs) |
| `unsafePatterns` | pattern[] | optional | Language-unsafe or high-risk patterns |
| `asyncPatterns` | pattern[] | optional | Patterns that identify async functions |
| `errorSwallowPatterns` | pattern[] | optional | Patterns for silently swallowed errors |

**Pattern object:**
```json
{ "pattern": "<regex string>", "kind": "<optional kind>", "description": "<optional label>" }
```

`kind` values: `process` (subprocess/shell), `net` (HTTP/socket), `fs` (file system),
`native-interop`, `code-injection`, or any custom label.

## What it detects

The universal topology rules operate on the extraction and produce Risk findings for:

- **trust-boundary (blocker)**: `process` external call inside a trust boundary function
- **trust-boundary (high)**: `fs` access inside a trust boundary function (path traversal)
- **external-interaction (medium)**: `net` call without visible timeout (inside or outside trust boundary)
- **error-propagation (high)**: error-swallowing patterns
- **resource-lifetime (low)**: async function with external call, no visible cancellation

## Example configs

### Python / FastAPI

```json
{
  "stack": "python-fastapi", "language": "python",
  "fileExtensions": [".py"],
  "trustBoundaryMarkers": [
    { "pattern": "@app\\.(get|post|put|delete|patch)\\b", "description": "FastAPI app route" },
    { "pattern": "@router\\.(get|post|put|delete|patch)\\b", "description": "FastAPI router" }
  ],
  "externalCallPatterns": [
    { "pattern": "subprocess\\.(run|call|Popen)\\s*\\(", "kind": "process" },
    { "pattern": "os\\.system\\s*\\(", "kind": "process" },
    { "pattern": "requests\\.(get|post|put|delete|patch)\\s*\\(", "kind": "net" },
    { "pattern": "httpx\\.(get|post|put|delete)\\s*\\(", "kind": "net" },
    { "pattern": "\\bopen\\s*\\(", "kind": "fs" }
  ],
  "unsafePatterns": [
    { "pattern": "eval\\s*\\(|exec\\s*\\(", "kind": "code-injection" }
  ],
  "asyncPatterns": [{ "pattern": "async def\\s+\\w+" }],
  "errorSwallowPatterns": [
    { "pattern": "except\\s*:", "description": "bare except" }
  ]
}
```

### Go / Gin

```json
{
  "stack": "go-gin", "language": "go",
  "fileExtensions": [".go"],
  "trustBoundaryMarkers": [
    { "pattern": "\\.(GET|POST|PUT|DELETE|PATCH)\\s*\\(", "description": "Gin route registration" },
    { "pattern": "http\\.HandleFunc\\s*\\(", "description": "stdlib HTTP handler" }
  ],
  "externalCallPatterns": [
    { "pattern": "exec\\.Command\\s*\\(", "kind": "process" },
    { "pattern": "http\\.Get\\s*\\(|http\\.Post\\s*\\(|client\\.Do\\s*\\(", "kind": "net" },
    { "pattern": "os\\.Open\\s*\\(|ioutil\\.ReadFile\\s*\\(|os\\.ReadFile\\s*\\(", "kind": "fs" }
  ],
  "asyncPatterns": [{ "pattern": "go func\\s*\\(" }],
  "errorSwallowPatterns": [
    { "pattern": "_ = \\w+\\.\\w+\\(", "description": "ignored error return" }
  ]
}
```

### Node.js / Express (TypeScript)

```json
{
  "stack": "node-express", "language": "typescript",
  "fileExtensions": [".ts", ".tsx"],
  "trustBoundaryMarkers": [
    { "pattern": "router\\.(get|post|put|delete|patch)\\s*\\(", "description": "Express route" },
    { "pattern": "@(Get|Post|Put|Delete|Patch)\\s*\\(", "description": "NestJS/routing-controllers decorator" }
  ],
  "externalCallPatterns": [
    { "pattern": "child_process\\.exec\\s*\\(|spawn\\s*\\(", "kind": "process" },
    { "pattern": "fetch\\s*\\(|axios\\.(get|post)\\s*\\(", "kind": "net" },
    { "pattern": "fs\\.readFile\\s*\\(|fs\\.writeFile\\s*\\(", "kind": "fs" }
  ],
  "asyncPatterns": [{ "pattern": "async\\s+(function|\\w+)\\s*\\(" }],
  "errorSwallowPatterns": [
    { "pattern": "\\.catch\\s*\\(\\s*\\(\\s*\\)\\s*=>\\s*\\{\\s*\\}", "description": "empty catch" }
  ]
}
```

## Priority

When `--stack auto` is run, `.anyharness/stack-config.json` takes **highest priority**
over all auto-detection logic. This lets you override detection for ambiguous projects
or mix frameworks.
