// Config-based extractor (Path C).
// Reads .anyharness/stack-config.json from the project root and applies
// the user-defined patterns to source files. Produces the same component
// shape as other extractors so universal topology rules can operate on it.
//
// Config shape: see references/stack-config-schema.md
import fs from 'node:fs';
import path from 'node:path';
import { findFilesByExt, findMatchingBrace, lineOf, enclosingMethod } from './_shared.mjs';

const CONFIG_PATH = '.anyharness/stack-config.json';

export function loadConfig(rootDir) {
  const cfgPath = path.join(rootDir, CONFIG_PATH);
  try {
    return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  } catch {
    return null;
  }
}

// Strip // and /* */ comments (works for JS, TS, Go, Rust, C-style, Python #)
function stripComments(content, language) {
  if (language === 'python') {
    // Python: # line comments only; no block comments
    return content.replace(/#[^\n]*/g, m => ' '.repeat(m.length));
  }
  let out = '', i = 0, inStr = false, inBlock = false, inLine = false;
  while (i < content.length) {
    const c = content[i], n = content[i + 1];
    if (inLine) { if (c === '\n') { inLine = false; out += '\n'; } else out += ' '; i++; continue; }
    if (inBlock) {
      if (c === '*' && n === '/') { inBlock = false; out += '  '; i += 2; continue; }
      out += (c === '\n' ? '\n' : ' '); i++; continue;
    }
    if (inStr) {
      if (c === '\\') { out += content.slice(i, i + 2); i += 2; continue; }
      if (c === '"' || c === "'") inStr = false;
      out += c; i++; continue;
    }
    if (c === '/' && n === '/') { inLine = true; out += '  '; i += 2; continue; }
    if (c === '/' && n === '*') { inBlock = true; out += '  '; i += 2; continue; }
    if (c === '"' || c === "'") { inStr = true; out += c; i++; continue; }
    out += c; i++;
  }
  return out;
}

// Generic function/method finder — works across most C-style and Python syntaxes
function findFunctions(content, language) {
  const fns = [];
  let re;
  if (language === 'python') {
    // Python: def/async def with possible decorators
    re = /(?:^|\n)([ \t]*(?:@\w+[^\n]*\n[ \t]*)*)[ \t]*(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)\s*(?:->[^\n:]+)?:/gm;
  } else if (language === 'go') {
    re = /(?:^|\n)func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(([^)]*)\)[^{]*\{/g;
  } else {
    // JS/TS/Rust/C#/Java generic
    re = /(?:^|\n)[ \t]*((?:pub(?:\([^)]*\))?\s+|async\s+|public\s+|private\s+|protected\s+|static\s+|override\s+)*)(?:fn|function|async\s+function|def)?\s*(\w+)\s*\(([^)]*)\)[^{;]*\{/g;
  }

  let m;
  while ((m = re.exec(content)) !== null) {
    const name = language === 'go' ? m[1] : (m[2] || m[1] || '?');
    const params = language === 'go' ? m[2] : (m[3] || '');
    const headerStart = m.index + (m[0].startsWith('\n') ? 1 : 0);
    const bodyOpen = language === 'python'
      ? content.indexOf(':', m.index + m[0].length - 1)  // Python uses : not {
      : content.indexOf('{', m.index + m[0].length - 1);
    const bodyEnd = bodyOpen !== -1 && language !== 'python'
      ? findMatchingBrace(content, bodyOpen)
      : -1;
    fns.push({
      name, params,
      line: lineOf(content, headerStart),
      bodyStart: bodyOpen,
      bodyEnd,
    });
  }
  return fns;
}

function extractFile(file, rootDir, config) {
  const raw = fs.readFileSync(file, 'utf8');
  const content = stripComments(raw, config.language || '');
  const rel = path.relative(rootDir, file);
  const functions = findFunctions(content, config.language || '');

  // ── Trust boundary functions ──────────────────────────────────────────────
  const trustBoundaryFunctions = [];
  for (const marker of (config.trustBoundaryMarkers || [])) {
    const re = new RegExp(marker.pattern, 'g');
    let m;
    while ((m = re.exec(content)) !== null) {
      const enc = enclosingMethod(functions, m.index) || functions.find(f => {
        // For Python decorators: the decorator appears before the function
        return Math.abs(f.line - lineOf(content, m.index)) <= 3;
      });
      if (!enc) continue;
      if (trustBoundaryFunctions.some(t => t.name === enc.name)) continue;
      trustBoundaryFunctions.push({
        name: enc.name,
        line: enc.line,
        params: enc.params.trim(),
        markerDescription: marker.description || marker.pattern,
      });
    }
  }

  // For languages without braces (Python), use line proximity to find enclosing fn
  function enclosingFn(idx) {
    const stdEnc = enclosingMethod(functions, idx);
    if (stdEnc) return stdEnc;
    // Fallback: find the last function whose def line is before current line
    const currentLine = lineOf(content, idx);
    let best = null;
    for (const fn of functions) {
      if (fn.line <= currentLine) best = fn;
      else break;
    }
    return best;
  }

  // ── External calls ────────────────────────────────────────────────────────
  const externalCalls = [];
  for (const pat of (config.externalCallPatterns || [])) {
    const re = new RegExp(pat.pattern, 'g');
    let m;
    while ((m = re.exec(content)) !== null) {
      const enc = enclosingFn(m.index);
      const isTrustBoundary = trustBoundaryFunctions.some(t => t.name === enc?.name);
      externalCalls.push({
        kind: pat.kind || 'external',
        op: (m[1] || pat.pattern).slice(0, 30),
        line: lineOf(content, m.index),
        function: enc ? enc.name : null,
        inTrustBoundary: isTrustBoundary,
      });
    }
  }

  // ── Unsafe / dangerous patterns ───────────────────────────────────────────
  const unsafeOccurrences = [];
  for (const pat of (config.unsafePatterns || [])) {
    const re = new RegExp(pat.pattern, 'g');
    let m;
    while ((m = re.exec(content)) !== null) {
      const enc = enclosingFn(m.index);
      unsafeOccurrences.push({
        kind: pat.kind || 'unsafe',
        line: lineOf(content, m.index),
        function: enc ? enc.name : null,
        inTrustBoundary: trustBoundaryFunctions.some(t => t.name === enc?.name),
      });
    }
  }

  // ── Async functions ───────────────────────────────────────────────────────
  const asyncFunctions = [];
  for (const pat of (config.asyncPatterns || [])) {
    const re = new RegExp(pat.pattern, 'g');
    let m;
    while ((m = re.exec(content)) !== null) {
      const enc = enclosingFn(m.index) || functions.find(f => lineOf(content, m.index) === f.line);
      if (!enc || asyncFunctions.some(a => a.name === enc.name)) continue;
      asyncFunctions.push({ name: enc.name, line: enc.line });
    }
  }

  // ── Error-swallowing patterns ─────────────────────────────────────────────
  const errorSwallows = [];
  for (const pat of (config.errorSwallowPatterns || [])) {
    const re = new RegExp(pat.pattern, 'g');
    let m;
    while ((m = re.exec(content)) !== null) {
      const enc = enclosingFn(m.index);
      errorSwallows.push({
        line: lineOf(content, m.index),
        function: enc ? enc.name : null,
        description: pat.description || pat.pattern,
      });
    }
  }

  const comp = {
    file: rel,
    kind: config.language || 'source',
    functionCount: functions.length,
  };
  if (trustBoundaryFunctions.length) comp.trustBoundaryFunctions = trustBoundaryFunctions;
  if (externalCalls.length) comp.externalCalls = externalCalls;
  if (unsafeOccurrences.length) comp.unsafeOccurrences = unsafeOccurrences;
  if (asyncFunctions.length) comp.asyncFunctions = asyncFunctions;
  if (errorSwallows.length) comp.errorSwallows = errorSwallows;

  return comp;
}

export function extract(rootDir, config) {
  const exts = config.fileExtensions || ['.js'];
  const files = findFilesByExt(rootDir, exts);
  const components = files
    .map(f => extractFile(f, rootDir, config))
    .filter(c => c.trustBoundaryFunctions || c.externalCalls || c.unsafeOccurrences || c.asyncFunctions || c.errorSwallows);

  return {
    stack: config.stack || 'custom',
    fileCount: files.length,
    components,
  };
}
