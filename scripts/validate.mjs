import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`Invalid JSON: ${file}: ${error.message}`);
    return null;
  }
}

function exists(file) {
  return fs.existsSync(file);
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function listDirs(dir) {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function parseFrontmatter(text, file) {
  if (!text.startsWith('---\n')) {
    errors.push(`Missing YAML frontmatter: ${file}`);
    return {};
  }
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) {
    errors.push(`Unclosed YAML frontmatter: ${file}`);
    return {};
  }
  const block = text.slice(4, end).trim();
  const out = {};
  for (const line of block.split('\n')) {
    const index = line.indexOf(':');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    value = value.replace(/^"|"$/g, '');
    out[key] = value;
  }
  return out;
}

function validatePlugin(kind, pluginRoot) {
  const manifestFile = kind === 'claude'
    ? path.join(pluginRoot, '.claude-plugin', 'plugin.json')
    : path.join(pluginRoot, '.codex-plugin', 'plugin.json');
  assert(exists(manifestFile), `${kind}: missing plugin manifest`);
  const manifest = readJson(manifestFile);
  if (manifest) {
    assert(manifest.name === 'vibe-coding-guardrails', `${kind}: wrong plugin name`);
    assert(manifest.skills === './skills/', `${kind}: manifest skills must be ./skills/`);
    assert(!manifest.hooks, `${kind}: v1 must not declare hooks`);
    assert(!manifest.mcpServers, `${kind}: v1 must not declare MCP servers`);
    assert(!manifest.apps, `${kind}: v1 must not declare apps`);
  }

  const forbidden = ['hooks', 'bin', '.mcp.json', '.app.json'];
  for (const item of forbidden) {
    assert(!exists(path.join(pluginRoot, item)), `${kind}: forbidden v1 runtime component exists: ${item}`);
  }

  const skillsDir = path.join(pluginRoot, 'skills');
  const skillDirs = listDirs(skillsDir);
  assert(skillDirs.length >= 8, `${kind}: expected at least 8 skills`);

  for (const skill of skillDirs) {
    const skillFile = path.join(skillsDir, skill, 'SKILL.md');
    assert(exists(skillFile), `${kind}: missing SKILL.md for ${skill}`);
    if (!exists(skillFile)) continue;
    const text = fs.readFileSync(skillFile, 'utf8');
    const fm = parseFrontmatter(text, skillFile);
    assert(fm.name === skill, `${kind}: skill ${skill} frontmatter name mismatch`);
    assert(Boolean(fm.description), `${kind}: skill ${skill} missing description`);
    assert(text.includes('Unknown') || text.includes('Unknowns'), `${kind}: skill ${skill} should mention Unknowns`);
  }

  const resourcesDir = path.join(pluginRoot, 'resources');
  assert(exists(resourcesDir), `${kind}: missing resources directory`);
}

validatePlugin('claude', path.join(root, 'plugins', 'claude', 'vibe-coding-guardrails'));
validatePlugin('codex', path.join(root, 'plugins', 'codex', 'vibe-coding-guardrails'));

const claudeMarketplace = readJson(path.join(root, '.claude-plugin', 'marketplace.json'));
if (claudeMarketplace) {
  assert(Array.isArray(claudeMarketplace.plugins), 'Claude marketplace must contain plugins[]');
  const entry = claudeMarketplace.plugins.find((p) => p.name === 'vibe-coding-guardrails');
  assert(Boolean(entry), 'Claude marketplace missing vibe-coding-guardrails entry');
  if (entry) assert(exists(path.join(root, entry.source)), `Claude marketplace source missing: ${entry.source}`);
}

const codexMarketplace = readJson(path.join(root, '.agents', 'plugins', 'marketplace.json'));
if (codexMarketplace) {
  assert(Array.isArray(codexMarketplace.plugins), 'Codex marketplace must contain plugins[]');
  const entry = codexMarketplace.plugins.find((p) => p.name === 'vibe-coding-guardrails');
  assert(Boolean(entry), 'Codex marketplace missing vibe-coding-guardrails entry');
  if (entry) assert(exists(path.join(root, entry.source.path)), `Codex marketplace source missing: ${entry.source.path}`);
}

if (errors.length) {
  console.error('Validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Validation passed. Pure skills v1 layout is valid.');
