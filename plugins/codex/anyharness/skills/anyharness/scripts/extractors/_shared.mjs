// Shared helpers used by per-stack extractors.
// Stack extractors import from this file.
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_SKIP = new Set([
  'node_modules', 'target', 'build', '.git', '.idea', 'out', 'dist',
  '.next', '.nuxt', 'vendor', '__pycache__', '.venv', '.tox',
  'bin', 'obj', // C# build outputs
  '.cargo', // Rust
]);

export function findFilesByExt(rootDir, exts, out = [], skip = DEFAULT_SKIP) {
  if (!fs.existsSync(rootDir)) return out;
  for (const e of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (e.name.startsWith('.') && e.name !== '.') continue;
    if (skip.has(e.name)) continue;
    const p = path.join(rootDir, e.name);
    if (e.isDirectory()) findFilesByExt(p, exts, out, skip);
    else if (e.isFile() && exts.some(ext => e.name.endsWith(ext))) out.push(p);
  }
  return out;
}

export function findMatchingBrace(text, openIdx) {
  let depth = 0;
  let i = openIdx;
  let inString = false, inChar = false, inBlock = false, inLine = false;
  while (i < text.length) {
    const c = text[i], n = text[i + 1];
    if (inLine) { if (c === '\n') inLine = false; i++; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i += 2; continue; } i++; continue; }
    if (inString) { if (c === '\\') { i += 2; continue; } if (c === '"') inString = false; i++; continue; }
    if (inChar) { if (c === '\\') { i += 2; continue; } if (c === "'") inChar = false; i++; continue; }
    if (c === '/' && n === '/') { inLine = true; i += 2; continue; }
    if (c === '/' && n === '*') { inBlock = true; i += 2; continue; }
    if (c === '"') { inString = true; i++; continue; }
    if (c === "'") { inChar = true; i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
    i++;
  }
  return -1;
}

export function lineOf(text, idx) {
  let line = 1;
  for (let i = 0; i < idx; i++) if (text[i] === '\n') line++;
  return line;
}

// Depth-aware split that respects generic brackets and parens.
export function splitParams(s) {
  const out = [];
  let buf = '';
  let depth = 0;
  for (const c of s) {
    if (c === '<' || c === '(' || c === '[') depth++;
    else if (c === '>' || c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
    } else {
      buf += c;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

// Find which method body an index falls inside, given a list of {bodyStart, bodyEnd, name}.
export function enclosingMethod(methods, idx) {
  return methods.find(me => me.bodyStart >= 0 && idx > me.bodyStart && idx < me.bodyEnd);
}
