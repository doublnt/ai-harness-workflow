import fs from 'node:fs';
import path from 'node:path';
import { AI_WORKFLOW_MARKERS, DEFAULT_IGNORE_DIRS } from './constants.js';
import { exists, readJson, readText, rel, unique } from './utils.js';

export function scanProject(root) {
  const files = listProjectFiles(root);
  const fileSet = new Set(files);

  const workflows = detectWorkflows(root, fileSet);
  const packageJson = exists(root, 'package.json') ? readJson(root, 'package.json') : null;
  const cargo = exists(root, 'Cargo.toml') ? readText(root, 'Cargo.toml') : null;
  const pyproject = exists(root, 'pyproject.toml') ? readText(root, 'pyproject.toml') : null;
  const goMod = exists(root, 'go.mod') ? readText(root, 'go.mod') : null;

  const facts = detectFacts(root, fileSet, { packageJson, cargo, pyproject, goMod });
  const docs = detectDocs(fileSet);
  const gates = detectEngineeringGates(fileSet, packageJson);
  const risks = detectRisks(fileSet, packageJson, files);
  const riskProfile = inferRiskProfile(risks, gates);
  const recommendedTarget = recommendTarget(workflows);
  const unknowns = detectUnknowns(facts, gates, workflows);

  return {
    root,
    files,
    workflows,
    recommendedTarget,
    facts,
    docs,
    gates,
    risks,
    riskProfile,
    unknowns,
    tags: detectTags(fileSet, packageJson, cargo, pyproject, goMod)
  };
}

export function listProjectFiles(root, maxDepth = 5) {
  const output = [];
  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (DEFAULT_IGNORE_DIRS.has(entry.name)) continue;
      if (entry.name === '.env' || entry.name.startsWith('.env.')) continue;
      const full = path.join(dir, entry.name);
      const relative = rel(root, full);
      if (entry.isDirectory()) walk(full, depth + 1);
      else output.push(relative);
    }
  }
  walk(root, 0);
  return output.sort();
}

function detectWorkflows(root, fileSet) {
  const result = {};
  for (const [name, markers] of Object.entries(AI_WORKFLOW_MARKERS)) {
    const evidence = markers.filter((marker) => fileSet.has(marker) || fs.existsSync(path.join(root, marker)));
    result[name] = {
      status: evidence.length > 0 ? 'Detected' : 'Missing',
      evidence
    };
  }
  return result;
}

function detectFacts(root, fileSet, manifests) {
  const { packageJson, cargo, pyproject, goMod } = manifests;
  const scripts = packageJson?.scripts || {};
  const deps = { ...(packageJson?.dependencies || {}), ...(packageJson?.devDependencies || {}) };

  let language = 'Unknown';
  if (packageJson) language = hasAnyFile(fileSet, ['tsconfig.json']) ? 'TypeScript/JavaScript' : 'JavaScript';
  if (cargo) language = 'Rust';
  if (pyproject) language = 'Python';
  if (goMod) language = 'Go';

  return {
    projectName: packageJson?.name || parseCargoPackageName(cargo) || parseGoModule(goMod) || path.basename(root),
    projectType: detectProjectType(fileSet, deps),
    primaryLanguage: language,
    framework: detectFramework(deps, fileSet),
    packageManager: detectPackageManager(fileSet),
    testFramework: detectTestFramework(deps, fileSet, scripts),
    buildCommand: detectScript(scripts, ['build']) || detectNonNodeCommand(fileSet, 'build'),
    devCommand: detectScript(scripts, ['dev', 'start']) || 'Unknown',
    testCommand: detectScript(scripts, ['test', 'test:unit', 'vitest', 'jest']) || detectNonNodeCommand(fileSet, 'test'),
    lintCommand: detectScript(scripts, ['lint']) || 'Unknown',
    formatCommand: detectScript(scripts, ['format', 'fmt']) || 'Unknown',
    typecheckCommand: detectScript(scripts, ['typecheck', 'type-check', 'check']) || (fileSet.has('tsconfig.json') ? 'Unknown' : 'Unknown'),
    database: detectDatabase(fileSet, deps),
    auth: detectAuth(fileSet, deps),
    deployment: detectDeployment(fileSet),
    cicd: detectCi(fileSet),
    packageScripts: scripts
  };
}

function detectDocs(fileSet) {
  return {
    readme: status(fileSet.has('README.md') || [...fileSet].some((f) => /^README\./.test(f))),
    contributing: status(fileSet.has('CONTRIBUTING.md')),
    security: status(fileSet.has('SECURITY.md')),
    adr: status([...fileSet].some((f) => /(^|\/)adr(s)?\//i.test(f))),
    testingDocs: status([...fileSet].some((f) => /test|testing/i.test(f) && /docs|README|md$/.test(f))),
    releaseDocs: status([...fileSet].some((f) => /release|deploy/i.test(f) && /docs|README|md$/.test(f))),
    aiInstructions: status(fileSet.has('CLAUDE.md') || fileSet.has('AGENTS.md') || fileSet.has('.github/copilot-instructions.md'))
  };
}

function detectEngineeringGates(fileSet, packageJson) {
  const scripts = packageJson?.scripts || {};
  return {
    lint: gate(Boolean(scripts.lint || fileSet.has('eslint.config.js') || fileSet.has('eslint.config.mjs') || hasPrefix(fileSet, '.eslintrc'))),
    format: gate(Boolean(scripts.format || fileSet.has('prettier.config.js') || fileSet.has('prettier.config.mjs') || fileSet.has('biome.json'))),
    unitTests: gate(Boolean(scripts.test || hasAnyPrefix(fileSet, ['test/', 'tests/', 'src/__tests__/']))),
    integrationTests: gate(Boolean(hasAnyPrefix(fileSet, ['test/integration/', 'tests/integration/', 'integration/']))),
    e2eTests: gate(Boolean(hasAnyPrefix(fileSet, ['e2e/', 'tests/e2e/']) || fileSet.has('playwright.config.js') || fileSet.has('playwright.config.ts'))),
    typeCheck: gate(Boolean(scripts.typecheck || scripts['type-check'] || fileSet.has('tsconfig.json'))),
    securityScan: gate(Boolean(scripts.audit || scripts.security || fileSet.has('SECURITY.md'))),
    ci: gate(Boolean(detectCi(fileSet) !== 'Unknown'))
  };
}

function detectRisks(fileSet, packageJson, files) {
  const deps = { ...(packageJson?.dependencies || {}), ...(packageJson?.devDependencies || {}) };
  const lowerFiles = files.map((f) => f.toLowerCase());
  const risks = [];

  if (detectAuth(fileSet, deps) !== 'Unknown' || lowerFiles.some((f) => f.includes('auth'))) risks.push('Auth/authz related files or dependencies detected');
  if (detectDatabase(fileSet, deps) !== 'Unknown') risks.push('Database or ORM detected');
  if (lowerFiles.some((f) => f.includes('migration') || f.includes('prisma') || f.includes('schema'))) risks.push('Migration or schema files detected');
  if (lowerFiles.some((f) => f.includes('upload') || f.includes('storage'))) risks.push('File upload/storage related paths detected');
  if (lowerFiles.some((f) => f.includes('payment') || f.includes('stripe') || f.includes('billing'))) risks.push('Payment or billing related paths detected');
  if (Object.keys(deps).some((d) => /openai|anthropic|langchain|llama|ai$|vercel\/ai/i.test(d))) risks.push('AI/LLM dependency detected');
  if (!packageJson?.scripts?.test && !hasAnyPrefix(fileSet, ['test/', 'tests/'])) risks.push('No obvious test command or test directory detected');
  if (!packageJson?.scripts?.lint) risks.push('No obvious lint command detected');
  if (detectCi(fileSet) === 'Unknown') risks.push('No obvious CI configuration detected');

  return unique(risks);
}

function inferRiskProfile(risks, gates) {
  let score = 0;
  for (const risk of risks) {
    if (/payment|billing|auth|migration|database|AI\/LLM|upload/i.test(risk)) score += 2;
    else score += 1;
  }
  if (gates.unitTests.status !== 'Present') score += 1;
  if (gates.ci.status !== 'Present') score += 1;

  if (score >= 8) return { level: 'Critical', confidence: 'Medium', reason: risks };
  if (score >= 5) return { level: 'High', confidence: 'Medium', reason: risks };
  if (score >= 2) return { level: 'Medium', confidence: 'Medium', reason: risks };
  return { level: 'Low', confidence: 'Low', reason: risks.length ? risks : ['Few risk signals detected by shallow scan'] };
}

function recommendTarget(workflows) {
  const claude = workflows.claude.status === 'Detected';
  const codex = workflows.codex.status === 'Detected';
  const speckit = workflows.speckit.status === 'Detected';
  if (claude && codex) return { target: 'both', confidence: 'High', reason: ['Claude and Codex markers detected'] };
  if (claude) return { target: 'claude', confidence: 'High', reason: ['Claude markers detected'] };
  if (codex) return { target: 'codex', confidence: 'High', reason: ['Codex markers detected'] };
  if (speckit) return { target: 'speckit', confidence: 'Medium', reason: ['Spec Kit markers detected'] };
  return { target: 'both', confidence: 'Low', reason: ['No Claude/Codex markers detected; both gives portable defaults'] };
}

function detectUnknowns(facts, gates, workflows) {
  const unknowns = [];
  for (const [key, value] of Object.entries(facts)) {
    if (value === 'Unknown') unknowns.push(key);
  }
  for (const [key, value] of Object.entries(gates)) {
    if (value.status === 'Unknown' || value.status === 'Missing') unknowns.push(`gate:${key}`);
  }
  if (workflows.claude.status === 'Missing' && workflows.codex.status === 'Missing') unknowns.push('current AI workflow');
  return unique(unknowns);
}

function detectTags(fileSet, packageJson, cargo, pyproject, goMod) {
  const deps = { ...(packageJson?.dependencies || {}), ...(packageJson?.devDependencies || {}) };
  const tags = [];
  if (packageJson) tags.push('node');
  if (cargo) tags.push('rust');
  if (pyproject) tags.push('python');
  if (goMod) tags.push('go');
  if (detectFramework(deps, fileSet).match(/React|Vue|Svelte|Next|Nuxt|Astro|Vite/)) tags.push('frontend');
  if (hasAnyPrefix(fileSet, ['api/', 'server/', 'routes/', 'controllers/', 'app/api/'])) tags.push('backend');
  if (detectDatabase(fileSet, deps) !== 'Unknown') tags.push('database');
  if (Object.keys(deps).some((d) => /openai|anthropic|langchain|llama|ai$|vercel\/ai/i.test(d))) tags.push('ai-agent');
  return unique(tags);
}

function detectProjectType(fileSet, deps) {
  const framework = detectFramework(deps, fileSet);
  if (framework !== 'Unknown') return framework.includes('Next') || framework.includes('Nuxt') ? 'Full-stack web app' : 'Web app';
  if (hasAnyPrefix(fileSet, ['api/', 'server/', 'routes/', 'controllers/'])) return 'Backend service';
  if (fileSet.has('Cargo.toml')) return 'Rust project';
  if (fileSet.has('go.mod')) return 'Go project';
  if (fileSet.has('pyproject.toml')) return 'Python project';
  return 'Unknown';
}

function detectFramework(deps, fileSet) {
  if (deps.next || fileSet.has('next.config.js') || fileSet.has('next.config.mjs') || fileSet.has('next.config.ts')) return 'Next.js';
  if (deps.nuxt || fileSet.has('nuxt.config.ts') || fileSet.has('nuxt.config.js')) return 'Nuxt';
  if (deps.react) return 'React';
  if (deps.vue) return 'Vue';
  if (deps.svelte) return 'Svelte';
  if (deps.astro || fileSet.has('astro.config.mjs')) return 'Astro';
  if (deps.vite || fileSet.has('vite.config.ts') || fileSet.has('vite.config.js')) return 'Vite';
  if (deps.express) return 'Express';
  if (deps.fastify) return 'Fastify';
  if (deps.nestjs || deps['@nestjs/core']) return 'NestJS';
  return 'Unknown';
}

function detectPackageManager(fileSet) {
  if (fileSet.has('pnpm-lock.yaml')) return 'pnpm';
  if (fileSet.has('yarn.lock')) return 'yarn';
  if (fileSet.has('package-lock.json')) return 'npm';
  if (fileSet.has('bun.lockb') || fileSet.has('bun.lock')) return 'bun';
  if (fileSet.has('Cargo.lock')) return 'cargo';
  if (fileSet.has('uv.lock')) return 'uv';
  if (fileSet.has('poetry.lock')) return 'poetry';
  if (fileSet.has('go.sum')) return 'go';
  return 'Unknown';
}

function detectTestFramework(deps, fileSet, scripts) {
  if (deps.vitest || scripts.vitest || fileSet.has('vitest.config.ts') || fileSet.has('vitest.config.js')) return 'Vitest';
  if (deps.jest || scripts.jest || fileSet.has('jest.config.js') || fileSet.has('jest.config.ts')) return 'Jest';
  if (deps['@playwright/test'] || fileSet.has('playwright.config.ts') || fileSet.has('playwright.config.js')) return 'Playwright';
  if (fileSet.has('pytest.ini') || fileSet.has('pyproject.toml')) return 'pytest or Python test tooling: Unknown';
  if (fileSet.has('Cargo.toml')) return 'cargo test';
  if (fileSet.has('go.mod')) return 'go test';
  return scripts.test ? 'Unknown JS test runner' : 'Unknown';
}

function detectDatabase(fileSet, deps) {
  if (deps.prisma || fileSet.has('prisma/schema.prisma')) return 'Prisma';
  if (deps.drizzle || deps['drizzle-orm']) return 'Drizzle ORM';
  if (deps['@supabase/supabase-js'] || hasAnyPrefix(fileSet, ['supabase/'])) return 'Supabase';
  if (deps.pg || deps.postgres) return 'PostgreSQL';
  if (deps.mysql2 || deps.mysql) return 'MySQL';
  if (deps.sqlite3 || deps['better-sqlite3']) return 'SQLite';
  if (hasAnyPrefix(fileSet, ['migrations/', 'db/', 'database/'])) return 'Unknown database tooling';
  return 'Unknown';
}

function detectAuth(fileSet, deps) {
  if (deps['next-auth'] || deps['@auth/core']) return 'Auth.js/NextAuth';
  if (deps['@clerk/nextjs'] || deps['@clerk/clerk-js']) return 'Clerk';
  if (deps['@supabase/supabase-js']) return 'Supabase Auth possible';
  if (deps.passport) return 'Passport';
  if ([...fileSet].some((f) => /auth|session|jwt|oauth/i.test(f))) return 'Auth-related files detected';
  return 'Unknown';
}

function detectDeployment(fileSet) {
  if (fileSet.has('vercel.json')) return 'Vercel';
  if (fileSet.has('netlify.toml')) return 'Netlify';
  if (fileSet.has('Dockerfile') || fileSet.has('docker-compose.yml') || fileSet.has('compose.yml')) return 'Docker/container';
  if (hasAnyPrefix(fileSet, ['infra/', 'terraform/'])) return 'Infrastructure as code detected';
  return 'Unknown';
}

function detectCi(fileSet) {
  if (hasAnyPrefix(fileSet, ['.github/workflows/'])) return 'GitHub Actions';
  if (fileSet.has('.gitlab-ci.yml')) return 'GitLab CI';
  if (hasAnyPrefix(fileSet, ['.circleci/'])) return 'CircleCI';
  return 'Unknown';
}

function detectScript(scripts, names) {
  for (const name of names) {
    if (scripts?.[name]) return `npm run ${name}`;
  }
  return null;
}

function detectNonNodeCommand(fileSet, purpose) {
  if (purpose === 'test') {
    if (fileSet.has('Cargo.toml')) return 'cargo test';
    if (fileSet.has('go.mod')) return 'go test ./...';
    if (fileSet.has('pyproject.toml')) return 'pytest';
  }
  if (purpose === 'build') {
    if (fileSet.has('Cargo.toml')) return 'cargo build';
    if (fileSet.has('go.mod')) return 'go build ./...';
  }
  return 'Unknown';
}

function parseCargoPackageName(cargo) {
  if (!cargo) return null;
  const match = cargo.match(/^name\s*=\s*["']([^"']+)["']/m);
  return match?.[1] || null;
}

function parseGoModule(goMod) {
  if (!goMod) return null;
  const match = goMod.match(/^module\s+(.+)$/m);
  return match?.[1] || null;
}

function status(value) {
  return value ? 'Found' : 'Missing';
}

function gate(value) {
  return { status: value ? 'Present' : 'Missing' };
}

function hasPrefix(fileSet, prefix) {
  return [...fileSet].some((file) => file.startsWith(prefix));
}

function hasAnyPrefix(fileSet, prefixes) {
  return prefixes.some((prefix) => hasPrefix(fileSet, prefix));
}

function hasAnyFile(fileSet, names) {
  return names.some((name) => fileSet.has(name));
}
