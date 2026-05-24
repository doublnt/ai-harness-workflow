#!/usr/bin/env node
// Invoked by the AnyHarness skill via Bash tool. Not a direct user command.
/**
 * Write or draft native prompt surfaces (CLAUDE.md, AGENTS.md, Cursor rule).
 * --target claude|codex|cursor|both|all  (default: both → CLAUDE.md + AGENTS.md)
 * --profile <path>  embed confirmedDomains and invariants from a profile JSON
 *
 * Safe by default: if a file already exists, drafts an append snippet instead
 * of overwriting.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const root = process.cwd();
const targetIdx = args.indexOf('--target');
const target = targetIdx !== -1 ? args[targetIdx + 1] : 'both';
const profileIdx = args.indexOf('--profile');
const profilePath = profileIdx !== -1 ? args[profileIdx + 1] : null;
const draftDir = path.join(root, '.anyharness', 'drafts');
fs.mkdirSync(draftDir, { recursive: true });

// Attempt to derive a project name for project-specific content
const projectName = (() => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    return pkg.name || path.basename(root);
  } catch { return path.basename(root); }
})();

let profileSummary = '';
if (profilePath && fs.existsSync(profilePath)) {
  try {
    const p = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    const domains = Array.isArray(p.confirmedDomains) ? p.confirmedDomains : [];
    const invariants = Array.isArray(p.invariants) ? p.invariants : [];
    const stacks = Array.isArray(p.stacks) ? p.stacks : [];
    if (domains.length || invariants.length || stacks.length) {
      profileSummary += '\n## Project-Specific Context\n';
      if (stacks.length) profileSummary += `\n**Stacks**: ${stacks.join(', ')}\n`;
      if (domains.length) profileSummary += `\n**Confirmed domains**: ${domains.join(', ')}\n`;
      if (invariants.length) {
        profileSummary += '\n**Invariants**:\n';
        for (const inv of invariants) {
          const label = typeof inv === 'string' ? inv : (inv.rule || JSON.stringify(inv));
          profileSummary += `- ${label}\n`;
        }
      }
    }
  } catch (e) {
    process.stderr.write(JSON.stringify({ error: 'failed to parse --profile file', code: 1, hint: String(e.message) }) + '\n');
    process.exit(1);
  }
}

// If no profile provided, add a placeholder that reminds the user to fill it in
const profilePlaceholder = profileSummary
  ? profileSummary
  : `\n## Project-Specific Context\n\n<!-- TODO: Ask AnyHarness to synthesize domain rules for ${projectName} and regenerate this file with --profile .anyharness/profile.json -->\n`;

const core = `# AnyHarness Project Instructions — ${projectName}

This project uses AnyHarness. Before substantial code changes:

1. Classify risk.
2. Read the project harness profile if present: \`.anyharness/profile.json\` and \`.anyharness/profile.md\`.
3. Keep changes surgical.
4. State assumptions and Unknowns.
5. Use project-specific expert roles for review.
6. Do not modify high-risk files without explicit approval.
7. Provide tests or evidence, not just claims.

For domain-sensitive changes, do not rely on generic assumptions. Use repository evidence and user-confirmed project invariants.
${profilePlaceholder}`;

function writeOrDraft(file, content) {
  const p = path.join(root, file);
  if (fs.existsSync(p)) {
    const draft = path.join(draftDir, file.replace(/[\\/]/g, '_') + '.append.md');
    fs.writeFileSync(draft, '\n\n<!-- AnyHarness draft append -->\n' + content);
    return { file, action: 'drafted', draft: path.relative(root, draft) };
  }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  return { file, action: 'created' };
}

const results = [];
if (target === 'claude' || target === 'both' || target === 'all') results.push(writeOrDraft('CLAUDE.md', core));
if (target === 'codex' || target === 'both' || target === 'all') results.push(writeOrDraft('AGENTS.md', core));
if (target === 'cursor' || target === 'all') {
  results.push(writeOrDraft('.cursor/rules/anyharness.mdc', `---\ndescription: AnyHarness project instructions\nalwaysApply: true\n---\n\n${core}`));
}
console.log(JSON.stringify({ results }, null, 2));
