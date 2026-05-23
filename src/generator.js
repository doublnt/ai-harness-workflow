import path from 'node:path';
import {
  projectContext,
  engineeringConstitution,
  riskLevels,
  fileChangePolicy,
  workflowOverview,
  requirementGate,
  designGate,
  implementationGate,
  codeReviewGate,
  testingGate,
  securityGate,
  releaseGate,
  architectureChecklist,
  codeReviewChecklist,
  testingChecklist,
  securityChecklist,
  releaseChecklist,
  dependencyChecklist,
  observabilityChecklist,
  featureSpecTemplate,
  designProposalTemplate,
  adrTemplate,
  implementationPlanTemplate,
  testPlanTemplate,
  prReviewTemplate,
  releasePlanTemplate,
  frontendChecklist,
  backendChecklist,
  databaseChecklist,
  rustChecklist,
  aiAgentChecklist
} from './templates/common.js';
import { claudeCommand, claudeMd, claudeSettingsDraft, claudeSkill } from './templates/claude.js';
import { agentsMd, codexConfigDraft, codexSkill, governanceRules, safetyRules } from './templates/codex.js';
import { contributingDraft, pullRequestTemplateDraft, ciGatesDraft } from './templates/drafts.js';
import { speckitCommand, speckitGovernanceAddendum } from './templates/speckit.js';
import { writeFileSafe } from './utils.js';

export function buildConfig(scan, options = {}) {
  const target = resolveTarget(scan, options.target || 'detect');
  return {
    target,
    scope: options.full ? 'full' : options.lite ? 'lite' : 'standard',
    stage: options.stage || 'Unknown',
    primaryUsers: options.primaryUsers || 'Unknown',
    coreDomain: options.coreDomain || 'Unknown',
    primaryGoal: options.primaryGoal || 'safety + maintainability',
    aiAutonomy: options.aiAutonomy || 'medium',
    testGate: options.testGate || 'normal',
    securityGate: options.securityGate || 'normal',
    releaseGate: options.releaseGate || 'light'
  };
}

export function resolveTarget(scan, target) {
  if (!target || target === 'detect') return scan.recommendedTarget.target;
  return target;
}

export function planFiles(scan, config) {
  const files = [];
  if (config.target === 'claude') addClaude(files, scan, config, { sharedAgents: false });
  else if (config.target === 'codex') addCodex(files, scan, config, { shared: false });
  else if (config.target === 'both') {
    addCodex(files, scan, config, { shared: true });
    addClaude(files, scan, config, { sharedAgents: true });
  } else if (config.target === 'speckit') {
    addSpecKit(files, scan, config);
  }
  return files;
}

export function generateFiles(root, scan, config, { dryRun = false } = {}) {
  const planned = planFiles(scan, config);
  if (dryRun) return { planned: planned.map((file) => file.path), created: [], drafts: [] };

  const created = [];
  const drafts = [];
  for (const file of planned) {
    writeFileSafe(root, file.path, file.content, created, drafts);
  }
  return { planned: planned.map((file) => file.path), created, drafts };
}

function addClaude(files, scan, config, { sharedAgents }) {
  files.push({ path: 'CLAUDE.md', content: claudeMd({ sharedAgents }) });
  files.push({ path: '.claude/settings.json', content: claudeSettingsDraft(scan) });
  files.push({ path: '.claude/rules/engineering-constitution.md', content: engineeringConstitution() });
  files.push({ path: '.claude/rules/risk-levels.md', content: riskLevels() });
  files.push({ path: '.claude/rules/file-change-policy.md', content: fileChangePolicy() });

  for (const name of ['init-project', 'new-feature', 'design-review', 'implementation-plan', 'code-review', 'test-plan', 'release-check', 'risk-classify']) {
    files.push({ path: `.claude/commands/${name}.md`, content: claudeCommand(name) });
  }

  files.push({ path: '.claude/skills/ai-development-governance/SKILL.md', content: claudeSkill() });
  addReferences(files, '.claude/skills/ai-development-governance/references', scan, config, { includeConstitution: false });
  addDrafts(files, '.claude/_drafts', scan);
}

function addCodex(files, scan, config, { shared }) {
  files.push({ path: 'AGENTS.md', content: agentsMd({ shared }) });
  files.push({ path: '.codex/config.toml', content: codexConfigDraft() });
  files.push({ path: '.codex/rules/governance.rules', content: governanceRules(scan) });
  files.push({ path: '.codex/rules/safety.rules', content: safetyRules() });
  files.push({ path: '.agents/skills/ai-development-governance/SKILL.md', content: codexSkill() });
  addReferences(files, '.agents/skills/ai-development-governance/references', scan, config, { includeConstitution: true });
  addDrafts(files, shared ? '_drafts' : '.agents/_drafts', scan);
}

function addSpecKit(files, scan, config) {
  files.push({ path: '.specify/governance/guardrails.md', content: speckitGovernanceAddendum() });
  files.push({ path: '.specify/commands/governance-check.md', content: speckitCommand() });
  files.push({ path: '.specify/governance/project-context.md', content: projectContext(scan, config) });
  files.push({ path: '.specify/governance/risk-levels.md', content: riskLevels() });
  files.push({ path: '.specify/governance/file-change-policy.md', content: fileChangePolicy() });
  addDrafts(files, '_drafts', scan);
}

function addReferences(files, base, scan, config, { includeConstitution }) {
  const common = [
    ['project-context.md', projectContext(scan, config)],
    ['workflow-overview.md', workflowOverview()],
    ['requirement-gate.md', requirementGate()],
    ['design-gate.md', designGate()],
    ['implementation-gate.md', implementationGate()],
    ['code-review-gate.md', codeReviewGate()],
    ['testing-gate.md', testingGate(scan)],
    ['security-gate.md', securityGate()],
    ['release-gate.md', releaseGate()],
    ['architecture-checklist.md', architectureChecklist()],
    ['code-review-checklist.md', codeReviewChecklist()],
    ['testing-checklist.md', testingChecklist(scan)],
    ['security-checklist.md', securityChecklist()],
    ['release-checklist.md', releaseChecklist()],
    ['dependency-checklist.md', dependencyChecklist()],
    ['observability-checklist.md', observabilityChecklist()],
    ['feature-spec-template.md', featureSpecTemplate()],
    ['design-proposal-template.md', designProposalTemplate()],
    ['adr-template.md', adrTemplate()],
    ['implementation-plan-template.md', implementationPlanTemplate()],
    ['test-plan-template.md', testPlanTemplate()],
    ['pr-review-template.md', prReviewTemplate()],
    ['release-plan-template.md', releasePlanTemplate()]
  ];

  if (includeConstitution) {
    common.unshift(['engineering-constitution.md', engineeringConstitution()]);
    common.unshift(['risk-levels.md', riskLevels()]);
    common.unshift(['file-change-policy.md', fileChangePolicy()]);
  }

  for (const [name, content] of common) files.push({ path: path.posix.join(base, name), content });

  if (scan.tags.includes('frontend')) {
    files.push({ path: path.posix.join(base, 'frontend-checklist.md'), content: frontendChecklist() });
    files.push({ path: path.posix.join(base, 'accessibility-checklist.md'), content: frontendChecklist() });
    files.push({ path: path.posix.join(base, 'ui-state-checklist.md'), content: frontendChecklist() });
  }
  if (scan.tags.includes('backend')) {
    files.push({ path: path.posix.join(base, 'backend-checklist.md'), content: backendChecklist() });
    files.push({ path: path.posix.join(base, 'api-checklist.md'), content: backendChecklist() });
  }
  if (scan.tags.includes('database')) {
    files.push({ path: path.posix.join(base, 'database-checklist.md'), content: databaseChecklist() });
  }
  if (scan.tags.includes('rust')) {
    files.push({ path: path.posix.join(base, 'rust-checklist.md'), content: rustChecklist() });
    files.push({ path: path.posix.join(base, 'rust-safety-checklist.md'), content: rustChecklist() });
  }
  if (scan.tags.includes('ai-agent')) {
    files.push({ path: path.posix.join(base, 'ai-agent-checklist.md'), content: aiAgentChecklist() });
    files.push({ path: path.posix.join(base, 'prompt-injection-checklist.md'), content: aiAgentChecklist() });
    files.push({ path: path.posix.join(base, 'eval-checklist.md'), content: aiAgentChecklist() });
  }
}

function addDrafts(files, base, scan) {
  files.push({ path: `${base}/CONTRIBUTING.draft.md`, content: contributingDraft(scan) });
  files.push({ path: `${base}/PULL_REQUEST_TEMPLATE.draft.md`, content: pullRequestTemplateDraft() });
  files.push({ path: `${base}/CI-GATES.draft.md`, content: ciGatesDraft(scan) });
}
