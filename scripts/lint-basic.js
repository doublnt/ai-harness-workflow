import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', 'coverage', 'dist', 'build']);
const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignored.has(entry)) continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(js|md|json|yml|toml|rules)$/.test(entry)) files.push(full);
  }
}

walk(root);

let failed = false;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  if (!text.endsWith('\n')) {
    console.error(`Missing final newline: ${path.relative(root, file)}`);
    failed = true;
  }
  if (file.includes('src/templates') && /path:\s*['\"]\.ai\//.test(text)) {
    console.error(`Generated template must not create .ai/: ${path.relative(root, file)}`);
    failed = true;
  }
}

if (failed) process.exit(1);
