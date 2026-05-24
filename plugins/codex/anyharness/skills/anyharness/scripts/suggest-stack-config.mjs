#!/usr/bin/env node
// Invoked by the AnyHarness skill via Bash tool. Not a direct user command.
/**
 * B→C upgrade path: generate a draft .anyharness/stack-config.json for any
 * project that doesn't have a built-in deterministic extractor.
 *
 * Usage:
 *   node suggest-stack-config.mjs [--path <dir>] [--save] [--confirm]
 *
 * Default (no flags): print the config JSON to stdout.
 * --save:    write to .anyharness/drafts/stack-config.json (safe; does not activate Path C).
 * --confirm: write to .anyharness/stack-config.json (activates Path C on next analyze run).
 *
 * Exit codes:
 *   0 — config written/printed
 *   1 — error (see stderr JSON)
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const args = process.argv.slice(2);
const get = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def; };
const has = (flag) => args.includes(flag);

const projectPath = path.resolve(get('--path', '.'));
const save = has('--save');
const confirm = has('--confirm');

const here = path.dirname(url.fileURLToPath(import.meta.url));
const SUPPORTED = new Set(['java-spring', 'rust-tauri', 'csharp-avalonia', 'cpp-sdk']);

// ── Detect stack ──────────────────────────────────────────────────────────────

const { detectStack } = await import(url.pathToFileURL(path.join(here, 'extractors/_detect-stack.mjs')).href);
const detection = detectStack(projectPath);

if (detection.isUserConfig) {
  console.log(JSON.stringify({
    action: 'noop',
    message: 'A .anyharness/stack-config.json already exists for this project.',
    configPath: detection.configPath,
    hint: 'Remove or rename it to regenerate a fresh template.',
  }, null, 2));
  process.exit(0);
}

if (detection.supported && SUPPORTED.has(detection.stack)) {
  console.log(JSON.stringify({
    action: 'noop',
    message: `Stack '${detection.stack}' already has a built-in deterministic extractor (Path A). No stack-config.json needed.`,
    stack: detection.stack,
    hint: 'Run: analyze.mjs --stack auto --path <dir>',
  }, null, 2));
  process.exit(0);
}

// ── Templates ─────────────────────────────────────────────────────────────────

const T = {
  'python-fastapi': {
    stack: 'python-fastapi', language: 'python', framework: 'fastapi',
    fileExtensions: ['.py'],
    trustBoundaryMarkers: [
      { pattern: '@app\\.(get|post|put|delete|patch)\\b', description: 'FastAPI app route' },
      { pattern: '@router\\.(get|post|put|delete|patch)\\b', description: 'FastAPI APIRouter route' },
    ],
    externalCallPatterns: [
      { pattern: 'subprocess\\.(run|call|check_output|Popen)\\s*\\(', kind: 'process' },
      { pattern: 'os\\.system\\s*\\(', kind: 'process' },
      { pattern: 'requests\\.(get|post|put|delete|patch)\\s*\\(', kind: 'net' },
      { pattern: 'httpx\\.(get|post|put|delete|patch)\\s*\\(', kind: 'net' },
      { pattern: 'aiohttp\\.ClientSession', kind: 'net' },
      { pattern: '\\bopen\\s*\\(', kind: 'fs' },
    ],
    unsafePatterns: [{ pattern: 'eval\\s*\\(|exec\\s*\\(', kind: 'code-injection' }],
    asyncPatterns: [{ pattern: 'async def\\s+\\w+' }],
    errorSwallowPatterns: [
      { pattern: 'except\\s*:', description: 'bare except' },
      { pattern: 'except Exception\\s*:', description: 'bare Exception catch' },
    ],
  },

  'python-flask': {
    stack: 'python-flask', language: 'python', framework: 'flask',
    fileExtensions: ['.py'],
    trustBoundaryMarkers: [
      { pattern: '@app\\.route\\s*\\(', description: 'Flask app route' },
      { pattern: '@(?:blueprint|bp)\\.route\\s*\\(', description: 'Flask Blueprint route' },
    ],
    externalCallPatterns: [
      { pattern: 'subprocess\\.(run|call|check_output|Popen)\\s*\\(', kind: 'process' },
      { pattern: 'os\\.system\\s*\\(', kind: 'process' },
      { pattern: 'requests\\.(get|post|put|delete|patch)\\s*\\(', kind: 'net' },
      { pattern: 'httpx\\.(get|post|put|delete|patch)\\s*\\(', kind: 'net' },
      { pattern: '\\bopen\\s*\\(', kind: 'fs' },
    ],
    unsafePatterns: [{ pattern: 'eval\\s*\\(|exec\\s*\\(', kind: 'code-injection' }],
    asyncPatterns: [{ pattern: 'async def\\s+\\w+' }],
    errorSwallowPatterns: [
      { pattern: 'except\\s*:', description: 'bare except' },
      { pattern: 'except Exception\\s*:', description: 'bare Exception catch' },
    ],
  },

  'python-django': {
    stack: 'python-django', language: 'python', framework: 'django',
    fileExtensions: ['.py'],
    trustBoundaryMarkers: [
      { pattern: 'def\\s+(?:get|post|put|delete|patch)\\s*\\(self,\\s*request', description: 'Django class-based view method' },
      { pattern: 'path\\s*\\(.*,\\s*views\\.', description: 'Django URL route' },
      { pattern: '@require_(?:http_methods|GET|POST)', description: 'Django function-based view decorator' },
    ],
    externalCallPatterns: [
      { pattern: 'subprocess\\.(run|call|check_output|Popen)\\s*\\(', kind: 'process' },
      { pattern: 'os\\.system\\s*\\(', kind: 'process' },
      { pattern: 'requests\\.(get|post|put|delete|patch)\\s*\\(', kind: 'net' },
      { pattern: '\\bopen\\s*\\(', kind: 'fs' },
    ],
    unsafePatterns: [{ pattern: 'eval\\s*\\(|exec\\s*\\(', kind: 'code-injection' }],
    asyncPatterns: [{ pattern: 'async def\\s+\\w+' }],
    errorSwallowPatterns: [
      { pattern: 'except\\s*:', description: 'bare except' },
    ],
  },

  'python': {
    stack: 'python', language: 'python', framework: null,
    fileExtensions: ['.py'],
    trustBoundaryMarkers: [
      { pattern: '@app\\.(get|post|put|delete|patch)\\b', description: 'HTTP route decorator (FastAPI/Flask-style)' },
      { pattern: '@router\\.(get|post|put|delete|patch)\\b', description: 'Router route decorator' },
    ],
    externalCallPatterns: [
      { pattern: 'subprocess\\.(run|call|check_output|Popen)\\s*\\(', kind: 'process' },
      { pattern: 'os\\.system\\s*\\(', kind: 'process' },
      { pattern: 'requests\\.(get|post|put|delete|patch)\\s*\\(', kind: 'net' },
      { pattern: 'httpx\\.(get|post|put|delete|patch)\\s*\\(', kind: 'net' },
      { pattern: '\\bopen\\s*\\(', kind: 'fs' },
    ],
    unsafePatterns: [{ pattern: 'eval\\s*\\(|exec\\s*\\(', kind: 'code-injection' }],
    asyncPatterns: [{ pattern: 'async def\\s+\\w+' }],
    errorSwallowPatterns: [{ pattern: 'except\\s*:', description: 'bare except' }],
  },

  'go-gin': {
    stack: 'go-gin', language: 'go', framework: 'gin',
    fileExtensions: ['.go'],
    trustBoundaryMarkers: [
      { pattern: '\\.(GET|POST|PUT|DELETE|PATCH)\\s*\\(', description: 'Gin route registration' },
      { pattern: 'http\\.HandleFunc\\s*\\(', description: 'stdlib HTTP handler' },
    ],
    externalCallPatterns: [
      { pattern: 'exec\\.Command\\s*\\(', kind: 'process' },
      { pattern: 'http\\.(Get|Post|Do)\\s*\\(|client\\.Do\\s*\\(', kind: 'net' },
      { pattern: 'os\\.(Open|ReadFile|WriteFile)\\s*\\(|ioutil\\.ReadFile\\s*\\(', kind: 'fs' },
    ],
    asyncPatterns: [{ pattern: 'go func\\s*\\(' }],
    errorSwallowPatterns: [{ pattern: '_ = \\w+\\.\\w+\\(', description: 'ignored error return' }],
  },

  'go-echo': {
    stack: 'go-echo', language: 'go', framework: 'echo',
    fileExtensions: ['.go'],
    trustBoundaryMarkers: [
      { pattern: 'e\\.(GET|POST|PUT|DELETE|PATCH)\\s*\\(', description: 'Echo route registration' },
      { pattern: 'g\\.(GET|POST|PUT|DELETE|PATCH)\\s*\\(', description: 'Echo group route' },
    ],
    externalCallPatterns: [
      { pattern: 'exec\\.Command\\s*\\(', kind: 'process' },
      { pattern: 'http\\.(Get|Post|Do)\\s*\\(|client\\.Do\\s*\\(', kind: 'net' },
      { pattern: 'os\\.(Open|ReadFile|WriteFile)\\s*\\(', kind: 'fs' },
    ],
    asyncPatterns: [{ pattern: 'go func\\s*\\(' }],
    errorSwallowPatterns: [{ pattern: '_ = \\w+\\.\\w+\\(', description: 'ignored error return' }],
  },

  'go': {
    stack: 'go', language: 'go', framework: null,
    fileExtensions: ['.go'],
    trustBoundaryMarkers: [
      { pattern: 'http\\.HandleFunc\\s*\\(', description: 'stdlib HTTP handler' },
      { pattern: '\\.(GET|POST|PUT|DELETE|PATCH)\\s*\\(', description: 'Router route registration' },
    ],
    externalCallPatterns: [
      { pattern: 'exec\\.Command\\s*\\(', kind: 'process' },
      { pattern: 'http\\.(Get|Post|Do)\\s*\\(', kind: 'net' },
      { pattern: 'os\\.(Open|ReadFile|WriteFile)\\s*\\(', kind: 'fs' },
    ],
    asyncPatterns: [{ pattern: 'go func\\s*\\(' }],
    errorSwallowPatterns: [{ pattern: '_ = \\w+\\.\\w+\\(', description: 'ignored error return' }],
  },

  'node-express': {
    stack: 'node-express', language: 'typescript', framework: 'express',
    fileExtensions: ['.ts', '.tsx'],
    trustBoundaryMarkers: [
      { pattern: 'router\\.(get|post|put|delete|patch)\\s*\\(', description: 'Express router route' },
      { pattern: 'app\\.(get|post|put|delete|patch)\\s*\\(', description: 'Express app route' },
    ],
    externalCallPatterns: [
      { pattern: 'child_process\\.(exec|execSync|spawn)\\s*\\(|\\bspawn\\s*\\(', kind: 'process' },
      { pattern: 'fetch\\s*\\(|axios\\.(get|post|put|delete)\\s*\\(', kind: 'net' },
      { pattern: 'fs\\.(readFile|writeFile|readFileSync|writeFileSync)\\s*\\(', kind: 'fs' },
    ],
    asyncPatterns: [{ pattern: 'async\\s+(function|\\w+)\\s*\\(' }],
    errorSwallowPatterns: [
      { pattern: '\\.catch\\s*\\(\\s*\\(\\s*\\)\\s*=>\\s*\\{\\s*\\}', description: 'empty .catch()' },
      { pattern: 'catch\\s*\\([^)]+\\)\\s*\\{\\s*\\}', description: 'empty catch block' },
    ],
  },

  'node-express-js': {
    stack: 'node-express', language: 'javascript', framework: 'express',
    fileExtensions: ['.js', '.mjs'],
    trustBoundaryMarkers: [
      { pattern: 'router\\.(get|post|put|delete|patch)\\s*\\(', description: 'Express router route' },
      { pattern: 'app\\.(get|post|put|delete|patch)\\s*\\(', description: 'Express app route' },
    ],
    externalCallPatterns: [
      { pattern: 'child_process\\.(exec|execSync|spawn)\\s*\\(|\\bspawn\\s*\\(', kind: 'process' },
      { pattern: 'fetch\\s*\\(|axios\\.(get|post|put|delete)\\s*\\(', kind: 'net' },
      { pattern: 'fs\\.(readFile|writeFile|readFileSync|writeFileSync)\\s*\\(', kind: 'fs' },
    ],
    asyncPatterns: [{ pattern: 'async\\s+(function|\\w+)\\s*\\(' }],
    errorSwallowPatterns: [
      { pattern: '\\.catch\\s*\\(\\s*\\(\\s*\\)\\s*=>\\s*\\{\\s*\\}', description: 'empty .catch()' },
    ],
  },

  'node-nestjs': {
    stack: 'node-nestjs', language: 'typescript', framework: 'nestjs',
    fileExtensions: ['.ts'],
    trustBoundaryMarkers: [
      { pattern: '@(Get|Post|Put|Delete|Patch)\\s*\\(', description: 'NestJS HTTP method decorator' },
      { pattern: '@MessagePattern\\s*\\(|@EventPattern\\s*\\(', description: 'NestJS microservice pattern' },
    ],
    externalCallPatterns: [
      { pattern: 'child_process\\.(exec|execSync|spawn)\\s*\\(', kind: 'process' },
      { pattern: 'fetch\\s*\\(|axios\\.(get|post|put|delete)\\s*\\(|this\\.httpService', kind: 'net' },
      { pattern: 'fs\\.(readFile|writeFile|readFileSync|writeFileSync)\\s*\\(', kind: 'fs' },
    ],
    asyncPatterns: [{ pattern: 'async\\s+\\w+\\s*\\(' }],
    errorSwallowPatterns: [
      { pattern: 'catch\\s*\\([^)]+\\)\\s*\\{\\s*\\}', description: 'empty catch block' },
    ],
  },

  'node': {
    stack: 'node', language: 'javascript', framework: null,
    fileExtensions: ['.js', '.mjs', '.cjs'],
    trustBoundaryMarkers: [
      { pattern: '(?:router|app)\\.(get|post|put|delete|patch)\\s*\\(', description: 'HTTP route' },
    ],
    externalCallPatterns: [
      { pattern: 'child_process\\.(exec|execSync|spawn)\\s*\\(', kind: 'process' },
      { pattern: 'fetch\\s*\\(|axios\\.(get|post)\\s*\\(', kind: 'net' },
      { pattern: 'fs\\.(readFile|writeFile)\\s*\\(', kind: 'fs' },
    ],
    asyncPatterns: [{ pattern: 'async\\s+(function|\\w+)\\s*\\(' }],
    errorSwallowPatterns: [
      { pattern: '\\.catch\\s*\\(\\s*\\(\\s*\\)\\s*=>\\s*\\{\\s*\\}', description: 'empty .catch()' },
    ],
  },

  'typescript': {
    stack: 'typescript', language: 'typescript', framework: null,
    fileExtensions: ['.ts', '.tsx'],
    trustBoundaryMarkers: [
      { pattern: '(?:router|app)\\.(get|post|put|delete|patch)\\s*\\(', description: 'HTTP route' },
      { pattern: '@(Get|Post|Put|Delete|Patch)\\s*\\(', description: 'HTTP method decorator' },
    ],
    externalCallPatterns: [
      { pattern: 'child_process\\.(exec|execSync|spawn)\\s*\\(', kind: 'process' },
      { pattern: 'fetch\\s*\\(|axios\\.(get|post)\\s*\\(', kind: 'net' },
      { pattern: 'fs\\.(readFile|writeFile|readFileSync|writeFileSync)\\s*\\(', kind: 'fs' },
    ],
    asyncPatterns: [{ pattern: 'async\\s+(function|\\w+)\\s*\\(' }],
    errorSwallowPatterns: [
      { pattern: 'catch\\s*\\([^)]+\\)\\s*\\{\\s*\\}', description: 'empty catch block' },
    ],
  },

  'ruby-rails': {
    stack: 'ruby-rails', language: 'ruby', framework: 'rails',
    fileExtensions: ['.rb'],
    trustBoundaryMarkers: [
      { pattern: 'def\\s+(index|show|create|update|destroy|new|edit)\\b', description: 'Rails RESTful action' },
      { pattern: 'before_action|around_action|after_action', description: 'Rails filter' },
    ],
    externalCallPatterns: [
      { pattern: '`[^`]+`|\\bsystem\\s*\\(', kind: 'process' },
      { pattern: 'Net::HTTP|HTTParty\\.|Faraday\\.', kind: 'net' },
      { pattern: 'File\\.(open|read|write)|IO\\.read', kind: 'fs' },
    ],
    asyncPatterns: [{ pattern: 'perform_later|perform_async|Sidekiq::Worker' }],
    errorSwallowPatterns: [{ pattern: 'rescue\\s*$', description: 'bare rescue (catches everything)' }],
  },

  'ruby': {
    stack: 'ruby', language: 'ruby', framework: null,
    fileExtensions: ['.rb'],
    trustBoundaryMarkers: [
      { pattern: 'get\\s*[\'"].*[\'"]|post\\s*[\'"].*[\'"]', description: 'Sinatra-style route' },
      { pattern: 'def\\s+(index|show|create|update|destroy)\\b', description: 'Controller action' },
    ],
    externalCallPatterns: [
      { pattern: '`[^`]+`|\\bsystem\\s*\\(', kind: 'process' },
      { pattern: 'Net::HTTP|open-uri', kind: 'net' },
      { pattern: 'File\\.(open|read|write)', kind: 'fs' },
    ],
    asyncPatterns: [],
    errorSwallowPatterns: [{ pattern: 'rescue\\s*$', description: 'bare rescue' }],
  },
};

function pickTemplate(lang, fw) {
  const l = (lang || '').toLowerCase();
  const f = (fw || '').toLowerCase();

  if (l === 'python') {
    if (f.includes('fastapi')) return T['python-fastapi'];
    if (f.includes('flask')) return T['python-flask'];
    if (f.includes('django')) return T['python-django'];
    return T['python'];
  }
  if (l === 'go') {
    if (f.includes('gin')) return T['go-gin'];
    if (f.includes('echo')) return T['go-echo'];
    return T['go'];
  }
  if (l === 'typescript') {
    if (f.includes('nest')) return T['node-nestjs'];
    if (f.includes('express') || f.includes('fastify')) return T['node-express'];
    return T['typescript'];
  }
  if (l === 'javascript') {
    if (f.includes('express') || f.includes('fastify')) return T['node-express-js'];
    return T['node'];
  }
  if (l === 'ruby') {
    if (f.includes('rails')) return T['ruby-rails'];
    return T['ruby'];
  }
  // Unknown — return a placeholder template
  return {
    stack: detection.stack || 'custom',
    language: lang || 'unknown',
    framework: fw || null,
    fileExtensions: ['.<ext>'],
    trustBoundaryMarkers: [
      { pattern: '<route-decorator-or-handler-annotation>', description: 'HTTP or IPC entry point' },
    ],
    externalCallPatterns: [
      { pattern: '<shell-exec-pattern>', kind: 'process' },
      { pattern: '<http-client-call-pattern>', kind: 'net' },
      { pattern: '<file-open-read-pattern>', kind: 'fs' },
    ],
    unsafePatterns: [],
    asyncPatterns: [],
    errorSwallowPatterns: [],
    _note: 'No language template matched. Fill in the regex patterns for your stack. See references/stack-config-schema.md.',
  };
}

const config = pickTemplate(detection.language, detection.framework);

// ── Write / print ─────────────────────────────────────────────────────────────

const configJson = JSON.stringify(config, null, 2);

if (confirm) {
  const dest = path.join(projectPath, '.anyharness', 'stack-config.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    process.stderr.write(JSON.stringify({
      error: 'stack-config.json already exists',
      path: dest,
      hint: 'Remove it first, or use --save to write to the drafts folder.',
    }) + '\n');
    process.exit(1);
  }
  fs.writeFileSync(dest, configJson);
  console.log(JSON.stringify({
    action: 'written',
    path: dest,
    stack: config.stack,
    language: config.language,
    nextAction: 'run: analyze.mjs --stack auto --path <dir>',
    hint: 'Path C is now active. Edit the patterns to match your project before running analyze.',
  }, null, 2));
} else if (save) {
  const dest = path.join(projectPath, '.anyharness', 'drafts', 'stack-config.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, configJson);
  console.log(JSON.stringify({
    action: 'drafted',
    path: dest,
    stack: config.stack,
    language: config.language,
    nextAction: 'review the draft, then run with --confirm to activate Path C',
  }, null, 2));
} else {
  // Print config JSON to stdout (for piping or inspection)
  console.log(configJson);
}
