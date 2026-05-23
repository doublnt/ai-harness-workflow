# AnyHarness for Codex

AnyHarness is a Codex plugin that adds AI development guardrails through skills and optional lifecycle hooks.

## Example prompts

```text
Use AnyHarness core rules for this change.
Use AnyHarness to initialize this repository.
Use AnyHarness to review this diff before commit.
Use AnyHarness to prepare a release check.
```

## Beginner path

1. Install the plugin from the local marketplace.
2. Ask Codex to use AnyHarness core rules.
3. Run repository initialization only when you want project-local rules.
4. Enable Harness mode only after advisory mode feels stable.

## New project

Ask:

```text
Use AnyHarness to initialize this repository in Project mode.
```

## Existing project

Start with advisory mode. Existing `AGENTS.md` files are not overwritten; AnyHarness creates draft append files.

## Safety

Installing the plugin does not modify your repository. Plugin-bundled hooks should be reviewed and trusted before use.
