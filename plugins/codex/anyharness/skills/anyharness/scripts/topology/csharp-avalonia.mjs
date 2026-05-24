// Risk topology rules for csharp-avalonia.
// Consumes the structured extraction from extractors/csharp-avalonia.mjs.

const cite = (c, line) => `${c.file}:${line}`;

export function deriveRisks(extraction) {
  const components = Array.isArray(extraction.components) ? extraction.components : [];
  const risks = [];

  const risk = (kind, severity, title, evidence, candidate) =>
    risks.push({ kind, severity, title, evidence, candidate });

  for (const c of components) {

    // async void — fire-and-forget, exceptions swallowed
    if (c.asyncVoids) {
      for (const av of c.asyncVoids) {
        const isEventHandler = av.isEventHandler;
        risk(
          'error-propagation',
          isEventHandler ? 'medium' : 'high',
          `async void ${av.name} in ${c.file} — exceptions are unobserved${isEventHandler ? ' (event handler)' : ''}`,
          [cite(c, av.line)],
          {
            type: 'new-invariant',
            proposed: isEventHandler
              ? `Convert '${av.name}' to async Task and call it with fire-and-forget only if exceptions are handled inside. Wrap in try/catch or use a TaskExtensions.FireAndForgetSafeAsync helper.`
              : `Change 'async void ${av.name}' to 'async Task ${av.name}'. async void is only acceptable for event handlers, and even then exceptions must be caught internally.`,
            rationale: 'async void exceptions propagate to the SynchronizationContext and typically crash the application with an unhandled exception. They cannot be awaited, so callers have no way to observe completion or failure.',
          }
        );
      }
    }

    // ObservableCollection mutation inside Task.Run
    if (c.collectionMutations) {
      for (const cm of c.collectionMutations) {
        risk(
          'threading-discipline',
          'high',
          `ObservableCollection.${cm.op}() called inside Task.Run in ${cm.method || c.file} — not thread-safe, may crash UI`,
          [cite(c, cm.line)],
          {
            type: 'new-invariant',
            proposed: `Dispatch collection mutations to the UI thread: \`await Dispatcher.UIThread.InvokeAsync(() => collection.${cm.op}(...))\` or collect results in a plain List<T> inside Task.Run and assign to the collection on the UI thread after.`,
            rationale: "Avalonia's ObservableCollection change notifications are consumed by the UI thread's binding engine. Modifying a collection from a background thread causes a cross-thread access exception or silent data corruption.",
          }
        );
      }
    }

    // Process.Start with UseShellExecute=true and unvalidated path
    if (c.processStarts) {
      for (const ps of c.processStarts) {
        if (ps.useShellExecute) {
          risk(
            'trust-boundary',
            'high',
            `Process.Start with UseShellExecute=true in ${ps.method || c.file} — OS picks handler; path must be validated`,
            [cite(c, ps.line)],
            {
              type: 'new-invariant',
              proposed: `In '${ps.method || c.file}', validate the path against an allowlist of known safe extensions and locations before passing to Process.Start. Prefer UseShellExecute=false with an explicit FileName for known binaries.`,
              rationale: 'UseShellExecute=true lets the OS choose the handler based on file association. An attacker-controlled path (.bat, .ps1, .exe) passed here is a remote code execution vector. Paths from UI bindings are user-controlled.',
            }
          );
        } else {
          risk(
            'trust-boundary',
            'medium',
            `Process.Start in ${ps.method || c.file} — verify FileName is from an allowlist, not from UI input`,
            [cite(c, ps.line)],
            {
              type: 'new-unknown',
              question: `Does ${ps.method || c.file}'s Process.Start receive a path from user input or an ObservableCollection item? If so, validate against an allowlist of allowed executables.`,
              rationale: 'Even without UseShellExecute, passing user-controlled strings as FileName or Arguments to Process.Start is a command injection trust-boundary violation.',
            }
          );
        }
      }
    }

    // P/Invoke declarations — native trust boundary
    if (c.pinvokes) {
      for (const pi of c.pinvokes) {
        risk(
          'trust-boundary',
          'medium',
          `P/Invoke '${pi.name}' → '${pi.library}' — native trust boundary; verify marshaling and error-code handling`,
          [cite(c, pi.line)],
          {
            type: 'new-unknown',
            question: `Does '${pi.name}' check its return value for error codes? Is the CharSet specified? Are all pointer arguments validated before marshaling? Does the native library validate buffer sizes independently?`,
            rationale: 'P/Invoke bypasses managed memory safety. Incorrect marshaling (wrong CharSet, missing null check, wrong buffer size) causes buffer overreads, stack corruption, or silent data loss.',
          }
        );
      }
    }

    // unsafe blocks
    if (c.unsafeBlocks) {
      for (const ub of c.unsafeBlocks) {
        risk(
          'trust-boundary',
          'medium',
          `unsafe block in ${ub.method ? `'${ub.method}'` : c.file} — pointer arithmetic bypasses CLR memory safety`,
          [cite(c, ub.line)],
          {
            type: 'new-unknown',
            question: `Is the unsafe block in '${ub.method || c.file}' operating on bounds-checked data? Are all pointer arithmetic expressions verified against buffer length before use?`,
            rationale: 'The C# unsafe keyword disables CLR memory safety guarantees. Pointer arithmetic errors cause buffer overreads, use-after-free, or type confusion — the same class of bugs as in C/C++.',
          }
        );
      }
    }

    // HttpClient created per-call (inside a method)
    if (c.httpClients) {
      for (const hc of c.httpClients) {
        if (hc.kind === 'new-instance' && hc.insideMethod) {
          risk(
            'resource-lifetime',
            'high',
            `new HttpClient() inside method '${hc.method}' in ${c.file} — socket exhaustion risk`,
            [cite(c, hc.line)],
            {
              type: 'new-invariant',
              proposed: `Inject a single HttpClient (or IHttpClientFactory) as a constructor dependency rather than creating new HttpClient() per call. Alternatively, use IHttpClientFactory.CreateClient() which manages connection pooling.`,
              rationale: 'HttpClient wraps a socket. Creating a new one per call leaves sockets in TIME_WAIT state; under load, the process exhausts ephemeral ports. Disposing HttpClient aggressively causes the same issue.',
            }
          );
        }

        // HttpClient field not in IDisposable class
        if (hc.kind === 'new-instance' && !hc.insideMethod) {
          const cls = (c.classes || []).find(cl => !cl.implementsDisposable);
          if (cls) {
            risk(
              'resource-lifetime',
              'medium',
              `HttpClient field in '${cls.name}' (${c.file}) which does not implement IDisposable`,
              [cite(c, hc.line)],
              {
                type: 'new-unknown',
                question: `Does '${cls.name}' have a predictable lifetime? If it is a singleton (registered with DI), the HttpClient can be long-lived. If it is short-lived (e.g., created per window), it should be disposed and the class should implement IDisposable.`,
                rationale: "A class that owns an IDisposable field must implement IDisposable itself and call Dispose() on it — otherwise the underlying resource (socket/handle) leaks when the object is GC'd.",
              }
            );
          }
        }
      }
    }

    // IDisposable fields in non-IDisposable class
    if (c.disposableFields) {
      for (const df of c.disposableFields) {
        if (!df.classImplementsIDisposable) {
          risk(
            'resource-lifetime',
            'medium',
            `${df.type} field '${df.field}' in ${c.file} — class does not implement IDisposable; resource may leak`,
            [cite(c, df.line)],
            {
              type: 'new-invariant',
              proposed: `Implement IDisposable on the containing class and call ${df.field}.Dispose() in Dispose(). If the class is a ViewModel, hook into the window's Closed event or the navigation framework's deactivation to call Dispose().`,
              rationale: `${df.type} holds unmanaged resources (socket / kernel handle / memory). Without Dispose(), the resource is released only when the GC finalizes the object — which may be long after the object is logically dead, or never if the GC never runs.`,
            }
          );
        }
      }
    }

    // Thread.Sleep
    if (c.threadSleeps) {
      for (const ts of c.threadSleeps) {
        risk(
          'threading-discipline',
          'medium',
          `Thread.Sleep in '${ts.method || c.file}' — blocks the calling thread; may block the UI thread if called from a ViewModel`,
          [cite(c, ts.line)],
          {
            type: 'new-invariant',
            proposed: `Replace Thread.Sleep(ms) with await Task.Delay(ms, cancellationToken) to yield the thread to the runtime during the wait. If synchronous polling is unavoidable, ensure the call site is wrapped in Task.Run to keep it off the UI thread.`,
            rationale: 'Thread.Sleep blocks the OS thread for the full duration. If called directly or indirectly from the UI thread (e.g., in a ViewModel property setter or command handler not wrapped in Task.Run), it freezes the application.',
          }
        );
      }
    }
  }

  return risks;
}
