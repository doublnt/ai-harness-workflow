#!/usr/bin/env node
// Invoked by the AnyHarness skill via Bash tool. Not a direct user command.
/**
 * Validate a project harness profile against the required schema fields.
 * Outputs a JSON report to stdout; exits 1 if validation fails.
 *
 * Output includes a `nextAction` hint to guide agent loops.
 *
 * Usage: node validate-profile.mjs [path/to/profile.json]
 */
import fs from 'node:fs';

const file = process.argv[2] || '.anyharness/profile.json';

if (!fs.existsSync(file)) {
  process.stderr.write(JSON.stringify({ error: `Profile not found: ${file}`, code: 1, hint: 'Run write-profile.mjs --confirm to create one.' }) + '\n');
  process.exit(1);
}

let p;
try {
  p = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  process.stderr.write(JSON.stringify({ error: 'Failed to parse profile JSON', code: 1, hint: String(e.message) }) + '\n');
  process.exit(1);
}

const required = [
  { key: 'version', type: 'string' },
  { key: 'project', type: 'object' },
  { key: 'stacks', type: 'array' },
  { key: 'domainHypotheses', type: 'array' },
  { key: 'confirmedDomains', type: 'array' },
  { key: 'glossary', type: 'array' },
  { key: 'domainModel', type: 'object' },
  { key: 'invariants', type: 'array' },
  { key: 'riskModel', type: 'object' },
  { key: 'expertRoles', type: 'array' },
  { key: 'gates', type: 'array' },
  { key: 'testOracles', type: 'array' },
  { key: 'evidenceRequirements', type: 'array' },
  { key: 'unknowns', type: 'array' },
];

const errors = [];
for (const { key, type } of required) {
  if (!(key in p)) {
    errors.push({ field: key, issue: 'missing' });
  } else if (type === 'array' && !Array.isArray(p[key])) {
    errors.push({ field: key, issue: `expected array, got ${typeof p[key]}` });
  } else if (type === 'object' && (typeof p[key] !== 'object' || Array.isArray(p[key]) || p[key] === null)) {
    errors.push({ field: key, issue: `expected object, got ${Array.isArray(p[key]) ? 'array' : typeof p[key]}` });
  } else if (type === 'string' && typeof p[key] !== 'string') {
    errors.push({ field: key, issue: `expected string, got ${typeof p[key]}` });
  }
}

// Determine whether the profile looks substantively filled in or still starter-level
const isStarter = Array.isArray(p.confirmedDomains) && p.confirmedDomains.length === 0
  && Array.isArray(p.invariants) && p.invariants.length === 0;

if (errors.length > 0) {
  const missingFields = errors.map(e => e.field);
  process.stderr.write(JSON.stringify({ error: 'Profile validation failed', code: 1, errors }) + '\n');
  console.log(JSON.stringify({
    valid: false,
    file,
    errors,
    nextAction: `fill_missing_fields: ${missingFields.join(', ')}`,
  }));
  process.exit(1);
}

console.log(JSON.stringify({
  valid: true,
  file,
  fields: required.map(r => r.key),
  nextAction: isStarter
    ? 'synthesize_profile: profile exists but confirmedDomains and invariants are empty — ask AnyHarness to synthesize from scan results'
    : 'proceed: profile is valid and substantive',
}));
