import path from 'node:path';
import { loadConfig } from './config.mjs';
import { getChangedFiles } from './git.mjs';
import { classifyChangedFiles, requiredGatesFor } from './risk.mjs';
import { checkDocsDrift } from './docs-drift.mjs';
import { scanFilesForSecrets } from './secret-scan.mjs';
import { findSatisfyingGate, hasApprovalForGate } from './gates.mjs';

export function runChecks({ staged = false, ci = false, push = false, files = null, projectDir = process.cwd() } = {}) {
  const config = loadConfig(projectDir);
  const changedFiles = files || getChangedFiles({ staged, since: ci ? 'origin/main' : null, projectDir });
  const classification = classifyChangedFiles(changedFiles, config);
  const requiredGates = requiredGatesFor(classification.risk, classification.areas);
  const docsDrift = checkDocsDrift(changedFiles, config);
  const secretFindings = scanFilesForSecrets(changedFiles, config, projectDir);
  const gate = findSatisfyingGate({ risk: classification.risk, requiredGates, projectDir });

  const errors = [];
  const warnings = [];
  const mode = config.mode || 'advisory';

  for (const finding of secretFindings) errors.push(`Potential secret: ${finding.file} — ${finding.reason}`);

  if (classification.red.length) {
    const msg = `Red Zone files changed: ${classification.red.join(', ')}`;
    if (mode === 'advisory') warnings.push(msg); else errors.push(msg);
  }

  if (classification.yellow.length) warnings.push(`Yellow Zone files changed: ${classification.yellow.join(', ')}`);

  if (config.requireGateArtifactsFor.includes(classification.risk) && !gate) {
    const msg = `${classification.risk} change requires a gate artifact with completed gates: ${requiredGates.join(', ')}`;
    if (mode === 'advisory') warnings.push(msg); else errors.push(msg);
  }

  if (gate && config.requireApprovalFor.includes(classification.risk) && !hasApprovalForGate(gate, projectDir)) {
    const msg = `${classification.risk} change requires human approval for gate ${gate.id}.`;
    if (mode === 'strict' || mode === 'enforcing') errors.push(msg); else warnings.push(msg);
  }

  if (docsDrift.length) {
    const msg = `Docs drift detected: ${docsDrift.map((d) => d.rule).join('; ')}`;
    if (mode === 'strict' || ci) errors.push(msg); else warnings.push(msg);
  }

  if (push && classification.risk !== 'L0' && mode !== 'advisory' && !gate) {
    errors.push('Pre-push requires a gate artifact for non-trivial changes in enforcing/strict mode.');
  }

  return {
    ok: errors.length === 0,
    mode,
    changedFiles,
    risk: classification.risk,
    areas: classification.areas,
    redZone: classification.red,
    yellowZone: classification.yellow,
    requiredGates,
    gate: gate ? { id: gate.id, riskLevel: gate.riskLevel, completedGates: gate.completedGates, humanApprovalStatus: gate.humanApprovalStatus } : null,
    docsDrift,
    secretFindings,
    warnings,
    errors
  };
}

export function formatCheckResult(result) {
  const lines = [];
  lines.push(`AnyHarness check: ${result.ok ? 'PASS' : 'BLOCKED'}`);
  lines.push(`Mode: ${result.mode}`);
  lines.push(`Risk: ${result.risk}`);
  if (result.changedFiles.length) lines.push(`Changed files: ${result.changedFiles.join(', ')}`);
  if (result.requiredGates.length) lines.push(`Required gates: ${result.requiredGates.join(', ')}`);
  if (result.gate) lines.push(`Gate artifact: ${result.gate.id}`);
  if (result.warnings.length) {
    lines.push('\nWarnings:');
    for (const w of result.warnings) lines.push(`- ${w}`);
  }
  if (result.errors.length) {
    lines.push('\nErrors:');
    for (const e of result.errors) lines.push(`- ${e}`);
  }
  return lines.join('\n');
}
