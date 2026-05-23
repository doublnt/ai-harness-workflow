import { matchesAny } from './matcher.mjs';

export function docsDriftIssues(files, config, artifacts = []) {
  const issues = [];
  const docsChanged = files.some((file) => matchesAny(file, config.docsPatterns || []));
  const gateJustifiesDocs = artifacts.some((artifact) => artifact.docsImpact?.status === 'none' && artifact.docsImpact?.justification);
  for (const rule of config.docsMap || []) {
    const impacted = files.some((file) => matchesAny(file, rule.changed || []));
    if (!impacted) continue;
    const relevantDocsChanged = files.some((file) => matchesAny(file, rule.docs || []));
    if (!relevantDocsChanged && !docsChanged && !gateJustifiesDocs) {
      issues.push({
        code: 'DOCS_DRIFT',
        severity: 'error',
        message: `Potential ${rule.name} docs drift: code/config changed but no related docs or gate justification found.`,
        rule: rule.name,
        fix: `Update one of: ${(rule.docs || []).join(', ')} or add a gate artifact with docsImpact.status = "none" and justification.`
      });
    }
  }
  return issues;
}
