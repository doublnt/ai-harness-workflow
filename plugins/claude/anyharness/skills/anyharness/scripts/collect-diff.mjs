#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const mode = process.argv.includes('--staged') ? '--cached' : '';
function git(args){
  try { return execFileSync('git', args, {encoding:'utf8'}); }
  catch { return ''; }
}
const changed = git(['diff', mode, '--name-only'].filter(Boolean)).trim().split('\n').filter(Boolean);
const diff = git(['diff', mode].filter(Boolean));
console.log(JSON.stringify({ changedFiles: changed, diff }, null, 2));
