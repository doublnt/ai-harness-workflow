#!/usr/bin/env node
// Invoked by the AnyHarness skill via Bash tool. Not a direct user command.
/**
 * Dispatcher for risk topology derivation.
 * Reads an architecture extraction JSON (from extract-architecture.mjs),
 * loads the per-stack topology rule module from ./topology/<stack>.mjs,
 * and emits risk findings ready for propose-evolution.mjs.
 *
 * Usage:
 *   node derive-risk-topology.mjs --in <path>
 *   cat extraction.json | node derive-risk-topology.mjs
 *
 * Each topology module exports `deriveRisks(extraction)` returning Risk[].
 * See references/risk-topology.md and references/universal-failure-modes.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const SUPPORTED_STACKS = ['java-spring', 'rust-tauri', 'csharp-avalonia', 'cpp-sdk'];

const args = process.argv.slice(2);
const inIdx = args.indexOf('--in');
const inPath = inIdx !== -1 ? args[inIdx + 1] : null;

let extraction;
try {
  const raw = inPath ? fs.readFileSync(inPath, 'utf8') : fs.readFileSync(0, 'utf8');
  extraction = JSON.parse(raw);
} catch (e) {
  process.stderr.write(JSON.stringify({ error: 'failed to read/parse extraction JSON', code: 1, hint: String(e.message) }) + '\n');
  process.exit(1);
}

const here = path.dirname(url.fileURLToPath(import.meta.url));

// Resolve topology module: per-stack if available, else universal fallback
let topologyPath;
if (SUPPORTED_STACKS.includes(extraction.stack)) {
  topologyPath = path.join(here, 'topology', `${extraction.stack}.mjs`);
} else {
  // Path C (config-based) or any unknown stack that produced component data
  topologyPath = path.join(here, 'topology', '_universal.mjs');
}

let topology;
try {
  topology = await import(url.pathToFileURL(topologyPath).href);
} catch (e) {
  process.stderr.write(JSON.stringify({
    error: `failed to load topology rules for ${extraction.stack}`,
    code: 1,
    hint: String(e.message),
  }) + '\n');
  process.exit(1);
}

if (typeof topology.deriveRisks !== 'function') {
  process.stderr.write(JSON.stringify({
    error: `topology module for ${extraction.stack} does not export deriveRisks()`,
    code: 1,
  }) + '\n');
  process.exit(1);
}

const risks = topology.deriveRisks(extraction) || [];

const counts = { blocker: 0, high: 0, medium: 0, low: 0 };
for (const r of risks) counts[r.severity] = (counts[r.severity] || 0) + 1;

console.log(JSON.stringify({
  stack: extraction.stack,
  source: inPath || 'stdin',
  componentCount: (extraction.components || []).length,
  riskCount: risks.length,
  counts,
  risks,
  poc: true,
  nextAction: risks.length === 0
    ? 'no_risks: topology pass found no flagged patterns'
    : 'present_to_user: surface findings and ask which Learning Candidates to apply via propose-evolution.mjs',
}, null, 2));
