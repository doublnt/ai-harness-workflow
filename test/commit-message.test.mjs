import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCommitMessage } from '../src/commit-message.mjs';

test('requires risk tag', () => {
  assert.equal(validateCommitMessage('feat: add thing').length > 0, true);
});

test('allows L1 risk tag', () => {
  assert.equal(validateCommitMessage('feat(ui): add card [risk:L1]').length, 0);
});

test('requires trailers for L3', () => {
  const issues = validateCommitMessage('feat(db): migrate users [risk:L3]\n\nRisk-Level: L3\nGate-Review: .guardrails/gates/x.json\nTests: npm test\n');
  assert.equal(issues.some((i) => i.code === 'COMMIT_HUMAN_APPROVAL'), true);
});
