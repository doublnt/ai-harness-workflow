import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, writeText } from './utils.mjs';
import { runChecks, formatCheckResult } from './check.mjs';
import { validateCommitMessageFile } from './commit-message.mjs';
import { installGitHooks, gitHubActionsTemplate } from './install-hooks.mjs';
import { initProject } from './init-project.mjs';

const HELP = `Vibe Coding Guardrails v2

Usage:
  vibe-guardrails init [--target detect|claude|codex|both|speckit]
  vibe-guardrails check --staged|--ci|--push [--base <ref>]
  vibe-guardrails commit-msg <file>
  vibe-guardrails install-hooks [--no-config]
  vibe-guardrails ci-template [--write]
  vibe-guardrails doctor
`;

export async function main(argv) {
  const [cmd = 'help', ...rest] = argv;
  const { flags, rest: positional } = parseArgs(rest);
  if (cmd === 'help' || flags.help || cmd === '--help' || cmd === '-h') { console.log(HELP); return; }

  if (cmd === 'init' || cmd === '/init-project') {
    if (flags.dryRun) {
      console.log('Dry run: would create .guardrails/config.json, gate templates, PR draft, and optional hooks.');
      return;
    }
    const result = initProject({ target: flags.target || 'detect' });
    console.log('Initialized Vibe Guardrails project state.');
    console.log(`Created:\n${result.created.map((f) => `  - ${f}`).join('\n')}`);
    if (result.drafts.length) console.log(`Drafts:\n${result.drafts.map((f) => `  - ${f}`).join('\n')}`);
    return;
  }

  if (cmd === 'check') {
    const mode = flags.ci ? 'ci' : flags.push ? 'push' : 'staged';
    const result = runChecks({ mode, base: flags.base || null });
    process.stdout.write(formatCheckResult(result));
    if (!result.ok) process.exit(1);
    return;
  }

  if (cmd === 'commit-msg') {
    const file = positional[0];
    if (!file) throw new Error('commit-msg requires a commit message file path.');
    const issues = validateCommitMessageFile(file);
    if (issues.length) {
      console.error('Commit message blocked by Vibe Guardrails.');
      for (const issue of issues) console.error(`- [${issue.code}] ${issue.message}`);
      process.exit(1);
    }
    console.log('Commit message check passed.');
    return;
  }

  if (cmd === 'install-hooks') {
    const files = installGitHooks({ setCoreHooksPath: !flags.noConfig });
    console.log(`Installed Git hooks:\n${files.map((f) => `  - ${f}`).join('\n')}`);
    if (!flags.noConfig) console.log('Configured git core.hooksPath = .githooks');
    return;
  }

  if (cmd === 'ci-template') {
    const text = gitHubActionsTemplate();
    if (flags.write) {
      const file = path.join(process.cwd(), '.github/workflows/vibe-guardrails.yml');
      writeText(file, text);
      console.log(`Wrote ${file}`);
    } else console.log(text);
    return;
  }

  if (cmd === 'doctor') {
    console.log('Vibe Guardrails doctor');
    console.log(`cwd: ${process.cwd()}`);
    console.log(`config: ${fs.existsSync(path.join(process.cwd(), '.guardrails/config.json')) ? 'found' : 'missing'}`);
    console.log(`git hooks: ${fs.existsSync(path.join(process.cwd(), '.githooks/pre-commit')) ? 'installed' : 'missing'}`);
    return;
  }

  throw new Error(`Unknown command: ${cmd}\n${HELP}`);
}
