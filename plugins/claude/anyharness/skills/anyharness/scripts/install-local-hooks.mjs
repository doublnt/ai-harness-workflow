#!/usr/bin/env node
// Invoked by the AnyHarness skill via Bash tool. Not a direct user command.
/**
 * Install local enforcement hooks and CI workflow.
 * Safe default: DRY-RUN — lists what would be created without writing anything.
 * --confirm: actually write files and configure git core.hooksPath.
 *
 * The generated check.mjs supports --skip-if-no-profile to avoid blocking
 * CI in projects that haven't set up a profile yet.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const root = process.cwd();
const confirm = args.includes('--confirm');

const scriptDir = path.join(root, '.anyharness', 'scripts');
const checkScriptPath = path.join(scriptDir, 'check.mjs');
const hooksDir = path.join(root, '.githooks');
const preCommitPath = path.join(hooksDir, 'pre-commit');
const commitMsgPath = path.join(hooksDir, 'commit-msg');
const ciDir = path.join(root, '.github', 'workflows');
const ciPath = path.join(ciDir, 'anyharness.yml');

const checkScript = `#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const skipIfNoProfile = process.argv.includes('--skip-if-no-profile');
const profile = '.anyharness/profile.json';
if (!fs.existsSync(profile)) {
  if (skipIfNoProfile) { console.log('AnyHarness: no profile found, skipping check (--skip-if-no-profile).'); process.exit(0); }
  console.error('AnyHarness profile missing. Ask AnyHarness to generate .anyharness/profile.json.');
  process.exit(1);
}
const msg = process.argv.includes('--commit-msg') ? fs.readFileSync(process.argv[process.argv.indexOf('--commit-msg')+1],'utf8') : '';
if (msg && !/\\[risk:L[0-3]\\]/.test(msg)) {
  console.error('Commit message must include [risk:L0], [risk:L1], [risk:L2], or [risk:L3].');
  process.exit(1);
}
console.log('AnyHarness local check passed.');
`;

const preCommitScript = `#!/usr/bin/env sh\nnode .anyharness/scripts/check.mjs\n`;
const commitMsgScript = `#!/usr/bin/env sh\nnode .anyharness/scripts/check.mjs --commit-msg "$1"\n`;
const ciWorkflow = `name: AnyHarness
on: [pull_request]
jobs:
  anyharness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: node .anyharness/scripts/check.mjs --skip-if-no-profile
`;

const willCreate = [
  { path: path.relative(root, checkScriptPath), content: checkScript },
  { path: path.relative(root, preCommitPath), content: preCommitScript },
  { path: path.relative(root, commitMsgPath), content: commitMsgScript },
  { path: path.relative(root, ciPath), content: ciWorkflow },
];

if (!confirm) {
  console.log(JSON.stringify({
    dryRun: true,
    hint: 'Run with --confirm to actually create these files and configure git.',
    wouldCreate: willCreate.map(f => ({
      file: f.path,
      preview: f.content.split('\n').slice(0, 3).join('\n') + (f.content.split('\n').length > 3 ? '\n...' : ''),
    })),
    wouldRunGitConfig: 'git config core.hooksPath .githooks',
  }));
  process.exit(0);
}

fs.mkdirSync(scriptDir, { recursive: true });
fs.writeFileSync(checkScriptPath, checkScript, { mode: 0o755 });

fs.mkdirSync(hooksDir, { recursive: true });
fs.writeFileSync(preCommitPath, preCommitScript, { mode: 0o755 });
fs.writeFileSync(commitMsgPath, commitMsgScript, { mode: 0o755 });

fs.mkdirSync(ciDir, { recursive: true });
fs.writeFileSync(ciPath, ciWorkflow);

try { execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' }); } catch {}

console.log(JSON.stringify({
  created: willCreate.map(f => f.path),
  gitConfig: 'core.hooksPath = .githooks',
}));
