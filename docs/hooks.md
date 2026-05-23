# Hooks

V2 ships plugin-bundled lifecycle hooks for Claude Code and Codex.

The hooks intentionally block only high-confidence dangerous actions:

- destructive `rm -rf`
- `git push`
- direct `git commit` by an agent
- dependency installation without review
- reading real `.env` files
- operations touching Red Zone files

For day-to-day policy checks, use Git hooks and CI.
