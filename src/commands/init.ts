import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { ConfigParser } from '../lib/config-parser';

export async function init(): Promise<void> {
  const cwd = process.cwd();
  const gooseFlowDir = path.join(cwd, '.goose-flow');
  const configParser = new ConfigParser(cwd);

  console.log(chalk.blue('🚀 Initializing goose-flow swarm orchestration...'));

  // Check if already initialized
  if (await fs.pathExists(gooseFlowDir) && await fs.pathExists(configParser.getConfigPath())) {
    console.log(chalk.yellow('⚠️  goose-flow is already initialized in this directory'));
    console.log(chalk.green('✅ Configuration file already exists'));
    return;
  }

  // Create directory structure  
  await fs.ensureDir(path.join(gooseFlowDir, 'workspace'));
  await fs.ensureDir(path.join(gooseFlowDir, 'logs'));
  await fs.ensureDir(path.join(gooseFlowDir, 'workspace', 'agents'));
  await fs.ensureDir(path.join(gooseFlowDir, 'workspace', 'results'));

  // Create main configuration file with agents
  await configParser.createDefaultConfig();


  // Create initial workspace files
  await fs.writeJSON(path.join(gooseFlowDir, 'workspace', 'task-queue.json'), [], { spaces: 2 });
  await fs.writeJSON(path.join(gooseFlowDir, 'workspace', 'progress.json'), [], { spaces: 2 });

  // Configuration file created with default agents

  // Create basic .gitignore
  const gitignoreContent = `
# goose-flow workspace
.goose-flow/workspace/
.goose-flow/logs/
*.log

# Config (uncomment to ignore)
# goose-flow.config.json
`;
  await fs.writeFile(path.join(gooseFlowDir, '.gitignore'), gitignoreContent.trim());

  console.log(chalk.green('✅ goose-flow swarm orchestration initialized successfully!'));
  console.log(chalk.cyan('📁 Created directories:'));
  console.log(chalk.gray('  .goose-flow/'));
  console.log(chalk.gray('  .goose-flow/workspace/'));
  console.log(chalk.gray('  .goose-flow/logs/'));
  console.log(chalk.cyan('📄 Created configuration:'));
  console.log(chalk.gray('  goose-flow.config.json (unified configuration with agent definitions)'));
  console.log(chalk.cyan('🤖 Available agent modes:'));
  
  try {
    const modes = await configParser.getAllModes();
    const modeNames = Object.keys(modes);
    console.log(chalk.gray(`  ${modeNames.join(', ')}`));
  } catch (error) {
    console.log(chalk.gray('  orchestrator, coder, security-orchestrator, and more...'));
  }
  
  console.log(chalk.yellow('💡 Next steps:'));
  console.log(chalk.gray('  1. Review and customize goose-flow.config.json file'));
  console.log(chalk.gray('  2. Run: goose-flow modes (to see all available modes)'));
  console.log(chalk.gray('  3. Run: goose-flow run --mode orchestrator --task "your task"'));
  console.log(chalk.gray('  4. Run: goose-flow run --mode coder,tester --parallel --task "your task"'));
}