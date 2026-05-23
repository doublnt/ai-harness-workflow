import fs from 'node:fs';
import path from 'node:path';
import { runChecks, formatCheckResult } from './lib/checks.mjs';
import { loadConfig, ensureConfig } from './lib/config.mjs';
import { validateCommitMessage } from './lib/commit-message.mjs';
import { scanProject } from './lib/scanner.mjs';
import { printJson, readText, writeJson, writeText, exists } from './lib/utils.mjs';
import { installGitHooks, uninstallGitHooks } from './lib/install-hooks.mjs';
import { createGate, approveGate, listGateArtifacts } from './lib/gates.mjs';
import { runAgentHook } from './lib/agent-hook.mjs';

const VERSION = '0.3.0';

export async function main(args) {
  const [cmd, ...rest] = args;
  switch (cmd || 'help') {
    case 'scan': return cmdScan(rest);
    case 'init': return cmdInit(rest);
    case 'check': return cmdCheck(rest);
    case 'commit-msg': return cmdCommitMsg(rest);
    case 'install-hooks': return cmdInstallHooks(rest);
    case 'uninstall-hooks': return cmdUninstallHooks(rest);
    case 'ci-template': return cmdCiTemplate(rest);
    case 'cursor-template': return cmdCursorTemplate(rest);
    case 'doctor': return cmdDoctor(rest);
    case 'gate': return cmdGate(rest);
    case 'hook': return cmdHook(rest);
    case 'help':
    case '--help':
    case '-h': return help();
    default:
      console.error(`Unknown command: ${cmd}`);
      help();
      process.exit(1);
  }
}

function has(args, flag) { return args.includes(flag); }
function value(args, flag, fallback = null) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : fallback; }

function cmdScan(args) {
  const report = scanProject(process.cwd());
  if (has(args, '--json')) printJson(report);
  else {
    console.log(`# Project Scan\n`);
    console.log(`Name: ${report.name}`);
    console.log(`Package manager: ${report.packageManager}`);
    console.log(`AI workflow: Claude=${report.aiWorkflow.claude}, Codex=${report.aiWorkflow.codex}, SpecKit=${report.aiWorkflow.speckit}`);
    console.log(`Risk signals: ${report.riskSignals.join(', ') || 'none'}`);
  }
}

function cmdInit(args) {
  const profile = value(args, '--profile', 'project');
  const mode = value(args, '--mode', profile === 'harness' ? 'enforcing' : 'advisory');
  const target = value(args, '--target', 'detect');
  const dryRun = has(args, '--dry-run');
  const installHooks = has(args, '--install-hooks');
  const report = scanProject(process.cwd());

  if (dryRun) {
    console.log('AnyHarness init dry run');
    printJson({ profile, mode, target, report, wouldCreate: plannedInitFiles(profile, target) });
    return;
  }

  ensureConfig(process.cwd(), { config: { mode, profile, target } });
  const dirs = ['.anyharness/gates', '.anyharness/approvals', '.anyharness/baselines', '.anyharness/drafts', 'docs/gates'];
  for (const d of dirs) fs.mkdirSync(path.join(process.cwd(), d), { recursive: true });
  writeJson(path.join(process.cwd(), '.anyharness', 'baselines', 'project-scan.json'), report);

  const created = [];
  safeWrite('ANYHARNESS.md', guardrailsCore(), '.anyharness/drafts/ANYHARNESS.md', created);

  if (profile === 'project' || profile === 'harness') {
    if (target === 'detect' || target === 'codex' || target === 'both') {
      safeWrite('AGENTS.md', agentsInstructions(), '.anyharness/drafts/AGENTS.append.md', created);
    }
    if (target === 'detect' || target === 'claude' || target === 'both') {
      safeWrite('CLAUDE.md', claudeInstructions(), '.anyharness/drafts/CLAUDE.append.md', created);
    }
  }

  if (profile === 'harness') {
    writeCiTemplate(true, created);
    if (installHooks) installGitHooks(process.cwd());
  }

  console.log(`Initialized AnyHarness ${VERSION} in ${process.cwd()}`);
  console.log(`Profile: ${profile}`);
  console.log(`Mode: ${mode}`);
  console.log(`Target: ${target}`);
  console.log(`Created or drafted: ${created.join(', ') || 'none'}`);
  if (profile === 'harness' && !installHooks) console.log('Run `anyharness install-hooks` to enable local Git hooks.');
}

function plannedInitFiles(profile, target) {
  const files = ['.anyharness/config.json', '.anyharness/baselines/project-scan.json', 'ANYHARNESS.md'];
  if (profile === 'project' || profile === 'harness') {
    if (target === 'detect' || target === 'codex' || target === 'both') files.push('AGENTS.md or .anyharness/drafts/AGENTS.append.md');
    if (target === 'detect' || target === 'claude' || target === 'both') files.push('CLAUDE.md or .anyharness/drafts/CLAUDE.append.md');
  }
  if (profile === 'harness') files.push('.github/workflows/anyharness.yml or .anyharness/drafts/anyharness.yml');
  return files;
}

function safeWrite(rel, content, draftRel, created) {
  const full = path.join(process.cwd(), rel);
  if (!exists(full)) {
    writeText(full, content);
    created.push(rel);
  } else {
    writeText(path.join(process.cwd(), draftRel), content);
    created.push(draftRel);
  }
}

function guardrailsCore() {
  return `# AnyHarness Core\n\n1. Classify Risk First.\n2. Keep Changes Surgical.\n3. Require Evidence.\n4. Block Unsafe Work.\n\nFor non-trivial work, end with:\n\n\`\`\`text\nRisk Level:\nAssumptions:\nUnknowns:\nFiles Changed:\nTests:\nSecurity Considerations:\nRollback Plan:\nHuman Approval Required:\n\`\`\`\n\nRed Zone work includes auth, authorization, payment, migrations, secrets, CI/deploy, production data, and AI governance files.\n`;
}

function agentsInstructions() {
  return `# AGENTS.md\n\nThis project uses AnyHarness.\n\nBefore implementation:\n\n1. Read ANYHARNESS.md.\n2. Classify task risk: L0, L1, L2, L3.\n3. Keep changes surgical.\n4. Do not modify Red Zone files without human approval.\n5. Do not claim tests passed unless they were actually run.\n6. For L2/L3 work, create gate artifacts under .anyharness/gates and record approval when required.\n\nUse AnyHarness skills for planning, review, testing, security review, and release checks.\n`;
}

function claudeInstructions() {
  return `# CLAUDE.md\n\nThis project uses AnyHarness.\n\nRequired reading before changes:\n\n- ANYHARNESS.md\n- .anyharness/config.json, if present\n\nUse the AnyHarness plugin skills:\n\n- /anyharness:harness-core\n- /anyharness:risk-classify\n- /anyharness:new-feature\n- /anyharness:code-review\n- /anyharness:test-plan\n- /anyharness:security-review\n- /anyharness:release-check\n\nDo not modify Red Zone files without explicit approval and required gates.\n`;
}

function cmdCheck(args) {
  const result = runChecks({ staged: has(args, '--staged'), ci: has(args, '--ci'), push: has(args, '--push') });
  if (has(args, '--json')) printJson(result); else console.log(formatCheckResult(result));
  if (!result.ok) process.exit(1);
}

function cmdCommitMsg(args) {
  const file = args[0];
  if (!file) throw new Error('Usage: anyharness commit-msg <path-to-message-file>');
  const message = readText(file);
  const result = validateCommitMessage(message, loadConfig(process.cwd()));
  if (!result.ok) {
    console.error('Commit message blocked by AnyHarness.');
    for (const e of result.errors) console.error(`- ${e}`);
    process.exit(1);
  }
  for (const w of result.warnings) console.error(`Warning: ${w}`);
}

function cmdInstallHooks() {
  const dir = installGitHooks(process.cwd());
  console.log(`Installed Git hooks at ${dir}`);
}

function cmdUninstallHooks() {
  uninstallGitHooks(process.cwd());
  console.log('Unset git core.hooksPath.');
}

function cmdCiTemplate(args) {
  const created = [];
  const content = ciTemplateContent();
  if (!has(args, '--write')) {
    console.log(content);
    return;
  }
  writeCiTemplate(true, created);
  console.log(`Created or drafted: ${created.join(', ')}`);
}

function ciTemplateContent() {
  const source = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'templates', 'project', 'github-actions', 'anyharness.yml');
  return readText(source);
}

function writeCiTemplate(write, created = []) {
  if (!write) return;
  safeWrite('.github/workflows/anyharness.yml', ciTemplateContent(), '.anyharness/drafts/anyharness.yml', created);
}

function cmdCursorTemplate(args) {
  const source = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'adapters', 'cursor', 'anyharness.mdc');
  const content = readText(source);
  if (!has(args, '--write')) {
    console.log(content);
    return;
  }
  const created = [];
  safeWrite('.cursor/rules/anyharness.mdc', content, '.anyharness/drafts/anyharness.cursor.mdc', created);
  console.log(`Created or drafted: ${created.join(', ')}`);
}

function cmdDoctor() {
  const report = scanProject(process.cwd());
  const config = loadConfig(process.cwd());
  console.log('AnyHarness Doctor');
  console.log(`- Version: ${VERSION}`);
  console.log(`- Mode: ${config.mode}`);
  console.log(`- Project: ${report.name}`);
  console.log(`- Git files scanned: ${report.filesScanned}`);
  console.log(`- AI workflows: Claude=${report.aiWorkflow.claude}, Codex=${report.aiWorkflow.codex}, SpecKit=${report.aiWorkflow.speckit}`);
}

function cmdGate(args) {
  const sub = args[0];
  if (sub === 'create') {
    const task = value(args, '--task', args.slice(1).join(' ') || 'manual gate');
    const risk = value(args, '--risk', 'L1');
    const required = (value(args, '--gates', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const gate = createGate({ task, riskLevel: risk, requiredGates: required, projectDir: process.cwd() });
    printJson(gate);
  } else if (sub === 'approve') {
    const id = args[1];
    if (!id) throw new Error('Usage: anyharness gate approve <gate-id>');
    printJson(approveGate(id, process.cwd(), value(args, '--notes', '')));
  } else if (sub === 'status') {
    printJson(listGateArtifacts(process.cwd()));
  } else {
    console.log('Usage: anyharness gate create|approve|status');
  }
}

async function cmdHook(args) {
  const kind = args[0];
  const stdin = await new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => data += chunk);
    process.stdin.on('end', () => resolve(data));
  });
  const result = await runAgentHook(kind, stdin, process.env);
  if (result.stdout) process.stdout.write(result.stdout);
  process.exit(result.code);
}

function help() {
  console.log(`AnyHarness ${VERSION}\n\nModes:\n  Lite     Plugin skill only, no repo enforcement\n  Project  Project-local ANYHARNESS.md + agent instructions\n  Harness  Project-local rules + hooks + CI gate\n\nCommands:\n  init [--profile lite|project|harness] [--mode advisory|enforcing|strict] [--target detect|claude|codex|both] [--install-hooks] [--dry-run]\n  scan [--json]\n  check [--staged|--ci|--push] [--json]\n  commit-msg <file>\n  install-hooks\n  uninstall-hooks\n  ci-template [--write]\n  cursor-template [--write]\n  gate create --task <text> --risk L2 --gates design,security,test\n  gate approve <gate-id>\n  gate status\n  doctor\n  hook <event>\n`);
}
