import fs from 'node:fs';
import path from 'node:path';
import { exists } from './utils.mjs';

export function scanFilesForSecrets(files, config, projectDir = process.cwd()) {
  const findings = [];
  const regexes = (config.secretPatterns || []).map((p) => new RegExp(p));
  for (const file of files) {
    if (/^\.env(\.|$)/.test(file)) {
      findings.push({ file, reason: 'Real .env file must not be committed or read.' });
      continue;
    }
    const full = path.join(projectDir, file);
    if (!exists(full)) continue;
    const stat = fs.statSync(full);
    if (!stat.isFile() || stat.size > 1024 * 1024) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const re of regexes) {
      if (re.test(text)) findings.push({ file, reason: `Potential secret matched ${re}` });
    }
  }
  return findings;
}
