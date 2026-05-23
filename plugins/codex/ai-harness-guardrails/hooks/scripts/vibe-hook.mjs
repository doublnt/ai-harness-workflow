#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const event = process.argv[2] || '';
let inputText = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => inputText += chunk);
process.stdin.on('end', () => {
  let input = {};
  try { input = inputText ? JSON.parse(inputText) : {}; } catch {}
  const projectDir = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.env.CODEX_PROJECT_DIR || process.env.PWD || process.cwd();
  const tool = input.tool_name || input.toolName || '';
  const toolInput = input.tool_input || input.toolInput || {};
  const mode = readMode(projectDir);

  if (/PreToolUse|PermissionRequest|pre-tool-use|permission-request/i.test(event || input.hook_event_name || '')) {
    const reason = evaluateTool(tool, toolInput, projectDir, mode);
    if (reason) {
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: mode === 'advisory' ? 'ask' : 'deny', permissionDecisionReason: reason } }));
      process.exit(0);
    }
  }

  if (/Stop|SubagentStop|stop/i.test(event || input.hook_event_name || '')) {
    const msg = input.last_assistant_message || '';
    const missing = ['Risk Level', 'Unknowns', 'Tests'].filter((x) => !new RegExp(x.replace(' ', '\\s*'), 'i').test(msg));
    if (missing.length && mode !== 'advisory') {
      process.stdout.write(JSON.stringify({ decision: 'block', reason: `Vibe Guardrails: missing final gate summary sections: ${missing.join(', ')}` }));
      process.exit(0);
    }
  }
  process.exit(0);
});

function readMode(projectDir) {
  try { return JSON.parse(fs.readFileSync(path.join(projectDir, '.guardrails/config.json'), 'utf8')).mode || 'advisory'; } catch { return 'advisory'; }
}
function evaluateTool(tool, toolInput, projectDir, mode) {
  const command = toolInput.command || '';
  if (tool === 'Bash' && /(rm\s+-rf\s+\/|git\s+push|git\s+reset\s+--hard|npm\s+install|pnpm\s+add|yarn\s+add|cargo\s+add|terraform\s+apply|kubectl\s+(apply|delete))/i.test(command)) {
    return `Dangerous command requires explicit approval: ${command}`;
  }
  const file = toolInput.file_path || toolInput.path || '';
  if (file) {
    const rel = file.startsWith(projectDir) ? file.slice(projectDir.length + 1).replace(/\\/g, '/') : file.replace(/^\.\//, '').replace(/\\/g, '/');
    if (/^\.env(\.|$)/.test(rel)) return `Real .env files are blocked: ${rel}`;
    if ((tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit') && /^(migrations\/|db\/migrations\/|supabase\/migrations\/|src\/auth\/|src\/security\/|src\/payments\/|\.github\/workflows\/|deploy\/|infra\/|CLAUDE\.md|AGENTS\.md|\.claude\/settings\.json|\.codex\/config\.toml)/.test(rel)) {
      return `Red Zone file requires gate approval: ${rel}`;
    }
  }
  return '';
}
