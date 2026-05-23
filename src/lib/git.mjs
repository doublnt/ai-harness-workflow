import { runGit, isGitRepo, uniq } from './utils.mjs';

export function getChangedFiles({ staged = false, since = null, projectDir = process.cwd() } = {}) {
  if (!isGitRepo(projectDir)) return [];
  let args;
  if (staged) args = ['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB'];
  else if (since) args = ['diff', '--name-only', '--diff-filter=ACMRTUXB', since + '...HEAD'];
  else args = ['diff', '--name-only', '--diff-filter=ACMRTUXB'];
  const output = runGit(args, { cwd: projectDir });
  return uniq(output.split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
}

export function getAllTrackedFiles(projectDir = process.cwd()) {
  if (!isGitRepo(projectDir)) return [];
  return runGit(['ls-files'], { cwd: projectDir }).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

export function getRoot(projectDir = process.cwd()) {
  const root = runGit(['rev-parse', '--show-toplevel'], { cwd: projectDir });
  return root || projectDir;
}
