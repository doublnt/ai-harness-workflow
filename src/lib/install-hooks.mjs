import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { writeText } from './utils.mjs';

export function installGitHooks(projectDir = process.cwd()) {
  const hooksDir = path.join(projectDir, '.githooks');
  writeText(path.join(hooksDir, 'pre-commit'), `#!/usr/bin/env sh\nset -eu\nnpx vibe-coding-guardrails check --staged\n`, 0o755);
  writeText(path.join(hooksDir, 'commit-msg'), `#!/usr/bin/env sh\nset -eu\nnpx vibe-coding-guardrails commit-msg "$1"\n`, 0o755);
  writeText(path.join(hooksDir, 'pre-push'), `#!/usr/bin/env sh\nset -eu\nnpx vibe-coding-guardrails check --push\n`, 0o755);
  try { execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: projectDir, stdio: 'ignore' }); } catch {}
  return hooksDir;
}

export function uninstallGitHooks(projectDir = process.cwd()) {
  try { execFileSync('git', ['config', '--unset', 'core.hooksPath'], { cwd: projectDir, stdio: 'ignore' }); } catch {}
}
