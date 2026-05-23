import { pathMatches } from './utils.mjs';

export function checkDocsDrift(files, config) {
  const findings = [];
  const changedDocs = files.filter((f) => /^(docs\/|README|CHANGELOG|SECURITY|CONTRIBUTING)/.test(f));
  for (const rule of config.docsDrift || []) {
    const hits = files.filter((f) => pathMatches(f, rule.changed || []));
    if (hits.length === 0) continue;
    const docsHit = changedDocs.some((f) => pathMatches(f, rule.docs || []));
    const gateHit = files.some((f) => /^\.anyharness\/gates\/.*\.(json|md)$/.test(f) || /^docs\/gates\//.test(f));
    if (!docsHit && !gateHit) {
      findings.push({ rule: rule.name, changed: hits, expectedDocs: rule.docs || [] });
    }
  }
  return findings;
}
