export function parseCommitMessage(message) {
  const first = message.split(/\r?\n/)[0] || '';
  const risk = first.match(/\[risk:(L[0-3])\]/i)?.[1]?.toUpperCase() || null;
  const trailers = {};
  for (const line of message.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z-]+):\s*(.+)$/);
    if (m) trailers[m[1].toLowerCase()] = m[2].trim();
  }
  const conventional = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]+\))?!?:\s+.+/.test(first);
  return { first, risk, trailers, conventional };
}

export function validateCommitMessage(message, config) {
  const parsed = parseCommitMessage(message);
  const errors = [];
  const warnings = [];
  if (!parsed.conventional) warnings.push('Commit message is not Conventional Commits style.');
  if (config.riskTagRequired && !parsed.risk) errors.push('Missing risk tag, e.g. [risk:L1].');
  if (parsed.risk && ['L2', 'L3'].includes(parsed.risk)) {
    if (!parsed.trailers['gate-review']) errors.push(`${parsed.risk} commit requires Gate-Review trailer.`);
    if (!parsed.trailers['human-approval']) errors.push(`${parsed.risk} commit requires Human-Approval trailer.`);
    if (!parsed.trailers['tests']) errors.push(`${parsed.risk} commit requires Tests trailer.`);
    if (!parsed.trailers['rollback']) errors.push(`${parsed.risk} commit requires Rollback trailer.`);
  }
  return { ok: errors.length === 0, errors, warnings, parsed };
}
