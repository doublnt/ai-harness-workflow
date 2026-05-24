#!/usr/bin/env node
// Invoked by the AnyHarness skill via Bash tool. Not a direct user command.
/**
 * Dispatcher for deep architecture extraction.
 * Selects a per-stack extractor module from ./extractors/<stack>.mjs and
 * runs it against the project root. Output is a uniform JSON shape consumed
 * by derive-risk-topology.mjs.
 *
 * Supported stacks (PoC):
 *   java-spring        Java + Spring Boot
 *   rust-tauri         Rust + Tauri desktop client
 *   csharp-avalonia    C# + Avalonia desktop client
 *   cpp-sdk            C/C++ SDK (public API surface)
 *
 * Usage:
 *   node extract-architecture.mjs --stack <stack> [path]
 *
 * Each extractor is a small ES module that exports `extract(rootDir)` and
 * returns `{ stack, fileCount, components }`. See references/probe-architecture.md.
 */
import path from 'node:path';
import url from 'node:url';

const SUPPORTED_STACKS = ['java-spring', 'rust-tauri', 'csharp-avalonia', 'cpp-sdk'];

const args = process.argv.slice(2);
const stackIdx = args.indexOf('--stack');
const stack = stackIdx !== -1 ? args[stackIdx + 1] : null;
const positional = args.filter((a, i) => i !== stackIdx && i !== stackIdx + 1 && !a.startsWith('--'));
const root = path.resolve(positional[0] || process.cwd());

if (!stack) {
  process.stderr.write(JSON.stringify({
    error: 'missing --stack',
    code: 1,
    supported: SUPPORTED_STACKS,
    hint: 'Pass --stack <id>. Run with --stack java-spring (or rust-tauri / csharp-avalonia / cpp-sdk).',
  }) + '\n');
  process.exit(1);
}

if (!SUPPORTED_STACKS.includes(stack)) {
  process.stderr.write(JSON.stringify({
    error: `stack not supported: ${stack}`,
    code: 1,
    supported: SUPPORTED_STACKS,
  }) + '\n');
  process.exit(1);
}

const here = path.dirname(url.fileURLToPath(import.meta.url));
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
