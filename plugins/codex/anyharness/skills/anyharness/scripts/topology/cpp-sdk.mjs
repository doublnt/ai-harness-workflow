// Risk topology rules for cpp-sdk.
// Consumes the structured extraction from extractors/cpp-sdk.mjs.

const cite = (c, line) => `${c.file}:${line}`;

export function deriveRisks(extraction) {
  const components = Array.isArray(extraction.components) ? extraction.components : [];
  const cross = extraction.cross || {};
  const risks = [];

  const risk = (kind, severity, title, evidence, candidate) =>
    risks.push({ kind, severity, title, evidence, candidate });

  // ── Cross-file: public API surface ────────────────────────────────────────

  // Public API functions that return char* — caller owns memory but may not know it
  for (const name of (cross.publicAPIReturnsCStr || [])) {
    let evidence = [];
    for (const c of components) {
      if (!c.publicAPI) continue;
      const fn = c.publicAPI.find(f => f.name === name);
      if (fn) { evidence.push(cite(c, fn.line)); break; }
    }
    risk(
      'api-stability',
      'high',
      `Public API '${name}' returns char* — ownership and lifetime must be documented`,
      evidence,
      {
        type: 'new-invariant',
        proposed: `Document whether '${name}' returns a static buffer (not thread-safe), a caller-must-free heap buffer, or an SDK-owned buffer freed by a paired function (e.g. sdk_free_string). Prefer returning via caller-supplied buffer (char* buf, size_t buf_len) to make ownership explicit.`,
        rationale: 'A char* return from a C API creates an invisible ownership contract. Callers who do not free it leak memory; callers who free a static buffer corrupt memory. The contract must be explicit in the header or callers will guess wrong.',
      }
    );
  }

  // Public API functions that take raw pointer + size — trust boundary
  for (const c of components) {
    if (!c.publicAPI) continue;
    for (const fn of c.publicAPI) {
      if (fn.hasSizeParam && fn.hasRawPtr) {
        risk(
          'trust-boundary',
          'high',
          `Public API '${fn.name}' takes raw pointer + size — validate len <= buffer capacity before use`,
          [cite(c, fn.line)],
          {
            type: 'new-invariant',
            proposed: `In '${fn.name}', assert len > 0, data != nullptr, and len <= out_len (or the known output buffer capacity) before any memcpy/read. Return an error code (not crash) if constraints are violated.`,
            rationale: 'SDK callers are untrusted. A caller that passes len > out_len (accidentally or maliciously) causes a heap buffer overflow in the SDK process. The SDK must not trust the caller-supplied length without an independent bound check.',
          }
        );
      }

      if (fn.hasVoidCtx) {
        risk(
          'resource-lifetime',
          'high',
          `Public API '${fn.name}' accepts void* ctx — no lifetime guarantee; caller must ensure ctx outlives callback invocations`,
          [cite(c, fn.line)],
          {
            type: 'new-invariant',
            proposed: `Document that ctx must remain valid for the entire lifetime of the SDK handle (until sdk_destroy or the corresponding sdk_unset_callback). Provide a paired deregistration function so callers can cancel the callback before freeing ctx.`,
            rationale: 'A void* ctx callback pattern stores a raw pointer to caller-managed memory. If the caller frees ctx and the SDK later invokes the callback, the SDK reads deallocated memory (use-after-free). This is one of the most common SDK integration bugs.',
          }
        );
      }
    }
  }

  // ── Per-component rules ───────────────────────────────────────────────────

  for (const c of components) {

    // memcpy without bounds check (in public API implementation)
    if (c.memOps) {
      for (const op of c.memOps) {
        if (op.kind === 'memcpy') {
          risk(
            'trust-boundary',
            'blocker',
            `memcpy in '${op.function || c.file}' — verify len <= destination buffer capacity before copy`,
            [cite(c, op.line)],
            {
              type: 'new-invariant',
              proposed: `Before memcpy(dst, src, len), assert len <= dst_capacity. If dst_capacity is caller-supplied, treat it as untrusted and document the valid range in the API contract.`,
              rationale: 'memcpy with a caller-supplied length and no bounds check is the canonical heap buffer overflow. An attacker-controlled len writes past the end of the destination buffer, overwriting adjacent heap metadata or other objects.',
            }
          );
        }

        if (op.kind === 'sprintf') {
          risk(
            'trust-boundary',
            'high',
            `sprintf (unbounded) in '${op.function || c.file}' — use snprintf with explicit buffer size`,
            [cite(c, op.line)],
            {
              type: 'new-invariant',
              proposed: `Replace sprintf(buf, fmt, ...) with snprintf(buf, buf_size, fmt, ...) and check that the return value is < buf_size (meaning the output was not truncated).`,
              rationale: 'sprintf does not check the destination buffer size. If the formatted output exceeds the buffer, sprintf writes past the end — a stack or heap buffer overflow depending on where buf is allocated.',
            }
          );
        }

        if (op.kind === 'strcpy') {
          risk(
            'trust-boundary',
            'high',
            `strcpy (unbounded) in '${op.function || c.file}' — use strncpy or strlcpy with explicit size`,
            [cite(c, op.line)],
            {
              type: 'new-invariant',
              proposed: `Replace strcpy(dst, src) with strncpy(dst, src, dst_size - 1); dst[dst_size - 1] = '\\0'; or use strlcpy if available.`,
              rationale: 'strcpy copies until the null terminator with no bounds check. If the source string is longer than the destination buffer, it overwrites adjacent memory.',
            }
          );
        }

        if (op.kind === 'gets') {
          risk(
            'trust-boundary',
            'blocker',
            `gets() used in '${op.function || c.file}' — unconditionally vulnerable; replace with fgets`,
            [cite(c, op.line)],
            {
              type: 'new-invariant',
              proposed: `Replace gets(buf) with fgets(buf, buf_size, stdin). gets() is removed from C11 and has no safe usage.`,
              rationale: 'gets() reads until newline with no length limit. There is no safe way to call gets(). Every use is a buffer overflow.',
            }
          );
        }
      }
    }

    // Raw new/delete — potential double-free, memory leak, use-after-free
    if (c.rawAllocations) {
      const news = c.rawAllocations.filter(a => a.kind === 'new');
      const deletes = c.rawAllocations.filter(a => a.kind === 'delete');
      if (news.length > 0 || deletes.length > 0) {
        const evidence = [...news, ...deletes].map(a => cite(c, a.line));
        risk(
          'resource-lifetime',
          'medium',
          `Raw new/delete in ${c.file} — prefer RAII (unique_ptr, shared_ptr) to prevent double-free and leaks`,
          evidence.slice(0, 3),
          {
            type: 'new-invariant',
            proposed: `Replace raw new/delete with std::unique_ptr<T> for single-owner resources and std::shared_ptr<T> for shared ownership. The destructor runs automatically when the smart pointer goes out of scope, making it impossible to forget deallocation or double-free.`,
            rationale: 'Every raw new has exactly one correct matching delete. Early returns, exceptions, and multi-path code make it easy to miss the delete path. Raw delete also allows double-free if the pointer is used after deletion. RAII eliminates both failure modes.',
          }
        );
      }
    }

    // Thread detach — orphan threads
    if (c.threadOps) {
      const detaches = c.threadOps.filter(t => t.kind === 'detach');
      for (const det of detaches) {
        risk(
          'resource-lifetime',
          'high',
          `std::thread.detach() in '${det.function || c.file}' — orphan thread cannot be joined; may access freed resources`,
          [cite(c, det.line)],
          {
            type: 'new-invariant',
            proposed: `Replace .detach() with .join() in the owner's destructor, or store the thread in an object whose destructor calls .join(). If the thread must outlive the creator, store it in a long-lived owner (e.g., application singleton) and ensure it stops before the objects it captures are destroyed.`,
            rationale: 'A detached thread is uncheckable — there is no way to know when it finishes or whether it completed successfully. If the thread captures a pointer to a local or freed object, it causes use-after-free at an unpredictable time.',
          }
        );
      }

      const creates = c.threadOps.filter(t => t.kind === 'thread-create');
      for (const cr of creates) {
        risk(
          'threading-discipline',
          'medium',
          `std::thread created in '${cr.function || c.file}' — verify no data races on captured variables`,
          [cite(c, cr.line)],
          {
            type: 'new-unknown',
            question: `Does the lambda captured in this std::thread access shared state without synchronization? Are all captured pointers guaranteed to remain valid for the lifetime of the thread?`,
            rationale: 'Unsynchronized access to shared variables from a spawned thread is a data race — undefined behavior in C++. Common patterns: reading a flag (is_open) without mutex or atomic, writing to a shared collection without lock, accessing a captured pointer after the owner is destroyed.',
          }
        );
      }
    }

    // Global mutable state
    if (c.globalState) {
      for (const gs of c.globalState) {
        risk(
          'threading-discipline',
          'medium',
          `Global mutable state '${gs.name}' in ${c.file} — verify all access is properly synchronized`,
          [cite(c, gs.line)],
          {
            type: 'new-unknown',
            question: `Is all access to '${gs.name}' protected by the same mutex? Is the mutex itself initialized before any concurrent access? Can the mutex be held and re-entered on the same thread (if so, use std::recursive_mutex)?`,
            rationale: 'Global mutable state creates implicit coupling between all callsites. A single unsynchronized read or write is a data race. Mutex mistakes (wrong lock, missing lock, or deadlock from lock ordering) are invisible at compile time.',
          }
        );
      }
    }
  }

  return risks;
}
