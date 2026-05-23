import { toPosix } from './utils.mjs';

export function globToRegExp(glob) {
  const normalized = toPosix(glob).replace(/^\.\//, '');
  let out = '^';
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    const next = normalized[i + 1];
    if (ch === '*' && next === '*') {
      const after = normalized[i + 2];
      if (after === '/') { out += '(?:.*\/)?'; i += 2; }
      else { out += '.*'; i += 1; }
    } else if (ch === '*') out += '[^/]*';
    else if (ch === '?') out += '[^/]';
    else if ('\\.^$+{}()|[]'.includes(ch)) out += `\\${ch}`;
    else out += ch;
  }
  out += '$';
  return new RegExp(out);
}

export function matchesAny(file, patterns = []) {
  const normalized = toPosix(file).replace(/^\.\//, '');
  return patterns.some((pattern) => globToRegExp(pattern).test(normalized));
}

export function firstMatch(file, patterns = []) {
  return patterns.find((pattern) => matchesAny(file, [pattern])) || null;
}
