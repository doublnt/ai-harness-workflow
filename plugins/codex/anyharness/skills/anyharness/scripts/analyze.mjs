#!/usr/bin/env node
// Invoked by the AnyHarness skill via Bash tool. Not a direct user command.
/**
 * Unified analysis pipeline: extract → topology → human-readable report.
 *
 * For Path A (deterministic) and Path C (config-based):
 *   runs extract-architecture.mjs, pipes output into derive-risk-topology.mjs,
 *   formats findings grouped by severity, and saves to .anyharness/reports/.
 *
 * For Path B (unsupported stack):
 *   runs extract-architecture.mjs, emits LLM instructions with the sampled
 *   file list, and exits — the LLM step is the caller's responsibility.
 *
 * Usage:
 *   node analyze.mjs [--stack auto|<id>] [--path <dir>] [--save] [--json]
 *
 * Options:
 *   --stack   Stack identifier. Default: auto.
 *   --path    Project root. Default: current directory.
 *   --save    Write report JSON to .anyharness/reports/analysis-<timestamp>.json
 *   --json    Emit machine-readable JSON instead of human-readable text.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const args = process.argv.slice(2);
const get = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def; };
const has = (flag) => args.includes(flag);

const stack = get('--stack', 'auto');
const projectPath = path.resolve(get('--path', '.'));
const saveReport = has('--save');
const jsonMode = has('--json');

const here = path.dirname(url.fileURLToPath(import.meta.url));
const extractScript = path.join(here, 'extract-architecture.mjs');
const topologyScript = path.join(here, 'derive-risk-topology.mjs');

// ── Step 1: Extract ───────────────────────────────────────────────────────────

let extraction;
try {
  const raw = execFileSync(process.execPath, [extractScript, '--stack', stack, projectPath], {
    encoding: 'utf8', timeout: 30000,
  });
  extraction = JSON.parse(raw);
} catch (e) {
  const errText = e.stderr || e.stdout || e.message;
  let parsed;
  try { parsed = JSON.parse(errText); } catch { parsed = null; }
  process.stderr.write(JSON.stringify({
    error: 'extraction failed',
    detail: parsed || errText,
  }) + '\n');
  process.exit(1);
}

// ── Path B: LLM analysis needed ───────────────────────────────────────────────

if (extraction.needsLLMAnalysis) {
  if (jsonMode) {
    console.log(JSON.stringify(extraction, null, 2));
  } else {
    const files = extraction.sampledFiles || [];
    console.log('');
    console.log('  STACK: ' + (extraction.stack || 'unknown') +
      (extraction.framework ? ' / ' + extraction.framework : ''));
    console.log('  PATH B — No deterministic extractor for this stack.');
    console.log('');
    console.log('  Sampled files for LLM analysis (' + files.length + ' of ' + (extraction.totalFiles || '?') + ' total):');
    for (const f of files) {
      console.log('    ' + f.path + '  (' + f.lines + ' lines)');
    }
    console.log('');
    console.log('  Next step: Read the files above, then apply references/llm-extractor.md');
    console.log('  to produce Risk[] findings in the standard topology format.');
    console.log('');
    if (extraction.detectionEvidence) {
      console.log('  Detection evidence: ' + extraction.detectionEvidence.join(', '));
      console.log('');
    }
  }
  process.exit(0);
}

// ── Step 2: Derive risk topology ──────────────────────────────────────────────

let topology;
try {
  const extractionJson = JSON.stringify(extraction);
  const raw = execFileSync(process.execPath, [topologyScript], {
    input: extractionJson,
    encoding: 'utf8',
    timeout: 30000,
  });
  topology = JSON.parse(raw);
} catch (e) {
  const errText = e.stderr || e.stdout || e.message;
  let parsed;
  try { parsed = JSON.parse(errText); } catch { parsed = null; }
  process.stderr.write(JSON.stringify({
    error: 'topology derivation failed',
    detail: parsed || errText,
  }) + '\n');
  process.exit(1);
}

// ── Step 3: Assemble report ───────────────────────────────────────────────────

const report = {
  generatedAt: new Date().toISOString(),
  stack: topology.stack,
  root: extraction.root,
  detectedBy: extraction.detectedBy,
  extractionMethod: extraction.extractionMethod,
  fileCount: extraction.fileCount,
  componentCount: extraction.componentCount,
  riskCount: topology.riskCount,
  counts: topology.counts,
  risks: topology.risks,
};

// ── Step 4: Save (optional) ───────────────────────────────────────────────────

let savedPath = null;
if (saveReport) {
  const reportsDir = path.join(projectPath, '.anyharness', 'reports');
  try {
    fs.mkdirSync(reportsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    savedPath = path.join(reportsDir, `analysis-${ts}.json`);
    fs.writeFileSync(savedPath, JSON.stringify(report, null, 2));
  } catch (e) {
    process.stderr.write('warn: could not save report: ' + e.message + '\n');
  }
}

// ── Step 5: Output ────────────────────────────────────────────────────────────

if (jsonMode) {
  if (savedPath) report.savedTo = path.relative(projectPath, savedPath);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

// Human-readable output
const SEV_ORDER = ['blocker', 'high', 'medium', 'low'];
const SEV_LABEL = {
  blocker: 'BLOCKER',
  high:    'HIGH   ',
  medium:  'MEDIUM ',
  low:     'LOW    ',
};

const risks = report.risks || [];
const byGroup = {};
for (const sev of SEV_ORDER) {
  byGroup[sev] = risks.filter(r => r.severity === sev);
}

console.log('');
console.log('  AnyHarness Analysis');
console.log('  ═══════════════════════════════════════════════════════════════');
console.log('  Stack:      ' + report.stack);
console.log('  Root:       ' + (report.root || '.'));
console.log('  Method:     ' + (report.extractionMethod || '—'));
console.log('  Files:      ' + (report.fileCount || 0) + '  Components: ' + (report.componentCount || 0));
console.log('');

const counts = report.counts || {};
const total = report.riskCount || 0;
if (total === 0) {
  console.log('  No risk findings. Topology pass found no flagged patterns.');
} else {
  const summary = SEV_ORDER
    .filter(s => (counts[s] || 0) > 0)
    .map(s => `${counts[s]} ${s}`)
    .join('  ·  ');
  console.log('  Findings:   ' + total + '  (' + summary + ')');
  console.log('');

  for (const sev of SEV_ORDER) {
    const group = byGroup[sev];
    if (!group.length) continue;
    for (const r of group) {
      console.log('  [' + SEV_LABEL[sev] + ']  ' + r.title);
      if (r.kind) console.log('             kind: ' + r.kind);
      if (r.evidence && r.evidence.length) {
        for (const ev of r.evidence) {
          console.log('             ' + ev);
        }
      }
      if (r.candidate) {
        const c = r.candidate;
        if (c.type === 'invariant' && c.proposed) {
          console.log('             → invariant: ' + c.proposed);
        } else if (c.type === 'question' && c.question) {
          console.log('             → question: ' + c.question);
        }
      }
      console.log('');
    }
  }
}

console.log('  ───────────────────────────────────────────────────────────────');
if (savedPath) {
  console.log('  Report saved: ' + path.relative(process.cwd(), savedPath));
} else {
  console.log('  Tip: run with --save to persist the report to .anyharness/reports/');
}
console.log('');
