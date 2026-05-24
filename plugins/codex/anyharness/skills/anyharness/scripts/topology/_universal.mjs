// Universal topology rules.
// Operates on the output of _config-based.mjs (Path C: user-defined stack).
// Applies the 7 universal failure modes to the generic component model.
// Also used as fallback for any stack that produces trustBoundaryFunctions /
// externalCalls / unsafeOccurrences / asyncFunctions / errorSwallows fields.

const cite = (c, line) => `${c.file}:${line}`;

export function deriveRisks(extraction) {
  const components = Array.isArray(extraction.components) ? extraction.components : [];
  const risks = [];

  const risk = (kind, severity, title, evidence, candidate) =>
    risks.push({ kind, severity, title, evidence, candidate });

  for (const c of components) {

    // ── trust-boundary: external calls inside trust boundary functions ───────
    if (c.externalCalls) {
      for (const ec of c.externalCalls) {
        if (!ec.inTrustBoundary) continue;

        if (ec.kind === 'process') {
          risk(
            'trust-boundary',
            'blocker',
            `Subprocess call (${ec.op}) inside trust boundary '${ec.function}' in ${c.file} — input may reach shell`,
            [cite(c, ec.line)],
            {
              type: 'new-invariant',
              proposed: `In '${ec.function}', subprocess arguments must come from a compile-time allowlist, not from request parameters. Never use shell=True / shell interpolation with user-supplied input.`,
              rationale: 'User-supplied input passed to a subprocess via shell execution is a command injection trust-boundary violation. The caller is untrusted; treat all request parameters as hostile.',
            }
          );
        } else if (ec.kind === 'fs') {
          risk(
            'trust-boundary',
            'high',
            `File system access (${ec.op}) inside trust boundary '${ec.function}' in ${c.file} — validate path before use`,
            [cite(c, ec.line)],
            {
              type: 'new-invariant',
              proposed: `In '${ec.function}', resolve the path with os.path.realpath() (or equivalent) and assert it is under an allowed root directory before opening. Reject any path that escapes the allowed root.`,
              rationale: 'A request-supplied path using "../" traversal can read or write files outside the intended directory. Without path validation, this endpoint gives callers access to the entire filesystem.',
            }
          );
        } else if (ec.kind === 'net') {
          risk(
            'external-interaction',
            'medium',
            `External network call (${ec.op}) inside trust boundary '${ec.function}' in ${c.file} — verify timeout and retry`,
            [cite(c, ec.line)],
            {
              type: 'new-unknown',
              question: `Does '${ec.function}' set an explicit timeout on the ${ec.op} call? Is there a retry policy with exponential backoff? What happens to the request if the downstream service is slow?`,
              rationale: 'An outbound call without a timeout inside a request handler can hold the thread/connection open indefinitely. Under load, this exhausts the worker pool and takes down the service.',
            }
          );
        }
      }

      // External calls outside trust boundary — still flag net calls without timeout
      for (const ec of c.externalCalls) {
        if (ec.inTrustBoundary) continue;
        if (ec.kind === 'net') {
          risk(
            'external-interaction',
            'medium',
            `External network call (${ec.op}) in '${ec.function || c.file}' — verify timeout is set`,
            [cite(c, ec.line)],
            {
              type: 'new-unknown',
              question: `Is there an explicit timeout on this ${ec.op} call? What is the caller's timeout budget?`,
              rationale: 'Network calls without timeouts block the caller indefinitely if the remote service is slow or unreachable.',
            }
          );
        }
      }
    }

    // ── trust-boundary: unsafe/dangerous ops inside trust boundary ───────────
    if (c.unsafeOccurrences) {
      for (const u of c.unsafeOccurrences) {
        if (!u.inTrustBoundary) continue;
        risk(
          'trust-boundary',
          'high',
          `Unsafe operation (${u.kind}) inside trust boundary function '${u.function}' in ${c.file}`,
          [cite(c, u.line)],
          {
            type: 'new-invariant',
            proposed: `The unsafe pattern '${u.kind}' in '${u.function}' must not operate on data received from callers without prior validation. Validate type, range, and bounds before passing caller-supplied data to unsafe operations.`,
            rationale: 'Native/unsafe operations in a function that receives untrusted input are a trust-boundary violation. The caller can craft inputs that trigger memory corruption, arbitrary code execution, or data exfiltration.',
          }
        );
      }
    }

    // ── error-propagation: swallowed errors ──────────────────────────────────
    if (c.errorSwallows) {
      for (const es of c.errorSwallows) {
        risk(
          'error-propagation',
          'high',
          `Error swallowed in '${es.function || c.file}' (${es.description}) — failures become silent`,
          [cite(c, es.line)],
          {
            type: 'new-invariant',
            proposed: `In '${es.function || c.file}', replace the bare except/catch with either: (a) catch specific exceptions and handle them, or (b) log the error and re-raise, or (c) return a typed error response to the caller. Never silently discard exceptions.`,
            rationale: 'A bare except/catch that returns a generic response hides failures from observability systems. Errors that should fail fast (payment failures, auth failures) silently succeed from the caller\'s perspective, leading to data inconsistency.',
          }
        );
      }
    }

    // ── resource-lifetime: async without cancellation awareness ─────────────
    if (c.asyncFunctions && c.externalCalls) {
      const asyncNames = new Set((c.asyncFunctions || []).map(a => a.name));
      for (const ec of c.externalCalls) {
        if (!asyncNames.has(ec.function)) continue;
        if (ec.kind !== 'net') continue;
        risk(
          'resource-lifetime',
          'low',
          `Async function '${ec.function}' makes external call without visible cancellation/timeout`,
          [cite(c, ec.line)],
          {
            type: 'new-unknown',
            question: `Does '${ec.function}' propagate a cancellation signal (CancellationToken / context.Context / asyncio.timeout) to the external call? What happens if the client disconnects mid-request?`,
            rationale: 'An async function that does not propagate cancellation will continue running and holding resources even after the client has disconnected. Under load, this exhausts connection pools.',
          }
        );
      }
    }
  }

  return risks;
}
