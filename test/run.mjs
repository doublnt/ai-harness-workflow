import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

execFileSync('node', ['scripts/validate.mjs'], {stdio:'inherit'});
const scan = execFileSync('node', ['plugins/codex/anyharness/skills/anyharness/scripts/scan-project.mjs', '.'], {encoding:'utf8'});
const parsed = JSON.parse(scan);
if (!Array.isArray(parsed.sampleFiles)) throw new Error('scan-project did not return sampleFiles');
if (!parsed.aiWorkflow) throw new Error('scan-project did not return aiWorkflow');
console.log('Unit tests passed.');
