import process from 'node:process';
import path from 'node:path';
import { TARGETS } from './constants.js';
import { scanProject } from './scanner.js';
import { buildConfig, generateFiles, planFiles } from './generator.js';
import { confirmConfiguration } from './interactive.js';
import { printInstallReport, printScanReport } from './report.js';

export async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);
  if (options.help || !command || command === 'help') {
    printHelp();
    return;
  }

  if (command !== 'init' && command !== '/init-project') {
    throw new Error(`Unknown command: ${command}`);
  }

  const root = path.resolve(options.root || process.cwd());
  const scan = scanProject(root);
  let config = buildConfig(scan, options);
  const planned = planFiles(scan, config).map((file) => file.path);

  printScanReport(scan, config, planned);

  if (options.dryRun) {
    console.log('\nDry run only. No files were written.');
    return;
  }

  config = await confirmConfiguration(scan, config, { yes: options.yes });
  if (config.cancelled) {
    console.log('Cancelled. No files were written.');
    return;
  }

  const result = generateFiles(root, scan, config, { dryRun: false });
  printInstallReport(config, result);
}

export function parseArgs(argv) {
  const options = { target: 'detect', dryRun: false, yes: false, lite: false, full: false };
  let command = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!command && !arg.startsWith('--')) {
      command = arg;
      continue;
    }

    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--yes' || arg === '-y') options.yes = true;
    else if (arg === '--lite') options.lite = true;
    else if (arg === '--full') options.full = true;
    else if (arg === '--target') {
      const value = argv[++i];
      if (!TARGETS.has(value)) throw new Error(`Invalid --target: ${value}`);
      options.target = value;
    } else if (arg.startsWith('--target=')) {
      const value = arg.slice('--target='.length);
      if (!TARGETS.has(value)) throw new Error(`Invalid --target: ${value}`);
      options.target = value;
    } else if (arg === '--root') {
      options.root = argv[++i];
    } else if (arg.startsWith('--root=')) {
      options.root = arg.slice('--root='.length);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return { command, options };
}

function printHelp() {
  console.log(`vibe-guardrails

Usage:
  vibe-guardrails init [options]
  vibe-guardrails /init-project [options]

Options:
  --target detect|claude|codex|both|speckit
  --root <path>
  --dry-run
  --yes, -y
  --lite
  --full
  --help, -h
`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
  });
}
