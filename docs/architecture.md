# Architecture

## Components

- `src/cli.js`: argument parsing and command orchestration
- `src/scanner.js`: shallow project scan and AI workflow detection
- `src/generator.js`: target-specific file planning and generation
- `src/templates/`: markdown templates for Claude, Codex, Spec Kit, and common references
- `src/report.js`: scan and install reports
- `src/interactive.js`: confirmation prompts

## Flow

~~~text
parse args
  -> scan project
  -> recommend target
  -> build config
  -> plan files
  -> print scan report
  -> confirm
  -> write safe files or drafts
  -> print install report
~~~

## Safety model

The scanner is read-only. The generator writes only after confirmation, unless the user explicitly passes `--yes`.

All writes go through `writeFileSafe`, which never overwrites existing files and writes drafts on conflict.
