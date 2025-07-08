#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { init, run, status, tools } from './commands';

const program = new Command();

program
  .name('goose-flow')
  .description('Multi-agent orchestration tool for Goose')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize goose-flow in current directory')
  .action(async () => {
    try {
      await init();
    } catch (error) {
      console.error(chalk.red('❌ Initialization failed:'), error);
      process.exit(1);
    }
  });

program
  .command('run')
  .description('Run multi-agent swarm orchestration')
  .option('--mode <modes>', 'Comma-separated list of agent modes to run')
  .option('--task <description>', 'Specific task description for the agents')
  .option('--parallel', 'Run agents in parallel mode')
  .option('--max-agents <n>', 'Maximum number of concurrent agents', '4')
  .option('--timeout <ms>', 'Timeout for each agent in milliseconds', '1800000')
  .action(async (options) => {
    try {
      await run(options);
    } catch (error) {
      console.error(chalk.red('❌ Run failed:'), error);
      process.exit(1);
    }
  });

program
  .command('modes')
  .description('List available agent modes from configuration')
  .action(async () => {
    try {
      const { ConfigParser } = await import('./lib/config-parser');
      const parser = new ConfigParser(process.cwd());
      
      try {
        const modes = await parser.getAllModes();
        console.log(chalk.blue('📋 Available Agent Modes:'));
        console.log(chalk.gray('═'.repeat(50)));
        
        for (const [modeName, modeConfig] of Object.entries(modes)) {
          console.log(chalk.cyan(`🔸 ${modeName}`));
          console.log(chalk.gray(`   ${modeConfig.description}`));
          console.log(chalk.gray(`   Groups: ${modeConfig.groups.map(g => Array.isArray(g) ? g[0] : g).join(', ')}`));
          console.log('');
        }
        
        console.log(chalk.yellow('💡 Usage examples:'));
        console.log(chalk.gray('   goose-flow run --mode orchestrator --task "coordinate team development"'));
        console.log(chalk.gray('   goose-flow run --mode security-orchestrator,static-auditor,vuln-validator,report-writer'));
        console.log(chalk.gray('   goose-flow run --mode coder,tester --parallel'));
      } catch (error) {
        console.error(chalk.red('❌ Failed to load configuration. Run "goose-flow init" first.'));
        console.log(chalk.yellow('💡 Run "goose-flow init" to create goose-flow.config.json'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to list modes:'), error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show current status of running agents')
  .action(async () => {
    try {
      await status();
    } catch (error) {
      console.error(chalk.red('❌ Status check failed:'), error);
      process.exit(1);
    }
  });

program
  .command('tools')
  .description('List available tools and their usage')
  .option('--mode <mode>', 'Show tools available for specific agent mode')
  .action(async (options) => {
    try {
      await tools(options);
    } catch (error) {
      console.error(chalk.red('❌ Tools listing failed:'), error);
      process.exit(1);
    }
  });

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}