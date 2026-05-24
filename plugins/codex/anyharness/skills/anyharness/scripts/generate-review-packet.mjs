#!/usr/bin/env node
// Invoked by the AnyHarness skill via Bash tool. Not a direct user command.
/**
 * Generate a self-contained cross-model review packet.
 * --role <name>         expert review role (default: code-reviewer)
 * --mode staged|unstaged|both   which diff to collect (default: both)
 * --max-diff-kb <n>    truncate diff if larger than n KB (default: 500)
 *
 * Reads .anyharness/profile.json to populate GATE_REQUIREMENTS.md and
 * DOMAIN_INVARIANTS.md with real project content.
 * Exits 1 (with JSON error) if the diff is empty.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const root = process.cwd();
const roleIdx = args.indexOf('--role');
const role = roleIdx !== -1 ? args[roleIdx + 1] : 'code-reviewer';
const modeIdx = args.indexOf('--mode');
const mode = modeIdx !== -1 ? args[modeIdx + 1] : 'both';
const maxDiffKbIdx = args.indexOf('--max-diff-kb');
const maxDiffKb = maxDiffKbIdx !== -1 ? parseInt(args[maxDiffKbIdx + 1], 10) : 500;

if (!['staged', 'unstaged', 'both'].includes(mode)) {
  process.stderr.write(JSON.stringify({ error: 'invalid --mode; use staged|unstaged|both', code: 1 }) + '\n');
  process.exit(1);
}

function git(gitArgs) {
  try { return execFileSync('git', gitArgs, { encoding: 'utf8' }); }
  catch (e) {
    process.stderr.write(JSON.stringify({ error: 'git command failed', code: 2, hint: String(e.message) }) + '\n');
    process.exit(2);
  }
}

let changedFiles = [];
let diff = '';

if (mode === 'staged' || mode === 'both') {
  const s = git(['diff', '--cached', '--name-only']).trim();
  if (s) changedFiles.push(...s.split('\n').filter(Boolean));
  diff += git(['diff', '--cached']);
}
if (mode === 'unstaged' || mode === 'both') {
  const u = git(['diff', '--name-only']).trim();
  if (u) {
    const newFiles = u.split('\n').filter(f => f && !changedFiles.includes(f));
    changedFiles.push(...newFiles);
  }
  diff += git(['diff']);
}
changedFiles = [...new Set(changedFiles)];

if (changedFiles.length === 0) {
  process.stderr.write(JSON.stringify({ error: 'diff is empty; no changed files found', code: 1, hint: `Try a different --mode (currently: ${mode})` }) + '\n');
  process.exit(1);
}

// Diff size protection
const maxBytes = maxDiffKb * 1024;
let diffTruncated = false;
if (Buffer.byteLength(diff, 'utf8') > maxBytes) {
  diff = diff.slice(0, maxBytes);
  diff += `\n\n[DIFF TRUNCATED at ${maxDiffKb}KB. Use --max-diff-kb to increase the limit.]\n`;
  diffTruncated = true;
}

// Load profile if present
const profileJsonPath = path.join(root, '.anyharness', 'profile.json');
let profile = null;
if (fs.existsSync(profileJsonPath)) {
  try { profile = JSON.parse(fs.readFileSync(profileJsonPath, 'utf8')); } catch {}
}
const profileMdPath = path.join(root, '.anyharness', 'profile.md');
const profileMd = fs.existsSync(profileMdPath) ? fs.readFileSync(profileMdPath, 'utf8') : 'No project profile found.';

// Build gate requirements content
let gateContent = '# Gate Requirements\n\n';
if (profile && Array.isArray(profile.gates) && profile.gates.length > 0) {
  for (const gate of profile.gates) {
    const name = typeof gate === 'string' ? gate : (gate.name || JSON.stringify(gate));
    const rule = typeof gate === 'object' && gate.rule ? `\n  Rule: ${gate.rule}` : '';
    gateContent += `- ${name}${rule}\n`;
  }
} else {
  gateContent += '_No gates defined in .anyharness/profile.json._\n\nAdd gates to your profile by asking AnyHarness to synthesize project-specific gates.\n';
}

// Build domain invariants content
let invariantsContent = '# Domain Invariants\n\n';
if (profile && Array.isArray(profile.invariants) && profile.invariants.length > 0) {
  for (const inv of profile.invariants) {
    const label = typeof inv === 'string' ? inv : (inv.rule || JSON.stringify(inv));
    invariantsContent += `- ${label}\n`;
  }
} else {
  invariantsContent += '_No invariants defined in .anyharness/profile.json._\n\nAdd invariants to your profile by asking AnyHarness to synthesize domain invariants.\n';
}

// Build relevant files listing from changed file list
let relevantFilesContent = '# Relevant Files\n\nFiles changed in this diff:\n\n';
for (const f of changedFiles) relevantFilesContent += `- \`${f}\`\n`;

const id = new Date().toISOString().replace(/[:.]/g, '-') + '-' + role.replace(/[^a-zA-Z0-9_-]/g, '-');
const dir = path.join(root, '.anyharness', 'packets', id);
fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(path.join(dir, 'PROMPT.md'), `# Review Packet Prompt

You are performing exactly one expert role: **${role}**.

Do not implement code. Review the packet evidence and output:
- Summary
- Blockers
- Needs Changes
- Non-blocking Suggestions
- Unknowns

Cite evidence from packet files. List Unknowns that prevent Pass.
`);
fs.writeFileSync(path.join(dir, 'PROJECT_PROFILE.md'), profileMd);
fs.writeFileSync(path.join(dir, 'CHANGED_FILES.txt'), changedFiles.join('\n') + '\n');
fs.writeFileSync(path.join(dir, 'DIFF.patch'), diff);
fs.writeFileSync(path.join(dir, 'UNKNOWN.md'), '# Unknowns\n\nList unknowns discovered during review.\n');
fs.writeFileSync(path.join(dir, 'GATE_REQUIREMENTS.md'), gateContent);
fs.writeFileSync(path.join(dir, 'DOMAIN_INVARIANTS.md'), invariantsContent);
fs.writeFileSync(path.join(dir, 'RELEVANT_FILES.md'), relevantFilesContent);

console.log(JSON.stringify({ packet: path.relative(root, dir), role, mode, changedFiles, diffTruncated }));
