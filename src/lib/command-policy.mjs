import { loadConfig } from './config.mjs';
import { pathMatches } from './utils.mjs';

export function evaluateToolUse(input, projectDir = process.cwd()) {
  const config = loadConfig(projectDir);
  const tool = input.tool_name || input.toolName || input.name || '';
  const ti = input.tool_input || input.toolInput || {};
  const findings = [];
  if (tool === 'Bash' && ti.command) {
    for (const pattern of config.dangerousCommands || []) {
      const re = new RegExp(pattern, 'i');
      if (re.test(ti.command)) findings.push(`Dangerous command requires explicit approval: ${ti.command}`);
    }
  }
  const filePath = ti.file_path || ti.path || ti.filePath;
  if (filePath) {
    const rel = relativeToProject(filePath, projectDir);
    if (/^\.env(\.|$)/.test(rel)) findings.push(`Reading or modifying real env files is blocked: ${rel}`);
    if ((tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit') && pathMatches(rel, config.redZone)) {
      findings.push(`Red Zone file change requires gate approval: ${rel}`);
    }
  }
  return { ok: findings.length === 0, findings };
}

export function evaluateStop(input) {
  const text = input.last_assistant_message || input.message || '';
  const missing = [];
  const required = ['Risk Level', 'Unknowns', 'Tests'];
  for (const r of required) if (!new RegExp(r.replace(' ', '\\s*'), 'i').test(text)) missing.push(r);
  if (/risk\s*level\s*:\s*L[23]/i.test(text)) {
    for (const r of ['Rollback', 'Human Approval']) {
      if (!new RegExp(r.replace(' ', '\\s*'), 'i').test(text)) missing.push(r);
    }
  }
  return { ok: missing.length === 0, missing };
}

function relativeToProject(filePath, projectDir) {
  const normalized = String(filePath).replace(/\\/g, '/');
  const project = String(projectDir).replace(/\\/g, '/');
  if (normalized.startsWith(project + '/')) return normalized.slice(project.length + 1);
  return normalized.replace(/^\.\//, '');
}
