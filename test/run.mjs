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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-guardrails-'));
fs.mkdirSync(path.join(tmp, '.guardrails'), { recursive: true });
fs.writeFileSync(path.join(tmp, '.guardrails/config.json'), JSON.stringify({ mode: 'enforcing', redZone: ['src/auth/**'], dangerousCommands: ['git\\s+push'] }));
assert.equal(evaluateToolUse({ tool_name: 'Bash', tool_input: { command: 'git push origin main' } }, tmp).ok, false);
assert.equal(evaluateToolUse({ tool_name: 'Edit', tool_input: { file_path: path.join(tmp, 'src/auth/session.ts') } }, tmp).ok, false);
assert.equal(evaluateStop({ last_assistant_message: 'Risk Level: L1\nUnknowns: none\nTests: npm test' }).ok, true);
assert.equal(evaluateStop({ last_assistant_message: 'done' }).ok, false);

// Smoke CLI help
execFileSync('node', ['bin/vibe-guardrails.mjs', '--help'], { cwd: process.cwd(), stdio: 'pipe' });
console.log('Unit tests passed.');
