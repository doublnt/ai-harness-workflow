#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const role = process.argv.includes('--role') ? process.argv[process.argv.indexOf('--role')+1] : 'code-reviewer';
const id = new Date().toISOString().replace(/[:.]/g,'-') + '-' + role.replace(/[^a-zA-Z0-9_-]/g,'-');
const dir = path.join(root,'.anyharness','packets',id);
fs.mkdirSync(dir,{recursive:true});
function git(args){ try { return execFileSync('git', args, {encoding:'utf8'}); } catch { return ''; } }
const changed = git(['diff','--cached','--name-only']);
const diff = git(['diff','--cached']);
const profilePath = path.join(root,'.anyharness','profile.md');
const profile = fs.existsSync(profilePath) ? fs.readFileSync(profilePath,'utf8') : 'No project profile found.';
fs.writeFileSync(path.join(dir,'PROMPT.md'), `# Review Packet Prompt\n\nYou are performing exactly one expert role: ${role}.\n\nDo not implement code. Review the packet evidence and output Blockers / Needs Changes / Pass. Cite evidence from packet files and list Unknowns that prevent Pass.\n`);
fs.writeFileSync(path.join(dir,'PROJECT_PROFILE.md'), profile);
fs.writeFileSync(path.join(dir,'CHANGED_FILES.txt'), changed);
fs.writeFileSync(path.join(dir,'DIFF.patch'), diff);
fs.writeFileSync(path.join(dir,'UNKNOWN.md'), '# Unknowns\n\nList unknowns discovered during review.\n');
fs.writeFileSync(path.join(dir,'GATE_REQUIREMENTS.md'), '# Gate Requirements\n\nRead .anyharness/profile.json for project-specific gates if present.\n');
fs.writeFileSync(path.join(dir,'DOMAIN_INVARIANTS.md'), '# Domain Invariants\n\nRead .anyharness/profile.json for confirmed invariants if present.\n');
fs.writeFileSync(path.join(dir,'RELEVANT_FILES.md'), '# Relevant Files\n\nPopulate with relevant source snippets if needed.\n');
console.log(JSON.stringify({packet:path.relative(root,dir)}, null, 2));
