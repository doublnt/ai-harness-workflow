#!/usr/bin/env node
import fs from 'node:fs';
const file = process.argv[2] || '.anyharness/profile.json';
if (!fs.existsSync(file)) { console.error(`Missing ${file}`); process.exit(1); }
const p = JSON.parse(fs.readFileSync(file,'utf8'));
const required = ['version','project','stacks','domainHypotheses','riskModel','expertRoles','gates','unknowns'];
const missing = required.filter(k => !(k in p));
if (missing.length) { console.error(`Invalid profile. Missing: ${missing.join(', ')}`); process.exit(1); }
console.log('Profile valid.');
