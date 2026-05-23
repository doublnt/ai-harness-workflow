import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
function exists(p) { return fs.existsSync(path.join(root, p)); }
function json(p) { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); }
function assert(cond, msg) { if (!cond) errors.push(msg); }

const skills = [
  'guardrails-core',
  'init-project',
  'risk-classify',
  'new-feature',
  'design-review',
  'implementation-plan',
  'code-review',
  'test-plan',
  'security-review',
  'release-check'
];

for (const kind of ['claude', 'codex']) {
  const base = `plugins/${kind}/vibe-coding-guardrails`;
  const manifestPath = kind === 'claude' ? `${base}/.claude-plugin/plugin.json` : `${base}/.codex-plugin/plugin.json`;
  assert(exists(manifestPath), `${kind} manifest missing`);
  const manifest = json(manifestPath);
  assert(manifest.skills === './skills/', `${kind} skills path must be ./skills/`);
  assert(manifest.hooks === './hooks/hooks.json', `${kind} hooks path must be ./hooks/hooks.json`);
  assert(exists(`${base}/hooks/hooks.json`), `${kind} hooks.json missing`);
  assert(exists(`${base}/hooks/scripts/vibe-hook.mjs`), `${kind} hook script missing`);
  assert(exists(`${base}/resources/guardrails-core.md`), `${kind} guardrails-core resource missing`);
  const hooks = json(`${base}/hooks/hooks.json`);
  assert(hooks.hooks.PreToolUse, `${kind} PreToolUse hook missing`);
  assert(hooks.hooks.Stop, `${kind} Stop hook missing`);
  for (const skill of skills) {
    const skillPath = `${base}/skills/${skill}/SKILL.md`;
    assert(exists(skillPath), `${kind} skill missing: ${skill}`);
    const text = fs.readFileSync(path.join(root, skillPath), 'utf8');
    assert(text.startsWith('---\n'), `${kind} ${skill} missing frontmatter`);
    assert(text.includes(`name: ${skill}`), `${kind} ${skill} missing name`);
    assert(text.includes('description:'), `${kind} ${skill} missing description`);
  }
}

assert(exists('src/cli.mjs'), 'CLI missing');
assert(exists('templates/project/githooks/pre-commit'), 'pre-commit template missing');
assert(exists('templates/project/github-actions/vibe-guardrails.yml'), 'CI template missing');
assert(exists('README.md') && exists('README.zh-CN.md'), 'bilingual README missing');
assert(exists('GUARDRAILS.md') && exists('GUARDRAILS.zh-CN.md'), 'compact guardrails docs missing');
assert(exists('EXAMPLES.md') && exists('EXAMPLES.zh-CN.md'), 'examples docs missing');
assert(exists('adapters/cursor/vibe-guardrails.mdc'), 'Cursor adapter missing');
assert(exists('.cursor/rules/vibe-guardrails.mdc'), 'repo Cursor rule missing');

const packageJson = json('package.json');
assert(packageJson.name === 'vibe-coding-guardrails', 'package name must be vibe-coding-guardrails');
assert(packageJson.version === '0.3.0', 'package version must be 0.3.0');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Validation passed. final Vibe Coding Guardrails layout is valid.');
