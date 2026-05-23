import { stagedContent } from './git.mjs';
import { matchesAny } from './matcher.mjs';

const SECRET_PATTERNS = [
  { name: 'OpenAI-like key', re: /\bsk-[A-Za-z0-9_\-]{20,}\b/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ }
];

export function secretScanIssues(files, repo, config) {
  const issues = [];
  for (const file of files) {
    if (matchesAny(file, ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp', '*.pdf', '*.zip'])) continue;
    const content = stagedContent(file, repo);
    if (!content) continue;
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.re.test(content)) {
        issues.push({ code: 'SECRET_SCAN', severity: 'error', message: `Possible secret detected in ${file}: ${pattern.name}.`, fix: 'Remove the secret, rotate it if real, and commit only a placeholder.' });
      }
    }
  }
  return issues;
}
