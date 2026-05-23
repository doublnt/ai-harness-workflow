#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const profilePathArg = process.argv.includes('--from') ? process.argv[process.argv.indexOf('--from')+1] : null;
let profile = null;
if (profilePathArg && fs.existsSync(profilePathArg)) profile = JSON.parse(fs.readFileSync(profilePathArg,'utf8'));
else {
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
    unknowns: ['Profile was generated as a starter. Ask AnyHarness to synthesize it from scan results and user answers.']
  };
}
fs.mkdirSync(path.join(root,'.anyharness'), {recursive:true});
fs.writeFileSync(path.join(root,'.anyharness','profile.json'), JSON.stringify(profile, null, 2));
fs.writeFileSync(path.join(root,'.anyharness','profile.md'), `# Project Harness Profile\n\n\`\`\`json\n${JSON.stringify(profile, null, 2)}\n\`\`\`\n`);
console.log(JSON.stringify({created:['.anyharness/profile.json','.anyharness/profile.md']}, null, 2));
