import path from 'node:path';
import { readJson, writeJson, exists } from './utils.mjs';

export const DEFAULT_CONFIG = {
  version: 1,
  mode: 'enforcing',
  riskTagRequired: true,
  requireGateArtifactsFor: ['L2', 'L3'],
  redZone: [
    '.env', '.env.*', 'secrets/**', '**/*secret*', '**/*credential*',
    'migrations/**', 'db/migrations/**', 'prisma/schema.prisma', 'supabase/migrations/**',
    'src/auth/**', 'src/security/**', 'src/payments/**', 'app/api/auth/**', 'server/auth/**',
    '.github/workflows/**', '.gitlab-ci.yml', 'Dockerfile', 'docker-compose.yml', 'compose.yml', 'deploy/**', 'infra/**',
    'CLAUDE.md', 'AGENTS.md', '.claude/settings.json', '.codex/config.toml', '.codex/hooks.json', '.claude/hooks/**'
  ],
  yellowZone: [
    'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb',
    'Cargo.toml', 'Cargo.lock', 'go.mod', 'go.sum', 'pyproject.toml', 'requirements.txt',
    'tsconfig.json', 'vite.config.*', 'next.config.*', 'eslint.config.*', 'biome.json'
  ],
  docsMap: [
    { name: 'api', changed: ['app/api/**', 'src/routes/**', 'server/routes/**', 'openapi.*', '**/*.graphql', '**/*.proto'], docs: ['docs/api/**', 'openapi.*', 'README.md'] },
    { name: 'database', changed: ['migrations/**', 'db/**', 'prisma/schema.prisma', 'supabase/**'], docs: ['docs/database/**', 'docs/data/**', 'docs/architecture.md'] },
    { name: 'security', changed: ['src/auth/**', 'src/security/**', 'server/auth/**', 'app/api/auth/**'], docs: ['SECURITY.md', 'docs/security/**', 'docs/architecture.md'] },
    { name: 'configuration', changed: ['.env.example', 'Dockerfile', 'docker-compose.yml', 'compose.yml', 'deploy/**', 'infra/**'], docs: ['README.md', 'docs/deployment/**', 'docs/operations/**'] },
    { name: 'ai-workflow', changed: ['CLAUDE.md', 'AGENTS.md', '.claude/**', '.codex/**', '.agents/**'], docs: ['docs/ai/**', 'docs/governance/**', 'README.md'] }
  ],
  testPatterns: ['test/**', 'tests/**', 'spec/**', '**/*.test.*', '**/*.spec.*', 'e2e/**'],
  docsPatterns: ['README.md', 'README.*.md', 'docs/**', 'CHANGELOG.md', 'SECURITY.md', 'CONTRIBUTING.md'],
  gateDir: '.guardrails/gates',
  approvalDir: '.guardrails/approvals'
};

export function configPath(repo = process.cwd()) {
  return path.join(repo, '.guardrails', 'config.json');
}

export function loadConfig(repo = process.cwd()) {
  const cfg = readJson(configPath(repo), null);
  if (!cfg) return DEFAULT_CONFIG;
  return { ...DEFAULT_CONFIG, ...cfg, docsMap: cfg.docsMap || DEFAULT_CONFIG.docsMap };
}

export function writeDefaultConfig(repo = process.cwd()) {
  const file = configPath(repo);
  if (!exists(file)) writeJson(file, DEFAULT_CONFIG);
  return file;
}
