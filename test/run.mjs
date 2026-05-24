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
  assert(Array.isArray(xp.tools) && xp.tools.length === 8, 'codex plugin.json: must have 8 tools');
  assert(xp.tools.some(t => t.name === 'anyharness_propose_evolution'), 'codex plugin.json: anyharness_propose_evolution tool required');
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

// ── 10. propose-evolution.mjs end-to-end ─────────────────────────────────────

{
  const tmpEv = fs.mkdtempSync(path.join(os.tmpdir(), 'anyharness-evolve-'));
  try {
    // Bootstrap: a valid profile with one existing invariant
    const profilePath = path.join(tmpEv, '.anyharness', 'profile.json');
    fs.mkdirSync(path.dirname(profilePath), { recursive: true });
    const baseProfile = {
      version: '3.0.0',
      project: { name: 'evolve-test', stage: 'Unknown' },
      aiWorkflow: {},
      stacks: ['node'],
      domainHypotheses: [],
      confirmedDomains: ['payment'],
      glossary: [],
      domainModel: { entities: [], workflows: [], stateMachines: [] },
      invariants: [
        { rule: 'All amounts use Decimal, not float' },
      ],
      riskModel: { redZones: [], yellowZones: [], escalationRules: [] },
      expertRoles: [],
      gates: [],
      testOracles: [],
      evidenceRequirements: [],
      unknowns: [],
    };
    fs.writeFileSync(profilePath, JSON.stringify(baseProfile, null, 2));

    const findingsPath = path.join(tmpEv, 'findings.json');
    const findings = {
      trigger: 'review of staged diff',
      candidates: [
        {
          type: 'new-invariant',
          proposed: 'Webhook handlers must check idempotency key before any side effect',
          evidence: 'PaymentWebhook.java:42',
          rationale: 'Class of bug, not one-off',
        },
        // Duplicate of existing — must be skipped
        {
          type: 'new-invariant',
          proposed: 'all amounts use decimal, not float',
        },
        {
          type: 'new-unknown',
          question: 'Whether retry queue interacts with idempotency guard',
        },
        {
          type: 'new-gate',
          name: 'idempotency-check',
          rule: 'changes to src/webhooks/ must add an idempotency-key test',
          evidence: 'recurring pattern',
        },
      ],
    };
    fs.writeFileSync(findingsPath, JSON.stringify(findings));

    // Draft mode
    const draftOut = run('node', [script('propose-evolution.mjs'), '--findings', findingsPath], { cwd: tmpEv });
    const drafted = JSON.parse(draftOut);
    assert(drafted.action === 'drafted', 'propose-evolution: must report drafted in default mode');
    assert(drafted.accepted.added === 1, 'propose-evolution: must accept 1 new invariant');
    assert(drafted.accepted.newUnknowns === 1, 'propose-evolution: must accept 1 new unknown');
    assert(drafted.accepted.newGates === 1, 'propose-evolution: must accept 1 new gate');
    assert(drafted.skipped.some(s => s.reason === 'duplicate'), 'propose-evolution: must skip duplicates');
    assert(fs.existsSync(path.join(tmpEv, '.anyharness', 'drafts', 'profile.evolved.json')),
      'propose-evolution: must write draft to .anyharness/drafts/profile.evolved.json');

    // profile.json must be unchanged after draft
    const stillBase = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    assert(stillBase.invariants.length === 1, 'propose-evolution: profile.json must NOT change in draft mode');
    assert(!stillBase.learningHistory || stillBase.learningHistory.length === 0,
      'propose-evolution: learningHistory must NOT be appended in draft mode');

    // Confirm mode — merges
    const confirmOut = run('node', [script('propose-evolution.mjs'), '--findings', findingsPath, '--confirm'], { cwd: tmpEv });
    const confirmed = JSON.parse(confirmOut);
    assert(confirmed.action === 'evolved', 'propose-evolution --confirm: must report evolved');
    assert(confirmed.learningHistoryEntries === 1, 'propose-evolution --confirm: must append one learningHistory entry');

    const evolved = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    assert(evolved.invariants.length === 2, 'propose-evolution: profile must now have 2 invariants');
    assert(evolved.gates.length === 1, 'propose-evolution: profile must now have 1 gate');
    assert(evolved.unknowns.length === 1, 'propose-evolution: profile must now have 1 unknown');
    assert(Array.isArray(evolved.learningHistory) && evolved.learningHistory.length === 1,
      'propose-evolution: learningHistory must have exactly 1 entry');
    const entry = evolved.learningHistory[0];
    assert(typeof entry.at === 'string' && entry.at.includes('T'), 'learningHistory entry: at must be ISO timestamp');
    assert(entry.trigger === 'review of staged diff', 'learningHistory entry: trigger preserved');
    assert(entry.added.length === 1 && entry.newUnknowns.length === 1 && entry.newGates.length === 1,
      'learningHistory entry: must reflect accepted candidates');

    // Idempotency: re-run with same findings is no-op
    const noopOut = run('node', [script('propose-evolution.mjs'), '--findings', findingsPath, '--confirm'], { cwd: tmpEv });
    const noop = JSON.parse(noopOut);
    assert(noop.action === 'noop', 'propose-evolution: re-running with same findings must be noop');
    const stillEvolved = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    assert(stillEvolved.learningHistory.length === 1,
      'propose-evolution: learningHistory must not duplicate on no-op re-run');
    assert(stillEvolved.invariants.length === 2,
      'propose-evolution: invariants must not duplicate on no-op re-run');

    // Missing --findings: error
    const missing = assertExitCode('node', [script('propose-evolution.mjs')], 1, { cwd: tmpEv });
    assert(missing.stderr.includes('missing --findings'), 'propose-evolution: must error on missing --findings');

    // Refined invariant
    const refinedFindingsPath = path.join(tmpEv, 'findings-refined.json');
    fs.writeFileSync(refinedFindingsPath, JSON.stringify({
      trigger: 'review-refine',
      candidates: [{
        type: 'refined-invariant',
        from: 'All amounts use Decimal, not float',
        to: 'All monetary amounts under src/payment/ use Decimal with banker\'s rounding',
      }],
    }));
    const refineOut = run('node', [script('propose-evolution.mjs'), '--findings', refinedFindingsPath, '--confirm'], { cwd: tmpEv });
    const refined = JSON.parse(refineOut);
    assert(refined.accepted.refined === 1, 'propose-evolution: must accept refined-invariant');
    const refinedProfile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    const stillTwo = refinedProfile.invariants.length === 2;
    assert(stillTwo, 'propose-evolution: refined invariant replaces, does not add (count stays 2)');
    assert(refinedProfile.invariants.some(i =>
      (typeof i === 'object' ? i.rule : i).includes('banker')),
      'propose-evolution: refined text must be present');

    // Retired invariant
    const retiredFindingsPath = path.join(tmpEv, 'findings-retired.json');
    fs.writeFileSync(retiredFindingsPath, JSON.stringify({
      trigger: 'review-retire',
      candidates: [{
        type: 'retired-invariant',
        rule: 'Webhook handlers must check idempotency key before any side effect',
      }],
    }));
    const retireOut = run('node', [script('propose-evolution.mjs'), '--findings', retiredFindingsPath, '--confirm'], { cwd: tmpEv });
    const retired = JSON.parse(retireOut);
    assert(retired.accepted.retired === 1, 'propose-evolution: must accept retired-invariant');
    const retiredProfile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    assert(retiredProfile.invariants.length === 1, 'propose-evolution: retired invariant must reduce count');
  } finally {
    fs.rmSync(tmpEv, { recursive: true, force: true });
  }
}

// ── done ─────────────────────────────────────────────────────────────────────

console.log('All tests passed.');
