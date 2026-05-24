// Stack auto-detection.
// Inspects project files to identify the tech stack and whether a
// deterministic extractor exists. Used by extract-architecture.mjs --stack auto.
//
// Returns:
//   { stack, supported, language, framework, confidence, evidence }
//
// `stack` is the extractor ID if supported, or a descriptive label if not.
// `supported` = true means a deterministic extractor exists.
// `confidence` = 'high' | 'medium' | 'low'
import fs from 'node:fs';
import path from 'node:path';

const SUPPORTED = new Set(['java-spring', 'rust-tauri', 'csharp-avalonia', 'cpp-sdk']);

function fileExists(rootDir, rel) {
  try { fs.accessSync(path.join(rootDir, rel)); return true; } catch { return false; }
}

function findByExt(rootDir, exts, maxDepth = 4) {
  const results = [];
  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'target' || e.name === 'build') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else if (exts.some(x => e.name.endsWith(x))) results.push(full);
    }
  }
  walk(rootDir, 0);
  return results;
}

function readFileSafe(p, maxBytes = 8192) {
  try { return fs.readFileSync(p, 'utf8').slice(0, maxBytes); } catch { return ''; }
}

export function detectStack(rootDir) {
  const evidence = [];

  // ── Path C: user-defined stack-config.json takes highest priority ─────────
  const userConfig = path.join(rootDir, '.anyharness', 'stack-config.json');
  if (fileExists(rootDir, '.anyharness/stack-config.json')) {
    try {
      const cfg = JSON.parse(fs.readFileSync(userConfig, 'utf8'));
      return {
        stack: cfg.stack || 'custom',
        supported: true,
        language: cfg.language || null,
        framework: cfg.framework || null,
        confidence: 'high',
        evidence: ['.anyharness/stack-config.json (user-defined)'],
        configPath: userConfig,
        isUserConfig: true,
      };
    } catch { /* fall through */ }
  }

  // ── Rust + Tauri ───────────────────────────────────────────────────────────
  const cargoToml = path.join(rootDir, 'Cargo.toml');
  const srcTauriCargo = path.join(rootDir, 'src-tauri', 'Cargo.toml');
  const cargoContent = readFileSafe(cargoToml) || readFileSafe(srcTauriCargo);
  if (cargoContent) {
    evidence.push('Cargo.toml');
    if (/tauri/.test(cargoContent)) {
      return { stack: 'rust-tauri', supported: true, language: 'rust', framework: 'tauri', confidence: 'high', evidence: ['Cargo.toml contains tauri dependency'] };
    }
    // Plain Rust without Tauri — not a supported extractor, but we know the language
    return { stack: 'rust', supported: false, language: 'rust', framework: null, confidence: 'high', evidence: ['Cargo.toml found'] };
  }

  // ── C# + Avalonia ──────────────────────────────────────────────────────────
  const csprojFiles = findByExt(rootDir, ['.csproj'], 2);
  if (csprojFiles.length > 0) {
    const csprojContent = csprojFiles.map(f => readFileSafe(f)).join('\n');
    evidence.push(csprojFiles.map(f => path.relative(rootDir, f)).join(', '));
    if (/Avalonia/i.test(csprojContent)) {
      return { stack: 'csharp-avalonia', supported: true, language: 'csharp', framework: 'avalonia', confidence: 'high', evidence: ['.csproj with Avalonia package reference'] };
    }
    if (/MAUI|WPF|WinForms|Blazor/i.test(csprojContent)) {
      const fw = csprojContent.match(/MAUI|WPF|WinForms|Blazor/i)?.[0] || 'dotnet';
      return { stack: `csharp-${fw.toLowerCase()}`, supported: false, language: 'csharp', framework: fw, confidence: 'high', evidence: [`.csproj with ${fw} reference`] };
    }
    return { stack: 'csharp', supported: false, language: 'csharp', framework: null, confidence: 'high', evidence: ['.csproj found'] };
  }

  // ── Java + Spring ──────────────────────────────────────────────────────────
  const pomXml = path.join(rootDir, 'pom.xml');
  const buildGradle = path.join(rootDir, 'build.gradle');
  const buildGradleKts = path.join(rootDir, 'build.gradle.kts');
  if (fileExists(rootDir, 'pom.xml') || fileExists(rootDir, 'build.gradle') || fileExists(rootDir, 'build.gradle.kts')) {
    const buildContent = readFileSafe(pomXml) + readFileSafe(buildGradle) + readFileSafe(buildGradleKts);
    evidence.push('pom.xml / build.gradle');
    if (/springframework|spring-boot/i.test(buildContent)) {
      return { stack: 'java-spring', supported: true, language: 'java', framework: 'spring', confidence: 'high', evidence: ['pom.xml/build.gradle with Spring dependency'] };
    }
    if (/quarkus|micronaut/i.test(buildContent)) {
      const fw = buildContent.match(/quarkus|micronaut/i)?.[0] || 'java';
      return { stack: `java-${fw.toLowerCase()}`, supported: false, language: 'java', framework: fw, confidence: 'high', evidence: [`build file with ${fw}`] };
    }
    return { stack: 'java', supported: false, language: 'java', framework: null, confidence: 'high', evidence: ['pom.xml/build.gradle found'] };
  }

  // ── C++ SDK ────────────────────────────────────────────────────────────────
  const cmakeLists = path.join(rootDir, 'CMakeLists.txt');
  const makeFile = path.join(rootDir, 'Makefile');
  const headers = findByExt(rootDir, ['.h', '.hpp'], 3);
  const hasCppSources = findByExt(rootDir, ['.cpp', '.cc', '.cxx'], 3).length > 0;
  if ((fileExists(rootDir, 'CMakeLists.txt') || fileExists(rootDir, 'Makefile')) && (headers.length > 0 || hasCppSources)) {
    evidence.push('CMakeLists.txt / Makefile with C++ sources');
    // SDK heuristic: public include/ directory with headers
    const hasIncludeDir = fileExists(rootDir, 'include') || findByExt(rootDir, ['.h', '.hpp'], 1).length > 0;
    if (hasIncludeDir) {
      return { stack: 'cpp-sdk', supported: true, language: 'cpp', framework: 'sdk', confidence: 'medium', evidence: ['CMakeLists.txt + include/ headers'] };
    }
    return { stack: 'cpp', supported: false, language: 'cpp', framework: null, confidence: 'medium', evidence: ['CMakeLists.txt/Makefile + C++ sources'] };
  }
  if (headers.length > 0 || hasCppSources) {
    return { stack: 'cpp', supported: false, language: 'cpp', framework: null, confidence: 'low', evidence: ['C++ source files found'] };
  }

  // ── Node.js / TypeScript ───────────────────────────────────────────────────
  const pkgJson = path.join(rootDir, 'package.json');
  if (fileExists(rootDir, 'package.json')) {
    const pkg = readFileSafe(pkgJson);
    evidence.push('package.json');
    const deps = pkg;
    if (/\"express\"/.test(deps)) return { stack: 'node-express', supported: false, language: 'javascript', framework: 'express', confidence: 'high', evidence: ['package.json with express'] };
    if (/\"fastify\"/.test(deps)) return { stack: 'node-fastify', supported: false, language: 'javascript', framework: 'fastify', confidence: 'high', evidence: ['package.json with fastify'] };
    if (/\"@nestjs\/core\"/.test(deps)) return { stack: 'node-nestjs', supported: false, language: 'typescript', framework: 'nestjs', confidence: 'high', evidence: ['package.json with @nestjs/core'] };
    if (/\"next\"/.test(deps)) return { stack: 'node-nextjs', supported: false, language: 'typescript', framework: 'nextjs', confidence: 'high', evidence: ['package.json with next'] };
    if (/\"electron\"/.test(deps)) return { stack: 'node-electron', supported: false, language: 'javascript', framework: 'electron', confidence: 'high', evidence: ['package.json with electron'] };
    return { stack: 'node', supported: false, language: 'javascript', framework: null, confidence: 'medium', evidence: ['package.json found'] };
  }

  // ── Go ─────────────────────────────────────────────────────────────────────
  if (fileExists(rootDir, 'go.mod')) {
    const goMod = readFileSafe(path.join(rootDir, 'go.mod'));
    if (/gin-gonic\/gin/.test(goMod)) return { stack: 'go-gin', supported: false, language: 'go', framework: 'gin', confidence: 'high', evidence: ['go.mod with gin'] };
    if (/labstack\/echo/.test(goMod)) return { stack: 'go-echo', supported: false, language: 'go', framework: 'echo', confidence: 'high', evidence: ['go.mod with echo'] };
    return { stack: 'go', supported: false, language: 'go', framework: null, confidence: 'high', evidence: ['go.mod found'] };
  }

  // ── Python ─────────────────────────────────────────────────────────────────
  const pyFiles = ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'];
  for (const f of pyFiles) {
    if (fileExists(rootDir, f)) {
      const content = readFileSafe(path.join(rootDir, f));
      if (/fastapi/i.test(content)) return { stack: 'python-fastapi', supported: false, language: 'python', framework: 'fastapi', confidence: 'high', evidence: [`${f} with fastapi`] };
      if (/django/i.test(content)) return { stack: 'python-django', supported: false, language: 'python', framework: 'django', confidence: 'high', evidence: [`${f} with django`] };
      if (/flask/i.test(content)) return { stack: 'python-flask', supported: false, language: 'python', framework: 'flask', confidence: 'high', evidence: [`${f} with flask`] };
      return { stack: 'python', supported: false, language: 'python', framework: null, confidence: 'medium', evidence: [`${f} found`] };
    }
  }

  // ── Unknown ────────────────────────────────────────────────────────────────
  return { stack: 'unknown', supported: false, language: null, framework: null, confidence: 'low', evidence: [] };
}
