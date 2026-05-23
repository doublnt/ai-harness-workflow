#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = process.cwd();
const scriptDir = path.join(root,'.anyharness','scripts');
fs.mkdirSync(scriptDir,{recursive:true});
const check = `#!/usr/bin/env node\nimport fs from 'node:fs';\nimport { execFileSync } from 'node:child_process';\nconst profile = '.anyharness/profile.json';\nif (!fs.existsSync(profile)) { console.error('AnyHarness profile missing. Ask AnyHarness to generate .anyharness/profile.json.'); process.exit(1);}\nconst msg = process.argv.includes('--commit-msg') ? fs.readFileSync(process.argv[process.argv.indexOf('--commit-msg')+1],'utf8') : '';\nif (msg && !/\\[risk:L[0-3]\\]/.test(msg)) { console.error('Commit message must include [risk:L0], [risk:L1], [risk:L2], or [risk:L3].'); process.exit(1);}\nconsole.log('AnyHarness local check passed.');\n`;
fs.writeFileSync(path.join(scriptDir,'check.mjs'), check, {mode:0o755});
fs.mkdirSync(path.join(root,'.githooks'),{recursive:true});
fs.writeFileSync(path.join(root,'.githooks','pre-commit'), '#!/usr/bin/env sh\nnode .anyharness/scripts/check.mjs\n', {mode:0o755});
fs.writeFileSync(path.join(root,'.githooks','commit-msg'), '#!/usr/bin/env sh\nnode .anyharness/scripts/check.mjs --commit-msg "$1"\n', {mode:0o755});
try { execFileSync('git',['config','core.hooksPath','.githooks'],{stdio:'ignore'}); } catch {}
fs.mkdirSync(path.join(root,'.github','workflows'),{recursive:true});
fs.writeFileSync(path.join(root,'.github','workflows','anyharness.yml'), `name: AnyHarness\non: [pull_request]\njobs:\n  anyharness:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n      - run: node .anyharness/scripts/check.mjs\n`);
console.log(JSON.stringify({created:['.anyharness/scripts/check.mjs','.githooks/pre-commit','.githooks/commit-msg','.github/workflows/anyharness.yml']}, null, 2));
