import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseCommitMessage, validateCommitMessage } from '../src/lib/commit-message.mjs';
import { evaluateToolUse, evaluateStop } from '../src/lib/command-policy.mjs';
import { runChecks } from '../src/lib/checks.mjs';

const msg = `feat(auth): rotate token [risk:L2]\n\nRisk-Level: L2\nGate-Review: docs/gates/x.md\nHuman-Approval: required\nTests: npm test\nRollback: docs/release/x.md\n`;
assert.equal(parseCommitMessage(msg).risk, 'L2');
assert.equal(validateCommitMessage(msg, { riskTagRequired: true }).ok, true);
assert.equal(validateCommitMessage('feat: x', { riskTagRequired: true }).ok, false);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anyharness-'));
fs.mkdirSync(path.join(tmp, '.anyharness'), { recursive: true });
fs.writeFileSync(path.join(tmp, '.anyharness/config.json'), JSON.stringify({ mode: 'enforcing', redZone: ['src/auth/**'], dangerousCommands: ['git\\s+push'] }));
assert.equal(evaluateToolUse({ tool_name: 'Bash', tool_input: { command: 'git push origin main' } }, tmp).ok, false);
assert.equal(evaluateToolUse({ tool_name: 'Edit', tool_input: { file_path: path.join(tmp, 'src/auth/session.ts') } }, tmp).ok, false);
assert.equal(evaluateStop({ last_assistant_message: 'Risk Level: L1\nUnknowns: none\nTests: npm test' }).ok, true);
assert.equal(evaluateStop({ last_assistant_message: 'done' }).ok, false);

// Smoke CLI commands
execFileSync('node', ['bin/anyharness.mjs', '--help'], { cwd: process.cwd(), stdio: 'pipe' });
execFileSync('node', ['bin/anyharness.mjs', 'new', '--dry-run'], { cwd: process.cwd(), stdio: 'pipe' });
execFileSync('node', ['bin/anyharness.mjs', 'adopt', '--dry-run'], { cwd: process.cwd(), stdio: 'pipe' });
const promptOut = execFileSync('node', ['bin/anyharness.mjs', 'prompt', '--target', 'core'], { cwd: process.cwd(), encoding: 'utf8' });
assert.match(promptOut, /AnyHarness/);
assert.match(promptOut, /Classify Risk First/);
const newDryRun = execFileSync('node', [path.join(process.cwd(), 'bin/anyharness.mjs'), 'new', '--dry-run'], { cwd: tmp, encoding: 'utf8' });
assert.match(newDryRun, /\"profile\": \"harness\"/);
assert.match(newDryRun, /\"installHooks\": true/);
assert.match(newDryRun, /\"writeCi\": true/);
const adoptDryRun = execFileSync('node', [path.join(process.cwd(), 'bin/anyharness.mjs'), 'adopt', '--dry-run'], { cwd: tmp, encoding: 'utf8' });
assert.match(adoptDryRun, /\"profile\": \"project\"/);
assert.match(adoptDryRun, /\"installHooks\": false/);
assert.match(adoptDryRun, /\"writeCi\": false/);
const adoptEnforceDryRun = execFileSync('node', [path.join(process.cwd(), 'bin/anyharness.mjs'), 'adopt', '--enforce', '--dry-run'], { cwd: tmp, encoding: 'utf8' });
assert.match(adoptEnforceDryRun, /\"profile\": \"harness\"/);
assert.match(adoptEnforceDryRun, /\"installHooks\": true/);
assert.match(adoptEnforceDryRun, /\"writeCi\": true/);
console.log('Unit tests passed.');
