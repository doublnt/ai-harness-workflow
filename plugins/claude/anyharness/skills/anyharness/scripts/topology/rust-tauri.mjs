// Risk topology rules for rust-tauri.
// Consumes the structured extraction from extractors/rust-tauri.mjs.
// Each rule emits a Risk with severity, evidence (file:line), and a
// Learning Candidate that can be merged into profile.json via propose-evolution.

const cite = (c, line) => `${c.file}:${line}`;

export function deriveRisks(extraction) {
  const components = Array.isArray(extraction.components) ? extraction.components : [];
  const cross = extraction.cross || {};
  const risks = [];

  const risk = (kind, severity, title, evidence, candidate) =>
    risks.push({ kind, severity, title, evidence, candidate });

  // ── Cross-file rules ─────────────────────────────────────────────────────

  // Unregistered commands: declared #[tauri::command] but absent from generate_handler!
  // These could be dead code, internal helpers that accidentally got the attribute,
  // or (worse) reachable via plugin routes.
  for (const name of (cross.unregisteredCommands || [])) {
    // Find the file+line for this command across components
    let evidence = [];
    for (const c of components) {
      if (!c.tauriCommands) continue;
      const cmd = c.tauriCommands.find(t => t.name === name);
      if (cmd) { evidence.push(cite(c, cmd.line)); break; }
    }
    risk(
      'trust-boundary',
      'medium',
      `#[tauri::command] '${name}' is declared but not registered in generate_handler! — dead code or accessible via plugin route?`,
      evidence,
      {
        type: 'new-unknown',
        question: `Is '${name}' intentionally excluded from invoke_handler? If dead, remove the #[tauri::command] attribute. If intentionally accessible via a plugin route, document the path and validate inputs.`,
        rationale: 'Unregistered Tauri commands are not reachable through the normal IPC bridge, but the attribute signals intent. Dead annotated functions mislead reviewers; if another mechanism exposes them, there is an invisible trust boundary.',
      }
    );
  }

  // Registered-but-missing: listed in generate_handler! but no matching #[command] declaration
  // This is likely a linker error at compile time, but worth flagging for PoC completeness.
  for (const name of (cross.registeredButMissing || [])) {
    risk(
      'api-stability',
      'blocker',
      `generate_handler! lists '${name}' but no matching #[tauri::command] fn was found`,
      [],
      {
        type: 'new-invariant',
        proposed: `Every name in generate_handler! must have a corresponding #[tauri::command] fn '${name}'. Add the function or remove the registration.`,
        rationale: 'Rust will fail to compile if generate_handler! references an undefined function, but this can mask a refactoring inconsistency early in a branch.',
      }
    );
  }

  // ── Per-component rules ───────────────────────────────────────────────────

  for (const c of components) {

    // unsafe block inside a registered Tauri command — JS can trigger it
    if (c.unsafeBlocks) {
      for (const ub of c.unsafeBlocks) {
        if (!ub.inCommand) continue;
        // Only flag if this command is actually registered
        const isRegistered = (cross.registeredHandlers || []).includes(ub.function);
        const severity = isRegistered ? 'blocker' : 'high';
        risk(
          'trust-boundary',
          severity,
          `unsafe block in #[tauri::command] '${ub.function}'${isRegistered ? ' (registered — reachable from JS)' : ' (unregistered)'}`,
          [cite(c, ub.line)],
          {
            type: 'new-invariant',
            proposed: `#[tauri::command] functions must not contain unsafe blocks unless the safety invariants (pointer validity, bounds, alignment) are guaranteed by the Rust type system before the IPC boundary, not by the caller.`,
            rationale: 'The renderer process (JS/WebView) controls the arguments passed to Tauri commands. If a command passes renderer-supplied values (e.g., a pointer or length) into an unsafe block, the renderer can cause arbitrary memory reads/writes in the native process.',
          }
        );
      }
    }

    // process::Command spawned inside a Tauri command — check if user input reaches it
    if (c.externalCalls) {
      for (const ec of c.externalCalls) {
        if (ec.kind !== 'process') continue;
        if (!ec.inCommand) continue;
        const isRegistered = (cross.registeredHandlers || []).includes(ec.function);
        risk(
          'external-interaction',
          'high',
          `std::process::Command spawned inside${isRegistered ? ' registered' : ' unregistered'} #[tauri::command] '${ec.function}' — verify no renderer-controlled argument reaches the shell`,
          [cite(c, ec.line)],
          {
            type: 'new-invariant',
            proposed: `In '${ec.function}', shell arguments must come from a compile-time allowlist, not from renderer-supplied strings. Sanitize or reject inputs containing shell metacharacters before passing to Command.`,
            rationale: 'Passing renderer-supplied strings directly to a subprocess (especially via "sh -c") is a command-injection trust-boundary violation. The WebView renderer is untrusted; it can supply any string.',
          }
        );
      }

      // fs access inside a Tauri command — path traversal risk
      for (const ec of c.externalCalls) {
        if (ec.kind !== 'fs') continue;
        if (!ec.inCommand) continue;
        const isRegistered = (cross.registeredHandlers || []).includes(ec.function);
        risk(
          'trust-boundary',
          isRegistered ? 'high' : 'medium',
          `File system access (fs::${ec.op}) inside${isRegistered ? ' registered' : ' unregistered'} #[tauri::command] '${ec.function}' — validate path before use`,
          [cite(c, ec.line)],
          {
            type: 'new-invariant',
            proposed: `In '${ec.function}', resolve the path with std::fs::canonicalize() before use and assert it is under an allowed root directory (e.g., app data dir or explicitly allowed paths). Reject any path that escapes the allowed root.`,
            rationale: 'A renderer-supplied path can use "../" traversal to read or write files outside the intended sandbox. Without path validation, a Tauri command that accepts a path argument gives the renderer read/write access to the entire filesystem.',
          }
        );
      }
    }

    // tokio::spawn inside a command — background task outlives window, no cancellation
    if (c.tokioSpawns) {
      for (const sp of c.tokioSpawns) {
        if (!sp.inCommand) continue;
        risk(
          'resource-lifetime',
          'medium',
          `tokio::spawn inside #[tauri::command] '${sp.function}' — spawned task may outlive the window or have no cancellation path`,
          [cite(c, sp.line)],
          {
            type: 'new-unknown',
            question: `Does the task spawned in '${sp.function}' hold a reference to a window, AppHandle, or resource that becomes invalid after the window closes? Is there a cancellation token or abort handle?`,
            rationale: 'tokio::spawn detaches the task from the command future. If the task holds an AppHandle or captures window state, window close leaves the task running against a dead handle. This can cause panics, resource leaks, or incorrect state.',
          }
        );
      }
    }

    // Async command with no obvious cancellation — long-running CPU or IO loop
    if (c.tauriCommands) {
      for (const cmd of c.tauriCommands) {
        if (!cmd.isAsync) continue;
        const isRegistered = (cross.registeredHandlers || []).includes(cmd.name);
        if (!isRegistered) continue;
        risk(
          'resource-lifetime',
          'low',
          `async #[tauri::command] '${cmd.name}' — verify it yields to the runtime and handles window-close cancellation`,
          [cite(c, cmd.line)],
          {
            type: 'new-unknown',
            question: `Does '${cmd.name}' have any long-running non-yielding computation? If the user closes the window, does the command future get cancelled or run to completion?`,
            rationale: 'Tauri cancels the invoke future when the window closes, but a long-running synchronous computation inside an async fn blocks the executor thread. Use tokio::task::spawn_blocking for CPU-heavy work and select! with a cancellation token for IO loops.',
          }
        );
      }
    }
  }

  return risks;
}
