import test from 'node:test';
import assert from 'node:assert/strict';
import { engineeringConstitution, riskLevels, fileChangePolicy } from '../src/templates/common.js';

test('core templates include required governance concepts', () => {
  assert.match(engineeringConstitution(), /Unknown must be marked as Unknown/);
  assert.match(riskLevels(), /Level 3/);
  assert.match(fileChangePolicy(), /Red Zone/);
});
