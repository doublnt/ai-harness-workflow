#!/usr/bin/env node
// Invoked by the AnyHarness skill via Bash tool. Not a direct user command.
/**
 * Propose harness evolution from review findings.
 *
 * Input: a JSON file (--findings <path>) shaped as:
 *   {
 *     "trigger": "review of staged diff",
 *     "candidates": [
 *       { "type": "new-invariant", "proposed": "...", "evidence": "...", "rationale": "..." },
 *       { "type": "refined-invariant", "from": "...", "to": "...", "evidence": "..." },
 *       { "type": "retired-invariant", "rule": "...", "evidence": "..." },
 *       { "type": "new-unknown", "question": "...", "evidence": "..." },
 *       { "type": "new-gate", "name": "...", "rule": "...", "evidence": "..." }
 *     ]
 *   }
 *
 * Reads .anyharness/profile.json, drops candidates that duplicate existing entries
 * (matched by normalized rule text), and produces a draft merged profile at
 * .anyharness/drafts/profile.evolved.json plus a diff report.
 *
 * Default: draft mode (no write to profile.json).
 * --confirm: merge into .anyharness/profile.json and append a learningHistory entry.
 *
 * Idempotent: re-running with the same findings produces the same draft and never
 * appends a duplicate learningHistory entry on confirm.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const root = process.cwd();
const findingsIdx = args.indexOf('--findings');
const findingsPath = findingsIdx !== -1 ? args[findingsIdx + 1] : null;
const confirm = args.includes('--confirm');

if (!findingsPath) {
  process.stderr.write(JSON.stringify({ error: 'missing --findings <path>', code: 1, hint: 'Pass a JSON file of learning candidates.' }) + '\n');
  process.exit(1);
}
if (!fs.existsSync(findingsPath)) {
  process.stderr.write(JSON.stringify({ error: `findings file not found: ${findingsPath}`, code: 1 }) + '\n');
  process.exit(1);
}

let findings;
try {
  findings = JSON.parse(fs.readFileSync(findingsPath, 'utf8'));
} catch (e) {
  process.stderr.write(JSON.stringify({ error: 'failed to parse findings JSON', code: 1, hint: String(e.message) }) + '\n');
  process.exit(1);
}

if (!Array.isArray(findings.candidates)) {
  process.stderr.write(JSON.stringify({ error: 'findings.candidates must be an array', code: 1 }) + '\n');
  process.exit(1);
}

const profilePath = path.join(root, '.anyharness', 'profile.json');
if (!fs.existsSync(profilePath)) {
  process.stderr.write(JSON.stringify({ error: 'no .anyharness/profile.json found', code: 1, hint: 'Run write-profile.mjs --confirm first.' }) + '\n');
  process.exit(1);
}

let profile;
try {
  profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
} catch (e) {
  process.stderr.write(JSON.stringify({ error: 'failed to parse profile.json', code: 1, hint: String(e.message) }) + '\n');
  process.exit(1);
}

// Ensure shape
profile.invariants = Array.isArray(profile.invariants) ? profile.invariants : [];
profile.gates = Array.isArray(profile.gates) ? profile.gates : [];
profile.unknowns = Array.isArray(profile.unknowns) ? profile.unknowns : [];
profile.learningHistory = Array.isArray(profile.learningHistory) ? profile.learningHistory : [];

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const invariantText = (i) => (typeof i === 'string' ? i : (i && i.rule) || '');
const gateText = (g) => (typeof g === 'string' ? g : (g && g.rule) || (g && g.name) || '');
const unknownText = (u) => (typeof u === 'string' ? u : (u && u.question) || '');

const existingInvariants = new Set(profile.invariants.map(i => norm(invariantText(i))));
const existingGates = new Set(profile.gates.map(g => norm(gateText(g))));
const existingUnknowns = new Set(profile.unknowns.map(u => norm(unknownText(u))));

const now = new Date().toISOString();
const trigger = typeof findings.trigger === 'string' ? findings.trigger : 'review';
const source = `review:${now.slice(0, 10)}:${trigger.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 64)}`;

const accepted = { added: [], refined: [], retired: [], newUnknowns: [], newGates: [] };
const skipped = [];

for (const c of findings.candidates) {
  if (!c || typeof c !== 'object') continue;
  switch (c.type) {
    case 'new-invariant': {
      const text = String(c.proposed || '').trim();
      if (!text) { skipped.push({ type: c.type, reason: 'empty proposed text' }); break; }
      if (existingInvariants.has(norm(text))) {
        skipped.push({ type: c.type, reason: 'duplicate', text });
        break;
      }
      const entry = { rule: text, source, addedAt: now };
      if (c.rationale) entry.rationale = String(c.rationale);
      if (c.evidence) entry.evidence = String(c.evidence);
      profile.invariants.push(entry);
      existingInvariants.add(norm(text));
      accepted.added.push({ type: 'new-invariant', rule: text });
      break;
    }
    case 'refined-invariant': {
      const from = String(c.from || '').trim();
      const to = String(c.to || '').trim();
      if (!from || !to) { skipped.push({ type: c.type, reason: 'missing from/to' }); break; }
      const fromKey = norm(from);
      const idx = profile.invariants.findIndex(i => norm(invariantText(i)) === fromKey);
      if (idx === -1) { skipped.push({ type: c.type, reason: 'from not found', from }); break; }
      if (existingInvariants.has(norm(to)) && norm(to) !== fromKey) {
        skipped.push({ type: c.type, reason: 'refined text already exists', to });
        break;
      }
      const old = profile.invariants[idx];
      const merged = typeof old === 'object' ? { ...old, rule: to } : { rule: to };
      merged.source = source;
      merged.addedAt = now;
      if (c.evidence) merged.evidence = String(c.evidence);
      profile.invariants[idx] = merged;
      existingInvariants.delete(fromKey);
      existingInvariants.add(norm(to));
      accepted.refined.push({ type: 'refined-invariant', from, to });
      break;
    }
    case 'retired-invariant': {
      const text = String(c.rule || '').trim();
      if (!text) { skipped.push({ type: c.type, reason: 'empty rule text' }); break; }
      const key = norm(text);
      const idx = profile.invariants.findIndex(i => norm(invariantText(i)) === key);
      if (idx === -1) { skipped.push({ type: c.type, reason: 'rule not found', text }); break; }
      profile.invariants.splice(idx, 1);
      existingInvariants.delete(key);
      accepted.retired.push({ type: 'retired-invariant', rule: text });
      break;
    }
    case 'new-unknown': {
      const text = String(c.question || '').trim();
      if (!text) { skipped.push({ type: c.type, reason: 'empty question text' }); break; }
      if (existingUnknowns.has(norm(text))) {
        skipped.push({ type: c.type, reason: 'duplicate', text });
        break;
      }
      profile.unknowns.push(text);
      existingUnknowns.add(norm(text));
      accepted.newUnknowns.push({ type: 'new-unknown', question: text });
      break;
    }
    case 'new-gate': {
      const name = String(c.name || '').trim();
      const rule = String(c.rule || '').trim();
      if (!name || !rule) { skipped.push({ type: c.type, reason: 'missing name or rule' }); break; }
      const key = norm(rule);
      if (existingGates.has(key)) {
        skipped.push({ type: c.type, reason: 'duplicate', rule });
        break;
      }
      const entry = { name, rule, source, addedAt: now };
      if (c.evidence) entry.evidence = String(c.evidence);
      profile.gates.push(entry);
      existingGates.add(key);
      accepted.newGates.push({ type: 'new-gate', name, rule });
      break;
    }
    default:
      skipped.push({ type: c.type || 'unknown', reason: 'unsupported type' });
  }
}

const totalAccepted =
  accepted.added.length + accepted.refined.length + accepted.retired.length +
  accepted.newUnknowns.length + accepted.newGates.length;

// Idempotency: if nothing changed, no learningHistory entry is appended.
let historyEntry = null;
if (totalAccepted > 0) {
  historyEntry = {
    at: now,
    trigger,
    added: accepted.added,
    refined: accepted.refined,
    retired: accepted.retired,
    newUnknowns: accepted.newUnknowns,
    newGates: accepted.newGates,
  };
}

const draftsDir = path.join(root, '.anyharness', 'drafts');
fs.mkdirSync(draftsDir, { recursive: true });
const draftPath = path.join(draftsDir, 'profile.evolved.json');

if (!confirm) {
  // Write draft including the prospective learningHistory entry.
  const draftProfile = { ...profile };
  if (historyEntry) draftProfile.learningHistory = [...profile.learningHistory, historyEntry];
  fs.writeFileSync(draftPath, JSON.stringify(draftProfile, null, 2));
  console.log(JSON.stringify({
    action: 'drafted',
    draft: path.relative(root, draftPath),
    accepted: {
      added: accepted.added.length,
      refined: accepted.refined.length,
      retired: accepted.retired.length,
      newUnknowns: accepted.newUnknowns.length,
      newGates: accepted.newGates.length,
    },
    skipped,
    hint: totalAccepted === 0
      ? 'No changes proposed (all candidates were duplicates or invalid). Profile already up to date.'
      : 'Review draft, then run with --confirm to merge into .anyharness/profile.json.',
  }));
  process.exit(0);
}

if (totalAccepted === 0) {
  // No-op confirm: do not append empty history entry, do not rewrite profile.json.
  console.log(JSON.stringify({
    action: 'noop',
    reason: 'no candidates accepted; profile unchanged',
    skipped,
  }));
  process.exit(0);
}

profile.learningHistory.push(historyEntry);
fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));

const profileMdPath = path.join(root, '.anyharness', 'profile.md');
fs.writeFileSync(profileMdPath, `# Project Harness Profile\n\n\`\`\`json\n${JSON.stringify(profile, null, 2)}\n\`\`\`\n`);

console.log(JSON.stringify({
  action: 'evolved',
  profile: path.relative(root, profilePath),
  learningHistoryEntries: profile.learningHistory.length,
  accepted: {
    added: accepted.added.length,
    refined: accepted.refined.length,
    retired: accepted.retired.length,
    newUnknowns: accepted.newUnknowns.length,
    newGates: accepted.newGates.length,
  },
  skipped,
}));
