import { pathMatches } from './utils.mjs';

export function classifyChangedFiles(files, config) {
  const red = files.filter((f) => pathMatches(f, config.redZone));
  const yellow = files.filter((f) => pathMatches(f, config.yellowZone));
  const areas = new Set();
  for (const f of files) {
    if (/auth|session|oauth|jwt/i.test(f)) areas.add('auth');
    if (/security|csrf|xss|ssrf/i.test(f)) areas.add('security');
    if (/payment|stripe|billing/i.test(f)) areas.add('payments');
    if (/migration|schema\.prisma|supabase|db\//i.test(f)) areas.add('database');
    if (/\.github\/workflows|Dockerfile|deploy|infra/i.test(f)) areas.add('release');
    if (/\.claude|\.codex|\.agents|CLAUDE\.md|AGENTS\.md/i.test(f)) areas.add('ai-governance');
  }
  let risk = 'L0';
  if (files.length > 0) risk = 'L1';
  if (red.length > 0 || areas.size > 0) risk = 'L2';
  if (files.some((f) => /migration|production|deploy|terraform|kubernetes|\.github\/workflows/i.test(f))) risk = 'L3';
  return { risk, red, yellow, areas: [...areas] };
}

export function requiredGatesFor(risk, areas = []) {
  const gates = new Set(['review']);
  if (risk !== 'L0') gates.add('test');
  if (['L2', 'L3'].includes(risk)) {
    gates.add('design');
    gates.add('security');
    gates.add('release');
  }
  if (areas.includes('database')) gates.add('migration');
  if (areas.includes('auth') || areas.includes('security') || areas.includes('payments') || areas.includes('ai-governance')) gates.add('security');
  if (risk === 'L3') gates.add('approval');
  return [...gates];
}
