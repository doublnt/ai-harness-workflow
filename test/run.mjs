import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

// ── helpers ──────────────────────────────────────────────────────────────────

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', ...opts });
}

function assert(condition, msg) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

function assertExitCode(cmd, args, expected, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.error) throw r.error;
  assert(r.status === expected, `Expected exit ${expected} from ${[cmd, ...args].join(' ')}, got ${r.status}\nstderr: ${r.stderr}`);
  return r;
}

function script(name) {
  return path.resolve(`plugins/claude/anyharness/skills/anyharness/scripts/${name}`);
}

// ── 1. Validate project layout + sync check ──────────────────────────────────

run('node', ['scripts/validate.mjs'], { stdio: 'inherit' });

// ── 2. Sync drift detection ──────────────────────────────────────────────────

run('node', ['scripts/sync-distributions.mjs', '--check'], { stdio: 'inherit' });

// Stale file detection: create a stale file in a target, check detects it, then clean up
{
  const staleFile = 'plugins/codex/anyharness/skills/anyharness/references/__stale_test__.md';
  fs.writeFileSync(staleFile, 'stale');
  const r = spawnSync('node', ['scripts/sync-distributions.mjs', '--check'], { encoding: 'utf8' });
  assert(r.status !== 0, 'sync --check must detect stale files');
  const err = JSON.parse(r.stderr);
  assert(err.drift.some(d => d.reason === 'stale-in-target'), 'stale drift entry must have reason stale-in-target');
  // Normal sync must delete the stale file
  run('node', ['scripts/sync-distributions.mjs']);
  assert(!fs.existsSync(staleFile), 'sync must delete stale files from target');
}

// ── 3. Plugin.json structure validation ──────────────────────────────────────

{
  const cp = JSON.parse(fs.readFileSync('plugins/claude/anyharness/.claude-plugin/plugin.json', 'utf8'));
  assert(Array.isArray(cp.skills), 'claude plugin.json: skills must be array');
  assert(cp.skills[0].name === 'run', 'claude plugin.json: skills[0].name must be run');
  assert(typeof cp.skills[0].path === 'string', 'claude plugin.json: skills[0].path must be string');

  const xp = JSON.parse(fs.readFileSync('plugins/codex/anyharness/.codex-plugin/plugin.json', 'utf8'));
  assert(Array.isArray(xp.tools) && xp.tools.length === 7, 'codex plugin.json: must have 7 tools');
  for (const tool of xp.tools) {
    assert(typeof tool.sideEffects === 'boolean', `tool ${tool.name}: sideEffects must be boolean`);
    assert(typeof tool.idempotent === 'boolean', `tool ${tool.name}: idempotent must be boolean`);
  }
  const hasTemplate = (xp.interface?.defaultPrompt ?? []).some(p => p.includes('{{'));
  assert(hasTemplate, 'codex plugin.json: defaultPrompt must contain {{template}} variables');
}

// ── 4. Codex SKILL.md is the overlay (not the standard SKILL.md) ─────────────

{
  const codexSkill = fs.readFileSync('plugins/codex/anyharness/skills/anyharness/SKILL.md', 'utf8');
  assert(
    codexSkill.includes('Tool calling rules') || codexSkill.includes('Tool usage rules'),
    'Codex SKILL.md must be the overlay version',
  );
  const standaloneSkill = fs.readFileSync('standalone/skills/anyharness/SKILL.md', 'utf8');
  assert(standaloneSkill.includes('## Trigger phrases'), 'standalone SKILL.md must be the standard version');
}

// ── 5. scan-project.mjs ──────────────────────────────────────────────────────

{
  const scanOutput = run('node', [script('scan-project.mjs'), '.']);
  const scan = JSON.parse(scanOutput);
  assert(Array.isArray(scan.sampleFiles), 'scan-project: sampleFiles must be array');
  assert(scan.aiWorkflow !== undefined, 'scan-project: must return aiWorkflow');
  assert(Array.isArray(scan.stacks), 'scan-project: stacks must be array');
  assert(Array.isArray(scan.domainSignals), 'scan-project: domainSignals must be array');
  assert(scan.notable !== undefined, 'scan-project: notable must be present');
  assert(typeof scan.truncated === 'boolean', 'scan-project: truncated must be boolean');
  assert(!scan.sampleFiles.some(f => f.startsWith('.anyharness')), 'scan-project: must ignore .anyharness dir');
  assert(!scan.stacks.includes('nextjs'), 'scan-project: must not false-detect nextjs');
}

// ── 6. collect-diff.mjs ──────────────────────────────────────────────────────

{
  // Normal run inside git repo
  const diffOut = run('node', [script('collect-diff.mjs'), '--mode', 'both']);
  const diff = JSON.parse(diffOut);
  assert(typeof diff.empty === 'boolean', 'collect-diff: must return empty field');
  assert(diff.mode === 'both', 'collect-diff: must echo mode');

  // Non-git-repo: must return JSON error on stdout (not stderr)
  const tmpNoGit = fs.mkdtempSync(path.join(os.tmpdir(), 'anyharness-no-git-'));
  try {
    const r = spawnSync('node', [script('collect-diff.mjs')], { cwd: tmpNoGit, encoding: 'utf8' });
    assert(r.status !== 0, 'collect-diff in non-git dir must exit non-zero');
    const out = JSON.parse(r.stdout);
    assert(out.error === 'not-a-git-repo', 'collect-diff: non-git error must appear in stdout');
    assert(out.empty === true, 'collect-diff: non-git result must have empty:true');
  } finally {
    fs.rmSync(tmpNoGit, { recursive: true, force: true });
  }

  // Invalid --mode must exit 1 with JSON error on stdout
  const rBad = spawnSync('node', [script('collect-diff.mjs'), '--mode', 'invalid'], { encoding: 'utf8' });
  assert(rBad.status === 1, 'collect-diff: invalid mode must exit 1');
  const outBad = JSON.parse(rBad.stdout);
  assert(outBad.error !== undefined, 'collect-diff: invalid mode must return JSON error on stdout');
}

// ── 7. write-profile.mjs + install-local-hooks.mjs dry-run ──────────────────

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anyharness-test-'));
try {
  spawnSync('git', ['init'], { cwd: tmpDir });

  // write-profile without --confirm: must draft, not write profile.json
  run('node', [script('write-profile.mjs')], { cwd: tmpDir });
  assert(!fs.existsSync(path.join(tmpDir, '.anyharness', 'profile.json')),
    'write-profile without --confirm must not write profile.json');
  assert(fs.existsSync(path.join(tmpDir, '.anyharness', 'drafts', 'profile.json')),
    'write-profile without --confirm must create draft');

  // install-local-hooks without --confirm: must not create .githooks/
  run('node', [script('install-local-hooks.mjs')], { cwd: tmpDir });
  assert(!fs.existsSync(path.join(tmpDir, '.githooks')),
    'install-local-hooks without --confirm must not create .githooks/');

  // write-native-prompts: generated file must include project name placeholder
  run('node', [script('write-native-prompts.mjs'), '--target', 'both'], { cwd: tmpDir });
  const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
  assert(claudeMd.includes('AnyHarness Project Instructions'), 'CLAUDE.md must include AnyHarness header');
  assert(claudeMd.includes('Project-Specific Context'), 'CLAUDE.md must include Project-Specific Context section');
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// ── 8. generate-review-packet.mjs diff size truncation ───────────────────────

{
  const tmpPkt = fs.mkdtempSync(path.join(os.tmpdir(), 'anyharness-pkt-'));
  try {
    spawnSync('git', ['init'], { cwd: tmpPkt });
    // Stage a small file so diff is non-empty
    fs.writeFileSync(path.join(tmpPkt, 'x.txt'), 'hello');
    spawnSync('git', ['add', 'x.txt'], { cwd: tmpPkt });

    // Use --max-diff-kb 0 to force truncation of any non-empty diff
    const r = spawnSync('node', [
      script('generate-review-packet.mjs'),
      '--role', 'test-reviewer',
      '--mode', 'staged',
      '--max-diff-kb', '0',
    ], { cwd: tmpPkt, encoding: 'utf8' });
    assert(r.status === 0, `generate-review-packet must succeed: ${r.stderr}`);
    const out = JSON.parse(r.stdout);
    assert(out.packet !== undefined, 'generate-review-packet: must return packet path');
    const diffPatch = fs.readFileSync(path.join(tmpPkt, out.packet, 'DIFF.patch'), 'utf8');
    assert(diffPatch.includes('TRUNCATED'), 'DIFF.patch must be truncated when max-diff-kb is 0');
    assert(out.diffTruncated === true, 'generate-review-packet: must report diffTruncated:true');
  } finally {
    fs.rmSync(tmpPkt, { recursive: true, force: true });
  }
}

// ── 9. validate-profile.mjs fixtures + nextAction field ──────────────────────

{
  // Valid profile: exit 0, nextAction = proceed
  const validOut = run('node', [script('validate-profile.mjs'), 'test/fixtures/profile.valid.json']);
  const valid = JSON.parse(validOut);
  assert(valid.valid === true, 'validate-profile: valid fixture must return valid:true');
  assert(typeof valid.nextAction === 'string', 'validate-profile: must return nextAction');
  assert(valid.nextAction.startsWith('proceed'), 'validate-profile: valid profile nextAction must start with proceed');

  // Invalid profile: exit 1, nextAction lists missing fields
  const rInvalid = assertExitCode('node', [script('validate-profile.mjs'), 'test/fixtures/profile.invalid.json'], 1);
  const invalidStdout = JSON.parse(rInvalid.stdout);
  assert(invalidStdout.valid === false, 'validate-profile: invalid fixture must return valid:false');
  assert(invalidStdout.nextAction.startsWith('fill_missing_fields'), 'validate-profile: invalid nextAction must list missing fields');
}

// ── done ─────────────────────────────────────────────────────────────────────

console.log('All tests passed.');
