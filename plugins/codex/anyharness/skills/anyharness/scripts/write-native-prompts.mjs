#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const target = process.argv.includes('--target') ? process.argv[process.argv.indexOf('--target')+1] : 'both';
const draftDir = path.join(root, '.anyharness', 'drafts');
fs.mkdirSync(draftDir, {recursive:true});

const core = `# AnyHarness Project Instructions\n\nThis project uses AnyHarness. Before substantial code changes:\n\n1. Classify risk.\n2. Read the project harness profile if present: .anyharness/profile.json and .anyharness/profile.md.\n3. Keep changes surgical.\n4. State assumptions and Unknowns.\n5. Use project-specific expert roles for review.\n6. Do not modify high-risk files without explicit approval.\n7. Provide tests or evidence, not just claims.\n\nFor domain-sensitive changes, do not rely on generic assumptions. Use repository evidence and user-confirmed project invariants.\n`;

function writeOrDraft(file, content){
  const p = path.join(root, file);
  if (fs.existsSync(p)) {
    const draft = path.join(draftDir, file.replace(/[\\/]/g,'_') + '.append.md');
    fs.writeFileSync(draft, '\n\n<!-- AnyHarness draft append -->\n' + content);
    return {file, action:'drafted', draft:path.relative(root,draft)};
  }
  fs.mkdirSync(path.dirname(p), {recursive:true});
  fs.writeFileSync(p, content);
  return {file, action:'created'};
}

const results=[];
if (target === 'claude' || target === 'both' || target === 'all') results.push(writeOrDraft('CLAUDE.md', core));
if (target === 'codex' || target === 'both' || target === 'all') results.push(writeOrDraft('AGENTS.md', core));
if (target === 'cursor' || target === 'all') results.push(writeOrDraft('.cursor/rules/anyharness.mdc', `---\ndescription: AnyHarness project instructions\nalwaysApply: true\n---\n\n${core}`));
console.log(JSON.stringify({results}, null, 2));
