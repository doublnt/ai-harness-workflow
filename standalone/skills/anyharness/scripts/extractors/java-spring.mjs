// Java + Spring extractor. Walks .java files and emits structured Spring
// components: controllers (with endpoints), services (with @Transactional
// methods, Kafka send/listener, external HTTP calls, self-invocations),
// repositories (with @Query @Modifying issues), entities, components.
//
// PoC quality: regex-based. Replaceable with javaparser / tree-sitter.
import fs from 'node:fs';
import path from 'node:path';
import { findFilesByExt, findMatchingBrace, lineOf, splitParams, enclosingMethod } from './_shared.mjs';

function parseAnnotations(block) {
  if (!block) return [];
  const out = [];
  const re = /@(\w+)(?:\(([^)\n]*)\))?/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    out.push({ name: m[1], args: (m[2] || '').trim() });
  }
  return out;
}

function annotArg(annot, key) {
  if (!annot) return null;
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

function extractFile(file, rootDir) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(rootDir, file);

  const pkgMatch = content.match(/^\s*package\s+([\w.]+)\s*;/m);
  const pkg = pkgMatch ? pkgMatch[1] : '';

  const typeRe = /(?:^|\n)((?:[ \t]*@\w+(?:\([^)]*\))?\s*\n)*)\s*(?:public\s+|abstract\s+|final\s+)*(class|interface)\s+(\w+)/;
  const typeMatch = content.match(typeRe);
  if (!typeMatch) return null;

  const classAnnotations = parseAnnotations(typeMatch[1]);
  const className = typeMatch[3];
  const declaredKind = typeMatch[2];
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

  const reqMap = getAnn('RequestMapping');
  const basePath = reqMap ? (annotArg(reqMap) || '') : '';
  const tableAnn = getAnn('Table');
  const tableName = tableAnn ? annotArg(tableAnn, 'name') : null;

  // Method detection
  const methodRe = /(?:^|\n)[ \t]*((?:@\w+(?:\([^)\n]*\))?[ \t]*\n[ \t]*)*)((?:(?:public|private|protected|static|final|abstract|synchronized|default)\s+)+)?(?:<[^>]+>\s+)?(?:([\w<>\[\],\?]+)\s+)?(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[\w,\s.<>]+)?\s*[{;]/g;

  const methods = [];
  let m;
  while ((m = methodRe.exec(content)) !== null) {
    const annBlock = m[1] || '';
    const modifiers = m[2] || '';
    const returnType = (m[3] || '').trim();
    const name = m[4];
    const params = m[5] || '';

    if (['if', 'while', 'for', 'switch', 'return', 'throw', 'new', 'else', 'catch', 'try', 'do', 'super', 'this'].includes(name)) continue;

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
      name, returnType, params,
      line: declLineNum,
      annotations: parseAnnotations(annBlock),
      bodyStart, bodyEnd,
    });
  }

  // Constructor-injected deps
  const ctor = methods.find(me => me.name === className);
  const dependencies = [];
  if (ctor && ctor.params) {
    for (const param of splitParams(ctor.params)) {
      const cleaned = param.replace(/@\w+(\([^)]*\))?\s*/g, '').trim();
      if (!cleaned) continue;
      const tokens = cleaned.split(/\s+/);
      if (tokens.length >= 2) {
        const typeStr = tokens.slice(0, -1).join(' ').replace(/<[\s\S]*?>/g, '').trim();
        if (typeStr) dependencies.push(typeStr);
      }
    }
  }
  const autowiredRe = /@Autowired[\s\S]{0,80}?(?:private|protected|public)\s+(?:final\s+)?([\w<>\[\],\s\?]+?)\s+(\w+)\s*;/g;
  let am;
  while ((am = autowiredRe.exec(content)) !== null) {
    const t = am[1].replace(/<[^>]*>/g, '').trim();
    if (t && !dependencies.includes(t)) dependencies.push(t);
  }

  // Endpoints (controllers)
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

  // @Transactional
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

  // Kafka send
  const kafkaSends = [];
  const sendRe = /\b(\w*kafkaTemplate\w*)\.send\s*\(\s*"([^"]+)"/gi;
  while ((m = sendRe.exec(content)) !== null) {
    const enc = enclosingMethod(methods, m.index);
    kafkaSends.push({ topic: m[2], line: lineOf(content, m.index), method: enc ? enc.name : null });
  }

  // Kafka listeners
  const kafkaListeners = [];
  for (const me of methods) {
    const kl = me.annotations.find(a => a.name === 'KafkaListener');
    if (!kl) continue;
    const topicM = kl.args.match(/topics\s*=\s*(?:\{)?\s*"([^"]+)"/);
    const groupM = kl.args.match(/groupId\s*=\s*"([^"]+)"/);
    kafkaListeners.push({
      topic: topicM ? topicM[1] : null,
      groupId: groupM ? groupM[1] : null,
      method: me.name, line: me.line,
    });
  }

  // External HTTP
  const externalCalls = [];
  const httpClients = [
    { client: 'RestTemplate', re: /\b(\w*[Rr]estTemplate\w*)\.(\w+)\s*\(/g },
    { client: 'WebClient', re: /\b(\w*[Ww]ebClient\w*)\.\s*(\w+)\s*\(/g },
  ];
  for (const { client, re } of httpClients) {
    while ((m = re.exec(content)) !== null) {
      const enc = enclosingMethod(methods, m.index);
      externalCalls.push({ client, op: m[2], line: lineOf(content, m.index), method: enc ? enc.name : null });
    }
  }

  // Self-invocations of @Transactional / @Async / etc.
  const selfInvocations = [];
  const selfRe = /\bthis\.(\w+)\s*\(/g;
  while ((m = selfRe.exec(content)) !== null) {
    const callee = methods.find(me => me.name === m[1]);
    if (!callee) continue;
    const caller = enclosingMethod(methods, m.index);
    if (!caller || caller.name === callee.name) continue;
    const proxied = callee.annotations.find(a => ['Transactional', 'Async', 'Cacheable', 'CacheEvict', 'PreAuthorize', 'PostAuthorize'].includes(a.name));
    if (!proxied) continue;
    selfInvocations.push({
      caller: caller.name,
      callerLine: lineOf(content, m.index),
      callee: callee.name,
      calleeAnnotation: proxied.name,
    });
  }

  // @Query update without @Modifying
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
    file: rel, package: pkg, class: fqcn, kind,
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

export function extract(rootDir) {
  const files = findFilesByExt(rootDir, ['.java']);
  const components = files.map(f => extractFile(f, rootDir)).filter(Boolean);
  return {
    stack: 'java-spring',
    fileCount: files.length,
    components,
  };
}
