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

// 並列処理用の型定義
export interface ParallelTask {
  id: string;                    // Unique identifier for this parallel task
  description: string;           // Brief task description
  prompt: string;               // Detailed task instructions
  mode: string;                 // Agent mode (coder, architect, etc.)
  maxTurns?: number;           // Max turns for this specific task
  priority?: 'high' | 'medium' | 'low'; // Execution priority
}

export interface ParallelTasksRequest {
  description: string;           // Overall parallel operation description
  tasks: ParallelTask[];        // Array of independent tasks
  maxConcurrent?: number;       // Override default concurrency limit
  waitForAll?: boolean;         // Wait for all tasks vs fail-fast (default: true)
}

export interface ParallelTaskResult {
  id: string;
  description: string;
  success: boolean;
  result: string;
  error?: string;
  metadata: {
    duration: number;
    turns: number;
    startTime: number;
    endTime: number;
  };
}

export interface ParallelTasksResult {
  success: boolean;
  description: string;
  results: ParallelTaskResult[];
  metadata: {
    totalDuration: number;
    concurrentTasks: number;
    failedTasks: number;
    successfulTasks: number;
  };
}

// 進捗追跡の拡張
export interface ProgressUpdate {
  action: 'create' | 'update' | 'complete' | 'list' | 'parallel_start' | 'parallel_update';
  stepId?: string;
  description?: string;
  parallelTaskId?: string;        // For parallel task progress
  parallelStatus?: {
    total: number;
    completed: number;
    failed: number;
    active: string[];             // Currently running task IDs
  };
}