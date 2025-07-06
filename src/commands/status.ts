import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { ProgressTracker } from '../lib/progress-tracker';
import { TaskQueue } from '../lib/task-queue';

export async function status(): Promise<void> {
  const cwd = process.cwd();
  const gooseFlowDir = path.join(cwd, '.goose-flow');
  const workspaceDir = path.join(gooseFlowDir, 'workspace');

  console.log(chalk.blue('📊 goose-flow Status Report'));
  console.log(chalk.gray('═'.repeat(50)));

  // Check if goose-flow is initialized
  if (!(await fs.pathExists(gooseFlowDir))) {
    console.log(chalk.red('❌ goose-flow not initialized in this directory'));
    console.log(chalk.yellow('💡 Run "goose-flow init" to initialize'));
    return;
  }

  try {
    // Load progress tracker
    const progressTracker = new ProgressTracker(path.join(workspaceDir, 'progress.json'));
    const taskQueue = new TaskQueue(path.join(workspaceDir, 'task-queue.json'));

    // Display overall status
    const allProgress = progressTracker.getAllProgress();
    const activeAgents = progressTracker.getActiveAgents();
    const completedAgents = progressTracker.getCompletedAgents();
    const failedAgents = progressTracker.getFailedAgents();

    console.log(chalk.cyan('🔍 Overall Status'));
    console.log(chalk.gray('─'.repeat(30)));
    console.log(`Total Agents: ${allProgress.length}`);
    console.log(`Active: ${chalk.yellow(activeAgents.length)}`);
    console.log(`Completed: ${chalk.green(completedAgents.length)}`);
    console.log(`Failed: ${chalk.red(failedAgents.length)}`);

    if (allProgress.length > 0) {
      const overallProgress = progressTracker.getOverallProgress();
      console.log(`Overall Progress: ${chalk.cyan(overallProgress.toFixed(1) + '%')}`);
    }

    console.log('');

    // Display active agents
    if (activeAgents.length > 0) {
      console.log(chalk.yellow('🔄 Active Agents'));
      console.log(chalk.gray('─'.repeat(30)));
      
      activeAgents.forEach(agent => {
        const statusColor = agent.status === 'running' ? 'yellow' : 'gray';
        console.log(chalk[statusColor](`  ${agent.agentName}`));
        console.log(chalk.gray(`    Status: ${agent.status}`));
        console.log(chalk.gray(`    Progress: ${agent.progress}%`));
        if (agent.currentTask) {
          console.log(chalk.gray(`    Current Task: ${agent.currentTask}`));
        }
        console.log(chalk.gray(`    Last Update: ${agent.lastUpdate}`));
        console.log('');
      });
    }

    // Display completed agents
    if (completedAgents.length > 0) {
      console.log(chalk.green('✅ Completed Agents'));
      console.log(chalk.gray('─'.repeat(30)));
      
      completedAgents.forEach(agent => {
        console.log(chalk.green(`  ${agent.agentName}`));
        console.log(chalk.gray(`    Completed: ${agent.lastUpdate}`));
        console.log('');
      });
    }

    // Display failed agents
    if (failedAgents.length > 0) {
      console.log(chalk.red('❌ Failed Agents'));
      console.log(chalk.gray('─'.repeat(30)));
      
      failedAgents.forEach(agent => {
        console.log(chalk.red(`  ${agent.agentName}`));
        console.log(chalk.gray(`    Failed: ${agent.lastUpdate}`));
        console.log('');
      });
    }

    // Display task queue status
    const allTasks = taskQueue.getAllTasks();
    const pendingTasks = taskQueue.getPendingTasks();
    const inProgressTasks = taskQueue.getInProgressTasks();
    const completedTasks = taskQueue.getCompletedTasks();
    const failedTasks = taskQueue.getFailedTasks();

    if (allTasks.length > 0) {
      console.log(chalk.cyan('📋 Task Queue Status'));
      console.log(chalk.gray('─'.repeat(30)));
      console.log(`Total Tasks: ${allTasks.length}`);
      console.log(`Pending: ${chalk.yellow(pendingTasks.length)}`);
      console.log(`In Progress: ${chalk.blue(inProgressTasks.length)}`);
      console.log(`Completed: ${chalk.green(completedTasks.length)}`);
      console.log(`Failed: ${chalk.red(failedTasks.length)}`);
      console.log('');

      // Display pending tasks
      if (pendingTasks.length > 0) {
        console.log(chalk.yellow('⏳ Pending Tasks'));
        console.log(chalk.gray('─'.repeat(30)));
        
        pendingTasks.slice(0, 5).forEach(task => {
          console.log(chalk.yellow(`  ${task.id}`));
          console.log(chalk.gray(`    Type: ${task.type}`));
          console.log(chalk.gray(`    Role: ${task.role}`));
          console.log(chalk.gray(`    Created: ${task.createdAt}`));
          console.log('');
        });

        if (pendingTasks.length > 5) {
          console.log(chalk.gray(`  ... and ${pendingTasks.length - 5} more`));
          console.log('');
        }
      }

      // Display in-progress tasks
      if (inProgressTasks.length > 0) {
        console.log(chalk.blue('🔄 In Progress Tasks'));
        console.log(chalk.gray('─'.repeat(30)));
        
        inProgressTasks.forEach(task => {
          console.log(chalk.blue(`  ${task.id}`));
          console.log(chalk.gray(`    Type: ${task.type}`));
          console.log(chalk.gray(`    Role: ${task.role}`));
          if (task.assignedAgent) {
            console.log(chalk.gray(`    Assigned to: ${task.assignedAgent}`));
          }
          console.log(chalk.gray(`    Started: ${task.updatedAt}`));
          console.log('');
        });
      }
    }

    // Display workspace info
    console.log(chalk.cyan('📁 Workspace Info'));
    console.log(chalk.gray('─'.repeat(30)));
    console.log(`Workspace: ${workspaceDir}`);
    
    // Check for result files
    const resultsDir = path.join(workspaceDir, 'results');
    if (await fs.pathExists(resultsDir)) {
      const resultFiles = await fs.readdir(resultsDir);
      console.log(`Result Files: ${resultFiles.length}`);
      if (resultFiles.length > 0) {
        console.log(chalk.gray('  Files:'));
        resultFiles.forEach((file: string) => {
          console.log(chalk.gray(`    - ${file}`));
        });
      }
    }

    // Check for log files
    const logsDir = path.join(gooseFlowDir, 'logs');
    if (await fs.pathExists(logsDir)) {
      const logFiles = await fs.readdir(logsDir);
      console.log(`Log Files: ${logFiles.length}`);
    }

    console.log('');

    // Display recommendations
    if (activeAgents.length === 0 && pendingTasks.length === 0) {
      console.log(chalk.green('💡 No active workflows detected'));
      console.log(chalk.yellow('   Start a new workflow with:'));
      console.log(chalk.gray('   - goose-flow security-scan .'));
      console.log(chalk.gray('   - goose-flow run --mode orchestrator,static-auditor'));
    } else if (failedAgents.length > 0) {
      console.log(chalk.red('⚠️  Some agents have failed'));
      console.log(chalk.yellow('   Check logs for details and consider restarting'));
    }

  } catch (error) {
    console.error(chalk.red('❌ Failed to get status:'), error);
  }
}