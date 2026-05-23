import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesAny } from '../src/matcher.mjs';

test('glob matcher handles double star', () => {
  assert.equal(matchesAny('src/auth/session.ts', ['src/auth/**']), true);
  assert.equal(matchesAny('src/foo/session.ts', ['src/auth/**']), false);
  assert.equal(matchesAny('app/api/users/route.ts', ['app/api/**']), true);
});
