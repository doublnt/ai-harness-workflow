import { git, isGitRepo, unique } from './utils.mjs';

function lines(text) {
  return text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

export function changedFiles({ mode = 'working', repo = process.cwd(), base = null } = {}) {
  if (!isGitRepo(repo)) return [];
  if (mode === 'staged') {
    return unique(lines(git(['diff', '--cached', '--name-only', '--diff-filter=ACMRT'], { cwd: repo }).stdout));
  }
  if (mode === 'push') {
    const staged = lines(git(['diff', '--cached', '--name-only', '--diff-filter=ACMRT'], { cwd: repo }).stdout);
    const working = lines(git(['diff', '--name-only', '--diff-filter=ACMRT'], { cwd: repo }).stdout);
    return unique([...staged, ...working]);
  }
  if (mode === 'ci') {
    if (base) return unique(lines(git(['diff', '--name-only', '--diff-filter=ACMRT', `${base}...HEAD`], { cwd: repo }).stdout));
    const mergeBase = git(['merge-base', 'HEAD', 'origin/main'], { cwd: repo });
    if (mergeBase.ok && mergeBase.stdout.trim()) return unique(lines(git(['diff', '--name-only', '--diff-filter=ACMRT', `${mergeBase.stdout.trim()}...HEAD`], { cwd: repo }).stdout));
    return unique(lines(git(['diff', '--name-only', '--diff-filter=ACMRT', 'HEAD~1..HEAD'], { cwd: repo }).stdout));
  }
  return unique([
    ...lines(git(['diff', '--name-only', '--diff-filter=ACMRT'], { cwd: repo }).stdout),
    ...lines(git(['ls-files', '--others', '--exclude-standard'], { cwd: repo }).stdout)
  ]);
}

export function stagedContent(file, repo = process.cwd()) {
  if (!isGitRepo(repo)) return '';
  const result = git(['show', `:${file}`], { cwd: repo });
  return result.ok ? result.stdout : '';
}

export function allTrackedFiles(repo = process.cwd()) {
  if (!isGitRepo(repo)) return [];
  return lines(git(['ls-files'], { cwd: repo }).stdout);
}
