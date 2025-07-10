/**
 * MCP拡張サーバー
 * GooseにTaskツールを提供するMCPサーバー実装
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { TaskExecutor } from '../core/task-executor.js';
import { TaskRequest, TaskResult, ParallelTasksRequest } from '../types/index.js';

export class GooseFlowMCPServer {
  private server: Server;
  private taskExecutor: TaskExecutor;

  constructor() {
    this.server = new Server(
      {
        name: 'goose-flow',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.taskExecutor = new TaskExecutor();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // ツール一覧を提供
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'task',
            description: 'Execute a subtask using a specialized agent',
            inputSchema: {
              type: 'object',
              properties: {
                description: {
                  type: 'string',
                  description: 'Brief description of the subtask'
                },
                prompt: {
                  type: 'string',
                  description: 'Detailed instructions for the subtask'
                },
                mode: {
                  type: 'string',
                  description: 'Agent mode (coder, researcher, tester, etc.)',
                  default: 'coder'
                },
                maxTurns: {
                  type: 'number',
                  description: 'Maximum number of turns for the subtask',
                  default: 10
                }
              },
              required: ['description', 'prompt']
            }
          },
          {
            name: 'parallel_tasks',
            description: 'Execute multiple independent tasks in parallel',
            inputSchema: {
              type: 'object',
              properties: {
                description: {
                  type: 'string',
                  description: 'Overall description of the parallel operation'
                },
                tasks: {
                  type: 'array',
                  description: 'Array of independent tasks to execute in parallel',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        description: 'Unique identifier for this parallel task'
                      },
                      description: {
                        type: 'string',
                        description: 'Brief task description'
                      },
                      prompt: {
                        type: 'string',
                        description: 'Detailed instructions for the task'
                      },
                      mode: {
                        type: 'string',
                        description: 'Agent mode (coder, architect, tester, etc.)',
                        default: 'coder'
                      },
                      maxTurns: {
                        type: 'number',
                        description: 'Maximum number of turns for this task',
                        default: 10
                      },
                      priority: {
                        type: 'string',
                        enum: ['high', 'medium', 'low'],
                        description: 'Task execution priority',
                        default: 'medium'
                      }
                    },
                    required: ['id', 'description', 'prompt']
                  }
                },
                maxConcurrent: {
                  type: 'number',
                  description: 'Maximum number of tasks to run concurrently',
                  default: 3
                },
                waitForAll: {
                  type: 'boolean',
                  description: 'Wait for all tasks to complete vs fail-fast mode',
                  default: true
                }
              },
              required: ['description', 'tasks']
            }
          },
          {
            name: 'progress',
            description: 'Track and display progress of current orchestration',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['create', 'update', 'complete', 'list', 'parallel_start', 'parallel_update'],
                  description: 'Progress tracking action'
                },
                stepId: {
                  type: 'string',
                  description: 'Step identifier for update/complete actions'
                },
                description: {
                  type: 'string',
                  description: 'Step description for create action'
                },
                parallelTaskId: {
                  type: 'string',
                  description: 'Parallel task identifier for parallel progress tracking'
                },
                parallelStatus: {
                  type: 'object',
                  description: 'Status of parallel tasks execution',
                  properties: {
                    total: { type: 'number' },
                    completed: { type: 'number' },
                    failed: { type: 'number' },
                    active: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  }
                }
              },
              required: ['action']
            }
          }
        ]
      };
    });

    // ツール実行を処理
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'task':
            const taskRequest = this.validateTaskRequest(args);
            return await this.handleTaskTool(taskRequest);
          
          case 'parallel_tasks':
            const parallelTasksRequest = this.validateParallelTasksRequest(args);
            return await this.handleParallelTasksTool(parallelTasksRequest);
          
          case 'progress':
            return await this.handleProgressTool(args);
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private validateTaskRequest(args: unknown): TaskRequest {
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid task request: must be an object');
    }
    
    const { description, prompt, mode, maxTurns } = args as Record<string, unknown>;
    
    if (!description || typeof description !== 'string') {
      throw new Error('Invalid task request: description must be a string');
    }
    
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Invalid task request: prompt must be a string');
    }
    
    return {
      description,
      prompt,
      mode: typeof mode === 'string' ? mode : 'coder',
      maxTurns: typeof maxTurns === 'number' ? maxTurns : 10
    };
  }

  private async handleTaskTool(request: TaskRequest) {
    console.error(`[GooseFlow] Executing subtask: ${request.description}`);
    
    const result: TaskResult = await this.taskExecutor.executeTask(request);
    
    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Task completed successfully.\n\nResult: ${result.result}\n\nMetadata: ${JSON.stringify(result.metadata, null, 2)}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Task failed: ${result.error}\n\nPartial result: ${result.result || 'None'}`
          }
        ]
      };
    }
  }

  private async handleProgressTool(args: any) {
    // 進捗管理の実装（Phase 2で詳細実装）
    const { action, stepId, description } = args;
    
    switch (action) {
      case 'create':
        return {
          content: [
            {
              type: 'text',
              text: `Progress step created: ${description}`
            }
          ]
        };
      
      case 'list':
        return {
          content: [
            {
              type: 'text',
              text: 'Progress tracking: No active steps'
            }
          ]
        };
      
      default:
        return {
          content: [
            {
              type: 'text',
              text: `Progress ${action} completed for step: ${stepId}`
            }
          ]
        };
    }
  }

  // 並列タスクリクエストのバリデーション
  private validateParallelTasksRequest(args: unknown): ParallelTasksRequest {
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid parallel tasks request: must be an object');
    }
    
    const { description, tasks, maxConcurrent, waitForAll } = args as Record<string, unknown>;
    
    if (!description || typeof description !== 'string') {
      throw new Error('Invalid parallel tasks request: description must be a string');
    }
    
    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new Error('Invalid parallel tasks request: tasks must be a non-empty array');
    }
    
    // 各タスクをバリデーション
    const validatedTasks = tasks.map((task, index) => {
      if (!task || typeof task !== 'object') {
        throw new Error(`Invalid task at index ${index}: must be an object`);
      }
      
      const { id, description: taskDesc, prompt, mode, maxTurns, priority } = task as Record<string, unknown>;
      
      if (!id || typeof id !== 'string') {
        throw new Error(`Invalid task at index ${index}: id must be a string`);
      }
      
      if (!taskDesc || typeof taskDesc !== 'string') {
        throw new Error(`Invalid task at index ${index}: description must be a string`);
      }
      
      if (!prompt || typeof prompt !== 'string') {
        throw new Error(`Invalid task at index ${index}: prompt must be a string`);
      }
      
      return {
        id,
        description: taskDesc,
        prompt,
        mode: typeof mode === 'string' ? mode : 'coder',
        maxTurns: typeof maxTurns === 'number' ? maxTurns : 10,
        priority: (typeof priority === 'string' && ['high', 'medium', 'low'].includes(priority)) 
          ? priority as 'high' | 'medium' | 'low' 
          : 'medium'
      };
    });
    
    const result: ParallelTasksRequest = {
      description,
      tasks: validatedTasks
    };
    
    if (typeof maxConcurrent === 'number') {
      result.maxConcurrent = maxConcurrent;
    }
    
    if (typeof waitForAll === 'boolean') {
      result.waitForAll = waitForAll;
    }
    
    return result;
  }

  // 並列タスクツールのハンドラー
  private async handleParallelTasksTool(request: ParallelTasksRequest) {
    console.error(`[GooseFlow] Executing parallel tasks: ${request.description}`);
    console.error(`[GooseFlow] Running ${request.tasks.length} tasks in parallel`);
    
    const result = await this.taskExecutor.executeParallelTasks(request);
    
    // 結果を整形して返す
    let resultText = `Parallel execution completed: ${request.description}\n\n`;
    resultText += `Summary:\n`;
    resultText += `- Total tasks: ${result.results.length}\n`;
    resultText += `- Successful: ${result.metadata.successfulTasks}\n`;
    resultText += `- Failed: ${result.metadata.failedTasks}\n`;
    resultText += `- Duration: ${result.metadata.totalDuration}ms\n`;
    resultText += `- Concurrency: ${result.metadata.concurrentTasks}\n\n`;
    
    resultText += `Task Results:\n`;
    result.results.forEach((taskResult, index) => {
      resultText += `\n${index + 1}. ${taskResult.description} (${taskResult.id}):\n`;
      resultText += `   Status: ${taskResult.success ? 'SUCCESS' : 'FAILED'}\n`;
      resultText += `   Duration: ${taskResult.metadata.duration}ms\n`;
      if (taskResult.success) {
        resultText += `   Result: ${taskResult.result.substring(0, 200)}${taskResult.result.length > 200 ? '...' : ''}\n`;
      } else {
        resultText += `   Error: ${taskResult.error}\n`;
      }
    });
    
    return {
      content: [
        {
          type: 'text',
          text: resultText
        }
      ]
    };
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('[GooseFlow] MCP server started');
  }
}

// MCP拡張として実行される場合のエントリーポイント
export async function startMCPServer(): Promise<void> {
  const server = new GooseFlowMCPServer();
  await server.start();
}