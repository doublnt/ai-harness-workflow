import fs from 'node:fs';
import path from 'node:path';

export function exists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

export function readText(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

export function readJson(root, relativePath) {
  try {
    return JSON.parse(readText(root, relativePath));
  } catch {
    return null;
  }
}

export function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function writeFileSafe(root, relativePath, content, created, drafts) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    ensureDir(fullPath);
    fs.writeFileSync(fullPath, normalizeNewline(content), 'utf8');
    created.push(relativePath);
    return { path: relativePath, action: 'created' };
  }

  const draftPath = draftFor(relativePath);
  const fullDraftPath = path.join(root, draftPath);
  ensureDir(fullDraftPath);
  fs.writeFileSync(fullDraftPath, normalizeNewline(content), 'utf8');
  drafts.push(draftPath);
  return { path: draftPath, action: 'draft', conflictsWith: relativePath };
}

export function normalizeNewline(value) {
  return String(value).replace(/\r\n/g, '\n').trimEnd() + '\n';
}

export function draftFor(relativePath) {
  const safe = relativePath.replace(/[\\/]/g, '__');
  if (relativePath.startsWith('.claude/')) return `.claude/_drafts/${safe}.draft.md`;
  if (relativePath.startsWith('.agents/')) return `.agents/_drafts/${safe}.draft.md`;
  if (relativePath.startsWith('.codex/')) return `.codex/_drafts/${safe}.draft.md`;
  return `_drafts/${safe}.draft.md`;
}

export function table(rows) {
  if (rows.length === 0) return '';
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => String(row[i] ?? '').length)));
  return rows.map((row, index) => {
    const line = `| ${row.map((cell, i) => String(cell ?? '').padEnd(widths[i])).join(' | ')} |`;
    if (index === 0) {
      const sep = `| ${widths.map((w) => '-'.repeat(Math.max(3, w))).join(' | ')} |`;
      return `${line}\n${sep}`;
    }
    return line;
  }).join('\n');
}

export function rel(root, fullPath) {
  return path.relative(root, fullPath).split(path.sep).join('/');
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
