#!/usr/bin/env node
// Invoked by the AnyHarness skill via Bash tool. Not a direct user command.
/**
 * Derive risk topology from an architecture extraction.
 *
 * Input: JSON from extract-architecture.mjs, via --in <path> or stdin.
 * Output: JSON with risk findings, each having severity, kind, citations,
 * and a Learning Candidate template (so the evolve loop can consume them).
 *
 * Risk kinds detected from a java-spring extraction:
 *   - dual-write          @Transactional method + kafka send in same method
 *   - tx-self-invocation  this.foo() bypasses Spring proxy on @Transactional/@Async
 *   - requires-new-pool   REQUIRES_NEW under load can exhaust connection pool
 *   - external-no-retry   external HTTP call with no retry/circuit-breaker hint
 *   - missing-modifying   @Query update/delete missing @Modifying
 *   - kafka-no-idempotency @KafkaListener handler — must be idempotent
 *   - trust-boundary      controller endpoint with no @Valid + non-primitive body
 *
 * Severity scale: blocker | high | medium | low
 */
import fs from 'node:fs';

const args = process.argv.slice(2);
const inIdx = args.indexOf('--in');
const inPath = inIdx !== -1 ? args[inIdx + 1] : null;

let extraction;
try {
  const raw = inPath ? fs.readFileSync(inPath, 'utf8') : fs.readFileSync(0, 'utf8');
  extraction = JSON.parse(raw);
} catch (e) {
  process.stderr.write(JSON.stringify({ error: 'failed to read/parse extraction JSON', code: 1, hint: String(e.message) }) + '\n');
  process.exit(1);
}

if (extraction.stack !== 'java-spring') {
  process.stderr.write(JSON.stringify({
    error: `stack not supported for topology: ${extraction.stack}`,
    code: 1,
    supported: ['java-spring'],
  }) + '\n');
  process.exit(1);
}

const components = Array.isArray(extraction.components) ? extraction.components : [];
const cite = (c, line) => `${c.file}:${line}`;

const risks = [];

// Helper to push a risk with a learning candidate template
function risk(kind, severity, title, evidence, candidate) {
  risks.push({ kind, severity, title, evidence, candidate });
}

for (const c of components) {
  // ── dual-write: Transactional method that also sends to Kafka ────────────
  if (c.kind === 'service' && c.transactionalMethods && c.kafkaSends) {
    for (const tx of c.transactionalMethods) {
      const sendInSameMethod = c.kafkaSends.find(k => k.method === tx.method);
      if (sendInSameMethod) {
        risk(
          'dual-write',
          'high',
          `Dual-write: ${c.class}.${tx.method} commits DB and publishes to Kafka in one @Transactional block`,
          [
            cite(c, tx.line),
            cite(c, sendInSameMethod.line),
          ],
          {
            type: 'new-invariant',
            proposed: `In ${c.class}, do not publish to Kafka inside a @Transactional method. Use the transactional outbox pattern: persist the event in the same transaction, then publish from a separate poller.`,
            rationale: 'If the DB commit succeeds and Kafka send fails (or vice versa), the system becomes inconsistent. This is a recurring failure mode that warrants a project-wide rule.',
          }
        );
      }
    }
  }

  // ── self-invocation of @Transactional ────────────────────────────────────
  if (c.selfInvocations) {
    for (const si of c.selfInvocations) {
      const calleeLine = (c.methods || []).find(me => me.name === si.callee)?.line;
      const severity = si.calleeAnnotation === 'Transactional' ? 'high' : 'medium';
      risk(
        'tx-self-invocation',
        severity,
        `Self-invocation bypasses Spring proxy: ${c.class}.${si.caller} → this.${si.callee} (@${si.calleeAnnotation})`,
        [
          cite(c, si.callerLine),
          calleeLine ? cite(c, calleeLine) : null,
        ].filter(Boolean),
        {
          type: 'new-invariant',
          proposed: `Calls to @${si.calleeAnnotation}-annotated methods must go through a Spring-managed bean (constructor-injected reference), not 'this.'. Self-invocation silently disables the proxy.`,
          rationale: 'Self-invocation in Spring bypasses the AOP proxy. The annotation appears to be in effect but is not.',
        }
      );
    }
  }

  // ── REQUIRES_NEW propagation ─────────────────────────────────────────────
  if (c.transactionalMethods) {
    for (const tx of c.transactionalMethods) {
      if (tx.propagation === 'REQUIRES_NEW') {
        risk(
          'requires-new-pool',
          'medium',
          `REQUIRES_NEW on ${c.class}.${tx.method} can starve the connection pool under load`,
          [cite(c, tx.line)],
          {
            type: 'new-unknown',
            question: `Does ${c.class}.${tx.method} need REQUIRES_NEW, and what is the connection pool size relative to peak concurrency on the calling path?`,
            rationale: 'REQUIRES_NEW holds the outer transaction connection while opening a new one — pool exhaustion is a common production incident.',
          }
        );
      }
    }
  }

  // ── External HTTP without retry/circuit-breaker (heuristic) ──────────────
  if (c.externalCalls) {
    for (const ec of c.externalCalls) {
      risk(
        'external-no-retry-hint',
        'medium',
        `External HTTP call ${ec.client}.${ec.op} in ${c.class}.${ec.method || '?'} — verify retry/circuit-breaker/timeout`,
        [cite(c, ec.line)],
        {
          type: 'new-unknown',
          question: `Does ${c.class}.${ec.method || '?'}'s call to ${ec.client}.${ec.op} have explicit timeout, retry policy, and circuit breaker?`,
          rationale: 'Unbounded external calls cause cascading failures. The PoC extractor cannot see retry libraries (Resilience4j, Spring Retry) — manual verification required.',
        }
      );
    }
  }

  // ── @Query update without @Modifying ─────────────────────────────────────
  if (c.modifyingIssues) {
    for (const mi of c.modifyingIssues) {
      risk(
        'missing-modifying',
        'blocker',
        `${c.class}.${mi.method} uses @Query with UPDATE/DELETE/INSERT but is missing @Modifying`,
        [cite(c, mi.line)],
        {
          type: 'new-invariant',
          proposed: `Every @Query that mutates state (UPDATE/DELETE/INSERT) must be annotated with @Modifying. Without it, Spring Data treats the statement as a SELECT and silently fails or throws at runtime.`,
          rationale: 'This is a well-known Spring Data JPA pitfall — silent failure mode.',
        }
      );
    }
  }

  // ── Kafka listener — must be idempotent ──────────────────────────────────
  if (c.kafkaListeners) {
    for (const kl of c.kafkaListeners) {
      risk(
        'kafka-no-idempotency',
        'high',
        `Kafka listener ${c.class}.${kl.method} on topic '${kl.topic}' — at-least-once delivery; handler must be idempotent`,
        [cite(c, kl.line)],
        {
          type: 'new-unknown',
          question: `Is ${c.class}.${kl.method} idempotent? What key (event id / aggregate id) is checked before processing?`,
          rationale: 'Kafka guarantees at-least-once. Without idempotency, retries cause duplicate side effects.',
        }
      );
    }
  }

  // ── Controller trust boundary (heuristic) ────────────────────────────────
  if (c.kind === 'controller' && c.endpoints) {
    for (const ep of c.endpoints) {
      // Heuristic: any POST/PUT/PATCH endpoint that accepts a body and the
      // handler params include "@RequestBody" but no "@Valid" is a candidate.
      // The extractor doesn't yet parse param annotations; surface as an Unknown.
      if (['POST', 'PUT', 'PATCH'].includes(ep.method)) {
        risk(
          'trust-boundary',
          'medium',
          `${ep.method} ${ep.path} → ${c.class}.${ep.handler} accepts untrusted input — verify @Valid + DTO constraints`,
          [cite(c, ep.line)],
          {
            type: 'new-unknown',
            question: `Does ${c.class}.${ep.handler} apply @Valid to its request body, and does the DTO carry bean-validation constraints (@NotNull, @Size, etc.)?`,
            rationale: 'HTTP endpoints are the system trust boundary. Missing validation lets malformed input reach the service layer.',
          }
        );
      }
    }
  }
}

// Roll-up by severity for an at-a-glance view
const counts = { blocker: 0, high: 0, medium: 0, low: 0 };
for (const r of risks) counts[r.severity] = (counts[r.severity] || 0) + 1;

console.log(JSON.stringify({
  stack: extraction.stack,
  source: inPath || 'stdin',
  componentCount: components.length,
  riskCount: risks.length,
  counts,
  risks,
  poc: true,
  nextAction: risks.length === 0
    ? 'no_risks: topology pass found no flagged patterns; consider reviewing methods that are not yet covered by the extractor'
    : 'present_to_user: surface findings and ask which Learning Candidates to apply via propose-evolution.mjs',
}, null, 2));
