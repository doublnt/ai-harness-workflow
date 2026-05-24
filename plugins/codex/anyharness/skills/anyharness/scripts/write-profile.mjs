#!/usr/bin/env node
// Invoked by the AnyHarness skill via Bash tool. Not a direct user command.
/**
 * Write or draft a project harness profile.
 * Default: draft to .anyharness/drafts/profile.json (safe, no overwrite).
 * --confirm: write to .anyharness/profile.json.
 * --overwrite: required alongside --confirm when profile.json already exists.
 * --from <path>: seed from an existing JSON file instead of a blank template.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const overwrite = args.includes('--overwrite');
const fromIdx = args.indexOf('--from');
const profilePathArg = fromIdx !== -1 ? args[fromIdx + 1] : null;

const root = process.cwd();
const profileDir = path.join(root, '.anyharness');
const draftsDir = path.join(profileDir, 'drafts');
const profilePath = path.join(profileDir, 'profile.json');
const profileMdPath = path.join(profileDir, 'profile.md');
const draftPath = path.join(draftsDir, 'profile.json');

let profile = null;
if (profilePathArg && fs.existsSync(profilePathArg)) {
  try { profile = JSON.parse(fs.readFileSync(profilePathArg, 'utf8')); }
  catch (e) {
    process.stderr.write(JSON.stringify({ error: 'failed to parse --from file', code: 1, hint: String(e.message) }) + '\n');
    process.exit(1);
  }
} else {
  profile = {
    version: '3.0.0',
    project: { name: path.basename(root), stage: 'Unknown' },
    aiWorkflow: {},
    stacks: [],
    domainHypotheses: [],
    confirmedDomains: [],
    glossary: [],
    domainModel: { entities: [], workflows: [], stateMachines: [] },
    invariants: [],
    riskModel: { redZones: [], yellowZones: [], escalationRules: [] },
    expertRoles: [],
    gates: [],
    testOracles: [],
    evidenceRequirements: [],
    unknowns: ['Profile was generated as a starter. Ask AnyHarness to synthesize it from scan results and user answers.'],
  };
}

const json = JSON.stringify(profile, null, 2);

if (!confirm) {
  fs.mkdirSync(draftsDir, { recursive: true });
  fs.writeFileSync(draftPath, json);
  console.log(JSON.stringify({ action: 'drafted', draft: path.relative(root, draftPath), hint: 'Run with --confirm to write .anyharness/profile.json' }));
  process.exit(0);
}

if (fs.existsSync(profilePath) && !overwrite) {
  process.stderr.write(JSON.stringify({ error: '.anyharness/profile.json already exists; add --overwrite to replace it', code: 1, hint: 'Draft saved instead.', draft: path.relative(root, draftPath) }) + '\n');
  fs.mkdirSync(draftsDir, { recursive: true });
  fs.writeFileSync(draftPath, json);
  process.exit(1);
}

fs.mkdirSync(profileDir, { recursive: true });
fs.writeFileSync(profilePath, json);
fs.writeFileSync(profileMdPath, `# Project Harness Profile\n\n\`\`\`json\n${json}\n\`\`\`\n`);
console.log(JSON.stringify({ action: 'written', created: [path.relative(root, profilePath), path.relative(root, profileMdPath)] }));
