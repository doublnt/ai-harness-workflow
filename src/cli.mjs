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

const VERSION = '2.2.0';

export async function main(args) {
  const [cmd, ...rest] = args;
  switch (cmd || 'help') {
    case 'scan': return cmdScan(rest);
    case 'prompt': return cmdPrompt(rest);
    case 'new': return cmdNew(rest);
    case 'adopt': return cmdAdopt(rest);
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

function cmdPrompt(args) {
  const target = value(args, '--target', 'core');
  const write = has(args, '--write');
  const targets = expandPromptTargets(target);

  if (!write) {
    if (targets.length === 1) {
      console.log(promptContent(targets[0]));
      return;
    }
    for (const t of targets) {
      console.log(`\n--- ${t} ---\n`);
      console.log(promptContent(t));
    }
    return;
  }

  const writableTargets = targets.filter((t) => t !== 'core');
  if (writableTargets.length === 0) {
    console.error('`--target core --write` is intentionally disabled. The core prompt is copy-paste only. Use --target claude, codex, cursor, both, all, or detect to write native instruction files.');
    process.exit(1);
  }

  fs.mkdirSync(path.join(process.cwd(), '.anyharness', 'drafts'), { recursive: true });
  const created = [];
  for (const t of writableTargets) {
    if (t === 'claude') safeWrite('CLAUDE.md', promptContent('claude'), '.anyharness/drafts/CLAUDE.append.md', created);
    else if (t === 'codex' || t === 'agents') safeWrite('AGENTS.md', promptContent('codex'), '.anyharness/drafts/AGENTS.append.md', created);
    else if (t === 'cursor') safeWrite('.cursor/rules/anyharness.mdc', promptContent('cursor'), '.anyharness/drafts/anyharness.cursor.mdc', created);
  }
  console.log(`Injected native prompt surface(s): ${created.join(', ') || 'none'}`);
}

function expandPromptTargets(target) {
  if (target === 'core') return ['core'];
  if (target === 'claude') return ['claude'];
  if (target === 'codex' || target === 'agents') return ['codex'];
  if (target === 'cursor') return ['cursor'];
  if (target === 'both') return ['claude', 'codex'];
  if (target === 'all') return ['claude', 'codex', 'cursor'];
  if (target === 'detect') {
    const report = scanProject(process.cwd());
    const out = [];
    if (report.aiWorkflow.claude) out.push('claude');
    if (report.aiWorkflow.codex) out.push('codex');
    if (!report.aiWorkflow.claude && !report.aiWorkflow.codex) out.push('claude', 'codex');
    return out;
  }
  throw new Error('Unknown prompt target. Use --target core|claude|codex|agents|cursor|both|all|detect');
}

function promptContent(target) {
  const normalized = target === 'agents' ? 'codex' : target;
  const file = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'prompts', `${normalized}.md`);
  if (exists(file)) return readText(file);
  if (normalized === 'cursor') {
    const cursor = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'adapters', 'cursor', 'anyharness.mdc');
    return readText(cursor);
  }
  throw new Error('Unknown prompt target. Use --target core|claude|codex|agents|cursor|both|all|detect');
}

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


function cmdNew(args) {
  const target = value(args, '--target', 'both');
  const mode = value(args, '--mode', 'enforcing');
  const initArgs = ['--profile', 'harness', '--target', target, '--mode', mode];
  if (!has(args, '--no-hooks')) initArgs.push('--install-hooks');
  if (has(args, '--no-ci')) initArgs.push('--no-ci');
  if (has(args, '--dry-run')) initArgs.push('--dry-run');
  return cmdInit(initArgs);
}

function cmdAdopt(args) {
  const enforce = has(args, '--enforce') || has(args, '--harness');
  const profile = enforce ? 'harness' : value(args, '--profile', 'project');
  const target = value(args, '--target', 'detect');
  const mode = value(args, '--mode', enforce ? 'enforcing' : 'advisory');
  const initArgs = ['--profile', profile, '--target', target, '--mode', mode];
  if ((enforce && !has(args, '--no-hooks')) || has(args, '--install-hooks')) initArgs.push('--install-hooks');
  if (has(args, '--ci')) initArgs.push('--ci');
  if (has(args, '--no-ci')) initArgs.push('--no-ci');
  if (has(args, '--dry-run')) initArgs.push('--dry-run');
  return cmdInit(initArgs);
}

function cmdInit(args) {
  const profile = value(args, '--profile', 'project');
  const mode = value(args, '--mode', profile === 'harness' ? 'enforcing' : 'advisory');
  const target = value(args, '--target', 'detect');
  const dryRun = has(args, '--dry-run');
  const installHooks = has(args, '--install-hooks');
  const noCi = has(args, '--no-ci');
  const writeCi = has(args, '--ci') || (profile === 'harness' && !noCi);
  const report = scanProject(process.cwd());

  if (dryRun) {
    console.log('AnyHarness init dry run');
    printJson({ profile, mode, target, installHooks, writeCi, report, wouldCreate: plannedInitFiles(profile, target, writeCi, installHooks) });
    return;
  }

  ensureConfig(process.cwd(), { config: { mode, profile, target } });
  const dirs = ['.anyharness/gates', '.anyharness/approvals', '.anyharness/baselines', '.anyharness/drafts', 'docs/gates'];
  for (const d of dirs) fs.mkdirSync(path.join(process.cwd(), d), { recursive: true });
  writeJson(path.join(process.cwd(), '.anyharness', 'baselines', 'project-scan.json'), report);

  const created = [];
  if (profile === 'project' || profile === 'harness') {
    if (target === 'detect' || target === 'codex' || target === 'both') {
      safeWrite('AGENTS.md', promptContent('codex'), '.anyharness/drafts/AGENTS.append.md', created);
    }
    if (target === 'detect' || target === 'claude' || target === 'both') {
      safeWrite('CLAUDE.md', promptContent('claude'), '.anyharness/drafts/CLAUDE.append.md', created);
    }
  }

  if (writeCi) writeCiTemplate(true, created);
  if (installHooks) installGitHooks(process.cwd());

  console.log(`Initialized AnyHarness ${VERSION} in ${process.cwd()}`);
  console.log(`Profile: ${profile}`);
  console.log(`Mode: ${mode}`);
  console.log(`Target: ${target}`);
  console.log(`Git hooks: ${installHooks ? 'installed' : 'not installed'}`);
  console.log(`CI gate: ${writeCi ? 'created or drafted' : 'not created'}`);
  console.log(`Created or drafted: ${created.join(', ') || 'none'}`);
  if (profile === 'harness' && !installHooks) console.log('Git hooks were not installed. Run `anyharness install-hooks` to enable local Git hooks.');
  if (profile === 'harness' && noCi) console.log('CI template was skipped because --no-ci was used. Run `anyharness ci-template --write` later if needed.');
}

function plannedInitFiles(profile, target, writeCi = false, installHooks = false) {
  const files = ['.anyharness/config.json', '.anyharness/baselines/project-scan.json'];
  if (profile === 'project' || profile === 'harness') {
    if (target === 'detect' || target === 'codex' || target === 'both') files.push('AGENTS.md or .anyharness/drafts/AGENTS.append.md');
    if (target === 'detect' || target === 'claude' || target === 'both') files.push('CLAUDE.md or .anyharness/drafts/CLAUDE.append.md');
  }
  if (writeCi) files.push('.github/workflows/anyharness.yml or .anyharness/drafts/anyharness.yml');
  if (installHooks) files.push('.githooks/pre-commit', '.githooks/commit-msg', '.githooks/pre-push');
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
  console.log(`AnyHarness ${VERSION}

Modes:
  Lite     Copy-paste prompt or plugin skill only, no repo changes
  Project  Native prompt surfaces: CLAUDE.md / AGENTS.md / Cursor rules
  Harness  Native prompt surfaces + hooks + Git hooks + CI gates

Commands:
  new [--target claude|codex|both] [--mode enforcing|strict] [--no-hooks] [--no-ci] [--dry-run]
      New-project shortcut. Equivalent to harness init + Git hooks + CI template.

  adopt [--target detect|claude|codex|both] [--mode advisory|enforcing|strict] [--dry-run] [--enforce] [--ci] [--install-hooks]
      Existing-project shortcut. Safe by default; use --enforce to add hooks and CI without overwriting prompt files.

  init [--profile lite|project|harness] [--mode advisory|enforcing|strict] [--target detect|claude|codex|both] [--install-hooks] [--no-ci] [--dry-run]
      Low-level initializer. Harness profile now writes the CI template by default.

  prompt [--target core|claude|codex|agents|cursor|both|all|detect] [--write]
  scan [--json]
  check [--staged|--ci|--push] [--json]
  commit-msg <file>
  install-hooks
  uninstall-hooks
  ci-template [--write]
  cursor-template [--write]
  gate create --task <text> --risk L2 --gates design,security,test
  gate approve <gate-id>
  gate status
  doctor
  hook <event>

Notes:
  For a new project, run: npx anyharness new
  For an existing project, run: npx anyharness adopt
  prompt --target core prints a copy-paste prompt only. It does not write ANYHARNESS.md.
  Codex's native repository instruction file is AGENTS.md.
`);
}
