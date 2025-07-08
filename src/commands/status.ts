import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { ProgressTracker } from '../lib/progress-tracker';

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
    await progressTracker.initialize();

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

    // Display task orchestration status
    const tasksDir = path.join(workspaceDir, 'tasks');
    if (await fs.pathExists(tasksDir)) {
      const taskDirectories = await fs.readdir(tasksDir);

      console.log(chalk.cyan('🎯 Task Orchestration Status'));
      console.log(chalk.gray('─'.repeat(30)));
      console.log(`Active Task Sessions: ${taskDirectories.length}`);
      
      if (taskDirectories.length > 0) {
        console.log(chalk.blue('📋 Recent Task Sessions:'));
        console.log(chalk.gray('─'.repeat(30)));
        
        for (const taskDir of taskDirectories.slice(0, 5)) {
          const taskPath = path.join(tasksDir, taskDir);
          try {
            const stat = await fs.stat(taskPath);
            console.log(chalk.blue(`  ${taskDir}`));
            console.log(chalk.gray(`    Created: ${stat.birthtime}`));
            console.log(chalk.gray(`    Modified: ${stat.mtime}`));
            console.log('');
          } catch (error) {
            // Skip directories that can't be read
          }
        }

        if (taskDirectories.length > 5) {
          console.log(chalk.gray(`  ... and ${taskDirectories.length - 5} more`));
          console.log('');
        }
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
    const hasTasks = await fs.pathExists(tasksDir) && (await fs.readdir(tasksDir)).length > 0;
    
    if (activeAgents.length === 0 && !hasTasks) {
      console.log(chalk.green('💡 No active orchestration workflows detected'));
      console.log(chalk.yellow('   Start a new workflow with:'));
      console.log(chalk.gray('   - goose-flow run --mode orchestrator --task "your task"'));
      console.log(chalk.gray('   - goose-flow run --mode coder --task "create hello world"'));
    } else if (failedAgents.length > 0) {
      console.log(chalk.red('⚠️  Some tasks have failed'));
      console.log(chalk.yellow('   Check logs for details and consider restarting'));
    }

  } catch (error) {
    console.error(chalk.red('❌ Failed to get status:'), error);
  }
}