#!/usr/bin/env node
// Invoked by the AnyHarness skill via Bash tool. Not a direct user command.
/**
 * Unified onboarding for existing projects.
 *
 * Combines scan-project.mjs + analyze.mjs into one pass, producing a
 * structured JSON that lets the skill present domain signals AND architecture
 * risks together — then write the profile seeded with both in a single confirmation.
 *
 * Usage:
 *   node onboard.mjs [--path <dir>] [--json]
 *
 * Output JSON shape:
 *   {
 *     stack, stacks[], detectedBy, extractionMethod,
 *     scanResult:   { stacks, domainSignals, aiWorkflow, notable, fileCount },
 *     analysisResult: { riskCount, counts, risks }  OR  { needsLLMAnalysis, sampledFiles }
 *     seedCandidates: { trigger, candidates[] }   -- ready for propose-evolution.mjs
 *     needsLLMAnalysis: boolean
 *   }
 *
 * The skill workflow:
 *   1. Run onboard.mjs  →  combined domain + risk picture
 *   2. Present everything in ONE pass; ask focused residual questions
 *   3. write-profile.mjs (domain answers) + propose-evolution.mjs --findings seed (risks)
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const args = process.argv.slice(2);
const get = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def; };
const has = (flag) => args.includes(flag);

const projectPath = path.resolve(get('--path', '.'));
const jsonMode = has('--json');

const here = path.dirname(url.fileURLToPath(import.meta.url));
const scanScript    = path.join(here, 'scan-project.mjs');
const analyzeScript = path.join(here, 'analyze.mjs');

// ── Step 1: Scan ──────────────────────────────────────────────────────────────

let scanResult;
try {
  const raw = execFileSync(process.execPath, [scanScript, projectPath], {
    encoding: 'utf8', timeout: 30000,
  });
  scanResult = JSON.parse(raw);
} catch (e) {
  process.stderr.write(JSON.stringify({ error: 'scan failed', detail: String(e.message) }) + '\n');
  process.exit(1);
}

// ── Step 2: Analyze ──────────────────────────────────────────────────────────

let analysisResult;
try {
  const raw = execFileSync(process.execPath, [analyzeScript, '--stack', 'auto', '--path', projectPath, '--json'], {
    encoding: 'utf8', timeout: 60000,
  });
  analysisResult = JSON.parse(raw);
} catch (e) {
  // Analysis failure is non-fatal — onboard still works with scan only
  analysisResult = { error: String(e.message), riskCount: 0, risks: [] };
}

const needsLLMAnalysis = !!analysisResult.needsLLMAnalysis;

// ── Step 3: Build seed candidates from risk findings ─────────────────────────
// Risks carry pre-formatted Learning Candidates — collect them here so the skill
// can pass them directly to propose-evolution.mjs after profile creation.

const risks = analysisResult.risks || [];
const seedCandidates = {
  trigger: 'initial-onboarding',
  candidates: risks
    .filter(r => r.candidate && typeof r.candidate.type === 'string')
    .map(r => ({
      ...r.candidate,
      // Embed evidence from the risk so the profile entry has provenance
      evidence: r.evidence ? r.evidence.join(', ') : undefined,
      _severity: r.severity,
      _kind: r.kind,
    })),
};

// ── Step 4: Assemble output ───────────────────────────────────────────────────

const report = {
  stack: analysisResult.stack || scanResult.stacks?.[0] || 'unknown',
  stacks: scanResult.stacks || [],
  detectedBy: analysisResult.detectedBy || 'scan',
  extractionMethod: analysisResult.extractionMethod || null,
  fileCount: scanResult.fileCount ?? (scanResult.sampleFiles?.length ?? 0),
  componentCount: analysisResult.componentCount ?? 0,

  scanResult: {
    stacks: scanResult.stacks || [],
    domainSignals: scanResult.domainSignals || [],
    aiWorkflow: scanResult.aiWorkflow || {},
    notable: scanResult.notable || [],
    sampleFiles: (scanResult.sampleFiles || []).slice(0, 20),
  },

  analysisResult: needsLLMAnalysis
    ? {
        needsLLMAnalysis: true,
        stack: analysisResult.stack,
        language: analysisResult.language,
        framework: analysisResult.framework,
        sampledFiles: analysisResult.sampledFiles || [],
        totalFiles: analysisResult.totalFiles || 0,
        detectionEvidence: analysisResult.detectionEvidence || [],
      }
    : {
        needsLLMAnalysis: false,
        riskCount: analysisResult.riskCount || 0,
        counts: analysisResult.counts || {},
        risks: risks,
      },

  seedCandidates,
  needsLLMAnalysis,

  nextAction: needsLLMAnalysis
    ? [
        'llm_analysis: read the files in analysisResult.sampledFiles using references/llm-extractor.md.',
        'Then present: scanResult domain signals + your risk findings together.',
        'Ask focused residual questions, then write-profile.mjs and propose-evolution.mjs.',
      ].join(' ')
    : [
        'present_combined: show scanResult.domainSignals + analysisResult.risks to the user.',
        `Ask residual questions not answered by the ${risks.length} risk findings.`,
        'Then write-profile.mjs (domain), then propose-evolution.mjs --findings seedCandidates (risks).',
      ].join(' '),
};

// ── Step 5: Output ────────────────────────────────────────────────────────────

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

// Human-readable summary
const SEV_ORDER = ['blocker', 'high', 'medium', 'low'];
const counts = report.analysisResult.counts || {};

console.log('');
console.log('  AnyHarness Onboarding');
console.log('  ═══════════════════════════════════════════════════════════════');
console.log('  Stack:       ' + report.stack +
  (report.stacks.length > 1 ? '  (also: ' + report.stacks.filter(s => s !== report.stack).join(', ') + ')' : ''));
console.log('  Files:       ' + report.fileCount);
console.log('  Components:  ' + report.componentCount);
console.log('');

if ((scanResult.domainSignals || []).length > 0) {
  console.log('  Domain signals:');
  for (const s of scanResult.domainSignals.slice(0, 8)) {
    console.log('    · ' + (typeof s === 'string' ? s : JSON.stringify(s)));
  }
  console.log('');
}

if ((scanResult.aiWorkflow?.files || []).length > 0) {
  console.log('  AI workflow: ' + scanResult.aiWorkflow.files.join(', '));
  console.log('');
}

if (needsLLMAnalysis) {
  const files = report.analysisResult.sampledFiles || [];
  console.log('  Architecture: PATH B — No built-in extractor for this stack.');
  console.log('  Sampled ' + files.length + ' files for LLM analysis:');
  for (const f of files) console.log('    ' + f.path + '  (' + f.lines + ' lines)');
  console.log('');
  console.log('  Tip: run scripts/suggest-stack-config.mjs --path <dir> --save');
  console.log('       to generate a starter stack-config.json (Path C).');
} else {
  const total = report.analysisResult.riskCount || 0;
  if (total === 0) {
    console.log('  Architecture: No risk findings from topology pass.');
  } else {
    const summary = SEV_ORDER.filter(s => (counts[s] || 0) > 0)
      .map(s => `${counts[s]} ${s}`).join('  ·  ');
    console.log('  Architecture: ' + total + ' findings  (' + summary + ')');
    console.log('  Seed candidates ready: ' + seedCandidates.candidates.length +
      ' Learning Candidates pre-formatted for profile.');
  }
}

console.log('');
console.log('  ───────────────────────────────────────────────────────────────');
console.log('  Next: present combined findings, ask residual questions,');
console.log('  then write-profile.mjs + propose-evolution.mjs --findings seedCandidates.');
console.log('');
