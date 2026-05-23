import { table } from './utils.js';

export function printScanReport(scan, config, plannedFiles) {
  console.log('# Project Scan Report\n');

  console.log('## 1. Detected AI Workflow\n');
  console.log(table([
    ['Workflow', 'Status', 'Evidence'],
    ['Claude Code', scan.workflows.claude.status, scan.workflows.claude.evidence.join(', ') || '-'],
    ['Codex', scan.workflows.codex.status, scan.workflows.codex.evidence.join(', ') || '-'],
    ['Spec Kit', scan.workflows.speckit.status, scan.workflows.speckit.evidence.join(', ') || '-'],
    ['Cursor', scan.workflows.cursor.status, scan.workflows.cursor.evidence.join(', ') || '-'],
    ['Windsurf', scan.workflows.windsurf.status, scan.workflows.windsurf.evidence.join(', ') || '-'],
    ['Copilot instructions', scan.workflows.copilot.status, scan.workflows.copilot.evidence.join(', ') || '-']
  ]));

  console.log('\n## 2. Recommended Target Format\n');
  console.log(`Recommended target: ${scan.recommendedTarget.target}`);
  console.log(`Confidence: ${scan.recommendedTarget.confidence}`);
  console.log(`Reason: ${scan.recommendedTarget.reason.join('; ')}`);
  console.log(`Selected target: ${config.target}`);

  console.log('\n## 3. Detected Project Facts\n');
  console.log(table([
    ['Item', 'Value'],
    ['Project name', scan.facts.projectName],
    ['Project type', scan.facts.projectType],
    ['Primary language', scan.facts.primaryLanguage],
    ['Framework', scan.facts.framework],
    ['Package manager', scan.facts.packageManager],
    ['Test framework', scan.facts.testFramework],
    ['Build command', scan.facts.buildCommand],
    ['Lint command', scan.facts.lintCommand],
    ['Format command', scan.facts.formatCommand],
    ['Database', scan.facts.database],
    ['Auth', scan.facts.auth],
    ['Deployment', scan.facts.deployment],
    ['CI/CD', scan.facts.cicd]
  ]));

  console.log('\n## 4. Existing Engineering Gates\n');
  console.log(table([
    ['Gate', 'Status'],
    ['Lint', scan.gates.lint.status],
    ['Format', scan.gates.format.status],
    ['Unit tests', scan.gates.unitTests.status],
    ['Integration tests', scan.gates.integrationTests.status],
    ['E2E tests', scan.gates.e2eTests.status],
    ['Type check', scan.gates.typeCheck.status],
    ['Security scan', scan.gates.securityScan.status],
    ['CI', scan.gates.ci.status]
  ]));

  console.log('\n## 5. Risk Signals\n');
  console.log((scan.risks.length ? scan.risks : ['No major risk signals detected by shallow scan.']).map((item) => `- ${item}`).join('\n'));

  console.log('\n## 6. Inferred Project Risk Profile\n');
  console.log(`Default risk profile: ${scan.riskProfile.level}`);
  console.log(`Confidence: ${scan.riskProfile.confidence}`);

  console.log('\n## 7. Unknowns\n');
  console.log((scan.unknowns.length ? scan.unknowns : ['None']).map((item) => `- ${item}`).join('\n'));

  console.log('\n## 8. Proposed Files To Create\n');
  console.log(plannedFiles.map((file) => `- ${file}`).join('\n'));
}

export function printInstallReport(config, result) {
  console.log('\n# AI Development Governance Installed\n');
  console.log(`Target Format: ${config.target}\n`);

  console.log('## Created Files\n');
  console.log(result.created.length ? result.created.map((f) => `- ${f}`).join('\n') : '- None');

  console.log('\n## Draft Files\n');
  console.log(result.drafts.length ? result.drafts.map((f) => `- ${f}`).join('\n') : '- None');

  console.log('\n## How To Use\n');
  if (config.target === 'claude' || config.target === 'both') {
    console.log('Claude Code: read CLAUDE.md and use /new-feature, /code-review, /test-plan, /release-check.');
  }
  if (config.target === 'codex' || config.target === 'both') {
    console.log('Codex: read AGENTS.md and use the ai-development-governance skill.');
  }
  if (config.target === 'speckit') {
    console.log('Spec Kit: read .specify/governance/guardrails.md and run the governance check before implementation.');
  }
}
