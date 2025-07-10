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
import { TaskRequest, TaskResult } from '../types/index.js';

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
            name: 'progress',
            description: 'Track and display progress of current orchestration',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['create', 'update', 'complete', 'list'],
                  description: 'Progress tracking action'
                },
                stepId: {
                  type: 'string',
                  description: 'Step identifier for update/complete actions'
                },
                description: {
                  type: 'string',
                  description: 'Step description for create action'
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