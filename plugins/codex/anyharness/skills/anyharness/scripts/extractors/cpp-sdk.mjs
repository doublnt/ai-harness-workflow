// C++ SDK extractor.
//
// A C++ SDK exposes a public API surface (usually in headers under include/).
// Callers are untrusted; all inputs must be validated before use.
// Key failure modes:
//   - Raw pointer / length pairs in the public API (trust boundary)
//   - memcpy / strcpy / sprintf / gets with user-supplied length (buffer overflow)
//   - void* ctx callbacks with no lifetime enforcement (use-after-free)
//   - Raw new/delete without RAII (double-free, memory leak)
//   - Global mutable state (mutex, static variables) — data races, deadlock
//   - std::thread without join (orphan threads, use-after-free on capture)
//   - Detach instead of join (thread becomes uncheckable orphan)
//   - Return value of API function ignored (error swallowing)
//   - C-string (char*) in public API (no null-terminator guarantee)
//
// PoC quality: regex-based over header + source files. Replaceable with libclang / tree-sitter-cpp.
import fs from 'node:fs';
import path from 'node:path';
import { findFilesByExt, findMatchingBrace, lineOf, enclosingMethod } from './_shared.mjs';

// Strip // and /* */ comments, preserving line positions.
function stripComments(content) {
  let out = '', i = 0, inStr = false, inChar = false, inBlock = false, inLine = false;
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
    if (inStr) {
      if (c === '\\') { out += content.slice(i, i + 2); i += 2; continue; }
      if (c === '"') inStr = false;
      out += c; i++; continue;
    }
    if (inChar) {
      if (c === '\\') { out += content.slice(i, i + 2); i += 2; continue; }
      if (c === "'") inChar = false;
      out += c; i++; continue;
    }
    if (c === '/' && n === '/') { inLine = true; out += '  '; i += 2; continue; }
    if (c === '/' && n === '*') { inBlock = true; out += '  '; i += 2; continue; }
    if (c === '"') { inStr = true; out += c; i++; continue; }
    if (c === "'") { inChar = true; out += c; i++; continue; }
    out += c; i++;
  }
  return out;
}

function isHeader(file) {
  return /\.(h|hpp|hxx)$/.test(file);
}

function extractFile(file, rootDir) {
  const raw = fs.readFileSync(file, 'utf8');
  const content = stripComments(raw);
  const rel = path.relative(rootDir, file);
  const isHdr = isHeader(file);

  // ── Functions / methods ───────────────────────────────────────────────────
  // Matches: optional return type, function name, (params), optional { or ;
  const fnRe = /(?:^|\n)[ \t]*((?:[\w:*&<>\[\]]+\s+)+)(\w+)\s*\(([^)]*)\)\s*(?:const\s*)?(?:noexcept\s*)?(?:override\s*)?[{;]/g;
  const methods = [];
  let m;
  while ((m = fnRe.exec(content)) !== null) {
    const name = m[2];
    // Skip keywords that look like function calls
    if (/^(if|for|while|switch|catch|return|delete|new)$/.test(name)) continue;
    const params = m[3] || '';
    const headerStart = m.index + (m[0].startsWith('\n') ? 1 : 0);
    const bodyOpen = content.indexOf('{', m.index + m[0].length - 1);
    const bodyEnd = bodyOpen !== -1 && !m[0].endsWith(';') ? findMatchingBrace(content, bodyOpen) : -1;
    methods.push({
      name, params,
      line: lineOf(content, headerStart),
      bodyStart: bodyOpen,
      bodyEnd,
      isPublic: isHdr,
    });
  }

  // ── Public API surface (header functions) ─────────────────────────────────
  const publicFunctions = [];
  if (isHdr) {
    for (const me of methods) {
      const rawLine = raw.split('\n')[me.line - 1] || '';
      const hasRawPtr = /\*/.test(me.params) || /char\s*\*/.test(rawLine);
      const hasVoidCtx = /void\s*\*\s*\w*ctx/.test(me.params) || /void\s*\*\s*ctx/.test(me.params);
      const hasSizeParam = /\bsize_t\b/.test(me.params) || /\bsize\b/.test(me.params) || /\blen\b/.test(me.params);
      const hasCallback = /\(\s*\*\s*\w+\s*\)/.test(me.params) || /typedef.*\(\s*\*/.test(rawLine);
      const returnsCStr = /\bchar\s*\*/.test(rawLine.split('(')[0]);
      publicFunctions.push({
        name: me.name,
        line: me.line,
        params: me.params.trim(),
        hasRawPtr,
        hasVoidCtx,
        hasSizeParam,
        hasCallback,
        returnsCStr,
      });
    }
  }

  // ── Unsafe memory operations ──────────────────────────────────────────────
  const memOps = [];
  const memPatterns = [
    { kind: 'memcpy',  re: /\bmemcpy\s*\(/g },
    { kind: 'strcpy',  re: /\bstrcpy\s*\(/g },
    { kind: 'strncpy', re: /\bstrncpy\s*\(/g },
    { kind: 'sprintf', re: /\bsprintf\s*\(/g },
    { kind: 'gets',    re: /\bgets\s*\(/g },
    { kind: 'scanf',   re: /\bscanf\s*\(/g },
    { kind: 'strlen',  re: /\bstrlen\s*\(/g },
    { kind: 'malloc',  re: /\bmalloc\s*\(/g },
    { kind: 'realloc', re: /\brealloc\s*\(/g },
    { kind: 'free',    re: /\bfree\s*\(/g },
  ];
  for (const { kind, re } of memPatterns) {
    while ((m = re.exec(content)) !== null) {
      const enc = enclosingMethod(methods, m.index);
      memOps.push({
        kind,
        line: lineOf(content, m.index),
        function: enc ? enc.name : null,
      });
    }
  }

  // ── Raw new / delete (non-RAII) ───────────────────────────────────────────
  const rawAllocations = [];
  const newRe = /\bnew\s+\w+/g;
  while ((m = newRe.exec(content)) !== null) {
    const enc = enclosingMethod(methods, m.index);
    rawAllocations.push({
      kind: 'new',
      line: lineOf(content, m.index),
      function: enc ? enc.name : null,
    });
  }
  const deleteRe = /\bdelete\b\s*(?:\[\s*\])?\s*\w+/g;
  while ((m = deleteRe.exec(content)) !== null) {
    const enc = enclosingMethod(methods, m.index);
    rawAllocations.push({
      kind: 'delete',
      line: lineOf(content, m.index),
      function: enc ? enc.name : null,
    });
  }

  // ── Thread operations ─────────────────────────────────────────────────────
  const threadOps = [];
  const threadPatterns = [
    { kind: 'thread-create', re: /\bstd::thread\s*[({]/g },
    { kind: 'detach',        re: /\.detach\s*\(\s*\)/g },
    { kind: 'join',          re: /\.join\s*\(\s*\)/g },
    { kind: 'pthread-create',re: /\bpthread_create\s*\(/g },
  ];
  for (const { kind, re } of threadPatterns) {
    while ((m = re.exec(content)) !== null) {
      const enc = enclosingMethod(methods, m.index);
      threadOps.push({
        kind,
        line: lineOf(content, m.index),
        function: enc ? enc.name : null,
      });
    }
  }

  // ── Global mutable state ──────────────────────────────────────────────────
  const globalState = [];
  const globalRe = /(?:^|\n)(?:static\s+)?(?:std::mutex|std::atomic|std::vector|std::map|std::unordered_map)\s+(\w+)\s*[=;{]/g;
  while ((m = globalRe.exec(content)) !== null) {
    globalState.push({
      decl: m[0].trim().replace(/\s+/g, ' ').slice(0, 60),
      name: m[1],
      line: lineOf(content, m.index),
    });
  }

  // ── Component summary ─────────────────────────────────────────────────────
  const comp = {
    file: rel,
    kind: isHdr ? 'header' : 'source',
    functionCount: methods.length,
  };
  if (publicFunctions.length && isHdr) comp.publicAPI = publicFunctions;
  if (memOps.length) comp.memOps = memOps;
  if (rawAllocations.length) comp.rawAllocations = rawAllocations;
  if (threadOps.length) comp.threadOps = threadOps;
  if (globalState.length) comp.globalState = globalState;

  return comp;
}

export function extract(rootDir) {
  const files = findFilesByExt(rootDir, ['.h', '.hpp', '.hxx', '.c', '.cpp', '.cxx', '.cc']);
  const components = files.map(f => extractFile(f, rootDir)).filter(c => c && (
    c.publicAPI || c.memOps || c.rawAllocations || c.threadOps || c.globalState
  ));

  // Cross-file: surface list of public API functions with risk attributes
  const allPublicAPI = [];
  for (const c of components) {
    if (c.publicAPI) for (const fn of c.publicAPI) allPublicAPI.push({ ...fn, file: c.file });
  }

  return {
    stack: 'cpp-sdk',
    fileCount: files.length,
    components,
    cross: {
      publicAPICount: allPublicAPI.length,
      publicAPIWithRawPtr: allPublicAPI.filter(f => f.hasRawPtr).map(f => f.name),
      publicAPIWithCallback: allPublicAPI.filter(f => f.hasCallback).map(f => f.name),
      publicAPIReturnsCStr: allPublicAPI.filter(f => f.returnsCStr).map(f => f.name),
    },
  };
}
