import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { TaskOrchestrator } from './task-orchestrator';
import { CreateSubtaskRequest, CompleteTaskRequest } from '../types';

interface OrchestrationRequest {
  type: 'new_task' | 'attempt_completion';
  taskId?: string;
  parentId?: string;
  params: CreateSubtaskRequest | CompleteTaskRequest;
  requestId: string;
}

interface OrchestrationResponse {
  success: boolean;
  result?: string;
  taskId?: string;
  error?: string;
  requestId: string;
}

export class OrchestrationRequestHandler {
  private orchestrator: TaskOrchestrator;
  private requestDir: string;
  private running: boolean = false;
  private watchInterval?: NodeJS.Timeout;

  constructor(orchestrator: TaskOrchestrator) {
    this.orchestrator = orchestrator;
    this.requestDir = '/tmp';
  }

  async start(): Promise<void> {
    this.running = true;
    console.log(chalk.blue('🔄 Starting orchestration request handler'));
    
    // Start watching for request files
    this.watchInterval = setInterval(() => {
      this.processRequestFiles();
    }, 100); // Check every 100ms
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = undefined;
    }
    console.log(chalk.blue('🛑 Stopped orchestration request handler'));
  }

  private async processRequestFiles(): Promise<void> {
    if (!this.running) return;

    try {
      const files = await fs.readdir(this.requestDir);
      const requestFiles = files.filter(file => file.startsWith('goose-flow-request-') && file.endsWith('.json'));

      for (const file of requestFiles) {
        const filePath = path.join(this.requestDir, file);
        await this.processRequestFile(filePath);
      }
    } catch (error) {
      // Ignore errors during directory scanning
    }
  }

  private async processRequestFile(filePath: string): Promise<void> {
    try {
      // Read and parse the request
      const requestData = await fs.readJSON(filePath);
      const request = requestData as OrchestrationRequest;

      console.log(chalk.yellow(`📨 Processing ${request.type} request: ${request.requestId}`));

      // Process the request
      const response = await this.handleRequest(request);

      // Write the response
      const responseFile = filePath.replace('goose-flow-request-', 'goose-flow-response-');
      await fs.writeJSON(responseFile, response);

      // Clean up the request file
      await fs.remove(filePath);

      console.log(chalk.green(`✅ Processed request: ${request.requestId}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to process request file ${filePath}:`, error));
      
      // Try to write an error response
      try {
        const responseFile = filePath.replace('goose-flow-request-', 'goose-flow-response-');
        const errorResponse: OrchestrationResponse = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          requestId: 'unknown'
        };
        await fs.writeJSON(responseFile, errorResponse);
        await fs.remove(filePath);
      } catch (cleanupError) {
        console.error(chalk.red('Failed to write error response:', cleanupError));
      }
    }
  }

  private async handleRequest(request: OrchestrationRequest): Promise<OrchestrationResponse> {
    try {
      switch (request.type) {
        case 'new_task':
          return await this.handleCreateSubtask(request);
        case 'attempt_completion':
          return await this.handleCompleteTask(request);
        default:
          return {
            success: false,
            error: `Unknown request type: ${request.type}`,
            requestId: request.requestId
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        requestId: request.requestId
      };
    }
  }

  private async handleCreateSubtask(request: OrchestrationRequest): Promise<OrchestrationResponse> {
    if (!request.parentId) {
      return {
        success: false,
        error: 'parentId is required for new_task',
        requestId: request.requestId
      };
    }

    const params = request.params as CreateSubtaskRequest;
    
    try {
      const subtaskId = await this.orchestrator.createSubtask(request.parentId, params);
      
      return {
        success: true,
        taskId: subtaskId,
        result: `Created subtask ${subtaskId}`,
        requestId: request.requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        requestId: request.requestId
      };
    }
  }

  private async handleCompleteTask(request: OrchestrationRequest): Promise<OrchestrationResponse> {
    if (!request.taskId) {
      return {
        success: false,
        error: 'taskId is required for attempt_completion',
        requestId: request.requestId
      };
    }

    const params = request.params as CompleteTaskRequest;
    
    try {
      await this.orchestrator.completeTask(request.taskId, params);
      
      return {
        success: true,
        result: 'Task completed successfully',
        requestId: request.requestId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        requestId: request.requestId
      };
    }
  }

  // Cleanup method to remove old request/response files
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.requestDir);
      const gooseFlowFiles = files.filter(file => 
        (file.startsWith('goose-flow-request-') || file.startsWith('goose-flow-response-')) && 
        file.endsWith('.json')
      );

      const now = Date.now();
      const maxAge = 60000; // 1 minute

      for (const file of gooseFlowFiles) {
        const filePath = path.join(this.requestDir, file);
        try {
          const stats = await fs.stat(filePath);
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.remove(filePath);
            console.log(chalk.gray(`🧹 Cleaned up old file: ${file}`));
          }
        } catch (error) {
          // Ignore errors for individual files
        }
      }
    } catch (error) {
      console.error(chalk.red('Failed to cleanup old files:', error));
    }
  }
}