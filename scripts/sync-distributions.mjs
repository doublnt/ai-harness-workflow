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

for (const target of targets) {
  // Sync SKILL.md (use codex override if applicable)
  const skillSrc = (target.codexOverlay && hasCodexOverride) ? skillCodexOverridePath : skillSrcPath;
  syncFile(skillSrc, path.join(root, target.path, 'SKILL.md'));

  // Sync reference and script directories
  for (const dir of syncDirs) {
    const srcDir = path.join(root, src, dir);
    if (!fs.existsSync(srcDir)) continue;
    const srcEntries = new Set(fs.readdirSync(srcDir));

    for (const entry of srcEntries) {
      // Skip SKILL.codex.md — it's the overlay source, not a reference file
      if (entry === 'SKILL.codex.md') continue;
      syncFile(path.join(srcDir, entry), path.join(root, target.path, dir, entry));
    }

    // Check for stale files in the target
    const dstDir = path.join(root, target.path, dir);
    if (fs.existsSync(dstDir)) {
      for (const entry of fs.readdirSync(dstDir)) {
        if (!srcEntries.has(entry)) {
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
