import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function cwd() {
  return process.cwd();
}

export function toPosix(filePath) {
  return String(filePath).replace(/\\/g, '/');
}

export function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function exists(filePath) {
  return fs.existsSync(filePath);
}

export function readText(filePath, fallback = '') {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return fallback; }
}

export function writeText(filePath, text, mode) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, 'utf8');
  if (mode) fs.chmodSync(filePath, mode);
}

export function run(cmd, args = [], options = {}) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

export function git(args, options = {}) {
  return run('git', args, options);
}

export function isGitRepo(repo = cwd()) {
  const result = git(['rev-parse', '--is-inside-work-tree'], { cwd: repo });
  return result.ok && result.stdout.trim() === 'true';
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function parseArgs(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) { rest.push(token); continue; }
    const [rawKey, rawValue] = token.slice(2).split('=', 2);
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (rawValue !== undefined) { flags[key] = rawValue; continue; }
    const next = argv[i + 1];
    if (next && !next.startsWith('-')) { flags[key] = next; i += 1; }
    else { flags[key] = true; }
  }
  return { flags, rest };
}

export async function readStdinJson() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return { raw }; }
}

export function nowIso() {
  return new Date().toISOString();
}
