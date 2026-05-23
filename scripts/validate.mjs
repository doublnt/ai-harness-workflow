import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'README.md',
  'README.zh-CN.md',
  '.claude-plugin/marketplace.json',
  '.agents/plugins/marketplace.json',
  'plugins/claude/anyharness/.claude-plugin/plugin.json',
  'plugins/codex/anyharness/.codex-plugin/plugin.json',
  'plugins/claude/anyharness/skills/anyharness/SKILL.md',
  'plugins/codex/anyharness/skills/anyharness/SKILL.md',
  'standalone/skills/anyharness/SKILL.md'
];
const missing = required.filter(p => !fs.existsSync(path.join(root,p)));
if (missing.length) {
  console.error('Missing required files:\n' + missing.join('\n'));
  process.exit(1);
}
for (const p of required.filter(p => p.endsWith('.json'))) JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const skillFiles = [
  'plugins/claude/anyharness/skills/anyharness/SKILL.md',
  'plugins/codex/anyharness/skills/anyharness/SKILL.md',
  'standalone/skills/anyharness/SKILL.md'
];
for (const s of skillFiles) {
  const text = fs.readFileSync(path.join(root,s),'utf8');
  if (!text.startsWith('---\n')) throw new Error(`${s} missing frontmatter`);
  if (!text.includes('name: anyharness')) throw new Error(`${s} missing skill name`);
  if (!text.includes('description:')) throw new Error(`${s} missing description`);
}
const noNpx = fs.readFileSync(path.join(root,'README.md'),'utf8');
if (/npx anyharness/.test(noNpx)) throw new Error('README should not advertise npx anyharness as user path');
console.log('Validation passed. AnyHarness v3 skill-first layout is valid.');
