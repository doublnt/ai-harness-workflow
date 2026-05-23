import path from 'node:path';
import { DEFAULT_CONFIG } from './default-config.mjs';
import { exists, readJson, writeJson } from './utils.mjs';

export function configPath(projectDir = process.cwd()) {
  return path.join(projectDir, '.guardrails', 'config.json');
}

export function loadConfig(projectDir = process.cwd()) {
  const user = exists(configPath(projectDir)) ? readJson(configPath(projectDir), {}) : {};
  return mergeConfig(DEFAULT_CONFIG, user || {});
}

export function ensureConfig(projectDir = process.cwd(), options = {}) {
  const p = configPath(projectDir);
  if (!exists(p) || options.force) writeJson(p, mergeConfig(DEFAULT_CONFIG, options.config || {}));
  return p;
}

function mergeConfig(base, override) {
  const merged = { ...base, ...override };
  for (const key of ['redZone', 'yellowZone', 'dangerousCommands', 'secretPatterns', 'requireGateArtifactsFor', 'requireApprovalFor']) {
    merged[key] = override[key] || base[key];
  }
  merged.docsDrift = override.docsDrift || base.docsDrift;
  return merged;
}
