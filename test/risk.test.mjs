import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from '../src/policy.mjs';
import { classifyFiles } from '../src/risk.mjs';

test('classifies auth changes as high risk', () => {
  const risk = classifyFiles(['src/auth/session.ts'], DEFAULT_CONFIG);
  assert.equal(risk.riskLevel, 'L2');
  assert.equal(risk.requiredGates.includes('security'), true);
});

test('classifies migration as critical', () => {
  const risk = classifyFiles(['migrations/001.sql'], DEFAULT_CONFIG);
  assert.equal(risk.riskLevel, 'L3');
});
