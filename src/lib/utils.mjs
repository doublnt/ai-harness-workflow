import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function cwd() {
  return process.cwd();
}

export function exists(p) {
  return fs.existsSync(p);
}

export function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

export function writeText(p, content, mode) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
  if (mode) fs.chmodSync(p, mode);
}

export function readJson(p, fallback = null) {
  try {
    return JSON.parse(readText(p));
  } catch {
    return fallback;
  }
}

export function writeJson(p, value) {
  writeText(p, JSON.stringify(value, null, 2) + '\n');
}

export function runGit(args, options = {}) {
  try {
    return execFileSync('git', args, {
      cwd: options.cwd || process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}

export function isGitRepo(projectDir = process.cwd()) {
  return runGit(['rev-parse', '--is-inside-work-tree'], { cwd: projectDir }) === 'true';
}

export function toPosix(p) {
  return p.replace(/\\/g, '/');
}

export function rel(projectDir, filePath) {
  return toPosix(path.relative(projectDir, filePath));
}

export function uniq(items) {
  return [...new Set(items.filter(Boolean))];
}

export function nowIso() {
  return new Date().toISOString();
}

export function slugify(input) {
  return String(input || 'change')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'change';
}

export function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

export function pathMatches(file, patterns) {
  const f = toPosix(file);
  return patterns.some((pattern) => globMatch(f, pattern));
}

export function globMatch(file, pattern) {
  const p = toPosix(pattern).replace(/^\.\//, '');
  if (p === file) return true;
  if (p.endsWith('/**')) return file === p.slice(0, -3) || file.startsWith(p.slice(0, -2));
  if (p.endsWith('/**/*')) return file.startsWith(p.slice(0, -4));
  if (!p.includes('*')) return file === p || file.startsWith(p.endsWith('/') ? p : p + '/');
  const regex = '^' + globToRegex(p) + '$';
  return new RegExp(regex).test(file);
}

function globToRegex(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          out += '(?:.*/)?';
          i += 2;
        } else {
          out += '.*';
          i += 1;
        }
      } else {
        out += '[^/]*';
      }
    } else {
      out += escapeRegexChar(ch);
    }
  }
  return out;
}

function escapeRegexChar(ch) {
  return /[.+?^${}()|[\]\\]/.test(ch) ? '\\' + ch : ch;
}

function escapeRegex(s) {
  return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}
