#!/usr/bin/env node
// Invoked by the AnyHarness skill via Bash tool. Not a direct user command.
/**
 * Dispatcher for deep architecture extraction.
 * Selects a per-stack extractor module from ./extractors/<stack>.mjs and
 * runs it against the project root. Output is a uniform JSON shape consumed
 * by derive-risk-topology.mjs.
 *
 * Supported stacks (deterministic extractor):
 *   java-spring        Java + Spring Boot
 *   rust-tauri         Rust + Tauri desktop client
 *   csharp-avalonia    C# + Avalonia desktop client
 *   cpp-sdk            C/C++ SDK (public API surface)
 *
 * Usage:
 *   node extract-architecture.mjs --stack <stack|auto> [path]
 *
 * --stack auto  — detect the stack from project files; if supported, run the
 *                 deterministic extractor; if not, emit needsLLMAnalysis: true
 *                 with a sample file list for LLM-based analysis.
 *
 * Each extractor exports `extract(rootDir)` returning `{ stack, fileCount, components }`.
 * See references/probe-architecture.md.
 */
import path from 'node:path';
import url from 'node:url';

const SUPPORTED_STACKS = ['java-spring', 'rust-tauri', 'csharp-avalonia', 'cpp-sdk'];

const args = process.argv.slice(2);
const stackIdx = args.indexOf('--stack');
const stack = stackIdx !== -1 ? args[stackIdx + 1] : null;
const positional = args.filter((a, i) => i !== stackIdx && i !== stackIdx + 1 && !a.startsWith('--'));
const root = path.resolve(positional[0] || process.cwd());
const here = path.dirname(url.fileURLToPath(import.meta.url));

if (!stack) {
  process.stderr.write(JSON.stringify({
    error: 'missing --stack',
    code: 1,
    supported: [...SUPPORTED_STACKS, 'auto'],
    hint: 'Pass --stack auto to detect the stack automatically, or --stack <id> for a specific stack.',
  }) + '\n');
  process.exit(1);
}

// ── --stack auto: detect and dispatch ────────────────────��───────────────────

if (stack === 'auto') {
  const { detectStack } = await import(url.pathToFileURL(path.join(here, 'extractors/_detect-stack.mjs')).href);
  const detection = detectStack(root);

  if (detection.supported && SUPPORTED_STACKS.includes(detection.stack)) {
    // Re-invoke with the detected stack (fall through to deterministic path below)
    // by replacing the stack value and continuing execution
    process.argv[stackIdx + 1] = detection.stack;
    const extractorPath = path.join(here, 'extractors', `${detection.stack}.mjs`);
    let extractor;
    try { extractor = await import(url.pathToFileURL(extractorPath).href); } catch (e) {
      process.stderr.write(JSON.stringify({ error: `failed to load extractor for ${detection.stack}`, hint: String(e.message) }) + '\n');
      process.exit(1);
    }
    const result = extractor.extract(root);
    const components = Array.isArray(result.components) ? result.components : [];
    const out = {
      stack: result.stack || detection.stack,
      root: path.relative(process.cwd(), root) || '.',
      detectedBy: 'auto',
      detectionEvidence: detection.evidence,
      fileCount: result.fileCount ?? 0,
      componentCount: components.length,
      components,
      poc: true,
      extractionMethod: 'regex (PoC)',
      nextAction: components.length === 0
        ? 'no_components: extractor found files but no matching components — verify the project root and stack'
        : 'derive_risk_topology: pipe this output into derive-risk-topology.mjs',
    };
    if (result.cross) out.cross = result.cross;
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  }

  // Unsupported stack — emit LLM analysis request
  const { default: spawnChild } = await import('node:child_process');

  // Run sample-for-llm.mjs to get the file sample
  const sampleScript = path.join(here, 'sample-for-llm.mjs');
  let sampleResult;
  try {
    const { execFileSync } = await import('node:child_process');
    const out = execFileSync(process.execPath, [sampleScript, '--root', root], { encoding: 'utf8', timeout: 15000 });
    sampleResult = JSON.parse(out);
  } catch (e) {
    sampleResult = { files: [], error: String(e.message) };
  }

  console.log(JSON.stringify({
    stack: detection.stack,
    language: detection.language,
    framework: detection.framework,
    root: path.relative(process.cwd(), root) || '.',
    detectionConfidence: detection.confidence,
    detectionEvidence: detection.evidence,
    needsLLMAnalysis: true,
    supported: false,
    sampledFiles: sampleResult.files || [],
    totalFiles: sampleResult.totalFiles || 0,
    nextAction: [
      'llm_analysis: this stack has no deterministic extractor.',
      `Read the ${(sampleResult.files || []).length} files listed in sampledFiles.`,
      'Then apply references/llm-extractor.md to produce Risk[] findings.',
      'Output findings directly in the risk topology format (no need to pipe to derive-risk-topology.mjs).',
    ].join(' '),
  }, null, 2));
  process.exit(0);
}

// ── Explicit --stack <id>: deterministic path ─────────────────────────────────

if (!SUPPORTED_STACKS.includes(stack)) {
  // Try auto-detect as a hint, but report unsupported
  const { detectStack } = await import(url.pathToFileURL(path.join(here, 'extractors/_detect-stack.mjs')).href);
  const detection = detectStack(root);
  process.stderr.write(JSON.stringify({
    error: `stack not supported: ${stack}`,
    code: 1,
    supported: SUPPORTED_STACKS,
    hint: detection.stack !== 'unknown'
      ? `Auto-detection suggests this might be '${detection.stack}' (${detection.confidence} confidence). Try --stack auto.`
      : 'Try --stack auto to let AnyHarness detect the stack.',
  }) + '\n');
  process.exit(1);
}

const extractorPath = path.join(here, 'extractors', `${stack}.mjs`);

let extractor;
try {
  extractor = await import(url.pathToFileURL(extractorPath).href);
} catch (e) {
  process.stderr.write(JSON.stringify({
    error: `failed to load extractor for ${stack}`,
    code: 1,
    hint: String(e.message),
  }) + '\n');
  process.exit(1);
}

if (typeof extractor.extract !== 'function') {
  process.stderr.write(JSON.stringify({
    error: `extractor for ${stack} does not export extract()`,
    code: 1,
  }) + '\n');
  process.exit(1);
}

const result = extractor.extract(root);
const components = Array.isArray(result.components) ? result.components : [];

const out = {
  stack: result.stack || stack,
  root: path.relative(process.cwd(), root) || '.',
  fileCount: result.fileCount ?? 0,
  componentCount: components.length,
  components,
  poc: true,
  extractionMethod: 'regex (PoC)',
  nextAction: components.length === 0
    ? 'no_components: extractor found files but no matching components — verify the project root and stack'
    : 'derive_risk_topology: pipe this output into derive-risk-topology.mjs',
};
if (result.cross) out.cross = result.cross;

console.log(JSON.stringify(out, null, 2));
