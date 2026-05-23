import fs from 'node:fs';

export function validateCommitMessage(message) {
  const issues = [];
  const lines = message.trim().split(/\r?\n/);
  const subject = lines[0] || '';
  const riskMatch = subject.match(/\[risk:(L[0-3])\]/i) || message.match(/^Risk-Level:\s*(L[0-3])\s*$/im);
  if (!riskMatch) {
    issues.push({ code: 'COMMIT_RISK_TAG', severity: 'error', message: 'Commit message must include [risk:L0|L1|L2|L3] in the subject or a Risk-Level trailer.' });
    return issues;
  }
  const risk = riskMatch[1].toUpperCase();
  if (['L2', 'L3'].includes(risk)) {
    const required = ['Gate-Review', 'Tests'];
    if (risk === 'L3') required.push('Human-Approval', 'Rollback');
    for (const trailer of required) {
      const re = new RegExp(`^${trailer}:\\s*\\S+`, 'im');
      if (!re.test(message)) issues.push({ code: `COMMIT_${trailer.toUpperCase().replace(/-/g, '_')}`, severity: 'error', message: `Risk ${risk} commits must include a ${trailer}: trailer.` });
    }
  }
  return issues;
}

export function validateCommitMessageFile(filePath) {
  return validateCommitMessage(fs.readFileSync(filePath, 'utf8'));
}
