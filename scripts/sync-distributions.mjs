#!/usr/bin/env node
/**
 * Sync canonical source (plugins/claude/anyharness/skills/anyharness/) to
 * codex and standalone distributions.  Run with --check to detect drift
 * without writing (exits non-zero if distributions are out of date).
 *
 * Special cases:
 * - Codex: if SKILL.codex.md exists in the source, it is used as SKILL.md
 *   for the codex distribution instead of the standard SKILL.md.
 * - Stale files (present in a target but absent in source) are deleted in
 *   normal mode and flagged as errors in --check mode.
 */
import fs from 'node:fs';
import path from 'node:path';

const checkOnly = process.argv.includes('--check');
const root = process.cwd();

const src = 'plugins/claude/anyharness/skills/anyharness';
const targets = [
  { path: 'plugins/codex/anyharness/skills/anyharness', codexOverlay: true },
  { path: 'standalone/skills/anyharness', codexOverlay: false },
];
const syncDirs = ['references', 'scripts'];

let driftFound = false;
const driftReport = [];
const syncedFiles = [];
const deletedFiles = [];

function readFile(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

function syncFile(srcPath, dstPath) {
  const srcContent = readFile(srcPath);
  if (srcContent === null) return; // source doesn't exist, skip
  const dstContent = readFile(dstPath);
  if (srcContent === dstContent) return; // in sync

  const rel = path.relative(root, dstPath);
  if (dstContent === null) {
    driftReport.push({ file: rel, reason: 'missing' });
  } else {
    driftReport.push({ file: rel, reason: 'content-mismatch' });
  }
  driftFound = true;

  if (!checkOnly) {
    fs.mkdirSync(path.dirname(dstPath), { recursive: true });
    fs.writeFileSync(dstPath, srcContent);
    syncedFiles.push(rel);
  }
}

function deleteStale(dstPath) {
  const rel = path.relative(root, dstPath);
  driftReport.push({ file: rel, reason: 'stale-in-target' });
  driftFound = true;
  if (!checkOnly) {
    fs.rmSync(dstPath);
    deletedFiles.push(rel);
  }
}

// SKILL.codex.md override: if present in source, use it as SKILL.md for codex targets
const skillSrcPath = path.join(root, src, 'SKILL.md');
const skillCodexOverridePath = path.join(root, src, 'SKILL.codex.md');
const hasCodexOverride = fs.existsSync(skillCodexOverridePath);

// Recursively walk a directory, returning entries relative to base.
function walk(base, prefix = '') {
  const out = [];
  if (!fs.existsSync(base)) return out;
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const rel = prefix ? path.join(prefix, entry.name) : entry.name;
    if (entry.isDirectory()) {
      out.push(...walk(path.join(base, entry.name), rel));
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out;
}

for (const target of targets) {
  // Sync SKILL.md (use codex override if applicable)
  const skillSrc = (target.codexOverlay && hasCodexOverride) ? skillCodexOverridePath : skillSrcPath;
  syncFile(skillSrc, path.join(root, target.path, 'SKILL.md'));

  // Sync reference and script directories (recursive)
  for (const dir of syncDirs) {
    const srcDir = path.join(root, src, dir);
    if (!fs.existsSync(srcDir)) continue;
    const srcEntries = walk(srcDir).filter(e => e !== 'SKILL.codex.md');
    const srcSet = new Set(srcEntries);

    for (const entry of srcEntries) {
      syncFile(path.join(srcDir, entry), path.join(root, target.path, dir, entry));
    }

    // Check for stale files in the target (recursive)
    const dstDir = path.join(root, target.path, dir);
    if (fs.existsSync(dstDir)) {
      for (const entry of walk(dstDir)) {
        if (!srcSet.has(entry)) {
          deleteStale(path.join(dstDir, entry));
        }
      }
    }
  }
}

if (checkOnly) {
  if (driftFound) {
    process.stderr.write(JSON.stringify({ error: 'distribution-drift', drift: driftReport }, null, 2) + '\n');
    process.exit(1);
  }
  console.log(JSON.stringify({ status: 'in-sync', checked: targets.map(t => t.path) }));
  process.exit(0);
}

console.log(JSON.stringify({ synced: syncedFiles, deleted: deletedFiles, status: 'done' }));
