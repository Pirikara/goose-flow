import { execa, ExecaChildProcess } from 'execa';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import { AgentConfig, AgentInstance } from '../types';
import { TaskQueue } from './task-queue';
import { ProgressTracker } from './progress-tracker';

export class AgentManager {
  private agents: Map<string, AgentInstance> = new Map();
  private workspaceDir: string;
  private taskQueue: TaskQueue;
  private progressTracker: ProgressTracker;
  private maxConcurrent: number;
  private timeout: number;

  constructor(workspaceDir: string, maxConcurrent: number = 4, timeout: number = 1800000) {
    this.workspaceDir = workspaceDir;
    this.maxConcurrent = maxConcurrent;
    this.timeout = timeout;
    this.taskQueue = new TaskQueue(path.join(workspaceDir, 'task-queue.json'));
    this.progressTracker = new ProgressTracker(path.join(workspaceDir, 'progress.json'));
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.taskQueue.initialize(),
      this.progressTracker.initialize()
    ]);
  }

  async spawnAgent(config: AgentConfig): Promise<string> {
    const agentId = `${config.name}-${Date.now()}`;
    
    console.log(chalk.blue(`🚀 Spawning agent: ${config.name}`));
    
    // Create initial progress entry
    await this.progressTracker.updateProgress(agentId, {
      agentName: config.name,
      status: 'waiting',
      progress: 0,
      currentTask: config.initialTask
    });

    // Create the agent directory
    const agentDir = path.join(this.workspaceDir, 'agents', agentId);
    await fs.ensureDir(agentDir);

    // Create initial prompt file
    const promptFile = path.join(agentDir, 'initial-prompt.txt');
    await fs.writeFile(promptFile, config.prompt);

    // Setup Goose process using 'run' command for better automation
    // Create instruction text including the prompt
    const instructionText = `
Role: ${config.name}
Description: ${config.description}

Task: ${config.initialTask}

Instructions:
${config.prompt}

Working Directory: Please work in the current directory and analyze the project structure.
Output: Save your results to ./results/${config.outputFile}

Please start working on this task now.
`;
    
    const gooseArgs = [
      'run',
      '--text', instructionText,
      '--no-session',
      '--max-turns', '3',
      '--quiet'
    ];
    
    console.log(chalk.gray(`[DEBUG] Executing: goose ${gooseArgs.join(' ')}`));
    console.log(chalk.gray(`[DEBUG] Working directory: ${this.workspaceDir}`));
    
    const childProcess = execa('goose', gooseArgs, {
      cwd: this.workspaceDir, // Use workspace directory as working directory
      env: {
        ...process.env,
        ...config.environment
      },
      timeout: this.timeout,
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const agent: AgentInstance = {
      id: agentId,
      config,
      process: childProcess,
      status: 'waiting',
      output: [],
      error: [],
      startTime: new Date()
    };

    this.agents.set(agentId, agent);
    this.setupProcessHandlers(agent);
    
    return agentId;
  }

  private async sendInitialPrompt(agent: AgentInstance): Promise<void> {
    // Wait longer for the goose session to fully start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
      // Create a detailed prompt including the role and task
      const fullPrompt = `
Role: ${agent.config.name}
Description: ${agent.config.description}

Task: ${agent.config.initialTask}

Instructions:
${agent.config.prompt}

Working Directory: Please work in the current directory and analyze the project structure.
Output: Save your results to ./results/${agent.config.outputFile}

Please start working on this task now.
`;

      // Send the prompt to the goose session
      if (agent.process.stdin && !agent.process.stdin.destroyed) {
        agent.process.stdin.write(fullPrompt + '\n');
      }
    } catch (error) {
      console.error(chalk.red(`Failed to send initial prompt to ${agent.config.name}:`, error));
    }
  }

  private setupProcessHandlers(agent: AgentInstance): void {
    agent.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      agent.output.push(output);
      console.log(chalk.cyan(`[${agent.config.name}]`), output.trim());
      
      // Update progress based on output
      this.updateProgressFromOutput(agent, output);
    });

    agent.process.stderr?.on('data', (data: Buffer) => {
      const error = data.toString();
      agent.error.push(error);
      
      // Don't treat log directory permission errors as fatal
      if (error.includes('Failed to create log directory') || error.includes('Permission denied')) {
        console.warn(chalk.yellow(`[${agent.config.name}] Warning:`), error.trim());
      } else {
        console.error(chalk.red(`[${agent.config.name}]`), error.trim());
      }
    });

    agent.process.on('spawn', () => {
      agent.status = 'running';
      this.progressTracker.updateProgress(agent.id, {
        status: 'running',
        progress: 10
      });
    });

    agent.process.on('exit', (code: number) => {
      agent.status = code === 0 ? 'completed' : 'failed';
      agent.endTime = new Date();
      
      this.progressTracker.updateProgress(agent.id, {
        status: agent.status,
        progress: agent.status === 'completed' ? 100 : 0
      });

      console.log(chalk.green(`✅ Agent ${agent.config.name} ${agent.status}`));
      
      this.handleAgentCompletion(agent);
    });

    agent.process.on('error', (error: Error) => {
      agent.status = 'failed';
      agent.endTime = new Date();
      
      this.progressTracker.updateProgress(agent.id, {
        status: 'failed',
        progress: 0
      });

      console.error(chalk.red(`❌ Agent ${agent.config.name} failed:`, error.message));
    });
  }

  private updateProgressFromOutput(agent: AgentInstance, output: string): void {
    // Simple progress estimation based on output patterns
    let progress = 10; // Initial progress
    
    if (output.includes('Analyzing')) {
      progress = 25;
    } else if (output.includes('Processing')) {
      progress = 50;
    } else if (output.includes('Generating')) {
      progress = 75;
    } else if (output.includes('Completed') || output.includes('Finished')) {
      progress = 90;
    }

    this.progressTracker.updateProgress(agent.id, {
      progress,
      currentTask: this.extractCurrentTask(output)
    });
  }

  private extractCurrentTask(output: string): string | undefined {
    // Extract current task from output
    const taskMatch = output.match(/(?:Task|Step|Action):\s*(.+)/i);
    return taskMatch ? taskMatch[1].trim() : undefined;
  }

  private async handleAgentCompletion(agent: AgentInstance): Promise<void> {
    if (agent.status === 'completed') {
      console.log(chalk.green(`🎉 Agent ${agent.config.name} completed successfully`));
      
      // Trigger next roles if specified
      for (const nextRole of agent.config.nextRoles) {
        await this.triggerNextRole(nextRole, agent);
      }
    } else {
      console.log(chalk.red(`💥 Agent ${agent.config.name} failed`));
    }
  }

  private async triggerNextRole(roleName: string, previousAgent: AgentInstance): Promise<void> {
    try {
      const roleConfig = await this.loadRoleConfig(roleName);
      
      // Pass context from previous agent
      roleConfig.environment = {
        ...roleConfig.environment,
        PREVIOUS_AGENT_OUTPUT: previousAgent.config.outputFile,
        PREVIOUS_AGENT_ID: previousAgent.id
      };
      
      await this.spawnAgent(roleConfig);
    } catch (error) {
      console.error(chalk.red(`Failed to trigger next role ${roleName}:`, error));
    }
  }

  private async loadRoleConfig(roleName: string): Promise<AgentConfig> {
    const configPath = path.join(this.workspaceDir, '..', 'roles', `${roleName}.json`);
    
    if (!(await fs.pathExists(configPath))) {
      throw new Error(`Role configuration not found: ${configPath}`);
    }
    
    return await fs.readJSON(configPath);
  }

  async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      const checkCompletion = () => {
        if (this.progressTracker.isAllCompleted()) {
          resolve();
        } else {
          setTimeout(checkCompletion, 1000);
        }
      };
      checkCompletion();
    });
  }

  async stopAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.process && !agent.process.killed) {
      agent.process.kill();
    }

    await this.progressTracker.updateProgress(agentId, {
      status: 'failed',
      progress: 0
    });

    console.log(chalk.yellow(`🛑 Agent ${agent.config.name} stopped`));
  }

  async stopAllAgents(): Promise<void> {
    const stopPromises = Array.from(this.agents.keys()).map(agentId => 
      this.stopAgent(agentId)
    );
    
    await Promise.all(stopPromises);
  }

  getAgent(agentId: string): AgentInstance | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): AgentInstance[] {
    return Array.from(this.agents.values());
  }

  getActiveAgents(): AgentInstance[] {
    return Array.from(this.agents.values()).filter(agent => 
      agent.status === 'running' || agent.status === 'waiting'
    );
  }

  getCompletedAgents(): AgentInstance[] {
    return Array.from(this.agents.values()).filter(agent => 
      agent.status === 'completed'
    );
  }

  getFailedAgents(): AgentInstance[] {
    return Array.from(this.agents.values()).filter(agent => 
      agent.status === 'failed'
    );
  }

  getTaskQueue(): TaskQueue {
    return this.taskQueue;
  }

  getProgressTracker(): ProgressTracker {
    return this.progressTracker;
  }
}