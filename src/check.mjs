import { changedFiles } from './git.mjs';
import { loadConfig } from './policy.mjs';
import { classifyFiles } from './risk.mjs';
import { matchesAny } from './matcher.mjs';
import { loadApprovals, loadGateArtifacts, relevantGateArtifacts, hasCompletedGate, hasHumanApproval } from './gate-artifacts.mjs';
import { docsDriftIssues } from './docs-drift.mjs';
import { secretScanIssues } from './secret-scan.mjs';

export function runChecks({ repo = process.cwd(), mode = 'staged', files = null, base = null } = {}) {
  const config = loadConfig(repo);
  const changed = files || changedFiles({ mode, repo, base });
  const issues = [];
  const warnings = [];
  if (changed.length === 0) return { ok: true, mode, files: [], risk: { riskLevel: 'L0', changedAreas: [], reasons: [], requiredGates: [] }, issues, warnings };

  const risk = classifyFiles(changed, config);
  const artifacts = relevantGateArtifacts(loadGateArtifacts(repo, config), changed);
  const approvals = loadApprovals(repo, config);
  const hasApproval = hasHumanApproval(artifacts, approvals);

  for (const file of changed) {
    if (matchesAny(file, config.redZone || [])) {
      const issue = { code: 'RED_ZONE', severity: 'error', message: `Red Zone file changed: ${file}`, fix: 'Create/complete a gate artifact and record human approval before committing this change.' };
      if (config.mode === 'advisory') warnings.push(issue); else issues.push(issue);
    }
  }

  if ((config.requireGateArtifactsFor || []).includes(risk.riskLevel) && artifacts.length === 0) {
    issues.push({ code: 'MISSING_GATE_ARTIFACT', severity: 'error', message: `Risk ${risk.riskLevel} change requires a .guardrails/gates/*.json artifact.`, fix: 'Run the relevant skill or create a gate artifact with completed gates, tests, docs impact, and rollback data.' });
  }

  for (const gate of risk.requiredGates || []) {
    if (gate === 'approval') continue;
    if (['L2', 'L3'].includes(risk.riskLevel) && artifacts.length > 0 && !hasCompletedGate(artifacts, gate)) {
      issues.push({ code: 'INCOMPLETE_GATE', severity: 'error', message: `Required gate not completed: ${gate}.`, fix: `Complete the ${gate} gate and update the gate artifact.` });
    }
  }

  if (['L2', 'L3'].includes(risk.riskLevel) && !hasApproval) {
    issues.push({ code: 'MISSING_APPROVAL', severity: 'error', message: `Risk ${risk.riskLevel} change requires human approval ledger.`, fix: 'Add .guardrails/approvals/<gate-id>.approval.json with status = approved.' });
  }

  const sourceChanged = changed.some((file) => matchesAny(file, ['src/**', 'app/**', 'server/**', 'lib/**']));
  const testsChanged = changed.some((file) => matchesAny(file, config.testPatterns || []));
  const gateJustifiesTests = artifacts.some((artifact) => artifact.tests?.status === 'not-required' || artifact.tests?.justification);
  if (sourceChanged && !testsChanged && !gateJustifiesTests) {
    issues.push({ code: 'MISSING_TEST_UPDATE', severity: 'error', message: 'Source code changed without tests or a gate artifact test justification.', fix: 'Add/update tests, or justify why tests are not required in a gate artifact.' });
  }

  issues.push(...docsDriftIssues(changed, config, artifacts));
  issues.push(...secretScanIssues(changed, repo, config));

  return { ok: issues.length === 0, mode, files: changed, risk, issues, warnings };
}

export function formatCheckResult(result) {
  const lines = [];
  lines.push(`Vibe Guardrails check: ${result.ok ? 'PASS' : 'FAIL'}`);
  lines.push(`Mode: ${result.mode}`);
  lines.push(`Risk: ${result.risk.riskLevel}`);
  if (result.risk.changedAreas?.length) lines.push(`Areas: ${result.risk.changedAreas.join(', ')}`);
  if (result.files.length) lines.push(`Files:\n${result.files.map((f) => `  - ${f}`).join('\n')}`);
  if (result.warnings.length) {
    lines.push('\nWarnings:');
    for (const issue of result.warnings) lines.push(`  - [${issue.code}] ${issue.message}\n    Fix: ${issue.fix}`);
  }
  if (result.issues.length) {
    lines.push('\nBlocking issues:');
    for (const issue of result.issues) lines.push(`  - [${issue.code}] ${issue.message}\n    Fix: ${issue.fix}`);
  }
  return `${lines.join('\n')}\n`;
}
