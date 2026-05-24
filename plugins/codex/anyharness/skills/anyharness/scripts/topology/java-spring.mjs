// Risk topology rules for java-spring.
// Consumes the structured extraction from extractors/java-spring.mjs.
// Each rule emits a Risk with severity, evidence (file:line), and a
// Learning Candidate that can be merged into profile.json via propose-evolution.

const cite = (c, line) => `${c.file}:${line}`;

export function deriveRisks(extraction) {
  const components = Array.isArray(extraction.components) ? extraction.components : [];
  const risks = [];

  const risk = (kind, severity, title, evidence, candidate) =>
    risks.push({ kind, severity, title, evidence, candidate });

  for (const c of components) {
    // dual-write: @Transactional method also sends Kafka in same scope
    if (c.kind === 'service' && c.transactionalMethods && c.kafkaSends) {
      for (const tx of c.transactionalMethods) {
        const sendInSame = c.kafkaSends.find(k => k.method === tx.method);
        if (sendInSame) {
          risk(
            'state-mutation-safety',
            'high',
            `Dual-write: ${c.class}.${tx.method} commits DB and publishes to Kafka in one @Transactional block`,
            [cite(c, tx.line), cite(c, sendInSame.line)],
            {
              type: 'new-invariant',
              proposed: `In ${c.class}, do not publish to Kafka inside a @Transactional method. Use the transactional outbox pattern.`,
              rationale: 'If the DB commit succeeds and Kafka send fails (or vice versa), the system becomes inconsistent.',
            }
          );
        }
      }
    }

    // tx-self-invocation (Spring proxy bypass)
    if (c.selfInvocations) {
      for (const si of c.selfInvocations) {
        const calleeLine = (c.methods || []).find(me => me.name === si.callee)?.line;
        risk(
          'state-mutation-safety',
          'high',
          `Self-invocation bypasses Spring proxy: ${c.class}.${si.caller} → this.${si.callee} (@${si.calleeAnnotation})`,
          [cite(c, si.callerLine), calleeLine ? cite(c, calleeLine) : null].filter(Boolean),
          {
            type: 'new-invariant',
            proposed: `Calls to @${si.calleeAnnotation}-annotated methods must go through a Spring-managed bean (constructor-injected reference), not 'this.'.`,
            rationale: 'Self-invocation in Spring bypasses the AOP proxy. The annotation appears to be in effect but is not.',
          }
        );
      }
    }

    // REQUIRES_NEW propagation
    if (c.transactionalMethods) {
      for (const tx of c.transactionalMethods) {
        if (tx.propagation === 'REQUIRES_NEW') {
          risk(
            'resource-lifetime',
            'medium',
            `REQUIRES_NEW on ${c.class}.${tx.method} can starve the connection pool under load`,
            [cite(c, tx.line)],
            {
              type: 'new-unknown',
              question: `Does ${c.class}.${tx.method} need REQUIRES_NEW, and what is the connection pool size relative to peak concurrency on the calling path?`,
              rationale: 'REQUIRES_NEW holds the outer transaction connection while opening a new one — pool exhaustion is common.',
            }
          );
        }
      }
    }

    // External HTTP without visible retry/circuit-breaker
    if (c.externalCalls) {
      for (const ec of c.externalCalls) {
        risk(
          'external-interaction',
          'medium',
          `External HTTP call ${ec.client}.${ec.op} in ${c.class}.${ec.method || '?'} — verify retry/circuit-breaker/timeout`,
          [cite(c, ec.line)],
          {
            type: 'new-unknown',
            question: `Does ${c.class}.${ec.method || '?'}'s call to ${ec.client}.${ec.op} have explicit timeout, retry policy, and circuit breaker?`,
            rationale: 'Unbounded external calls cause cascading failures.',
          }
        );
      }
    }

    // @Query update missing @Modifying
    if (c.modifyingIssues) {
      for (const mi of c.modifyingIssues) {
        risk(
          'missing-modifying',
          'blocker',
          `${c.class}.${mi.method} uses @Query with UPDATE/DELETE/INSERT but is missing @Modifying`,
          [cite(c, mi.line)],
          {
            type: 'new-invariant',
            proposed: 'Every @Query that mutates state (UPDATE/DELETE/INSERT) must be annotated with @Modifying.',
            rationale: 'Spring Data treats unmarked queries as SELECT — silent runtime failure.',
          }
        );
      }
    }

    // Kafka listener — at-least-once requires idempotency
    if (c.kafkaListeners) {
      for (const kl of c.kafkaListeners) {
        risk(
          'state-mutation-safety',
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

    // Controller trust boundary (PoC: doesn't yet parse @Valid; surface as Unknown)
    if (c.kind === 'controller' && c.endpoints) {
      for (const ep of c.endpoints) {
        if (['POST', 'PUT', 'PATCH'].includes(ep.method)) {
          risk(
            'trust-boundary',
            'medium',
            `${ep.method} ${ep.path} → ${c.class}.${ep.handler} accepts untrusted input — verify @Valid + DTO constraints`,
            [cite(c, ep.line)],
            {
              type: 'new-unknown',
              question: `Does ${c.class}.${ep.handler} apply @Valid to its request body, and does the DTO carry bean-validation constraints?`,
              rationale: 'HTTP endpoints are the system trust boundary. Missing validation lets malformed input reach the service layer.',
            }
          );
        }
      }
    }
  }

  return risks;
}
