import fs from 'node:fs';
import path from 'node:path';
import { readJson } from './utils.mjs';

export function loadGateArtifacts(repo, config) {
  const dir = path.join(repo, config.gateDir || '.guardrails/gates');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJson(path.join(dir, name), null))
    .filter(Boolean);
}

export function loadApprovals(repo, config) {
  const dir = path.join(repo, config.approvalDir || '.guardrails/approvals');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJson(path.join(dir, name), null))
    .filter(Boolean);
}

export function relevantGateArtifacts(artifacts, files) {
  return artifacts.filter((artifact) => {
    const changed = artifact.changedFiles || artifact.files || [];
    if (changed.length === 0) return true;
    return changed.some((candidate) => files.includes(candidate));
  });
}

export function hasCompletedGate(artifacts, gate) {
  return artifacts.some((artifact) => (artifact.completedGates || []).includes(gate) || artifact.gates?.[gate] === 'pass');
}

export function hasHumanApproval(artifacts, approvals) {
  if (artifacts.some((artifact) => artifact.humanApprovalStatus === 'approved')) return true;
  const artifactIds = new Set(artifacts.map((a) => a.id).filter(Boolean));
  return approvals.some((approval) => approval.status === 'approved' && (!approval.gateId || artifactIds.has(approval.gateId)));
}

export function createGateArtifactTemplate({ id = 'change-id', task = 'Describe task', riskLevel = 'L1', files = [] } = {}) {
  return {
    id,
    task,
    riskLevel,
    changedFiles: files,
    changedAreas: [],
    requiredGates: [],
    completedGates: [],
    humanApprovalRequired: ['L2', 'L3'].includes(riskLevel),
    humanApprovalStatus: 'pending',
    tests: { planned: [], commands: [], status: 'not-run' },
    securityReview: { status: 'not-required', notes: '' },
    docsImpact: { status: 'unknown', justification: '' },
    rollbackPlan: '',
    unknowns: []
  };
}
