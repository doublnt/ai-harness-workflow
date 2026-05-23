import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'plugins/claude/vibe-coding-guardrails/.claude-plugin/plugin.json',
  'plugins/codex/vibe-coding-guardrails/.codex-plugin/plugin.json',
  'plugins/claude/vibe-coding-guardrails/hooks/hooks.json',
  'plugins/codex/vibe-coding-guardrails/hooks/hooks.json',
  'bin/vibe-guardrails.js',
  'src/cli.mjs',
  '.claude-plugin/marketplace.json',
  '.agents/plugins/marketplace.json'
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`);
}
for (const [target, manifestPath] of [
  ['claude', 'plugins/claude/vibe-coding-guardrails/.claude-plugin/plugin.json'],
  ['codex', 'plugins/codex/vibe-coding-guardrails/.codex-plugin/plugin.json']
]) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), 'utf8'));
  if (!manifest.hooks) throw new Error(`${target} manifest must point to hooks`);
  if (!manifest.skills) throw new Error(`${target} manifest must point to skills`);
  const hooks = JSON.parse(fs.readFileSync(path.join(root, `plugins/${target}/vibe-coding-guardrails/hooks/hooks.json`), 'utf8'));
  if (!hooks.hooks?.PreToolUse) throw new Error(`${target} hooks missing PreToolUse`);
  if (!hooks.hooks?.Stop) throw new Error(`${target} hooks missing Stop`);
}
const skills = ['init-project','risk-classify','new-feature','design-review','implementation-plan','code-review','test-plan','security-review','release-check'];
for (const target of ['claude', 'codex']) {
  for (const skill of skills) {
    const file = path.join(root, `plugins/${target}/vibe-coding-guardrails/skills/${skill}/SKILL.md`);
    if (!fs.existsSync(file)) throw new Error(`Missing skill ${target}/${skill}`);
    const txt = fs.readFileSync(file, 'utf8');
    if (!txt.startsWith('---')) throw new Error(`Skill missing frontmatter: ${file}`);
    if (!txt.includes('V2 Closed-loop Requirements')) throw new Error(`Skill missing v2 requirements: ${file}`);
  }
}
console.log('Validation passed. V2 closed-loop layout is valid.');
