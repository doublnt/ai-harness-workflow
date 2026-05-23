import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson, writeJson, nowIso, slugify } from './utils.mjs';

export function gateDir(projectDir = process.cwd()) {
  return path.join(projectDir, '.guardrails', 'gates');
}

export function approvalDir(projectDir = process.cwd()) {
  return path.join(projectDir, '.guardrails', 'approvals');
}

export function listGateArtifacts(projectDir = process.cwd()) {
  const dir = gateDir(projectDir);
  if (!exists(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
    const full = path.join(dir, f);
    return { path: full, ...readJson(full, {}) };
  });
}

export function findSatisfyingGate({ risk, requiredGates, projectDir = process.cwd() }) {
  const gates = listGateArtifacts(projectDir);
  return gates.find((g) => {
    if (!g.riskLevel) return false;
    if (risk === 'L3' && g.riskLevel !== 'L3') return false;
    const completed = new Set(g.completedGates || []);
    return requiredGates.every((gate) => gate === 'approval' || completed.has(gate));
  }) || null;
}

export function createGate({ task, riskLevel = 'L1', requiredGates = [], changedAreas = [], projectDir = process.cwd() }) {
  const id = `${new Date().toISOString().slice(0, 10)}-${slugify(task)}`;
  const gate = {
    id,
    task,
    riskLevel,
    changedAreas,
    requiredGates,
    completedGates: [],
    humanApprovalRequired: ['L2', 'L3'].includes(riskLevel),
    humanApprovalStatus: ['L2', 'L3'].includes(riskLevel) ? 'pending' : 'not-required',
    tests: { planned: [], commands: [], status: 'not-run' },
    rollbackPlan: '',
    unknowns: [],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  writeJson(path.join(gateDir(projectDir), id + '.json'), gate);
  return gate;
}

export function approveGate(id, projectDir = process.cwd(), notes = '') {
  const approval = {
    gateId: id,
    approvedBy: 'human',
    approvedAt: nowIso(),
    scope: ['current change'],
    notes
  };
  writeJson(path.join(approvalDir(projectDir), id + '.approval.json'), approval);
  const gatePath = path.join(gateDir(projectDir), id + '.json');
  if (exists(gatePath)) {
    const gate = readJson(gatePath, {});
    gate.humanApprovalStatus = 'approved';
    gate.updatedAt = nowIso();
    writeJson(gatePath, gate);
  }
  return approval;
}

export function hasApprovalForGate(gate, projectDir = process.cwd()) {
  if (!gate || !gate.id) return false;
  return exists(path.join(approvalDir(projectDir), gate.id + '.approval.json')) || gate.humanApprovalStatus === 'approved';
}
