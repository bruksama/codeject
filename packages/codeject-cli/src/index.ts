#!/usr/bin/env node
import { runInstallCommand } from './commands/install-command.js';
import { runRepairCommand } from './commands/repair-command.js';
import { runStatusCommand } from './commands/status-command.js';
import { runUninstallCommand } from './commands/uninstall-command.js';

const HELP_TEXT = `Usage: codeject <install|uninstall|status|repair> [--component hooks]

Commands:
  install     Install Codeject hook integration
  uninstall   Remove Codeject hook integration and ~/.codeject
  status      Inspect hook health and drift
  repair      Restore missing Codeject-managed hook pieces
`;

async function main() {
  const [commandName, ...rawArgs] = process.argv.slice(2);

  if (!commandName || commandName === '--help' || commandName === '-h') {
    console.log(HELP_TEXT);
    return;
  }

  const options = parseOptions(rawArgs);
  if (options.component !== 'hooks') {
    throw new Error(`Unsupported component: ${options.component}`);
  }

  switch (commandName) {
    case 'install':
      await runInstallCommand();
      break;
    case 'repair':
      await runRepairCommand();
      break;
    case 'status':
      await runStatusCommand();
      break;
    case 'uninstall':
      await runUninstallCommand();
      break;
    default:
      throw new Error(`Unknown command: ${commandName}`);
  }
}

function parseOptions(args: string[]) {
  let component = 'hooks';
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--component') {
      component = args[index + 1] ?? '';
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return { component };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Codeject CLI failed');
  process.exitCode = 1;
});
