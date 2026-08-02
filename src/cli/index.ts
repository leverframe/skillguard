#!/usr/bin/env node
import { Command } from 'commander';
import { installCommand } from './commands/install.js';

const program = new Command();

program
  .name('skillguard')
  .description('Signed + transparent plugin directory for Claude Code')
  .version('0.0.1');

program
  .command('install <repo-url>')
  .description('Install a signed plugin from a GitHub URL')
  .option('--dry-run', 'Preview without installing', false)
  .option('--yes', 'Skip per-category confirmations', false)
  .action(async (repoUrl: string, opts: { dryRun: boolean; yes: boolean }) => {
    await installCommand(repoUrl, opts);
  });

program.parse();
