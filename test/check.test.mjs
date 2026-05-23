import test from 'node:test';
import assert from 'node:assert/strict';
import { runChecks } from '../src/check.mjs';
import { DEFAULT_CONFIG } from '../src/policy.mjs';

test('check returns pass for no files', () => {
  const result = runChecks({ files: [], mode: 'staged' });
  assert.equal(result.ok, true);
  assert.equal(result.risk.riskLevel, 'L0');
});
