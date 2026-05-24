#!/usr/bin/env node
// Invoked by the AnyHarness skill via Bash tool. Not a direct user command.
/**
 * Extract architecture from a codebase. This PoC supports --stack java-spring.
 *
 * Output (JSON to stdout):
 *   { stack, root, componentCount, components: [ { class, kind, file, ... } ] }
 *
 * Each component carries kind-specific fields:
 *   controller  → basePath, endpoints[]
 *   service     → transactionalMethods[], kafkaSends[], externalCalls[],
 *                 selfInvocations[], kafkaListeners[]
 *   repository  → modifyingIssues[]  (e.g., @Query update without @Modifying)
 *   entity      → table name (if @Table specified)
 *   component   → externalCalls[]
 *
 * PoC NOTE: extraction uses regex, not a full AST parser. It is intentionally
 * conservative; each finding carries file+line and the LLM is expected to
 * verify by reading the source when needed. A future iteration can swap in
 * tree-sitter or javaparser without changing the output contract.
 */
import fs from 'node:fs';
import path from 'node:path';

const SUPPORTED_STACKS = ['java-spring'];

// ── arg parsing ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const stackIdx = args.indexOf('--stack');
const stack = stackIdx !== -1 ? args[stackIdx + 1] : 'java-spring';
const positional = args.filter((a, i) => i !== stackIdx && i !== stackIdx + 1 && !a.startsWith('--'));
const root = path.resolve(positional[0] || process.cwd());

if (!SUPPORTED_STACKS.includes(stack)) {
  process.stderr.write(JSON.stringify({
    error: `stack not supported yet: ${stack}`,
    code: 1,
    supported: SUPPORTED_STACKS,
    hint: 'PoC supports java-spring only.',
  }) + '\n');
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function findJavaFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const skip = new Set(['node_modules', 'target', 'build', '.git', '.idea', 'out', 'dist']);
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') && e.name !== '.') continue;
    if (skip.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) findJavaFiles(p, out);
    else if (e.isFile() && e.name.endsWith('.java')) out.push(p);
  }
  return out;
}

function findMatchingBrace(text, openIdx) {
  let depth = 0;
  let i = openIdx;
  let inString = false, inChar = false, inBlock = false, inLine = false;
  while (i < text.length) {
    const c = text[i], n = text[i + 1];
    if (inLine) { if (c === '\n') inLine = false; i++; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i += 2; continue; } i++; continue; }
    if (inString) { if (c === '\\') { i += 2; continue; } if (c === '"') inString = false; i++; continue; }
    if (inChar) { if (c === '\\') { i += 2; continue; } if (c === "'") inChar = false; i++; continue; }
    if (c === '/' && n === '/') { inLine = true; i += 2; continue; }
    if (c === '/' && n === '*') { inBlock = true; i += 2; continue; }
    if (c === '"') { inString = true; i++; continue; }
    if (c === "'") { inChar = true; i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
    i++;
  }
  return -1;
}

function lineOf(text, idx) {
  let line = 1;
  for (let i = 0; i < idx; i++) if (text[i] === '\n') line++;
  return line;
}

function parseAnnotations(block) {
  if (!block) return [];
  const out = [];
  // Args restricted to single line and no nested ')' to match the method regex.
  const re = /@(\w+)(?:\(([^)\n]*)\))?/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    out.push({ name: m[1], args: (m[2] || '').trim() });
  }
  return out;
}

// Depth-aware split that respects generic brackets and parens.
function splitParams(s) {
  const out = [];
  let buf = '';
  let depth = 0;
  for (const c of s) {
    if (c === '<' || c === '(' || c === '[') depth++;
    else if (c === '>' || c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
    } else {
      buf += c;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function annotArg(annot, key) {
  if (!annot) return null;
  // key = "value" or specific named arg
  if (!key) {
    const m = annot.args.match(/^"([^"]*)"/);
    if (m) return m[1];
    const v = annot.args.match(/value\s*=\s*"([^"]*)"/);
    if (v) return v[1];
    return null;
  }
  const re = new RegExp(`${key}\\s*=\\s*"([^"]*)"`);
  const m = annot.args.match(re);
  return m ? m[1] : null;
}

// ── per-file extraction ─────────────────────────────────────────────────────

function extractFile(file, rootDir) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(rootDir, file);

  // package
  const pkgMatch = content.match(/^\s*package\s+([\w.]+)\s*;/m);
  const pkg = pkgMatch ? pkgMatch[1] : '';

  // Class or interface declaration + class-level annotations
  // (Capture annotations on lines immediately preceding the declaration.)
  const typeRe = /(?:^|\n)((?:[ \t]*@\w+(?:\([^)]*\))?\s*\n)*)\s*(?:public\s+|abstract\s+|final\s+)*(class|interface)\s+(\w+)/;
  const typeMatch = content.match(typeRe);
  if (!typeMatch) return null;

  const classAnnotations = parseAnnotations(typeMatch[1]);
  const className = typeMatch[3];
  const declaredKind = typeMatch[2]; // 'class' | 'interface'
  const fqcn = pkg ? `${pkg}.${className}` : className;

  const hasAnn = (name) => classAnnotations.some(a => a.name === name);
  const getAnn = (name) => classAnnotations.find(a => a.name === name);

  let kind = 'unknown';
  if (hasAnn('RestController') || hasAnn('Controller')) kind = 'controller';
  else if (hasAnn('Service')) kind = 'service';
  else if (hasAnn('Repository')) kind = 'repository';
  else if (hasAnn('Component')) kind = 'component';
  else if (hasAnn('Entity')) kind = 'entity';
  else if (declaredKind === 'interface' && /\bJpaRepository\b|\bCrudRepository\b|\bPagingAndSortingRepository\b/.test(content)) kind = 'repository';

  // @RequestMapping path on class
  const reqMap = getAnn('RequestMapping');
  const basePath = reqMap ? (annotArg(reqMap) || '') : '';

  // @Table for entities
  const tableAnn = getAnn('Table');
  const tableName = tableAnn ? annotArg(tableAnn, 'name') : null;

  // ── method detection ─────────────────────────────────────────────────────
  // Match: optional annotation block (lines starting with @), optional modifiers,
  // optional generic-decl, optional return type, name, (params), {|;
  //
  // Leading whitespace after a newline is consumed explicitly so it works
  // when modifiers (optional, e.g. interface methods) are skipped.
  // Annotation args are restricted to single line (no nested ')' or newline)
  // so the regex engine cannot backtrack-extend args across the file.
  const methodRe = /(?:^|\n)[ \t]*((?:@\w+(?:\([^)\n]*\))?[ \t]*\n[ \t]*)*)((?:(?:public|private|protected|static|final|abstract|synchronized|default)\s+)+)?(?:<[^>]+>\s+)?(?:([\w<>\[\],\?]+)\s+)?(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[\w,\s.<>]+)?\s*[{;]/g;

  const methods = [];
  let m;
  while ((m = methodRe.exec(content)) !== null) {
    const annBlock = m[1] || '';
    const modifiers = m[2] || '';
    const returnType = (m[3] || '').trim();
    const name = m[4];
    const params = m[5] || '';

    // Filter false positives
    if (['if', 'while', 'for', 'switch', 'return', 'throw', 'new', 'else', 'catch', 'try', 'do', 'super', 'this'].includes(name)) continue;

    // Require at least one of: annotation block, modifier keyword, or a return
    // type that looks like a real Java type (not a variable name). This stops
    // the regex from matching ordinary method calls inside bodies.
    const hasAnnotations = annBlock.trim().length > 0;
    const hasModifiers = modifiers.trim().length > 0;
    const looksTyped = returnType && /^[A-Z]/.test(returnType.replace(/[\[\]<>,\s\?]+/g, '').slice(0, 1) || '') ||
      returnType && ['void', 'int', 'long', 'short', 'byte', 'float', 'double', 'boolean', 'char'].includes(returnType.split(/\s+/).pop());
    if (!hasAnnotations && !hasModifiers && !looksTyped) continue;

    const headerStartIdx = m.index + (m[0].startsWith('\n') ? 1 : 0);
    const declLineNum = lineOf(content, headerStartIdx);

    const matchedTail = m[0][m[0].length - 1];
    let bodyStart = -1, bodyEnd = -1;
    if (matchedTail === '{') {
      bodyStart = content.indexOf('{', m.index + m[0].length - 1);
      if (bodyStart !== -1) bodyEnd = findMatchingBrace(content, bodyStart);
    }

    methods.push({
      name,
      returnType,
      params,
      line: declLineNum,
      annotations: parseAnnotations(annBlock),
      bodyStart,
      bodyEnd,
    });
  }

  // ── constructor-injected deps ────────────────────────────────────────────
  const ctor = methods.find(me => me.name === className);
  const dependencies = [];
  if (ctor && ctor.params) {
    for (const param of splitParams(ctor.params)) {
      const cleaned = param.replace(/@\w+(\([^)]*\))?\s*/g, '').trim();
      if (!cleaned) continue;
      const tokens = cleaned.split(/\s+/);
      if (tokens.length >= 2) {
        // Type is everything except the last token (variable name); strip generics.
        const typeStr = tokens.slice(0, -1).join(' ').replace(/<[\s\S]*?>/g, '').trim();
        if (typeStr) dependencies.push(typeStr);
      }
    }
  }
  // Field-level @Autowired injection
  const autowiredRe = /@Autowired[\s\S]{0,80}?(?:private|protected|public)\s+(?:final\s+)?([\w<>\[\],\s\?]+?)\s+(\w+)\s*;/g;
  let am;
  while ((am = autowiredRe.exec(content)) !== null) {
    const t = am[1].replace(/<[^>]*>/g, '').trim();
    if (t && !dependencies.includes(t)) dependencies.push(t);
  }

  // ── HTTP endpoints (controllers) ─────────────────────────────────────────
  const endpoints = [];
  if (kind === 'controller') {
    const mappingHttp = {
      GetMapping: 'GET', PostMapping: 'POST', PutMapping: 'PUT',
      DeleteMapping: 'DELETE', PatchMapping: 'PATCH', RequestMapping: '*',
    };
    for (const me of methods) {
      for (const ann of me.annotations) {
        if (ann.name in mappingHttp) {
          const sub = annotArg(ann) || '';
          const fullPath = ((basePath || '') + sub).replace(/\/+/g, '/') || '/';
          endpoints.push({ method: mappingHttp[ann.name], path: fullPath, handler: me.name, line: me.line });
        }
      }
    }
  }

  // ── @Transactional methods ───────────────────────────────────────────────
  const transactionalMethods = [];
  for (const me of methods) {
    const tx = me.annotations.find(a => a.name === 'Transactional');
    if (!tx) continue;
    let propagation = 'default';
    const propM = tx.args.match(/propagation\s*=\s*(?:Propagation\.)?(\w+)/);
    if (propM) propagation = propM[1];
    let isolation = null;
    const isoM = tx.args.match(/isolation\s*=\s*(?:Isolation\.)?(\w+)/);
    if (isoM) isolation = isoM[1];
    const readOnly = /readOnly\s*=\s*true/.test(tx.args);
    transactionalMethods.push({ method: me.name, line: me.line, propagation, isolation, readOnly });
  }

  // ── Kafka send (inside method bodies) ────────────────────────────────────
  const kafkaSends = [];
  const sendRe = /\b(\w*kafkaTemplate\w*)\.send\s*\(\s*"([^"]+)"/gi;
  while ((m = sendRe.exec(content)) !== null) {
    const enclosing = methods.find(me => me.bodyStart >= 0 && m.index > me.bodyStart && m.index < me.bodyEnd);
    kafkaSends.push({ topic: m[2], line: lineOf(content, m.index), method: enclosing ? enclosing.name : null });
  }

  // ── @KafkaListener handlers ──────────────────────────────────────────────
  const kafkaListeners = [];
  for (const me of methods) {
    const kl = me.annotations.find(a => a.name === 'KafkaListener');
    if (!kl) continue;
    const topicM = kl.args.match(/topics\s*=\s*(?:\{)?\s*"([^"]+)"/);
    const groupM = kl.args.match(/groupId\s*=\s*"([^"]+)"/);
    kafkaListeners.push({
      topic: topicM ? topicM[1] : null,
      groupId: groupM ? groupM[1] : null,
      method: me.name,
      line: me.line,
    });
  }

  // ── External HTTP calls ──────────────────────────────────────────────────
  const externalCalls = [];
  const httpClients = [
    { client: 'RestTemplate', re: /\b(\w*[Rr]estTemplate\w*)\.(\w+)\s*\(/g },
    { client: 'WebClient', re: /\b(\w*[Ww]ebClient\w*)\.\s*(\w+)\s*\(/g },
    { client: 'FeignClient', re: /@FeignClient/g },
  ];
  for (const { client, re } of httpClients.slice(0, 2)) {
    while ((m = re.exec(content)) !== null) {
      const enclosing = methods.find(me => me.bodyStart >= 0 && m.index > me.bodyStart && m.index < me.bodyEnd);
      externalCalls.push({ client, op: m[2], line: lineOf(content, m.index), method: enclosing ? enclosing.name : null });
    }
  }

  // ── Self-invocations (this.x()) where target is @Transactional or @Async ─
  const selfInvocations = [];
  const selfRe = /\bthis\.(\w+)\s*\(/g;
  while ((m = selfRe.exec(content)) !== null) {
    const callee = methods.find(me => me.name === m[1]);
    if (!callee) continue;
    const caller = methods.find(me => me.bodyStart >= 0 && m.index > me.bodyStart && m.index < me.bodyEnd);
    if (!caller || caller.name === callee.name) continue;
    const proxiedAnn = callee.annotations.find(a => ['Transactional', 'Async', 'Cacheable', 'CacheEvict', 'PreAuthorize', 'PostAuthorize'].includes(a.name));
    if (!proxiedAnn) continue;
    selfInvocations.push({
      caller: caller.name,
      callerLine: lineOf(content, m.index),
      callee: callee.name,
      calleeAnnotation: proxiedAnn.name,
    });
  }

  // ── @Query update/delete without @Modifying ──────────────────────────────
  const modifyingIssues = [];
  if (kind === 'repository') {
    for (const me of methods) {
      const q = me.annotations.find(a => a.name === 'Query');
      if (!q) continue;
      const sqlM = q.args.match(/"([^"]+)"/);
      if (!sqlM) continue;
      const sql = sqlM[1].toUpperCase().trim();
      const mutates = sql.startsWith('UPDATE') || sql.startsWith('DELETE') || sql.startsWith('INSERT');
      if (mutates && !me.annotations.some(a => a.name === 'Modifying')) {
        modifyingIssues.push({ method: me.name, line: me.line, query: sqlM[1].slice(0, 80) });
      }
    }
  }

  const comp = {
    file: rel,
    package: pkg,
    class: fqcn,
    kind,
    annotations: classAnnotations.map(a => a.name),
    methods: methods.map(me => ({ name: me.name, line: me.line, annotations: me.annotations.map(a => a.name) })),
  };
  if (dependencies.length) comp.dependencies = dependencies;
  if (basePath) comp.basePath = basePath;
  if (tableName) comp.table = tableName;
  if (endpoints.length) comp.endpoints = endpoints;
  if (transactionalMethods.length) comp.transactionalMethods = transactionalMethods;
  if (kafkaSends.length) comp.kafkaSends = kafkaSends;
  if (kafkaListeners.length) comp.kafkaListeners = kafkaListeners;
  if (externalCalls.length) comp.externalCalls = externalCalls;
  if (selfInvocations.length) comp.selfInvocations = selfInvocations;
  if (modifyingIssues.length) comp.modifyingIssues = modifyingIssues;
  return comp;
}

// ── main ─────────────────────────────────────────────────────────────────────

const files = findJavaFiles(root);
if (files.length === 0) {
  process.stderr.write(JSON.stringify({ error: 'no .java files found', code: 1, hint: `searched: ${root}` }) + '\n');
  process.exit(1);
}

const components = files.map(f => extractFile(f, root)).filter(Boolean);

console.log(JSON.stringify({
  stack,
  root: path.relative(process.cwd(), root) || '.',
  fileCount: files.length,
  componentCount: components.length,
  components,
  poc: true,
  extractionMethod: 'regex (PoC)',
  nextAction: components.length === 0
    ? 'no_components: extractor found .java files but no annotated Spring components'
    : 'derive_risk_topology: pipe this output into derive-risk-topology.mjs',
}, null, 2));
