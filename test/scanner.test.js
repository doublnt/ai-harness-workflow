import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanProject } from '../src/scanner.js';

function tempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vcg-'));
}

test('scanner detects Node project and Claude workflow', () => {
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    name: 'demo',
    scripts: { test: 'vitest', lint: 'eslint .' },
    dependencies: { next: '^15.0.0', react: '^19.0.0' },
    devDependencies: { vitest: '^3.0.0' }
  }));
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# Claude');

  const scan = scanProject(dir);
  assert.equal(scan.facts.projectName, 'demo');
  assert.equal(scan.workflows.claude.status, 'Detected');
  assert.equal(scan.recommendedTarget.target, 'claude');
  assert.equal(scan.facts.framework, 'Next.js');
  assert.equal(scan.gates.lint.status, 'Present');
});

test('scanner recommends both when no AI workflow is detected', () => {
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'README.md'), '# Demo');
  const scan = scanProject(dir);
  assert.equal(scan.recommendedTarget.target, 'both');
  assert.equal(scan.recommendedTarget.confidence, 'Low');
});
