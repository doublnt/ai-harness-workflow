import { evaluateToolUse, evaluateStop } from './command-policy.mjs';

export async function runAgentHook(kind, stdin = '', env = process.env) {
  let input = {};
  try { input = stdin ? JSON.parse(stdin) : {}; } catch { input = {}; }
  const projectDir = input.cwd || env.CLAUDE_PROJECT_DIR || env.CODEX_PROJECT_DIR || env.PWD || process.cwd();
  const event = kind || input.hook_event_name || '';
  if (event === 'PreToolUse' || event === 'pre-tool-use' || event === 'PermissionRequest' || event === 'permission-request') {
    const result = evaluateToolUse(input, projectDir);
    if (!result.ok) return blockPreTool(result.findings.join('\n'));
    return allowContext('Vibe Guardrails checked tool use.');
  }
  if (event === 'Stop' || event === 'SubagentStop' || event === 'stop' || event === 'subagent-stop') {
    const result = evaluateStop(input);
    if (!result.ok) return blockStop(`Missing gate summary sections: ${result.missing.join(', ')}. Continue by producing Risk Level, Unknowns, Tests, and required rollback/approval sections.`);
    return { code: 0, stdout: '' };
  }
  if (event === 'UserPromptSubmit' || event === 'user-prompt-submit') {
    const prompt = input.prompt || input.user_prompt || '';
    if (/\b(production|payment|auth|authorization|migration|database|delete|rm -rf)\b/i.test(prompt)) {
      return { code: 0, stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: 'Vibe Guardrails: this prompt appears high-risk. Start with risk classification and a gate artifact before implementation.' } }) };
    }
  }
  return { code: 0, stdout: '' };
}

function blockPreTool(reason) {
  return {
    code: 0,
    stdout: JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason
      }
    })
  };
}

function blockStop(reason) {
  return { code: 0, stdout: JSON.stringify({ decision: 'block', reason }) };
}

function allowContext(additionalContext) {
  return { code: 0, stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext } }) };
}
