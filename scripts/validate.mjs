import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();

// ── Required files ───────────────────────────────────────────────────────────

const required = [
  'README.md',
  'README.zh-CN.md',
  '.claude-plugin/marketplace.json',
  '.agents/plugins/marketplace.json',
  'plugins/claude/anyharness/.claude-plugin/plugin.json',
  'plugins/codex/anyharness/.codex-plugin/plugin.json',
  'plugins/claude/anyharness/skills/anyharness/SKILL.md',
  'plugins/codex/anyharness/skills/anyharness/SKILL.md',
  'standalone/skills/anyharness/SKILL.md',
];
const missing = required.filter(p => !fs.existsSync(path.join(root, p)));
if (missing.length) {
  console.error('Missing required files:\n' + missing.join('\n'));
  process.exit(1);
}

// ── JSON validity ────────────────────────────────────────────────────────────

for (const p of required.filter(p => p.endsWith('.json'))) {
  JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
}

// ── SKILL.md frontmatter ─────────────────────────────────────────────────────

const skillFiles = [
  'plugins/claude/anyharness/skills/anyharness/SKILL.md',
  'plugins/codex/anyharness/skills/anyharness/SKILL.md',
  'standalone/skills/anyharness/SKILL.md',
];
for (const s of skillFiles) {
  const text = fs.readFileSync(path.join(root, s), 'utf8');
  if (!text.startsWith('---\n')) throw new Error(`${s} missing frontmatter`);
  if (!text.includes('name: anyharness')) throw new Error(`${s} missing skill name`);
  if (!text.includes('description:')) throw new Error(`${s} missing description`);
}

// ── Codex SKILL.md must be the overlay (contain "Tool" content) ──────────────

const codexSkill = fs.readFileSync(path.join(root, 'plugins/codex/anyharness/skills/anyharness/SKILL.md'), 'utf8');
if (!codexSkill.includes('Tool calling rules') && !codexSkill.includes('Tool usage rules')) {
  throw new Error('Codex SKILL.md must be the overlay version containing tool calling rules');
}

// ── Claude plugin.json: skills must be an array ──────────────────────────────

const claudePlugin = JSON.parse(fs.readFileSync(path.join(root, 'plugins/claude/anyharness/.claude-plugin/plugin.json'), 'utf8'));
if (!Array.isArray(claudePlugin.skills)) throw new Error('claude plugin.json: skills must be an array');
if (!claudePlugin.skills[0]?.name) throw new Error('claude plugin.json: skills[0].name is required');
if (!claudePlugin.skills[0]?.path) throw new Error('claude plugin.json: skills[0].path is required');

// ── Codex plugin.json: must have tools array with required fields ─────────────

const codexPlugin = JSON.parse(fs.readFileSync(path.join(root, 'plugins/codex/anyharness/.codex-plugin/plugin.json'), 'utf8'));
if (!Array.isArray(codexPlugin.tools) || codexPlugin.tools.length === 0) {
  throw new Error('codex plugin.json: tools array is required and must be non-empty');
}
const requiredTools = [
  'anyharness_scan_project', 'anyharness_collect_diff', 'anyharness_write_profile',
  'anyharness_write_native_prompts', 'anyharness_validate_profile',
  'anyharness_generate_review_packet', 'anyharness_install_local_hooks',
];
const toolNames = codexPlugin.tools.map(t => t.name);
const missingTools = requiredTools.filter(n => !toolNames.includes(n));
if (missingTools.length) throw new Error(`codex plugin.json: missing tools: ${missingTools.join(', ')}`);
for (const tool of codexPlugin.tools) {
  if (typeof tool.sideEffects !== 'boolean') throw new Error(`codex plugin.json: tool ${tool.name} missing sideEffects`);
  if (typeof tool.idempotent !== 'boolean') throw new Error(`codex plugin.json: tool ${tool.name} missing idempotent`);
}

// ── defaultPrompt must use template variables ────────────────────────────────

const prompts = codexPlugin.interface?.defaultPrompt ?? [];
const hasTemplate = prompts.some(p => p.includes('{{'));
if (!hasTemplate) throw new Error('codex plugin.json: defaultPrompt must contain {{template}} variables');

// ── No npx user path in README ───────────────────────────────────────────────

const noNpx = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
if (/npx anyharness/.test(noNpx)) throw new Error('README should not advertise npx anyharness as user path');

// ── Distribution sync check ──────────────────────────────────────────────────

try {
  execFileSync('node', ['scripts/sync-distributions.mjs', '--check'], { stdio: 'inherit' });
} catch {
  process.exit(1);
}

console.log('Validation passed. AnyHarness v3 skill-first layout is valid.');
