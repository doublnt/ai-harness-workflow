#!/usr/bin/env node
// Invoked by the AnyHarness skill via Bash tool. Not a direct user command.
/**
 * Collect the current git diff.
 * --mode staged|unstaged|both  (default: both)
 *
 * Outputs JSON to stdout in all cases, including error conditions,
 * so agents can always parse stdout without reading stderr.
 */
import { execFileSync, spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const modeIdx = args.indexOf('--mode');
const mode = modeIdx !== -1 ? args[modeIdx + 1] : 'both';

if (!['staged', 'unstaged', 'both'].includes(mode)) {
  console.log(JSON.stringify({ error: 'invalid --mode value; use staged|unstaged|both', code: 1, empty: true }));
  process.exit(1);
}

// Check that we're inside a git repo before calling git diff
const gitCheck = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });
if (gitCheck.status !== 0) {
  console.log(JSON.stringify({ error: 'not-a-git-repo', code: 2, empty: true, hint: 'Run this script from inside a git repository.' }));
  process.exit(2);
}

function git(gitArgs) {
  try {
    return execFileSync('git', gitArgs, { encoding: 'utf8' });
  } catch (e) {
    console.log(JSON.stringify({ error: 'git command failed', code: 2, empty: true, hint: String(e.message) }));
    process.exit(2);
  }
}

let changedFiles = [];
let diff = '';

if (mode === 'staged' || mode === 'both') {
  const staged = git(['diff', '--cached', '--name-only']).trim();
  if (staged) changedFiles.push(...staged.split('\n').filter(Boolean));
  diff += git(['diff', '--cached']);
}
if (mode === 'unstaged' || mode === 'both') {
  const unstaged = git(['diff', '--name-only']).trim();
  if (unstaged) {
    const newFiles = unstaged.split('\n').filter(f => f && !changedFiles.includes(f));
    changedFiles.push(...newFiles);
  }
  diff += git(['diff']);
}

changedFiles = [...new Set(changedFiles)];

console.log(JSON.stringify({ mode, changedFiles, diff, empty: changedFiles.length === 0 }, null, 2));
