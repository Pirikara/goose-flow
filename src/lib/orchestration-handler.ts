import { EventEmitter } from 'events';
import chalk from 'chalk';
import { logger } from './console-logger';
import { CreateSubtaskRequest, CompleteTaskRequest } from '../types';
import { TOOL_PATTERNS, TASK_DEFAULTS } from './constants';
import { createGooseFlowError, ErrorCode } from './errors';

export interface NewTaskParameters {
  mode: string;
  instruction: string;
  tools?: string[];
  maxTurns?: number;
}

export interface AttemptCompletionParameters {
  result: string;
  summary?: string;
}

export interface ToolCall {
  type: 'new_task' | 'attempt_completion';
  parameters: NewTaskParameters | AttemptCompletionParameters;
}

export interface OrchestrationRequest {
  taskId: string;
  toolCall: ToolCall;
}

export class OrchestrationHandler extends EventEmitter {
  private pendingRequests: Map<string, OrchestrationRequest> = new Map();

  constructor() {
    super();
  }

  /**
   * Parse LLM output to detect orchestration tool calls
   */
  parseOutput(output: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // Parse new_task tool calls using constants
    let match;

    while ((match = TOOL_PATTERNS.NEW_TASK.exec(output)) !== null) {
      try {
        const params = this.parseToolParameters(match[1]);
        if (params.mode && params.instruction) {
          toolCalls.push({
            type: 'new_task',
            parameters: {
              mode: params.mode,
              instruction: params.instruction,
              tools: params.tools ? params.tools.split(',').map(t => t.trim()) : undefined,
              maxTurns: params.maxTurns ? parseInt(params.maxTurns) : TASK_DEFAULTS.MAX_TURNS
            }
          });
        }
      } catch (error) {
        const parseError = createGooseFlowError(
          error,
          ErrorCode.ORCHESTRATION_PARSE_FAILED,
          { operation: 'parseNewTaskParameters' }
        );
        logger.debug('Failed to parse new_task parameters', { operation: 'parseNewTaskParameters', error: parseError.message });
      }
    }

    // Parse attempt_completion tool calls using constants
    while ((match = TOOL_PATTERNS.ATTEMPT_COMPLETION.exec(output)) !== null) {
      try {
        const params = this.parseToolParameters(match[1]);
        if (params.result) {
          toolCalls.push({
            type: 'attempt_completion',
            parameters: {
              result: params.result,
              summary: params.summary
            }
          });
        }
      } catch (error) {
        const parseError = createGooseFlowError(
          error,
          ErrorCode.ORCHESTRATION_PARSE_FAILED,
          { operation: 'parseAttemptCompletionParameters' }
        );
        logger.debug('Failed to parse attempt_completion parameters', { operation: 'parseAttemptCompletionParameters', error: parseError.message });
      }
    }

    // Also check for more structured XML-like format using constants
    while ((match = TOOL_PATTERNS.XML_NEW_TASK.exec(output)) !== null) {
      toolCalls.push({
        type: 'new_task',
        parameters: {
          mode: match[1].trim(),
          instruction: match[2].trim(),
          tools: match[3] ? match[3].trim().split(',').map(t => t.trim()) : undefined,
          maxTurns: match[4] ? parseInt(match[4].trim()) : TASK_DEFAULTS.MAX_TURNS
        }
      });
    }

    while ((match = TOOL_PATTERNS.XML_COMPLETION.exec(output)) !== null) {
      toolCalls.push({
        type: 'attempt_completion',
        parameters: {
          result: match[1].trim(),
          summary: match[2] ? match[2].trim() : undefined
        }
      });
    }

    return toolCalls;
  }

  /**
   * Parse tool parameters from string format like "mode: coder, instruction: create file"
   */
  private parseToolParameters(paramStr: string): Record<string, string> {
    const params: Record<string, string> = {};
    const lines = paramStr.split(',');
    
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
        params[key] = value;
      }
    }
    
    return params;
  }

  /**
   * Handle new_task tool call
   */
  async handleNewTask(taskId: string, params: NewTaskParameters): Promise<string> {
    console.log(chalk.cyan(`🔄 OrchestrationHandler: Creating new task`));
    console.log(chalk.gray(`   Parent: ${taskId}`));
    console.log(chalk.gray(`   Mode: ${params.mode}`));
    console.log(chalk.gray(`   Instruction: ${params.instruction}`));

    const request: CreateSubtaskRequest = {
      mode: params.mode,
      instruction: params.instruction,
      tools: params.tools,
      maxTurns: params.maxTurns || 10
    };

    // Emit event for TaskOrchestrator to handle
    this.emit('new_task', taskId, request);

    return `Task delegation request sent. Creating ${params.mode} subtask: "${params.instruction}"`;
  }

  /**
   * Handle attempt_completion tool call
   */
  async handleAttemptCompletion(taskId: string, params: AttemptCompletionParameters): Promise<string> {
    console.log(chalk.green(`✅ OrchestrationHandler: Task completion`));
    console.log(chalk.gray(`   Task: ${taskId}`));
    console.log(chalk.gray(`   Result: ${params.result}`));

    const request: CompleteTaskRequest = {
      result: params.result,
      summary: params.summary
    };

    // Emit event for TaskOrchestrator to handle  
    this.emit('attempt_completion', taskId, request);

    return `Task completed successfully. Result: ${params.result}`;
  }

  /**
   * Type guard for NewTaskParameters
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isNewTaskParameters(params: any): params is NewTaskParameters {
    return params && typeof params.mode === 'string' && typeof params.instruction === 'string';
  }

  /**
   * Type guard for AttemptCompletionParameters
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isAttemptCompletionParameters(params: any): params is AttemptCompletionParameters {
    return params && typeof params.result === 'string';
  }

  /**
   * Process tool calls found in LLM output
   */
  async processToolCalls(taskId: string, toolCalls: ToolCall[]): Promise<string[]> {
    const responses: string[] = [];

    for (const toolCall of toolCalls) {
      try {
        let response: string;
        
        if (toolCall.type === 'new_task' && this.isNewTaskParameters(toolCall.parameters)) {
          response = await this.handleNewTask(taskId, toolCall.parameters);
        } else if (toolCall.type === 'attempt_completion' && this.isAttemptCompletionParameters(toolCall.parameters)) {
          response = await this.handleAttemptCompletion(taskId, toolCall.parameters);
        } else {
          response = `Invalid tool call: ${toolCall.type} with invalid parameters`;
        }
        
        responses.push(response);
      } catch (error) {
        const toolError = createGooseFlowError(
          error,
          ErrorCode.ORCHESTRATION_TOOL_FAILED,
          { 
            operation: `execute_${toolCall.type}`,
            additionalData: { toolType: toolCall.type, parameters: toolCall.parameters }
          }
        );
        const errorMsg = `Error executing ${toolCall.type}: ${toolError.message}`;
        responses.push(errorMsg);
        logger.error(toolError, { operation: `execute_${toolCall.type}`, additionalData: { toolType: toolCall.type } });
      }
    }

    return responses;
  }

  /**
   * Check if output contains orchestration tool calls
   */
  hasOrchestrationTools(output: string): boolean {
    return TOOL_PATTERNS.TOOL_CHECK.test(output) ||
           TOOL_PATTERNS.XML_TOOL_CHECK.test(output);
  }
}