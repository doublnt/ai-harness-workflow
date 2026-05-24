# Architecture Extraction

This document describes the deep-extraction layer that distinguishes AnyHarness
from a filename scanner. The first stack supported is **java-spring**;
extractors for other stacks will follow the same contract.

## Why this exists

`scan-project.mjs` finds *what files exist* and *what stack a project uses*. It
does not understand the system's architecture — it cannot tell you where the
trust boundaries are, where transactions span, or where dual-writes happen.

`extract-architecture.mjs` reads the actual source code and produces a
**structured architecture model**: components, their kind, their dependencies,
and the salient operations inside them (HTTP endpoints, transactional methods,
external calls, message publishes, etc.). The risk topology layer then reasons
about boundaries over this model.

## Output contract

```json
{
  "stack": "java-spring",
  "root": "...",
  "fileCount": N,
  "componentCount": N,
  "components": [
    {
      "file": "src/.../Foo.java",
      "package": "com.x.y",
      "class": "com.x.y.Foo",
      "kind": "controller|service|repository|component|entity|unknown",
      "annotations": ["RestController", ...],
      "methods": [{"name", "line", "annotations": []}],
      "dependencies": ["Bar", ...],       // constructor-injected types
      "basePath": "/api/x",               // controllers
      "endpoints": [{"method", "path", "handler", "line"}],
      "transactionalMethods": [{"method", "line", "propagation", "isolation", "readOnly"}],
      "kafkaSends": [{"topic", "method", "line"}],
      "kafkaListeners": [{"topic", "groupId", "method", "line"}],
      "externalCalls": [{"client", "op", "method", "line"}],
      "selfInvocations": [{"caller", "callerLine", "callee", "calleeAnnotation"}],
      "modifyingIssues": [{"method", "line", "query"}],
      "table": "..."                      // entities
    }
  ],
  "poc": true,
  "extractionMethod": "regex (PoC)"
}
```

Every finding carries `file` + `line` so the LLM (or a human reviewer) can
verify by reading the source.

## PoC quality and the upgrade path

The current extractor is **regex-based**. It works on the patterns most Spring
code uses, but it is not a full AST parser. It will miss:

- Multi-line annotations with line breaks inside `(...)`
- Methods declared with reflection or annotation processors
- Patterns inside string literals (treated as code)
- Code in nested classes (only the outer class is captured)

This is acceptable for a PoC: the model is good enough to demonstrate that
**structured architecture extraction unlocks risk topology that filename
scanning cannot reach**. The contract is designed so the extractor can be
replaced by a tree-sitter or javaparser-based implementation without changing
the downstream consumer (`derive-risk-topology.mjs`).

## Adding a new stack

To add another stack (e.g., `--stack node-express` or `--stack go-stdlib`):

1. Write an extractor that walks the source files and emits the same outer
   shape (`stack`, `components[]`) with kind-specific fields appropriate to
   the framework.
2. Document the kind taxonomy for that stack (what counts as a "controller"
   in Express, what counts as a "service", etc.).
3. Add a corresponding `references/stacks/<stack>.md` knowledge pack.
4. Extend `derive-risk-topology.mjs` with risk rules for that stack.

## Confidence and verification

This extractor is intentionally conservative. False negatives (missed signals)
are acceptable in the PoC; false positives are worse because they erode trust.

When the LLM presents extraction-derived findings to the user, it should:

- Cite `file:line` so the user can verify.
- Mark findings as "(extracted, verify by reading source)" until confirmed.
- Defer to user knowledge when the extractor's view conflicts with intent.

## See also

- `risk-topology.md` — the layer that consumes this output
- `stacks/java-spring.md` — the knowledge pack the risk layer reasons against
- `extract-architecture.mjs` — the script
