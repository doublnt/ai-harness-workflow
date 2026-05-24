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
  assert(Array.isArray(xp.tools) && xp.tools.length === 13, 'codex plugin.json: must have 13 tools');
  assert(xp.tools.some(t => t.name === 'anyharness_propose_evolution'), 'codex plugin.json: anyharness_propose_evolution tool required');
  assert(xp.tools.some(t => t.name === 'anyharness_extract_architecture'), 'codex plugin.json: anyharness_extract_architecture tool required');
  assert(xp.tools.some(t => t.name === 'anyharness_derive_risk_topology'), 'codex plugin.json: anyharness_derive_risk_topology tool required');
  assert(xp.tools.some(t => t.name === 'anyharness_analyze'), 'codex plugin.json: anyharness_analyze tool required');
  assert(xp.tools.some(t => t.name === 'anyharness_suggest_stack_config'), 'codex plugin.json: anyharness_suggest_stack_config tool required');
  assert(xp.tools.some(t => t.name === 'anyharness_onboard'), 'codex plugin.json: anyharness_onboard tool required');
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

// ── 11. extract-architecture.mjs + derive-risk-topology.mjs (Spring PoC) ─────

{
  const fixtureRoot = path.resolve('test/fixtures/spring-project');
  assert(fs.existsSync(fixtureRoot), 'spring fixture must exist');

  // ── extract-architecture ─────────────────────────────────────────────────
  const extractOut = run('node', [script('extract-architecture.mjs'), '--stack', 'java-spring', fixtureRoot]);
  const extraction = JSON.parse(extractOut);
  assert(extraction.stack === 'java-spring', 'extract-architecture: stack must be java-spring');
  assert(extraction.componentCount >= 6, `extract-architecture: must find at least 6 components, got ${extraction.componentCount}`);

  const byClass = Object.fromEntries(extraction.components.map(c => [c.class, c]));

  // Controller
  const controller = byClass['com.example.controller.OrderController'];
  assert(controller && controller.kind === 'controller', 'extract: OrderController must be a controller');
  assert(controller.basePath === '/api/orders', 'extract: controller basePath must be /api/orders');
  assert(controller.endpoints && controller.endpoints.length === 2, `extract: controller must have 2 endpoints, got ${controller.endpoints?.length}`);
  assert(controller.endpoints.some(e => e.path === '/api/orders/{id}/confirm' && e.method === 'POST'),
    'extract: confirm endpoint must be POST /api/orders/{id}/confirm');

  // Service with transactions, kafka send, and self-invocation
  const svc = byClass['com.example.service.OrderService'];
  assert(svc && svc.kind === 'service', 'extract: OrderService must be a service');
  assert(svc.transactionalMethods && svc.transactionalMethods.length === 3,
    `extract: OrderService must have 3 @Transactional methods, got ${svc.transactionalMethods?.length}`);
  assert(svc.transactionalMethods.some(t => t.method === 'recordAudit' && t.propagation === 'REQUIRES_NEW'),
    'extract: recordAudit must have propagation=REQUIRES_NEW');
  assert(svc.kafkaSends && svc.kafkaSends.some(k => k.topic === 'orders.created' && k.method === 'placeOrder'),
    'extract: orders.created send must be in placeOrder');
  assert(svc.selfInvocations && svc.selfInvocations.some(si => si.caller === 'confirmOrder' && si.callee === 'markPaid'),
    'extract: confirmOrder must self-invoke markPaid');
  assert(svc.dependencies && svc.dependencies.includes('KafkaTemplate'),
    'extract: KafkaTemplate generic must parse correctly as a dependency');

  // Repository with missing @Modifying
  const repo = byClass['com.example.repository.OrderRepository'];
  assert(repo && repo.kind === 'repository', 'extract: OrderRepository must be a repository');
  assert(repo.modifyingIssues && repo.modifyingIssues.length === 1,
    'extract: OrderRepository must flag missing @Modifying');

  // Kafka listener
  const consumer = byClass['com.example.service.OrderEventConsumer'];
  assert(consumer.kafkaListeners && consumer.kafkaListeners.length === 1,
    'extract: OrderEventConsumer must have a KafkaListener');

  // External call
  const gw = byClass['com.example.external.PaymentGatewayClient'];
  assert(gw.externalCalls && gw.externalCalls.some(ec => ec.client === 'RestTemplate'),
    'extract: PaymentGatewayClient must have a RestTemplate call');

  // Entity
  const entity = byClass['com.example.entity.Order'];
  assert(entity && entity.kind === 'entity', 'extract: Order must be an entity');
  assert(entity.table === 'orders', 'extract: Order must have table=orders');

  // ── unsupported stack must error ─────────────────────────────────────────
  const unsupported = assertExitCode('node', [script('extract-architecture.mjs'), '--stack', 'node-express'], 1);
  assert(unsupported.stderr.includes('not supported'), 'extract: unsupported stack must error');

  // ── derive-risk-topology ─────────────────────────────────────────────────
  const tmpExtract = path.join(os.tmpdir(), `anyharness-extract-${Date.now()}.json`);
  fs.writeFileSync(tmpExtract, extractOut);
  try {
    const topoOut = run('node', [script('derive-risk-topology.mjs'), '--in', tmpExtract]);
    const topo = JSON.parse(topoOut);
    assert(topo.riskCount >= 6, `topology: must find at least 6 risks, got ${topo.riskCount}`);

    const kinds = new Set(topo.risks.map(r => r.kind));
    // Universal failure mode kinds (post-probe-architecture refactor)
    assert(kinds.has('state-mutation-safety'), 'topology: must detect state-mutation-safety (dual-write / self-invocation / Kafka)');
    assert(kinds.has('missing-modifying'), 'topology: must detect missing-modifying');
    assert(kinds.has('resource-lifetime'), 'topology: must detect resource-lifetime (REQUIRES_NEW)');
    assert(kinds.has('external-interaction'), 'topology: must detect external-interaction (HTTP without retry)');

    assert(topo.counts.blocker >= 1, 'topology: missing-modifying must be a blocker');
    assert(topo.counts.high >= 3, 'topology: must have >= 3 high severity findings');

    // Every risk must have evidence with file:line and a Learning Candidate
    for (const r of topo.risks) {
      assert(Array.isArray(r.evidence) && r.evidence.length > 0, `topology: ${r.kind} must have evidence`);
      assert(r.evidence.every(e => /:\d+$/.test(e)), `topology: ${r.kind} evidence must have file:line`);
      assert(r.candidate && typeof r.candidate.type === 'string',
        `topology: ${r.kind} must have a Learning Candidate`);
    }

    // ── Round-trip: feed topology candidates into propose-evolution ──────
    const evRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'anyharness-topo-evolve-'));
    try {
      const profilePath = path.join(evRoot, '.anyharness', 'profile.json');
      fs.mkdirSync(path.dirname(profilePath), { recursive: true });
      fs.writeFileSync(profilePath, JSON.stringify({
        version: '3.0.0', project: { name: 'topo-test', stage: 'Unknown' }, aiWorkflow: {},
        stacks: ['java'], domainHypotheses: [], confirmedDomains: [], glossary: [],
        domainModel: { entities: [], workflows: [], stateMachines: [] },
        invariants: [], riskModel: { redZones: [], yellowZones: [], escalationRules: [] },
        expertRoles: [], gates: [], testOracles: [], evidenceRequirements: [], unknowns: [],
      }, null, 2));

      const candidates = topo.risks.map(r => r.candidate);
      const findingsPath = path.join(evRoot, 'findings.json');
      fs.writeFileSync(findingsPath, JSON.stringify({ trigger: 'topology', candidates }));
      const evolveOut = run('node', [script('propose-evolution.mjs'), '--findings', findingsPath, '--confirm'], { cwd: evRoot });
      const evolved = JSON.parse(evolveOut);
      assert(evolved.action === 'evolved', 'topology→evolution round-trip: must succeed');
      assert(evolved.accepted.added + evolved.accepted.newUnknowns + evolved.accepted.newGates >= 5,
        'topology→evolution round-trip: must accept multiple candidates');
    } finally {
      fs.rmSync(evRoot, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(tmpExtract, { force: true });
  }
}

// ── 12. analyze.mjs: Path C (Python FastAPI + stack-config.json) ─────────────

{
  const fixtureRoot = path.resolve('test/fixtures/python-fastapi-project');
  assert(fs.existsSync(fixtureRoot), 'python-fastapi fixture must exist');

  const out = run('node', [script('analyze.mjs'), '--stack', 'auto', '--path', fixtureRoot, '--json']);
  const report = JSON.parse(out);

  assert(report.stack === 'python-fastapi', `analyze Path C: stack must be python-fastapi, got ${report.stack}`);
  assert(report.detectedBy === 'user-config', `analyze Path C: detectedBy must be user-config, got ${report.detectedBy}`);
  assert(report.riskCount >= 5, `analyze Path C: must find >= 5 risks, got ${report.riskCount}`);
  assert((report.counts.blocker || 0) >= 1, 'analyze Path C: must have >= 1 blocker (subprocess in trust boundary)');
  assert(report.risks.every(r => Array.isArray(r.evidence) && r.evidence.length > 0),
    'analyze Path C: all risks must have evidence');
}

// ── 13. analyze.mjs: Path A via auto-detection (java-spring from pom.xml) ────

{
  const fixtureRoot = path.resolve('test/fixtures/spring-project');

  const out = run('node', [script('analyze.mjs'), '--stack', 'auto', '--path', fixtureRoot, '--json']);
  const report = JSON.parse(out);

  assert(report.stack === 'java-spring', `analyze Path A auto: stack must be java-spring, got ${report.stack}`);
  assert(report.detectedBy === 'auto', `analyze Path A auto: detectedBy must be auto, got ${report.detectedBy}`);
  assert(report.riskCount >= 6, `analyze Path A auto: must find >= 6 risks, got ${report.riskCount}`);
  assert((report.counts.blocker || 0) >= 1, 'analyze Path A auto: must have >= 1 blocker');
}

// ── 14. analyze.mjs: --save flag writes report to .anyharness/reports/ ───────

{
  const fixtureRoot = path.resolve('test/fixtures/tauri-project');
  const reportsDir = path.join(fixtureRoot, '.anyharness', 'reports');
  if (fs.existsSync(reportsDir)) fs.rmSync(reportsDir, { recursive: true, force: true });

  run('node', [script('analyze.mjs'), '--stack', 'auto', '--path', fixtureRoot, '--save', '--json']);

  assert(fs.existsSync(reportsDir), 'analyze --save: .anyharness/reports/ must be created');
  const files = fs.readdirSync(reportsDir).filter(f => f.startsWith('analysis-') && f.endsWith('.json'));
  assert(files.length === 1, `analyze --save: must create exactly 1 report, got ${files.length}`);

  const saved = JSON.parse(fs.readFileSync(path.join(reportsDir, files[0]), 'utf8'));
  assert(saved.stack === 'rust-tauri', `analyze --save: saved report stack must be rust-tauri, got ${saved.stack}`);
  assert(saved.riskCount >= 5, `analyze --save: saved report must have risks, got ${saved.riskCount}`);
  assert(typeof saved.generatedAt === 'string', 'analyze --save: report must include generatedAt');

  // Cleanup
  fs.rmSync(reportsDir, { recursive: true, force: true });
}

// ── 15. suggest-stack-config.mjs: generates template for unsupported stacks ──

{
  const tmpPy = fs.mkdtempSync(path.join(os.tmpdir(), 'anyharness-suggest-'));
  try {
    // Python + FastAPI: should get a rich Python template
    fs.writeFileSync(path.join(tmpPy, 'requirements.txt'), 'fastapi==0.104.0\nuvicorn==0.24.0\n');

    const out = run('node', [script('suggest-stack-config.mjs'), '--path', tmpPy]);
    const config = JSON.parse(out);

    assert(typeof config.stack === 'string', 'suggest-stack-config: must return stack field');
    assert(config.language === 'python', `suggest-stack-config: language must be python, got ${config.language}`);
    assert(Array.isArray(config.fileExtensions) && config.fileExtensions.includes('.py'),
      'suggest-stack-config: fileExtensions must include .py');
    assert(Array.isArray(config.trustBoundaryMarkers) && config.trustBoundaryMarkers.length > 0,
      'suggest-stack-config: must return trustBoundaryMarkers');
    assert(Array.isArray(config.externalCallPatterns) && config.externalCallPatterns.length > 0,
      'suggest-stack-config: must return externalCallPatterns');
    assert(config.externalCallPatterns.some(p => p.kind === 'process'),
      'suggest-stack-config: must include a process-kind external call pattern');
    assert(config.externalCallPatterns.some(p => p.kind === 'net'),
      'suggest-stack-config: must include a net-kind external call pattern');

    // --save should write to drafts/
    const saveOut = run('node', [script('suggest-stack-config.mjs'), '--path', tmpPy, '--save']);
    const saveResult = JSON.parse(saveOut);
    assert(saveResult.action === 'drafted', `suggest-stack-config --save: action must be drafted, got ${saveResult.action}`);
    assert(fs.existsSync(path.join(tmpPy, '.anyharness', 'drafts', 'stack-config.json')),
      'suggest-stack-config --save: must write draft file');

    // Supported stack should return noop
    const springTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anyharness-spring-suggest-'));
    try {
      fs.writeFileSync(path.join(springTmp, 'pom.xml'), '<project><dependencies><dependency><groupId>org.springframework.boot</groupId></dependency></dependencies></project>');
      const noopOut = run('node', [script('suggest-stack-config.mjs'), '--path', springTmp]);
      const noop = JSON.parse(noopOut);
      assert(noop.action === 'noop', `suggest-stack-config: supported stack must return noop, got ${noop.action}`);
    } finally {
      fs.rmSync(springTmp, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(tmpPy, { recursive: true, force: true });
  }
}

// ── 16. onboard.mjs: combined scan + analyze → seedCandidates round-trip ─────

{
  const fixtureRoot = path.resolve('test/fixtures/spring-project');

  const out = run('node', [script('onboard.mjs'), '--path', fixtureRoot, '--json']);
  const report = JSON.parse(out);

  // Shape assertions
  assert(report.stack === 'java-spring', `onboard: stack must be java-spring, got ${report.stack}`);
  assert(report.detectedBy === 'auto', `onboard: detectedBy must be auto, got ${report.detectedBy}`);
  assert(report.needsLLMAnalysis === false, 'onboard: Spring must not need LLM analysis');

  // scanResult
  assert(Array.isArray(report.scanResult.stacks), 'onboard: scanResult.stacks must be array');
  assert(report.scanResult.stacks.includes('java'), 'onboard: scanResult must detect java stack');

  // analysisResult
  assert(report.analysisResult.riskCount >= 6,
    `onboard: analysisResult.riskCount must be >= 6, got ${report.analysisResult.riskCount}`);
  assert((report.analysisResult.counts.blocker || 0) >= 1,
    'onboard: analysisResult must have >= 1 blocker');

  // seedCandidates
  assert(report.seedCandidates.trigger === 'initial-onboarding',
    'onboard: seedCandidates.trigger must be initial-onboarding');
  assert(Array.isArray(report.seedCandidates.candidates) && report.seedCandidates.candidates.length >= 6,
    `onboard: seedCandidates must have >= 6 candidates, got ${report.seedCandidates.candidates.length}`);
  assert(report.seedCandidates.candidates.every(c => typeof c.type === 'string'),
    'onboard: every seed candidate must have a type');

  // Round-trip: seedCandidates → propose-evolution → profile gets seeded from onboarding
  const evRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'anyharness-onboard-rt-'));
  try {
    const profilePath = path.join(evRoot, '.anyharness', 'profile.json');
    fs.mkdirSync(path.dirname(profilePath), { recursive: true });
    fs.writeFileSync(profilePath, JSON.stringify({
      version: '3.0.0', project: { name: 'onboard-rt', stage: 'Unknown' }, aiWorkflow: {},
      stacks: ['java'], domainHypotheses: [], confirmedDomains: [], glossary: [],
      domainModel: { entities: [], workflows: [], stateMachines: [] },
      invariants: [], riskModel: { redZones: [], yellowZones: [], escalationRules: [] },
      expertRoles: [], gates: [], testOracles: [], evidenceRequirements: [], unknowns: [],
    }, null, 2));

    const seedPath = path.join(evRoot, 'seed.json');
    fs.writeFileSync(seedPath, JSON.stringify(report.seedCandidates));

    const evolveOut = run('node', [script('propose-evolution.mjs'), '--findings', seedPath, '--confirm'], { cwd: evRoot });
    const evolved = JSON.parse(evolveOut);
    assert(evolved.action === 'evolved', `onboard round-trip: propose-evolution must return evolved, got ${evolved.action}`);
    assert(evolved.accepted.added + evolved.accepted.newUnknowns + evolved.accepted.newGates >= 5,
      'onboard round-trip: must accept >= 5 candidates from seed');

    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    assert(profile.invariants.length >= 1 || profile.unknowns.length >= 1 || profile.gates.length >= 1,
      'onboard round-trip: profile must be seeded with at least one risk-derived entry');
    assert(Array.isArray(profile.learningHistory) && profile.learningHistory[0].trigger === 'initial-onboarding',
      'onboard round-trip: learningHistory trigger must be initial-onboarding');
  } finally {
    fs.rmSync(evRoot, { recursive: true, force: true });
  }
}

// ── done ─────────────────────────────────────────────────────────────────────

console.log('All tests passed.');
