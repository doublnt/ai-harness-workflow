#!/usr/bin/env node
import fs from 'node:fs';

async function stdinJson() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return { raw }; }
}

function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

function block(message) {
  console.error(`Blocked by Vibe Coding Guardrails: ${message}`);
  process.exit(2);
}

function context(message) {
  console.log(JSON.stringify({ hookSpecificOutput: { additionalContext: message } }));
  process.exit(0);
}

const input = await stdinJson();
const event = input.hook_event_name || input.hookEventName || input.event || input.hook_event || '';
const tool = input.tool_name || input.toolName || input.tool || '';
const toolInput = input.tool_input || input.toolInput || input.input || {};
const command = toolInput.command || input.command || '';
const allStrings = strings(toolInput).join('\n');

if (/UserPromptSubmit/i.test(event)) {
  const prompt = input.prompt || allStrings;
  if (/\b(delete production|drop database|rm -rf|rotate secret|payment|auth|authorization|migration)\b/i.test(prompt)) {
    context('Vibe Guardrails: this appears high risk. Classify risk first and require gate artifacts before modifying files.');
  }
  process.exit(0);
}

if (/PreToolUse|PermissionRequest/i.test(event) || tool) {
  if (/\brm\s+-rf\s+(\/|\.|~|\*)/i.test(command)) block('destructive rm -rf command requires explicit human approval and should not be run by the agent.');
  if (/\bgit\s+push\b/i.test(command)) block('git push must be performed by a human after CI gates pass.');
  if (/\bgit\s+commit\b/i.test(command)) block('git commit should go through repository Git hooks and explicit human review.');
  if (/\b(npm\s+install|pnpm\s+add|yarn\s+add|bun\s+add|cargo\s+add|pip\s+install)\b/i.test(command)) block('dependency changes require dependency review and gate artifact.');
  if (/\b(cat|less|more|grep|rg)\b.*\.env(\b|\.)/i.test(command)) block('reading real .env files is not allowed. Use .env.example or documented configuration instead.');
  if (/\.env(\b|\.)|secrets\/|credentials|private[_-]?key/i.test(allStrings)) block('operation appears to touch secrets or environment files.');
  if (/migrations\/|prisma\/schema\.prisma|src\/auth\/|src\/security\/|src\/payments\/|\.github\/workflows\//i.test(allStrings)) block('operation touches Red Zone files. Complete risk classification, gate artifact, and human approval first.');
}

if (/Stop|SubagentStop/i.test(event)) {
  const last = input.last_assistant_message || input.assistant_message || input.response || '';
  const missing = [];
  for (const label of ['Risk Level', 'Unknowns', 'Tests']) if (!new RegExp(label, 'i').test(last)) missing.push(label);
  if (missing.length) block(`missing required closing summary fields: ${missing.join(', ')}.`);
}

process.exit(0);
