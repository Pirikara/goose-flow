import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { TaskOrchestrator } from '../lib/task-orchestrator';
import { OrchestrationRequestHandler } from '../lib/orchestration-request-handler';
import { ConfigParser } from '../lib/config-parser';
import { ToolPermissionManager } from '../lib/tool-permission-manager';
import { CommandOptions } from '../types';
import { logger } from '../lib/console-logger';

export async function run(options: CommandOptions): Promise<void> {
  const cwd = process.cwd();

  // Initialize config parser
  const configParser = new ConfigParser(cwd);
  
  try {
    // Ensure configuration exists
    await configParser.loadConfig();
  } catch (error) {
    console.error(chalk.red('❌ Configuration file not found. Run "goose-flow init" first.'));
    console.error(chalk.gray('Error details:'), error);
    process.exit(1);
  }

  // Parse modes from options or show available modes
  if (!options.mode) {
    console.log(chalk.yellow('📋 No modes specified. Available agent modes:'));
    console.log(chalk.gray('─'.repeat(50)));
    
    try {
      const modes = await configParser.getAllModes();
      for (const [modeName, modeConfig] of Object.entries(modes)) {
        console.log(chalk.cyan(`🔸 ${modeName}`));
        console.log(chalk.gray(`   ${modeConfig.description}`));
      }
      
      console.log(chalk.yellow('\n💡 Usage examples:'));
      console.log(chalk.gray('   goose-flow run --mode orchestrator --task "coordinate development"'));
      console.log(chalk.gray('   goose-flow run --mode coder --task "implement user authentication"'));
      console.log(chalk.gray('   goose-flow run --mode security-orchestrator --task "perform security analysis"'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to load modes:'), error);
    }
    return;
  }

  const mode = options.mode.trim();
  
  // Display orchestration header  
  logger.orchestrationHeader([mode]);
  
  // Validate mode exists
  try {
    await configParser.getModeDefinition(mode);
  } catch (error) {
    console.error(chalk.red('❌ Invalid mode:'), error);
    console.log(chalk.yellow('💡 Use "goose-flow modes" to see available modes'));
    process.exit(1);
  }

  // Setup workspace
  const workspaceDir = path.join(cwd, '.goose-flow', 'workspace');
  const maxAgents = parseInt(options.maxAgents?.toString() || '4');
  const timeout = parseInt(options.timeout?.toString() || '1800000');

  const orchestrator = new TaskOrchestrator(workspaceDir, maxAgents, timeout);
  await orchestrator.initialize();

  // Clean up old progress entries
  await orchestrator.getProgressTracker().removeStaleEntries();

  // Start the request handler for orchestration communication
  const requestHandler = new OrchestrationRequestHandler(orchestrator);
  await requestHandler.start();

  try {
    // Clear previous workspace
    await clearWorkspace(workspaceDir);

    logger.info(`Target directory: ${cwd}`);
    if (options.task) {
      logger.info(`Task description: ${options.task}`);
    }

    // Single mode execution - create a root task
    const instruction = options.task || `Execute tasks in ${mode} mode`;
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _taskId = await orchestrator.createRootTask(mode, instruction, {
      maxTurns: mode.includes('orchestrator') ? 50 : 20,
      tools: await getToolsForMode(configParser, mode)
    });

    // Monitor progress
    await monitorProgress(orchestrator);

    // Wait for completion
    await orchestrator.waitForCompletion();

    // Display final summary
    await displayFinalSummary(orchestrator);

  } catch (error) {
    logger.error(`Task orchestration failed: ${error instanceof Error ? error.message : String(error)}`);
    
    // Stop all tasks on error
    await orchestrator.stopAllTasks();
    process.exit(1);
  } finally {
    // Stop the request handler
    await requestHandler.stop();
    
    // Cleanup old request files
    await requestHandler.cleanup();
  }
}

async function getToolsForMode(configParser: ConfigParser, mode: string): Promise<string[]> {
  try {
    const modes = await configParser.getAllModes();
    const toolPermissionManager = new ToolPermissionManager(modes);
    
    return toolPermissionManager.getAvailableTools(mode);
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Failed to get tools for mode ${mode}, using defaults`));
    return ['attempt_completion'];
  }
}

async function clearWorkspace(workspaceDir: string): Promise<void> {
  try {
    // Clear tasks directory
    const tasksDir = path.join(workspaceDir, 'tasks');
    if (await fs.pathExists(tasksDir)) {
      await fs.remove(tasksDir);
    }
    await fs.ensureDir(tasksDir);

    // Clear results directory
    const resultsDir = path.join(workspaceDir, 'results');
    if (await fs.pathExists(resultsDir)) {
      await fs.remove(resultsDir);
    }
    await fs.ensureDir(resultsDir);

    // Reset progress  
    await fs.writeJSON(path.join(workspaceDir, 'progress.json'), [], { spaces: 2 });
    
    // Clean up any old request/response files
    try {
      const tmpFiles = await fs.readdir('/tmp');
      const oldFiles = tmpFiles.filter(file => file.startsWith('goose-flow-'));
      for (const file of oldFiles) {
        await fs.remove(path.join('/tmp', file));
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    logger.debug('Workspace cleared');
  } catch (error) {
    logger.warn(`Failed to clear workspace: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function monitorProgress(orchestrator: TaskOrchestrator): Promise<void> {
  // Simple monitoring - the logger handles real-time progress display
  const checkCompletion = () => {
    const activeTasks = orchestrator.getAllTasks().filter(task => 
      task.status === 'running' || task.status === 'pending' || task.status === 'paused'
    );
    
    if (activeTasks.length === 0) {
      return;
    }
    setTimeout(checkCompletion, 1000);
  };

  checkCompletion();
}


async function displayFinalSummary(orchestrator: TaskOrchestrator): Promise<void> {
  try {
    const tasks = orchestrator.getAllTasks();
    
    if (tasks.length === 0) {
      return;
    }

    // Count by status
    const completed = tasks.filter(t => t.status === 'completed').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    const total = tasks.length;
    
    // Display orchestration summary
    logger.orchestrationSummary(completed, failed, total);
    
    // Show results for completed tasks
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.result);
    if (completedTasks.length > 0) {
      logger.separator('Task Results');
      completedTasks.forEach(task => {
        logger.info(`✅ ${task.mode}: ${task.result}`);
      });
      logger.info('');
    }

    // Show location of detailed results
    logger.info('📁 Detailed results available in: .goose-flow/workspace/tasks/');
    
  } catch (error) {
    logger.warn(`Failed to display summary: ${error instanceof Error ? error.message : String(error)}`);
  }
}

