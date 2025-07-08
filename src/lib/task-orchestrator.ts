import { execa } from 'execa';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import { EventEmitter } from 'events';
import { logger } from './console-logger';
import { Task, GooseProcess, CreateSubtaskRequest, CompleteTaskRequest, TaskHierarchy, OrchestrationEvent } from '../types';
import { TaskStack } from './task-stack';
import { ProgressTracker } from './progress-tracker';
import { SafetyManager } from './safety-manager';
import { ConfigParser } from './config-parser';
import { OrchestrationHandler } from './orchestration-handler';
import { PromptManager } from './prompt-manager';
import { TASK_DEFAULTS, PROGRESS_DEFAULTS, PROCESS_SETTINGS } from './constants';
import { TaskError, createGooseFlowError, ErrorCode } from './errors';

/**
 * @fileoverview TaskOrchestrator - Core orchestration engine for goose-flow
 * 
 * This module implements the main orchestration logic for managing multiple
 * AI agents in a hierarchical task delegation system. It handles task creation,
 * execution, coordination, and the Roo-Code-style boomerang task pattern.
 * 
 * Key features:
 * - Hierarchical task delegation with parent-child relationships
 * - Pause/resume functionality for parent tasks
 * - Real-time progress tracking and monitoring
 * - Safety constraints and limits
 * - Integration with goose processes for AI execution
 * - Structured error handling and logging
 * 
 * @author Claude Code
 * @version 1.0.0
 */

/**
 * TaskOrchestrator manages the execution and coordination of multiple AI agents
 * 
 * This class implements a hierarchical task management system where tasks can
 * create subtasks (delegation) and parent tasks are paused until children complete.
 * This follows the Roo-Code boomerang pattern for AI agent coordination.
 * 
 * @extends EventEmitter
 * @fires TaskOrchestrator#task_completed - When a task completes successfully
 * @fires TaskOrchestrator#orchestration_event - When orchestration events occur
 * 
 * @example
 * ```typescript
 * const orchestrator = new TaskOrchestrator('/workspace');
 * await orchestrator.initialize();
 * 
 * const taskId = await orchestrator.createRootTask(
 *   'orchestrator',
 *   'Analyze the codebase for security vulnerabilities'
 * );
 * 
 * await orchestrator.waitForCompletion();
 * ```
 */
export class TaskOrchestrator extends EventEmitter {
  private taskStack: TaskStack;
  private tasks: Map<string, Task> = new Map();
  private gooseProcesses: Map<string, GooseProcess> = new Map();
  private workspaceDir: string;
  private progressTracker: ProgressTracker;
  private safetyManager: SafetyManager;
  private configParser: ConfigParser;
  private orchestrationHandler: OrchestrationHandler;
  private promptManager: PromptManager;
  private maxConcurrent: number;
  private timeout: number;
  private taskCounter: number = 0;

  /**
   * Create a new TaskOrchestrator instance
   * 
   * @param {string} workspaceDir - Directory for task workspace and outputs
   * @param {number} maxConcurrent - Maximum number of concurrent tasks (default: 4)
   * @param {number} timeout - Task timeout in milliseconds (default: 30 minutes)
   */
  constructor(
    workspaceDir: string, 
    maxConcurrent: number = TASK_DEFAULTS.MAX_CONCURRENT, 
    timeout: number = TASK_DEFAULTS.TIMEOUT
  ) {
    super();
    this.workspaceDir = workspaceDir;
    this.maxConcurrent = maxConcurrent;
    this.timeout = timeout;
    this.taskStack = new TaskStack(TASK_DEFAULTS.STACK_MAX_DEPTH);
    this.progressTracker = new ProgressTracker(path.join(workspaceDir, 'progress.json'));
    this.safetyManager = new SafetyManager({
      maxDepth: TASK_DEFAULTS.MAX_DEPTH,
      maxChildren: TASK_DEFAULTS.MAX_CHILDREN,
      maxTotalTasks: TASK_DEFAULTS.MAX_TOTAL_TASKS,
      maxDuration: timeout
    });
    this.configParser = new ConfigParser(process.cwd());
    this.orchestrationHandler = new OrchestrationHandler();
    this.promptManager = new PromptManager(this.configParser);

    // Forward task stack events
    this.taskStack.on('orchestration_event', (event: OrchestrationEvent) => {
      this.emit('orchestration_event', event);
    });

    // Handle orchestration events
    this.orchestrationHandler.on('new_task', async (parentId: string, request: CreateSubtaskRequest) => {
      await this.createSubtask(parentId, request);
    });

    this.orchestrationHandler.on('attempt_completion', async (taskId: string, request: CompleteTaskRequest) => {
      await this.completeTask(taskId, request);
    });
  }

  /**
   * Initialize the orchestrator and its components
   * 
   * Must be called before using the orchestrator to ensure all
   * components are properly set up.
   * 
   * @returns {Promise<void>}
   * @throws {SystemError} If initialization fails
   */
  async initialize(): Promise<void> {
    await this.progressTracker.initialize();
    logger.debug('TaskOrchestrator initialized', { operation: 'initialize' });
  }

  /**
   * Create and start a root-level task
   * 
   * Root tasks are the entry point for orchestration workflows.
   * They have no parent and can create subtasks through delegation.
   * 
   * @param {string} mode - Agent mode (e.g., 'orchestrator', 'coder', 'researcher')
   * @param {string} instruction - Task instruction or objective
   * @param {Object} options - Additional task options
   * @param {number} [options.maxTurns] - Maximum conversation turns
   * @param {string[]} [options.tools] - Available tools for the agent
   * @param {string} [options.sessionName] - Custom session name
   * @returns {Promise<string>} Task ID of the created root task
   * @throws {TaskError} If task creation fails
   * @throws {SafetyError} If safety limits are exceeded
   */
  async createRootTask(mode: string, instruction: string, options: {
    maxTurns?: number;
    tools?: string[];
    sessionName?: string;
  } = {}): Promise<string> {
    // Safety validation for root task
    this.safetyManager.validateTaskCreation(undefined, mode, this.tasks);

    const task = this.createTask({
      mode,
      instruction,
      depth: 0,
      parentId: undefined,
      rootId: undefined,
      ...options
    });

    task.rootId = task.id; // Root task points to itself
    this.tasks.set(task.id, task);
    this.taskStack.push(task);

    await this.progressTracker.updateProgress(task.id, {
      agentName: `${mode}-root`,
      status: 'pending',
      progress: 0,
      currentTask: instruction
    });

    logger.taskStarted(task.id, mode, instruction);
    
    // Start the task
    await this.startTask(task);
    return task.id;
  }

  /**
   * Create a subtask as a child of an existing task
   * 
   * This implements the delegation pattern where a parent task can create
   * child tasks to handle specific subtasks. The parent is automatically
   * paused until the child completes.
   * 
   * @param {string} parentId - ID of the parent task
   * @param {CreateSubtaskRequest} request - Subtask creation parameters
   * @returns {Promise<string>} Task ID of the created subtask
   * @throws {TaskError} If parent task not found or creation fails
   * @throws {SafetyError} If safety limits (depth, children count) exceeded
   */
  async createSubtask(parentId: string, request: CreateSubtaskRequest): Promise<string> {
    const parentTask = this.tasks.get(parentId);
    if (!parentTask) {
      throw new TaskError(
        `Parent task not found: ${parentId}`,
        ErrorCode.TASK_NOT_FOUND,
        { taskId: parentId, operation: 'createSubtask' }
      );
    }

    const rootTask = this.tasks.get(parentTask.rootId || parentTask.id);
    if (!rootTask) {
      throw new TaskError(
        `Root task not found for parent: ${parentId}`,
        ErrorCode.TASK_NOT_FOUND,
        { taskId: parentTask.rootId || parentTask.id, operation: 'createSubtask', additionalData: { parentId } }
      );
    }

    // Safety validation
    this.safetyManager.validateTaskCreation(parentTask, request.mode, this.tasks);

    const task = this.createTask({
      mode: request.mode,
      instruction: request.instruction,
      depth: parentTask.depth + 1,
      parentId: parentTask.id,
      rootId: rootTask.id,
      tools: request.tools,
      maxTurns: request.maxTurns
    });

    this.tasks.set(task.id, task);
    this.taskStack.push(task);

    // Add child to parent
    parentTask.children.push(task.id);
    parentTask.updatedAt = new Date();

    // Pause parent task
    await this.pauseTask(parentId);

    await this.progressTracker.updateProgress(task.id, {
      agentName: `${request.mode}-subtask`,
      status: 'pending',
      progress: 0,
      currentTask: request.instruction
    });

    logger.taskStarted(task.id, request.mode, request.instruction);
    
    // Start the subtask
    await this.startTask(task);
    return task.id;
  }

  /**
   * Mark a task as completed and handle cleanup
   * 
   * Completes the task, stops its process, removes it from the stack,
   * and resumes the parent task if one exists.
   * 
   * @param {string} taskId - ID of the task to complete
   * @param {CompleteTaskRequest} request - Completion parameters including result
   * @returns {Promise<void>}
   * @throws {TaskError} If task not found
   * @fires TaskOrchestrator#task_completed
   */
  async completeTask(taskId: string, request: CompleteTaskRequest): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new TaskError(
        `Task not found: ${taskId}`,
        ErrorCode.TASK_NOT_FOUND,
        { taskId, operation: 'completeTask' }
      );
    }

    // Update task status
    task.status = 'completed';
    task.result = request.result;
    task.updatedAt = new Date();

    // Stop the goose process
    await this.stopGooseProcess(taskId);

    // Remove from stack
    this.taskStack.removeTask(taskId);

    await this.progressTracker.updateProgress(taskId, {
      status: 'completed',
      progress: 100
    });

    logger.taskCompleted(taskId, task.mode, request.result);

    // If this task has a parent, resume it
    if (task.parentId) {
      await this.resumeParentTask(task.parentId, request.result);
    }

    this.emit('task_completed', taskId, request.result);
  }

  async pauseTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new TaskError(
        `Task not found: ${taskId}`,
        ErrorCode.TASK_NOT_FOUND,
        { taskId, operation: 'pauseTask' }
      );
    }

    const gooseProcess = this.gooseProcesses.get(taskId);
    if (gooseProcess) {
      gooseProcess.status = 'paused';
    }

    task.isPaused = true;
    task.pausedMode = task.mode;
    task.status = 'paused';
    task.updatedAt = new Date();

    this.taskStack.updateTask(taskId, { isPaused: true, status: 'paused' });

    await this.progressTracker.updateProgress(taskId, {
      status: 'paused'
    });

    console.log(chalk.yellow(`⏸️  Task paused: ${taskId}`));
  }

  async resumeParentTask(parentId: string, completionMessage: string): Promise<void> {
    const parentTask = this.tasks.get(parentId);
    if (!parentTask) {
      throw new TaskError(
        `Parent task not found: ${parentId}`,
        ErrorCode.TASK_NOT_FOUND,
        { taskId: parentId, operation: 'resumeParentTask' }
      );
    }

    parentTask.isPaused = false;
    parentTask.status = 'running';
    parentTask.updatedAt = new Date();

    const gooseProcess = this.gooseProcesses.get(parentId);
    if (gooseProcess) {
      gooseProcess.status = 'running';
      
      // Send completion message to the parent goose process
      try {
        if (gooseProcess.process.stdin && !gooseProcess.process.stdin.destroyed) {
          const message = this.promptManager.generateCompletionMessage(parentId, completionMessage || '');
          gooseProcess.process.stdin.write(`\n${message}\n`);
        }
      } catch (error) {
        const processError = createGooseFlowError(
          error,
          ErrorCode.PROCESS_COMMUNICATION_FAILED,
          { taskId: parentId, operation: 'sendCompletionMessage' }
        );
        console.error(chalk.red(`Failed to send completion message to parent task ${parentId}:`), processError.message);
        logger.error(processError, { taskId: parentId, operation: 'sendCompletionMessage' });
      }
    }

    this.taskStack.updateTask(parentId, { isPaused: false, status: 'running' });

    await this.progressTracker.updateProgress(parentId, {
      status: 'running'
    });

    logger.debug('Parent task resumed', { taskId: parentId, operation: 'resumeParentTask', additionalData: { result: completionMessage } });
  }

  private async startTask(task: Task): Promise<void> {
    const sessionName = task.sessionName || `goose-flow-${task.id}`;
    
    // Use current working directory instead of creating subdirectories
    // Create task directory for outputs but run goose from project root
    const taskDir = path.join(this.workspaceDir, 'tasks', task.id);
    await fs.ensureDir(taskDir);

    // Prepare goose command - run from project root (no MCP extension needed)
    const maxTurns = task.mode === 'orchestrator' 
      ? TASK_DEFAULTS.MAX_TURNS_ORCHESTRATOR 
      : (task.data?.maxTurns || TASK_DEFAULTS.MAX_TURNS);
    
    const args = [
      'session',
      '--max-turns', maxTurns.toString()
    ];

    // Add standard tools if specified (but not orchestration tools)
    if (task.data?.tools && task.data.tools.length > 0) {
      const standardTools = task.data.tools.filter((tool: string) => 
        !['new_task', 'attempt_completion'].includes(tool)
      );
      if (standardTools.length > 0) {
        args.push('--with-builtin', standardTools.join(','));
      }
    }

    logger.debug(`Starting goose: ${args.join(' ')}`);
    logger.debug(`Working directory: ${process.cwd()}`);
    console.log(`🔧 DEBUG: Full goose command: goose ${args.join(' ')}`);
    console.log(`🔧 DEBUG: Working directory: ${process.cwd()}`);
    console.log(`🔧 DEBUG: Internal orchestration enabled`);

    try {
      const childProcess = execa('goose', args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          GOOSE_FLOW_TASK_ID: task.id,
          GOOSE_FLOW_PARENT_ID: task.parentId || '',
          GOOSE_FLOW_MODE: task.mode
        },
        timeout: this.timeout,
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const gooseProcess: GooseProcess = {
        taskId: task.id,
        process: childProcess,
        mode: task.mode,
        tools: task.data?.tools || [],
        sessionName,
        status: 'starting'
      };

      this.gooseProcesses.set(task.id, gooseProcess);
      this.setupProcessHandlers(task, gooseProcess);

      task.status = 'running';
      task.updatedAt = new Date();
      this.taskStack.updateTask(task.id, { status: 'running' });

      await this.progressTracker.updateProgress(task.id, {
        status: 'running',
        progress: PROGRESS_DEFAULTS.INITIAL_PROGRESS
      });

      // Send initial instruction after a brief delay
      setTimeout(() => {
        this.sendInitialInstruction(task, gooseProcess);
      }, PROCESS_SETTINGS.INSTRUCTION_DELAY);

    } catch (error) {
      const processError = createGooseFlowError(
        error,
        ErrorCode.PROCESS_START_FAILED,
        { taskId: task.id, mode: task.mode, operation: 'startTask' }
      );
      console.error(`🔧 DEBUG: Failed to start goose process:`, processError.message);
      logger.taskFailed(task.id, task.mode, processError.message);
      task.status = 'failed';
      this.taskStack.updateTask(task.id, { status: 'failed' });
      throw processError;
    }
  }

  private async sendInitialInstruction(task: Task, gooseProcess: GooseProcess): Promise<void> {
    try {
      if (gooseProcess.process.stdin && !gooseProcess.process.stdin.destroyed) {
        // Generate mode-specific prompt using PromptManager
        const modePrompt = await this.promptManager.generateModePrompt(task.mode);
        const fullInstruction = this.promptManager.buildTaskInstruction(modePrompt, task.instruction || '');

        console.log(`🔧 DEBUG: Sending mode-specific instruction to task ${task.id}`);
        console.log(`🔧 DEBUG: Full instruction: "${fullInstruction}"`);
        gooseProcess.process.stdin.write(fullInstruction + '\n');
        logger.debug('Sent mode-specific instruction', { taskId: task.id, mode: task.mode, operation: 'sendInitialInstruction' });
      } else {
        console.error(`🔧 DEBUG: Cannot send instruction - stdin is not available for task ${task.id}`);
      }
    } catch (error) {
      const processError = createGooseFlowError(
        error,
        ErrorCode.PROCESS_COMMUNICATION_FAILED,
        { taskId: task.id, mode: task.mode, operation: 'sendInitialInstruction' }
      );
      console.error(`🔧 DEBUG: Error sending instruction to task ${task.id}:`, processError.message);
      logger.error(processError, { taskId: task.id, mode: task.mode, operation: 'sendInitialInstruction' });
    }
  }

  private setupProcessHandlers(task: Task, gooseProcess: GooseProcess): void {
    gooseProcess.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log(`🔧 DEBUG STDOUT [${task.id}]:`, output.trim());
      logger.taskOutput(task.id, task.mode, output, false);
      
      // Check for orchestration tool calls in output
      this.processOrchestrationOutput(task.id, output);
      
      // Update progress based on output
      this.updateProgressFromOutput(task, output);
    });

    gooseProcess.process.stderr?.on('data', (data: Buffer) => {
      const error = data.toString();
      console.error(`🔧 DEBUG STDERR [${task.id}]:`, error.trim());
      logger.taskOutput(task.id, task.mode, error, true);
    });

    gooseProcess.process.on('spawn', () => {
      gooseProcess.status = 'running';
      logger.debug('Task process started', { taskId: task.id, mode: task.mode, operation: 'processStart' });
    });

    gooseProcess.process.on('exit', (code: number) => {
      console.log(`🔧 DEBUG: Goose process ${task.id} exited with code: ${code}`);
      const status = code === 0 ? 'completed' : 'failed';
      gooseProcess.status = status === 'completed' ? 'completed' : 'failed';
      
      if (task.status !== 'completed') { // Don't override if already completed via complete_task
        task.status = status;
        task.updatedAt = new Date();
        this.taskStack.updateTask(task.id, { status });
      }

      this.progressTracker.updateProgress(task.id, {
        status: task.status,
        progress: task.status === 'completed' ? 100 : 0
      });

      if (task.status === 'completed') {
        logger.taskCompleted(task.id, task.mode);
      } else {
        logger.taskFailed(task.id, task.mode, `Process exited with code ${code}`);
      }
      
      this.handleTaskExit(task, code);
    });

    gooseProcess.process.on('error', (error: Error) => {
      console.error(`🔧 DEBUG: Goose process ${task.id} error:`, error);
      logger.taskFailed(task.id, task.mode, error.message);
      task.status = 'failed';
      gooseProcess.status = 'failed';
      this.taskStack.updateTask(task.id, { status: 'failed' });
      
      this.progressTracker.updateProgress(task.id, {
        status: 'failed',
        progress: 0
      });
    });
  }

  private updateProgressFromOutput(task: Task, output: string): void {
    let progress: number = PROGRESS_DEFAULTS.INITIAL_PROGRESS;
    let activity: string | undefined;
    
    // Detect progress based on output patterns
    if (output.includes('Starting') || output.includes('Initializing')) {
      progress = PROGRESS_DEFAULTS.STARTING_PROGRESS;
      activity = 'Starting analysis';
    } else if (output.includes('Analyzing') || output.includes('Reading')) {
      progress = PROGRESS_DEFAULTS.ANALYZING_PROGRESS;
      activity = 'Analyzing files';
    } else if (output.includes('Scanning') || output.includes('Searching')) {
      progress = PROGRESS_DEFAULTS.SCANNING_PROGRESS;
      activity = 'Scanning for vulnerabilities';
    } else if (output.includes('Processing') || output.includes('Working')) {
      progress = PROGRESS_DEFAULTS.PROCESSING_PROGRESS;
      activity = 'Processing results';
    } else if (output.includes('Generating') || output.includes('Creating')) {
      progress = PROGRESS_DEFAULTS.GENERATING_PROGRESS;
      activity = 'Generating report';
    } else if (output.includes('Completed') || output.includes('Finished')) {
      progress = PROGRESS_DEFAULTS.COMPLETING_PROGRESS;
      activity = 'Finalizing';
    }

    // Extract specific activity from output
    const currentTask = this.extractCurrentTask(output);
    if (currentTask) {
      activity = currentTask;
    }

    this.progressTracker.updateProgress(task.id, {
      progress,
      currentTask: activity
    });

    // Show real-time progress
    logger.taskProgress(task.id, task.mode, progress, task.status, activity);
  }

  private extractCurrentTask(output: string): string | undefined {
    const taskMatch = output.match(/(?:Task|Step|Action):\s*(.+)/i);
    return taskMatch ? taskMatch[1].trim() : undefined;
  }

  private async handleTaskExit(task: Task, exitCode: number): Promise<void> {
    // Clean up
    this.gooseProcesses.delete(task.id);
    
    if (exitCode !== 0 && task.parentId) {
      // If task failed and has parent, resume parent with error
      await this.resumeParentTask(task.parentId, `Subtask failed with exit code: ${exitCode}`);
    }
  }

  private async stopGooseProcess(taskId: string): Promise<void> {
    const gooseProcess = this.gooseProcesses.get(taskId);
    if (!gooseProcess) {
      return;
    }

    if (gooseProcess.process && !gooseProcess.process.killed) {
      try {
        gooseProcess.process.kill('SIGTERM');
        console.log(chalk.yellow(`🛑 Stopped goose process for task: ${taskId}`));
      } catch (error) {
        const processError = createGooseFlowError(
          error,
          ErrorCode.PROCESS_COMMUNICATION_FAILED,
          { taskId, operation: 'stopGooseProcess' }
        );
        console.error(chalk.red(`Failed to stop goose process for task ${taskId}:`), processError.message);
        logger.error(processError, { taskId, operation: 'stopGooseProcess' });
      }
    }

    this.gooseProcesses.delete(taskId);
  }

  private createTask(options: {
    mode: string;
    instruction: string;
    depth: number;
    parentId?: string;
    rootId?: string;
    tools?: string[];
    maxTurns?: number;
    sessionName?: string;
  }): Task {
    const taskId = `task-${Date.now()}-${++this.taskCounter}`;
    
    return {
      id: taskId,
      type: 'orchestration',
      role: options.mode,
      data: {
        tools: options.tools,
        maxTurns: options.maxTurns
      },
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedAgent: options.mode,
      parentId: options.parentId,
      rootId: options.rootId,
      depth: options.depth,
      mode: options.mode,
      isPaused: false,
      children: [],
      instruction: options.instruction,
      sessionName: options.sessionName
    };
  }

  // Public API methods
  async stopTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new TaskError(
        `Task not found: ${taskId}`,
        ErrorCode.TASK_NOT_FOUND,
        { taskId, operation: 'stopTask' }
      );
    }

    await this.stopGooseProcess(taskId);
    task.status = 'failed';
    task.updatedAt = new Date();
    
    this.taskStack.removeTask(taskId);
    this.progressTracker.updateProgress(taskId, {
      status: 'failed',
      progress: 0
    });

    console.log(chalk.yellow(`🛑 Task stopped: ${taskId}`));
  }

  async stopAllTasks(): Promise<void> {
    const stopPromises = Array.from(this.tasks.keys()).map(taskId => 
      this.stopTask(taskId).catch(error => 
        console.error(`Failed to stop task ${taskId}:`, error)
      )
    );
    
    await Promise.all(stopPromises);
    this.taskStack.clear();
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTaskHierarchy(): TaskHierarchy[] {
    const rootTasks = this.getAllTasks().filter(task => !task.parentId);
    return rootTasks.map(task => this.buildTaskHierarchy(task));
  }

  private buildTaskHierarchy(task: Task): TaskHierarchy {
    const children = task.children
      .map(childId => this.tasks.get(childId))
      .filter(child => child !== undefined)
      .map(child => this.buildTaskHierarchy(child!));

    return {
      id: task.id,
      mode: task.mode,
      status: task.status,
      depth: task.depth,
      children,
      startTime: task.createdAt,
      endTime: task.status === 'completed' || task.status === 'failed' ? task.updatedAt : undefined,
      result: task.result
    };
  }

  getCurrentTask(): Task | undefined {
    return this.taskStack.getCurrentTask();
  }

  getTaskStack(): TaskStack {
    return this.taskStack;
  }

  getProgressTracker(): ProgressTracker {
    return this.progressTracker;
  }

  getSafetyManager(): SafetyManager {
    return this.safetyManager;
  }

  // Wait for all tasks to complete
  /**
   * Wait for all tasks to complete
   * 
   * Polls the task status until no active tasks remain.
   * Useful for waiting for the entire orchestration workflow to finish.
   * 
   * @returns {Promise<void>} Resolves when all tasks are complete
   */
  async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      const checkCompletion = () => {
        const activeTasks = this.getAllTasks().filter(task => 
          task.status === 'running' || task.status === 'pending' || task.status === 'paused'
        );
        
        if (activeTasks.length === 0) {
          resolve();
        } else {
          setTimeout(checkCompletion, 1000);
        }
      };
      checkCompletion();
    });
  }

  private async processOrchestrationOutput(taskId: string, output: string): Promise<void> {
    try {
      // Check if output contains orchestration tool calls
      if (this.orchestrationHandler.hasOrchestrationTools(output)) {
        console.log(chalk.yellow(`🔍 OrchestrationOutput detected in task ${taskId}`));
        
        // Parse tool calls from output
        const toolCalls = this.orchestrationHandler.parseOutput(output);
        
        if (toolCalls.length > 0) {
          console.log(chalk.cyan(`🛠️  Found ${toolCalls.length} orchestration tool call(s)`));
          
          // Process the tool calls
          const responses = await this.orchestrationHandler.processToolCalls(taskId, toolCalls);
          
          // Send responses back to the goose process
          const gooseProcess = this.gooseProcesses.get(taskId);
          if (gooseProcess && gooseProcess.process.stdin && !gooseProcess.process.stdin.destroyed) {
            for (const response of responses) {
              console.log(chalk.green(`📤 Sending tool response: ${response}`));
              const toolResponse = this.promptManager.generateToolResponse(response);
              gooseProcess.process.stdin.write(`${toolResponse}\n`);
            }
          }
        }
      }
    } catch (error) {
      const orchestrationError = createGooseFlowError(
        error,
        ErrorCode.ORCHESTRATION_PARSE_FAILED,
        { taskId, operation: 'processOrchestrationOutput' }
      );
      console.error(chalk.red(`❌ Error processing orchestration output for task ${taskId}:`), orchestrationError.message);
      logger.error(orchestrationError, { taskId, operation: 'processOrchestrationOutput' });
    }
  }

}