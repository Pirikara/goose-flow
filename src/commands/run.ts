import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { AgentManager } from '../lib/agent-manager';
import { ConfigParser } from '../lib/config-parser';
import { CommandOptions } from '../types';

export async function run(options: CommandOptions): Promise<void> {
  const cwd = process.cwd();
  
  console.log(chalk.blue('🚀 Starting goose-flow swarm orchestration...'));

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
      console.log(chalk.gray('   goose-flow run --mode coder,tester --parallel'));
      console.log(chalk.gray('   goose-flow run --mode security-orchestrator,static-auditor,vuln-validator,report-writer'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to load modes:'), error);
    }
    return;
  }

  const modes = options.mode.split(',').map(mode => mode.trim());
  
  // Validate all modes exist
  try {
    for (const mode of modes) {
      await configParser.getModeDefinition(mode);
    }
  } catch (error) {
    console.error(chalk.red('❌ Invalid mode:'), error);
    console.log(chalk.yellow('💡 Use "goose-flow modes" to see available modes'));
    process.exit(1);
  }

  // Setup workspace
  const workspaceDir = path.join(cwd, '.goose-flow', 'workspace');
  const maxAgents = parseInt(options.maxAgents?.toString() || '4');
  const timeout = parseInt(options.timeout?.toString() || '1800000');

  const agentManager = new AgentManager(workspaceDir, maxAgents, timeout);
  await agentManager.initialize();

  try {
    // Clear previous workspace
    await clearWorkspace(workspaceDir);

    console.log(chalk.cyan(`🎯 Running agent modes: ${modes.join(', ')}`));
    if (options.task) {
      console.log(chalk.gray(`📝 Task: ${options.task}`));
    }

    if (options.parallel) {
      // Parallel execution mode
      console.log(chalk.blue('🔄 Starting all agents in parallel mode...'));
      
      const agentPromises = modes.map(async (modeName) => {
        const agentConfig = await configParser.convertToAgentConfig(modeName, options.task);
        return agentManager.spawnAgent(agentConfig);
      });

      await Promise.all(agentPromises);
    } else {
      // Sequential execution mode (default)
      console.log(chalk.blue('🔄 Starting agents in sequential mode...'));
      
      for (let i = 0; i < modes.length; i++) {
        const modeName = modes[i];
        const agentConfig = await configParser.convertToAgentConfig(modeName, options.task);
        
        // Set up next roles chain for sequential execution
        if (i < modes.length - 1) {
          agentConfig.nextRoles = [modes[i + 1]];
        }
        
        await agentManager.spawnAgent(agentConfig);
        
        // For sequential mode, only start the first agent
        // The others will be triggered by the completion chain
        break;
      }
    }

    // Monitor progress
    console.log(chalk.yellow('📊 Monitoring swarm progress...'));
    await monitorProgress(agentManager);

    // Wait for completion
    console.log(chalk.yellow('⏳ Waiting for all agents to complete...'));
    await agentManager.waitForCompletion();

    // Display final summary in console
    await displayFinalSummary(agentManager);

    console.log(chalk.green('✅ Swarm orchestration completed successfully!'));
    console.log(chalk.cyan('📁 Agent results are available in .goose-flow/workspace/results/'));

  } catch (error) {
    console.error(chalk.red('❌ Swarm orchestration failed:'), error);
    
    // Stop all agents on error
    await agentManager.stopAllAgents();
    process.exit(1);
  }
}

async function clearWorkspace(workspaceDir: string): Promise<void> {
  try {
    // Clear agents directory
    const agentsDir = path.join(workspaceDir, 'agents');
    if (await fs.pathExists(agentsDir)) {
      await fs.remove(agentsDir);
    }
    await fs.ensureDir(agentsDir);

    // Clear results directory
    const resultsDir = path.join(workspaceDir, 'results');
    if (await fs.pathExists(resultsDir)) {
      await fs.remove(resultsDir);
    }
    await fs.ensureDir(resultsDir);

    // Reset task queue and progress
    await fs.writeJSON(path.join(workspaceDir, 'task-queue.json'), [], { spaces: 2 });
    await fs.writeJSON(path.join(workspaceDir, 'progress.json'), [], { spaces: 2 });

    console.log(chalk.gray('🧹 Workspace cleared'));
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to clear workspace:'), error);
  }
}

async function monitorProgress(agentManager: AgentManager): Promise<void> {
  const progressTracker = agentManager.getProgressTracker();
  
  const printProgress = () => {
    const progress = progressTracker.getAllProgress();
    
    if (progress.length === 0) {
      console.log(chalk.gray('⏳ No agents running...'));
      return;
    }

    console.log(chalk.blue('📊 Swarm Status:'));
    progress.forEach(entry => {
      const statusColor = entry.status === 'completed' ? 'green' : 
                         entry.status === 'failed' ? 'red' : 
                         entry.status === 'running' ? 'yellow' : 'gray';
      
      console.log(chalk[statusColor](
        `  🤖 ${entry.agentName}: ${entry.status} (${entry.progress}%)`
      ));
      
      if (entry.currentTask) {
        console.log(chalk.gray(`     Task: ${entry.currentTask}`));
      }
    });
    
    const overallProgress = progressTracker.getOverallProgress();
    console.log(chalk.cyan(`🌊 Swarm Progress: ${overallProgress.toFixed(1)}%`));
    console.log('');
  };

  // Print initial progress
  printProgress();

  // Set up periodic progress updates
  const interval = setInterval(printProgress, 10000); // Every 10 seconds

  // Stop monitoring when all completed
  const checkCompletion = () => {
    if (progressTracker.isAllCompleted()) {
      clearInterval(interval);
      return;
    }
    setTimeout(checkCompletion, 1000);
  };

  checkCompletion();
}

async function displayFinalSummary(agentManager: AgentManager): Promise<void> {
  try {
    const progressTracker = agentManager.getProgressTracker();
    const allProgress = progressTracker.getAllProgress();
    
    if (allProgress.length === 0) {
      return;
    }

    console.log(chalk.blue('📊 Final Summary:'));
    
    for (const entry of allProgress) {
      const statusColor = entry.status === 'completed' ? 'green' : 
                         entry.status === 'failed' ? 'red' : 'yellow';
      
      console.log(chalk[statusColor](
        `  🤖 ${entry.agentName}: ${entry.status} (${entry.progress}%)`
      ));
    }
    
    const completed = progressTracker.getCompletedAgents().length;
    const failed = progressTracker.getFailedAgents().length;
    const total = allProgress.length;
    
    console.log(chalk.cyan(`🎯 Total: ${total} | Completed: ${completed} | Failed: ${failed}`));
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to display summary:'), error);
  }
}

