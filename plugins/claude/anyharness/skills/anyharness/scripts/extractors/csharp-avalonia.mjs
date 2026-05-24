// C# + Avalonia extractor.
//
// Avalonia desktop apps follow MVVM: ViewModels own state and commands;
// Views bind to them via XAML. Key failure modes:
//   - async void event handlers (exceptions swallowed, cannot await)
//   - ObservableCollection mutated from background thread (not thread-safe)
//   - HttpClient created per-call (socket exhaustion)
//   - HttpClient with no Timeout set
//   - Process.Start with UseShellExecute=true and unvalidated path
//   - P/Invoke declarations (DllImport / LibraryImport) — native trust boundary
//   - unsafe blocks
//   - CancellationToken not propagated into async calls
//   - IDisposable types (HttpClient, CancellationTokenSource) that are fields but never Disposed
//   - Thread.Sleep on what may be the UI thread
//
// PoC quality: regex-based. Replaceable with Roslyn / tree-sitter-c-sharp.
import fs from 'node:fs';
import path from 'node:path';
import { findFilesByExt, findMatchingBrace, lineOf, enclosingMethod } from './_shared.mjs';

// Strip // and /* */ comments, preserving line positions.
function stripComments(content) {
  let out = '', i = 0, inStr = false, inVerbatim = false, inBlock = false, inLine = false;
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
    if (inVerbatim) {
      if (c === '"' && n === '"') { out += '""'; i += 2; continue; }
      if (c === '"') { inVerbatim = false; }
      out += c; i++; continue;
    }
    if (inStr) {
      if (c === '\\') { out += content.slice(i, i + 2); i += 2; continue; }
      if (c === '"') inStr = false;
      out += c; i++; continue;
    }
    if (c === '/' && n === '/') { inLine = true; out += '  '; i += 2; continue; }
    if (c === '/' && n === '*') { inBlock = true; out += '  '; i += 2; continue; }
    if (c === '@' && n === '"') { inVerbatim = true; out += '@"'; i += 2; continue; }
    if (c === '"') { inStr = true; out += c; i++; continue; }
    out += c; i++;
  }
  return out;
}

function extractFile(file, rootDir) {
  const raw = fs.readFileSync(file, 'utf8');
  const content = stripComments(raw);
  const rel = path.relative(rootDir, file);

  // ── Methods: optional attributes, access modifiers, return type, name, params ──
  // Captures async void, async Task, Task<T>, void, etc.
  const methodRe = /(?:^|\n)([ \t]*(?:\[[^\]\n]+\][ \t]*\n[ \t]*)*)[ \t]*((?:(?:public|private|protected|internal|static|async|partial|override|virtual|abstract|sealed)\s+)+)([\w<>\[\]?,\s]+?)\s+(\w+)\s*\(([^)]*)\)\s*(?:where[^{;]*)?[{;]/g;

  const methods = [];
  let m;
  while ((m = methodRe.exec(content)) !== null) {
    const attrBlock = m[1] || '';
    const modifiers = m[2] || '';
    const returnType = (m[3] || '').trim();
    const name = m[4];
    const params = m[5] || '';
    const headerStart = m.index + (m[0].startsWith('\n') ? 1 : 0);
    const declLine = lineOf(content, headerStart);
    const bodyOpen = content.indexOf('{', m.index + m[0].length - 1);

    const attrs = [];
    const attrRe = /\[([^\]\n]+)\]/g;
    let am;
    while ((am = attrRe.exec(attrBlock)) !== null) attrs.push(am[1].trim());

    const isAsync = /\basync\b/.test(modifiers);
    const isAsyncVoid = isAsync && /\bvoid\b/.test(returnType);
    const isRelayCommand = attrs.some(a => /RelayCommand|ICommand/.test(a));
    const bodyEnd = bodyOpen !== -1 ? findMatchingBrace(content, bodyOpen) : -1;

    methods.push({
      name, params, returnType,
      line: declLine,
      bodyStart: bodyOpen,
      bodyEnd,
      attrs,
      isAsync,
      isAsyncVoid,
      isRelayCommand,
    });
  }

  // ── Class declarations (for IDisposable check) ────────────────────────────
  const classes = [];
  const classRe = /(?:^|\n)[ \t]*((?:public|internal|private|partial|abstract|sealed|\s)*class\s+(\w+)(?:<[^>]*>)?(?:\s*:\s*([^{]+))?)\s*\{/g;
  while ((m = classRe.exec(content)) !== null) {
    const name = m[2];
    const bases = (m[3] || '').split(',').map(s => s.trim()).filter(Boolean);
    const implementsDisposable = bases.some(b => /IDisposable|IAsyncDisposable/.test(b));
    classes.push({
      name,
      line: lineOf(content, m.index),
      bases,
      implementsDisposable,
    });
  }

  // ── P/Invoke declarations ─────────────────────────────────────────────────
  const pinvokes = [];
  const dllImportRe = /\[(?:DllImport|LibraryImport)\s*\(\s*["']([^"']+)["'][^)]*\)\s*\]\s*(?:private\s+|public\s+|internal\s+|protected\s+|static\s+|extern\s+)*(?:static\s+)?(?:extern\s+)?(?:unsafe\s+)?[\w<>\[\]]+\s+(\w+)\s*\(/g;
  while ((m = dllImportRe.exec(content)) !== null) {
    pinvokes.push({
      library: m[1],
      name: m[2],
      line: lineOf(content, m.index),
    });
  }

  // ── unsafe blocks ─────────────────────────────────────────────────────────
  const unsafeBlocks = [];
  const unsafeRe = /\bunsafe\b\s*(?:static\s+)?(?:void|[\w<>]+\s+\w+\s*\([^)]*\)\s*)?\{/g;
  while ((m = unsafeRe.exec(content)) !== null) {
    const enc = enclosingMethod(methods, m.index);
    unsafeBlocks.push({
      line: lineOf(content, m.index),
      method: enc ? enc.name : null,
    });
  }

  // ── async void methods ────────────────────────────────────────────────────
  const asyncVoids = methods.filter(me => me.isAsyncVoid).map(me => ({
    name: me.name,
    line: me.line,
    isEventHandler: /object\?\s*sender|EventArgs/.test(me.params),
  }));

  // ── Process.Start calls ───────────────────────────────────────────────────
  const processStarts = [];
  const psRe = /\bProcess\.Start\s*\(/g;
  while ((m = psRe.exec(content)) !== null) {
    const enc = enclosingMethod(methods, m.index);
    // Check if UseShellExecute = true appears nearby (within 300 chars)
    const nearby = content.slice(m.index, m.index + 300);
    const hasShellExecute = /UseShellExecute\s*=\s*true/.test(nearby);
    processStarts.push({
      line: lineOf(content, m.index),
      method: enc ? enc.name : null,
      useShellExecute: hasShellExecute,
    });
  }

  // ── HttpClient usage patterns ─────────────────────────────────────────────
  const httpClients = [];

  // new HttpClient() — could be per-call or stored
  const newClientRe = /\bnew\s+HttpClient\s*\(\s*\)/g;
  while ((m = newClientRe.exec(content)) !== null) {
    const enc = enclosingMethod(methods, m.index);
    httpClients.push({
      kind: 'new-instance',
      line: lineOf(content, m.index),
      method: enc ? enc.name : null,
      insideMethod: !!enc,
    });
  }

  // HttpClient calls without observable Timeout assignment in same scope
  const httpCallRe = /\b_?httpClient\b\.(?:GetStringAsync|PostAsync|GetAsync|PutAsync|DeleteAsync|SendAsync)\s*\(/gi;
  while ((m = httpCallRe.exec(content)) !== null) {
    const enc = enclosingMethod(methods, m.index);
    httpClients.push({
      kind: 'call',
      op: m[0].match(/\.\s*(\w+)\s*\(/)?.[1] || 'call',
      line: lineOf(content, m.index),
      method: enc ? enc.name : null,
    });
  }

  // ── ObservableCollection cross-thread mutations ────────────────────────────
  // Look for .Add/.Clear/.Remove on collections inside Task.Run or similar backgrounds.
  const collectionMutations = [];
  const taskRunRe = /\bTask\.Run\s*\(/g;
  while ((m = taskRunRe.exec(content)) !== null) {
    // Find the lambda body by scanning forward for the matching brace
    const start = content.indexOf('{', m.index + m[0].length - 1);
    if (start === -1) continue;
    // Find the end of the lambda (approximate — find matching brace)
    let depth = 0, j = start;
    while (j < Math.min(content.length, start + 2000)) {
      if (content[j] === '{') depth++;
      else if (content[j] === '}') { depth--; if (depth === 0) break; }
      j++;
    }
    const lambdaBody = content.slice(start, j);

    // Check for ObservableCollection mutation patterns inside the lambda
    const mutRe = /\b(?:\w+)\s*\.(?:Add|Clear|Remove|RemoveAt|Insert)\s*\(/g;
    let mm;
    while ((mm = mutRe.exec(lambdaBody)) !== null) {
      const absIdx = start + mm.index;
      const enc = enclosingMethod(methods, absIdx);
      collectionMutations.push({
        op: mm[0].match(/\.(\w+)\s*\(/)?.[1] || 'mutate',
        line: lineOf(content, absIdx),
        method: enc ? enc.name : null,
        context: 'Task.Run',
      });
    }
  }

  // ── Thread.Sleep calls ────────────────────────────────────────────────────
  const threadSleeps = [];
  const sleepRe = /\bThread\.Sleep\s*\(/g;
  while ((m = sleepRe.exec(content)) !== null) {
    const enc = enclosingMethod(methods, m.index);
    threadSleeps.push({
      line: lineOf(content, m.index),
      method: enc ? enc.name : null,
    });
  }

  // ── IDisposable fields not disposed ───────────────────────────────────────
  // Heuristic: field declaration of a known IDisposable type without disposal
  const disposableFields = [];
  const dispFieldRe = /\bprivate\s+(?:readonly\s+)?(\w+(?:\?)?)\s+(_?\w+)\s*(?:=\s*new\s+\1)?;/g;
  const disposableTypes = /^(HttpClient|CancellationTokenSource|FileStream|MemoryStream|StreamReader|StreamWriter|TcpClient|UdpClient|WebClient|Timer|Mutex|Semaphore|SemaphoreSlim)$/;
  while ((m = dispFieldRe.exec(content)) !== null) {
    const typeName = m[1].replace('?', '');
    if (!disposableTypes.test(typeName)) continue;
    // Check if the class implements IDisposable
    const cls = classes[classes.length - 1]; // approximate: last class before this position
    const classDisposable = cls ? cls.implementsDisposable : false;
    disposableFields.push({
      type: typeName,
      field: m[2],
      line: lineOf(content, m.index),
      classImplementsIDisposable: classDisposable,
    });
  }

  // ── Component summary ─────────────────────────────────────────────────────
  const isViewModel = /ViewModel/.test(rel) || /ViewModel/.test(content);
  const isService = /Service/.test(rel);

  const comp = {
    file: rel,
    kind: isViewModel ? 'viewmodel' : isService ? 'service' : 'source',
    methodCount: methods.length,
    classes: classes.map(c => ({ name: c.name, line: c.line, implementsDisposable: c.implementsDisposable })),
  };
  if (pinvokes.length) comp.pinvokes = pinvokes;
  if (unsafeBlocks.length) comp.unsafeBlocks = unsafeBlocks;
  if (asyncVoids.length) comp.asyncVoids = asyncVoids;
  if (processStarts.length) comp.processStarts = processStarts;
  if (httpClients.length) comp.httpClients = httpClients;
  if (collectionMutations.length) comp.collectionMutations = collectionMutations;
  if (threadSleeps.length) comp.threadSleeps = threadSleeps;
  if (disposableFields.length) comp.disposableFields = disposableFields;

  return comp;
}

export function extract(rootDir) {
  const files = findFilesByExt(rootDir, ['.cs']);
  const components = files.map(f => extractFile(f, rootDir)).filter(c => c && (
    c.pinvokes || c.unsafeBlocks || c.asyncVoids || c.processStarts ||
    c.httpClients || c.collectionMutations || c.threadSleeps || c.disposableFields
  ));

  return {
    stack: 'csharp-avalonia',
    fileCount: files.length,
    components,
  };
}
