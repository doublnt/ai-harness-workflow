#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const ignore = new Set(['.git','node_modules','dist','build','target','coverage','.next','.nuxt','.venv','venv','tmp','logs']);
const maxFiles = 1200;
const files = [];

function walk(dir, depth=0){
  if (depth > 5 || files.length >= maxFiles) return;
  let entries=[];
  try { entries = fs.readdirSync(dir, {withFileTypes:true}); } catch { return; }
  for (const e of entries) {
    if (ignore.has(e.name) || e.name.startsWith('.env')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, depth+1);
    else if (e.isFile()) files.push(path.relative(root,p));
  }
}
walk(root);

function has(pattern){ return files.some(f => pattern.test(f)); }
function count(pattern){ return files.filter(f => pattern.test(f)).length; }

const aiWorkflow = {
  claude: has(/(^|\/)CLAUDE\.md$|^\.claude\//),
  codex: has(/(^|\/)AGENTS\.md$|^\.codex\//),
  cursor: has(/^\.cursor\//) || has(/(^|\/)\.cursorrules$/),
  speckit: has(/^\.specify\//) || has(/^specs\//)
};

const stacks = [];
if (has(/package\.json$/)) stacks.push('node');
if (has(/Cargo\.toml$/)) stacks.push('rust');
if (has(/go\.mod$/)) stacks.push('go');
if (has(/pom\.xml$|build\.gradle$/)) stacks.push('java');
if (has(/CMakeLists\.txt$|\.cpp$|\.hpp$|\.cc$|\.h$/)) stacks.push('cpp');
if (has(/electron/i) || has(/preload\.(ts|js)$/) || has(/main\.(ts|js)$/) && has(/renderer|ipc/i)) stacks.push('electron');
if (has(/next\.config\.|app\/|pages\//)) stacks.push('nextjs');
if (has(/vite\.config\.|src\/.*\.(tsx|jsx)$/)) stacks.push('frontend');

const domainSignals = [];
function addDomain(name, evidencePatterns){
  const evidence = files.filter(f => evidencePatterns.some(p => p.test(f))).slice(0,20);
  if (evidence.length) domainSignals.push({name, confidence: evidence.length >= 5 ? 'medium' : 'low', evidence});
}
addDomain('ecommerce/payment', [/order/i,/payment/i,/checkout/i,/cart/i,/inventory/i,/coupon/i,/refund/i]);
addDomain('electron-desktop-client', [/electron/i,/preload/i,/ipc/i,/BrowserWindow/i,/autoUpdater/i]);
addDomain('finance-trading-or-market-data', [/market.?data/i,/order.?book/i,/execution.?report/i,/venue/i,/risk/i,/FIX|fix/i,/instrument/i,/position/i]);
addDomain('ai-agent-or-llm-app', [/agent/i,/llm/i,/prompt/i,/rag/i,/tool.?call/i,/openai/i,/anthropic/i]);
addDomain('data-platform', [/pipeline/i,/dag/i,/warehouse/i,/etl/i,/spark/i,/airflow/i]);

const result = {
  root,
  scannedAt: new Date().toISOString(),
  fileCount: files.length,
  sampleFiles: files.slice(0,200),
  aiWorkflow,
  stacks: [...new Set(stacks)],
  domainSignals,
  notable: {
    tests: files.filter(f => /(^|\/)(test|tests|spec|e2e)(\/|$)|\.(test|spec)\./i.test(f)).slice(0,100),
    docs: files.filter(f => /(^|\/)docs\/|README|SECURITY|CONTRIBUTING|ADR|CHANGELOG/i.test(f)).slice(0,100),
    migrations: files.filter(f => /migration|migrations|prisma|schema\.prisma|db\//i.test(f)).slice(0,100),
    configs: files.filter(f => /package\.json|Cargo\.toml|go\.mod|pom\.xml|build\.gradle|Dockerfile|compose|\.github\/workflows/i.test(f)).slice(0,100)
  }
};
console.log(JSON.stringify(result, null, 2));
