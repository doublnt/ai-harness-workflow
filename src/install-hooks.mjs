import path from 'node:path';
import { writeText, ensureDir, git } from './utils.mjs';

const PRE_COMMIT = `#!/usr/bin/env sh
set -eu
npx vibe-coding-guardrails check --staged
`;
const COMMIT_MSG = `#!/usr/bin/env sh
set -eu
npx vibe-coding-guardrails commit-msg "$1"
`;
const PRE_PUSH = `#!/usr/bin/env sh
set -eu
npx vibe-coding-guardrails check --push
`;

export function installGitHooks({ repo = process.cwd(), setCoreHooksPath = true } = {}) {
  const dir = path.join(repo, '.githooks');
  ensureDir(dir);
  writeText(path.join(dir, 'pre-commit'), PRE_COMMIT, 0o755);
  writeText(path.join(dir, 'commit-msg'), COMMIT_MSG, 0o755);
  writeText(path.join(dir, 'pre-push'), PRE_PUSH, 0o755);
  if (setCoreHooksPath) git(['config', 'core.hooksPath', '.githooks'], { cwd: repo });
  return ['.githooks/pre-commit', '.githooks/commit-msg', '.githooks/pre-push'];
}

export function gitHubActionsTemplate() {
  return `name: Vibe Guardrails

on:
  pull_request:
  push:
    branches: [main, master]

jobs:
  guardrails:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx vibe-coding-guardrails check --ci
`;
}
