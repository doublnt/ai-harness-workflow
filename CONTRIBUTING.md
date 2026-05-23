# Contributing

This project is intentionally conservative. v1 is skills-only.

## Allowed in plugin roots

- `.claude-plugin/plugin.json`
- `.codex-plugin/plugin.json`
- `skills/**/SKILL.md`
- `resources/**/*.md`
- `README.md`
- `LICENSE`

## Not allowed in v1 plugin roots

- `hooks/`
- `.mcp.json`
- `.app.json`
- `bin/`
- executable scripts
- default settings that pre-approve shell commands

## Development

```bash
npm test
```

When adding a new skill, add it to both Claude and Codex plugin roots and make sure its frontmatter contains `name` and `description`.
