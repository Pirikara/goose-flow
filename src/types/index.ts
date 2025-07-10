/**
 * 新しいgoose-flow実装の型定義
 * Claude Code流のアプローチ
 */

export interface TaskRequest {
  description: string;
  prompt: string;
  mode?: string;
  maxTurns?: number;
}

export interface TaskResult {
  success: boolean;
  result: string;
  error?: string;
  metadata?: {
    duration: number;
    turns: number;
    model?: string;
  };
}

export interface MCPToolRequest {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface GooseProcess {
  id: string;
  pid: number;
  mode: string;
  status: 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
}

export interface ProgressTracker {
  taskId: string;
  steps: Array<{
    id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    startTime?: number;
    endTime?: number;
    result?: string;
  }>;
}