import path from 'node:path';
import { exists, readJson } from './utils.mjs';
import { getAllTrackedFiles } from './git.mjs';

export function scanProject(projectDir = process.cwd()) {
  const files = getAllTrackedFiles(projectDir);
  const has = (p) => files.includes(p) || exists(path.join(projectDir, p));
  const packageJson = has('package.json') ? readJson(path.join(projectDir, 'package.json'), {}) : null;
  const cargo = has('Cargo.toml');
  const pyproject = has('pyproject.toml');
  const go = has('go.mod');
  const workflows = files.filter((f) => f.startsWith('.github/workflows/'));
  const tests = files.filter((f) => /(^|\/)(test|tests|spec|e2e)(\/|$)|\.(test|spec)\.[cm]?[jt]sx?$/.test(f));
  const aiWorkflow = {
    claude: has('CLAUDE.md') || files.some((f) => f.startsWith('.claude/')),
    codex: has('AGENTS.md') || files.some((f) => f.startsWith('.codex/')) || files.some((f) => f.startsWith('.agents/skills/')),
    speckit: has('.specify/memory/constitution.md') || files.some((f) => f.startsWith('.specify/')) || files.some((f) => f.startsWith('specs/'))
  };
  return {
    projectDir,
    name: packageJson?.name || path.basename(projectDir),
    languages: {
      javascript: !!packageJson,
      rust: cargo,
      python: pyproject || has('requirements.txt'),
      go
    },
    packageManager: detectPackageManager(files),
    scripts: packageJson?.scripts || {},
    aiWorkflow,
    hasCi: workflows.length > 0,
    workflows,
    testsCount: tests.length,
    riskSignals: detectRiskSignals(files),
    filesScanned: files.length
  };
}

function detectPackageManager(files) {
  if (files.includes('pnpm-lock.yaml')) return 'pnpm';
  if (files.includes('yarn.lock')) return 'yarn';
  if (files.includes('bun.lockb')) return 'bun';
  if (files.includes('package-lock.json')) return 'npm';
  if (files.includes('Cargo.toml')) return 'cargo';
  if (files.includes('go.mod')) return 'go';
  if (files.includes('pyproject.toml')) return 'python';
  return 'Unknown';
}

function detectRiskSignals(files) {
  const signals = [];
  if (files.some((f) => /auth|session|oauth|jwt/i.test(f))) signals.push('auth');
  if (files.some((f) => /payment|stripe|billing/i.test(f))) signals.push('payment');
  if (files.some((f) => /migration|schema\.prisma|supabase/i.test(f))) signals.push('database-migration');
  if (files.some((f) => /upload|storage|s3/i.test(f))) signals.push('file-upload');
  if (files.some((f) => /openai|anthropic|llm|agent|prompt/i.test(f))) signals.push('ai-agent');
  return signals;
}
