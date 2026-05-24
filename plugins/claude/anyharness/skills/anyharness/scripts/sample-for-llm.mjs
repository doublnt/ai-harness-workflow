#!/usr/bin/env node
// For unknown/unsupported stacks: select the most "high-signal" source files
// for LLM-based architecture analysis.
//
// Logic: find entry points, route/handler/controller files, service layer files,
// public headers. Cap at --max-files (default 12) to keep LLM context manageable.
//
// Usage:
//   node sample-for-llm.mjs [--root <path>] [--max-files <n>] [--language <lang>]
//
// Output: JSON with { language, framework, files: [{path, lines, sizeBytes}],
//   totalFiles, instruction }
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { detectStack } from './extractors/_detect-stack.mjs';

const args = process.argv.slice(2);
const rootIdx = args.indexOf('--root');
const maxIdx = args.indexOf('--max-files');
const langIdx = args.indexOf('--language');

const rootDir = path.resolve(rootIdx !== -1 ? args[rootIdx + 1] : (args.find(a => !a.startsWith('--')) || process.cwd()));
const maxFiles = maxIdx !== -1 ? parseInt(args[maxIdx + 1], 10) : 12;
const forceLang = langIdx !== -1 ? args[langIdx + 1] : null;

// ── File discovery helpers ────────────────────────────────────────────────────

const SKIP_DIRS = new Set(['node_modules', '.git', 'target', 'build', 'dist', 'out', '.next',
  '__pycache__', '.cache', 'vendor', 'third_party', 'external', 'deps', 'obj', 'bin']);

function walk(dir, exts, maxDepth = 5) {
  const results = [];
  function _walk(d, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) _walk(full, depth + 1);
      else if (!exts || exts.some(x => e.name.endsWith(x))) results.push(full);
    }
  }
  _walk(dir, 0);
  return results;
}

function countLines(p) {
  try { return fs.readFileSync(p, 'utf8').split('\n').length; } catch { return 0; }
}

function fileSize(p) {
  try { return fs.statSync(p).size; } catch { return 0; }
}

// ── Per-language sampling strategies ─────────────────────────────────────────

function scoreFile(rel, content, language) {
  let score = 0;
  const name = path.basename(rel).toLowerCase();
  const dir = rel.toLowerCase();

  // Universal high-signal names
  if (/main|app|server|index|bootstrap|startup/.test(name)) score += 10;
  if (/route|router|handler|controller|endpoint|api/.test(name)) score += 8;
  if (/service|usecase|domain|core/.test(name)) score += 6;
  if (/middleware|interceptor|filter|guard/.test(name)) score += 5;
  if (/auth|security|permission|access/.test(name)) score += 7;
  if (/config|setting/.test(name)) score += 3;
  if (/test|spec|_test|mock/.test(name)) score -= 5;
  if (/migration|schema\.sql/.test(name)) score -= 3;

  // Dir-level bonuses
  if (/src\/|lib\/|pkg\//.test(dir)) score += 2;
  if (/test|spec|mock|fixture|vendor/.test(dir)) score -= 4;

  // Language-specific content signals
  if (language === 'python') {
    if (/@app\.|@router\.|def \w+\(request|async def/.test(content)) score += 6;
    if (/subprocess\.|os\.system|exec\(/.test(content)) score += 4;
    if (/open\(|pathlib/.test(content)) score += 3;
  } else if (language === 'javascript' || language === 'typescript') {
    if (/router\.\w+\(|app\.\w+\(|@Controller|@Get|@Post/.test(content)) score += 6;
    if (/exec\(|spawn\(|child_process/.test(content)) score += 4;
    if (/fs\.read|fs\.write|path\.join/.test(content)) score += 3;
    if (/async |await |Promise/.test(content)) score += 2;
  } else if (language === 'go') {
    if (/http\.HandleFunc|\.GET\(|\.POST\(|func.*Handler/.test(content)) score += 6;
    if (/exec\.Command|os\.Open|ioutil\.ReadFile/.test(content)) score += 4;
    if (/goroutine|go func|sync\.Mutex/.test(content)) score += 3;
  } else if (language === 'rust') {
    if (/#\[tauri::command\]|#\[command\]|async fn|pub fn/.test(content)) score += 5;
    if (/unsafe\s*\{|std::process|std::fs/.test(content)) score += 6;
  } else if (language === 'csharp') {
    if (/\[HttpGet\]|\[HttpPost\]|\[Route\]|async Task|async void/.test(content)) score += 6;
    if (/Process\.Start|DllImport|unsafe\s*{/.test(content)) score += 5;
  } else if (language === 'cpp') {
    // Headers are more important than implementation
    if (rel.endsWith('.h') || rel.endsWith('.hpp')) score += 5;
    if (/memcpy|malloc|sprintf|strcpy|pthread_create/.test(content)) score += 4;
  }

  return score;
}

function sampleFiles(rootDir, detection, maxFiles) {
  const lang = detection.language;
  const extMap = {
    rust:       ['.rs'],
    csharp:     ['.cs'],
    java:       ['.java'],
    cpp:        ['.cpp', '.cc', '.cxx', '.h', '.hpp'],
    javascript: ['.js', '.mjs', '.cjs'],
    typescript: ['.ts', '.tsx'],
    go:         ['.go'],
    python:     ['.py'],
  };

  const exts = extMap[lang] || null;
  const allFiles = walk(rootDir, exts);

  if (allFiles.length === 0) return [];

  // Score each file
  const scored = allFiles.map(f => {
    const rel = path.relative(rootDir, f);
    const content = (() => { try { return fs.readFileSync(f, 'utf8').slice(0, 4096); } catch { return ''; } })();
    return { path: rel, fullPath: f, score: scoreFile(rel, content, lang), lines: countLines(f), sizeBytes: fileSize(f) };
  });

  // Sort by score descending, then by size ascending (prefer smaller well-scored files)
  scored.sort((a, b) => b.score - a.score || a.sizeBytes - b.sizeBytes);

  return scored.slice(0, maxFiles).map(f => ({
    path: f.path,
    lines: f.lines,
    sizeBytes: f.sizeBytes,
    score: f.score,
  }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

const detection = detectStack(rootDir);
const lang = forceLang || detection.language;

// Override language in detection if forced
const effectiveDetection = forceLang ? { ...detection, language: forceLang } : detection;

const files = sampleFiles(rootDir, effectiveDetection, maxFiles);
const totalSourceFiles = walk(rootDir, null).length;

console.log(JSON.stringify({
  detectedStack: detection.stack,
  supported: detection.supported,
  language: detection.language,
  framework: detection.framework,
  confidence: detection.confidence,
  evidence: detection.evidence,
  totalFiles: totalSourceFiles,
  sampledFiles: files.length,
  files,
  instruction: [
    `Stack '${detection.stack}' has no deterministic extractor. Use LLM-based analysis.`,
    `Read each file listed in 'files' using your file-reading tool.`,
    `Then apply the LLM extraction guide from references/llm-extractor.md to produce Risk[] findings.`,
    `Output findings in the same format as derive-risk-topology.mjs (severity, kind, title, evidence, candidate).`,
  ].join(' '),
}, null, 2));
