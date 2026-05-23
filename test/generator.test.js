import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanProject } from '../src/scanner.js';
import { buildConfig, generateFiles, planFiles } from '../src/generator.js';

function tempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vcg-'));
}

test('generator plans Claude files without .ai directory', () => {
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'demo' }));
  const scan = scanProject(dir);
  const config = buildConfig(scan, { target: 'claude' });
  const files = planFiles(scan, config).map((file) => file.path);
  assert.ok(files.includes('CLAUDE.md'));
  assert.ok(files.includes('.claude/commands/new-feature.md'));
  assert.equal(files.some((file) => file.startsWith('.ai/')), false);
});

test('generator does not overwrite existing AGENTS.md', () => {
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Existing');
  const scan = scanProject(dir);
  const config = buildConfig(scan, { target: 'codex' });
  const result = generateFiles(dir, scan, config);
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), '# Existing');
  assert.ok(result.drafts.some((file) => file.includes('AGENTS.md')));
});

test('dry run writes nothing', () => {
  const dir = tempRepo();
  const scan = scanProject(dir);
  const config = buildConfig(scan, { target: 'both' });
  const result = generateFiles(dir, scan, config, { dryRun: true });
  assert.ok(result.planned.length > 0);
  assert.equal(fs.existsSync(path.join(dir, 'AGENTS.md')), false);
});
