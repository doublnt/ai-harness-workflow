// Rust + Tauri extractor.
//
// Tauri's IPC surface is defined by functions annotated `#[tauri::command]`
// and registered via `tauri::generate_handler!`. This extractor finds:
//   - All #[tauri::command] (and #[command]) functions — the trust boundary
//   - The handler list passed to tauri::generate_handler!
//   - unsafe { ... } blocks (with enclosing function name)
//   - File system and process invocations inside commands (std::fs, std::process)
//   - Async fn signatures (to flag cancellation surface)
//
// PoC quality: regex-based. Replaceable with syn / tree-sitter.
import fs from 'node:fs';
import path from 'node:path';
import { findFilesByExt, findMatchingBrace, lineOf, enclosingMethod } from './_shared.mjs';

// Strip /* ... */ and // ... comments while preserving line positions (replace with spaces / newlines).
function stripComments(content) {
  let out = '';
  let i = 0, inString = false, inChar = false, inBlock = false, inLine = false;
  while (i < content.length) {
    const c = content[i], n = content[i + 1];
    if (inLine) {
      if (c === '\n') { inLine = false; out += '\n'; } else out += ' ';
      i++; continue;
    }
    if (inBlock) {
      if (c === '*' && n === '/') { inBlock = false; out += '  '; i += 2; continue; }
      out += (c === '\n' ? '\n' : ' '); i++; continue;
    }
    if (inString) {
      if (c === '\\') { out += content.slice(i, i + 2); i += 2; continue; }
      if (c === '"') inString = false;
      out += c; i++; continue;
    }
    if (inChar) {
      if (c === '\\') { out += content.slice(i, i + 2); i += 2; continue; }
      if (c === "'") inChar = false;
      out += c; i++; continue;
    }
    if (c === '/' && n === '/') { inLine = true; out += '  '; i += 2; continue; }
    if (c === '/' && n === '*') { inBlock = true; out += '  '; i += 2; continue; }
    if (c === '"') { inString = true; out += c; i++; continue; }
    if (c === "'") { inChar = true; out += c; i++; continue; }
    out += c; i++;
  }
  return out;
}

function extractFile(file, rootDir) {
  const raw = fs.readFileSync(file, 'utf8');
  const content = stripComments(raw);
  const rel = path.relative(rootDir, file);

  // ── Functions: optional attributes (#[...] lines), pub?, async?, fn name(params)  ───
  // We need to capture attribute lines preceding each fn so we can detect #[tauri::command].
  const fnRe = /(?:^|\n)([ \t]*(?:#\[[^\n]*\][ \t]*\n[ \t]*)*)(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+(\w+)\s*\(([^)]*)\)[^{;]*\{/g;

  const functions = [];
  let m;
  while ((m = fnRe.exec(content)) !== null) {
    const attrBlock = m[1] || '';
    const name = m[2];
    const params = m[3] || '';
    const headerStart = m.index + (m[0].startsWith('\n') ? 1 : 0);
    const declLine = lineOf(content, headerStart);

    const bodyOpen = content.indexOf('{', m.index + m[0].length - 1);
    const bodyEnd = bodyOpen !== -1 ? findMatchingBrace(content, bodyOpen) : -1;

    const attrs = [];
    const attrRe = /#\[([^\]]+)\]/g;
    let am;
    while ((am = attrRe.exec(attrBlock)) !== null) attrs.push(am[1].trim());

    const isAsync = /\basync\s+fn\b/.test(m[0]);
    const isPub = /\bpub(?:\([^)]*\))?\s+/.test(m[0]);
    const isCommand = attrs.some(a => /^(?:tauri::)?command\b/.test(a));

    functions.push({
      name, params,
      line: declLine,
      bodyStart: bodyOpen,
      bodyEnd,
      attrs,
      isAsync,
      isPub,
      isCommand,
    });
  }

  // ── tauri::generate_handler! registered command names ────────────────────
  const generatedHandlers = [];
  const handlerRe = /tauri::generate_handler!\s*\[([\s\S]*?)\]/g;
  while ((m = handlerRe.exec(content)) !== null) {
    const body = m[1];
    for (const tok of body.split(',')) {
      const name = tok.trim().split('::').pop().trim();
      if (name && /^\w+$/.test(name)) generatedHandlers.push(name);
    }
  }

  // ── unsafe blocks (with enclosing function) ──────────────────────────────
  const unsafeBlocks = [];
  const unsafeRe = /\bunsafe\s*\{/g;
  while ((m = unsafeRe.exec(content)) !== null) {
    const enc = enclosingMethod(functions, m.index);
    unsafeBlocks.push({
      line: lineOf(content, m.index),
      function: enc ? enc.name : null,
      inCommand: !!(enc && enc.isCommand),
    });
  }

  // ── External interactions inside commands (file system, process) ─────────
  const externalCalls = [];
  const patterns = [
    { kind: 'fs',      re: /\bstd::fs::(\w+)\s*\(/g },
    { kind: 'fs',      re: /\bfs::(\w+)\s*\(/g },
    { kind: 'process', re: /\bstd::process::Command::new\s*\(/g },
    { kind: 'process', re: /\bCommand::new\s*\(/g },
    { kind: 'net',     re: /\breqwest::(\w+)\s*\(/g },
    { kind: 'net',     re: /\bTcpStream::connect\s*\(/g },
  ];
  for (const { kind, re } of patterns) {
    while ((m = re.exec(content)) !== null) {
      const enc = enclosingMethod(functions, m.index);
      if (!enc) continue;
      externalCalls.push({
        kind, op: m[1] || 'new',
        line: lineOf(content, m.index),
        function: enc.name,
        inCommand: enc.isCommand,
      });
    }
  }

  // ── tokio::spawn (unstructured background tasks) ─────────────────────────
  const spawns = [];
  const spawnRe = /\btokio::spawn\s*\(/g;
  while ((m = spawnRe.exec(content)) !== null) {
    const enc = enclosingMethod(functions, m.index);
    spawns.push({
      line: lineOf(content, m.index),
      function: enc ? enc.name : null,
      inCommand: !!(enc && enc.isCommand),
    });
  }

  // ── Component summary ────────────────────────────────────────────────────
  const commands = functions.filter(f => f.isCommand).map(f => ({
    name: f.name,
    line: f.line,
    isAsync: f.isAsync,
    params: f.params.trim(),
  }));

  const comp = {
    file: rel,
    kind: 'rust-source',
    functionCount: functions.length,
  };
  if (commands.length) comp.tauriCommands = commands;
  if (generatedHandlers.length) comp.generatedHandlers = generatedHandlers;
  if (unsafeBlocks.length) comp.unsafeBlocks = unsafeBlocks;
  if (externalCalls.length) comp.externalCalls = externalCalls;
  if (spawns.length) comp.tokioSpawns = spawns;

  return comp;
}

export function extract(rootDir) {
  const files = findFilesByExt(rootDir, ['.rs']);
  const components = files.map(f => extractFile(f, rootDir)).filter(c => c && (
    c.tauriCommands || c.generatedHandlers || c.unsafeBlocks || c.externalCalls || c.tokioSpawns
  ));

  // Cross-file: build the union of registered handlers and the union of declared commands
  const allCommands = new Set();
  const allRegistered = new Set();
  for (const c of components) {
    if (c.tauriCommands) for (const cmd of c.tauriCommands) allCommands.add(cmd.name);
    if (c.generatedHandlers) for (const h of c.generatedHandlers) allRegistered.add(h);
  }
  const unregisteredCommands = [...allCommands].filter(n => !allRegistered.has(n));
  const registeredButMissing = [...allRegistered].filter(n => !allCommands.has(n));

  return {
    stack: 'rust-tauri',
    fileCount: files.length,
    components,
    cross: {
      declaredCommands: [...allCommands],
      registeredHandlers: [...allRegistered],
      unregisteredCommands,        // declared #[tauri::command] but not in generate_handler!
      registeredButMissing,        // listed in generate_handler! but no matching #[command]
    },
  };
}
