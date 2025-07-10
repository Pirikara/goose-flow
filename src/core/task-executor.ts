/**
 * タスク実行エンジン
 * Gooseプロセスを起動してサブタスクを実行
 */

import { execa } from 'execa';
import { TaskRequest, TaskResult, GooseProcess, ParallelTask, ParallelTasksRequest, ParallelTasksResult, ParallelTaskResult } from '../types/index.js';
import { randomUUID } from 'crypto';

export class TaskExecutor {
  private activeProcesses: Map<string, GooseProcess> = new Map();
  private processResults: Map<string, string> = new Map();
  private maxConcurrentTasks: number = 3; // デフォルトの並列実行数制限

  public async executeTask(request: TaskRequest): Promise<TaskResult> {
    const taskId = randomUUID();
    const startTime = Date.now();
    
    console.error(`[TaskExecutor] Starting task ${taskId}: ${request.description}`);
    
    try {
      const result = await this.runGooseProcess(taskId, request);
      const endTime = Date.now();
      
      return {
        success: true,
        result: result,
        metadata: {
          duration: endTime - startTime,
          turns: 1, // 後で実際のターン数を追跡
          model: 'goose-agent'
        }
      };
    } catch (error) {
      const endTime = Date.now();
      
      return {
        success: false,
        result: '',
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          duration: endTime - startTime,
          turns: 0
        }
      };
    }
  }

  private async runGooseProcess(taskId: string, request: TaskRequest): Promise<string> {
    const processInfo: GooseProcess = {
      id: taskId,
      pid: 0,
      mode: request.mode || 'coder',
      status: 'running',
      startTime: Date.now()
    };

    this.activeProcesses.set(taskId, processInfo);

    try {
      // Gooseプロセスを起動
      const gooseArgs = [
        'run',
        '--text', request.prompt,
        '--no-session',
        '--quiet',
        '--max-turns', String(request.maxTurns || 10)
      ];

      console.error(`[TaskExecutor] Running: goose ${gooseArgs.join(' ')}`);
      
      const currentDir = process.cwd();
      const currentEnv = process.env;
      
      const gooseProcess = execa('goose', gooseArgs, {
        cwd: currentDir,
        env: {
          ...currentEnv,
          GOOSE_FLOW_TASK_ID: taskId,
          GOOSE_FLOW_MODE: request.mode || 'coder'
        }
      });

      // プロセスIDを記録
      processInfo.pid = gooseProcess.pid!;
      this.activeProcesses.set(taskId, processInfo);

      // 実行結果を待つ
      const { stdout, stderr } = await gooseProcess;
      
      // プロセス完了を記録
      processInfo.status = 'completed';
      processInfo.endTime = Date.now();
      this.activeProcesses.set(taskId, processInfo);

      // 結果を解析して返す
      const result = this.parseGooseOutput(stdout, stderr);
      this.processResults.set(taskId, result);
      
      console.error(`[TaskExecutor] Task ${taskId} completed`);
      return result;

    } catch (error) {
      // エラーを記録
      processInfo.status = 'failed';
      processInfo.endTime = Date.now();
      this.activeProcesses.set(taskId, processInfo);
      
      console.error(`[TaskExecutor] Task ${taskId} failed:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private parseGooseOutput(stdout: string, stderr: string): string {
    // --quietモードでは、stdoutにはモデルの応答のみが含まれる
    let result = stdout.trim();
    
    // エラーがある場合は含める
    if (stderr && stderr.trim()) {
      result += `\n\nErrors: ${stderr.trim()}`;
    }
    
    // 結果が空の場合はデフォルトメッセージ
    return result || 'Task completed (no specific output)';
  }

  // 並列タスク実行メソッド
  public async executeParallelTasks(request: ParallelTasksRequest): Promise<ParallelTasksResult> {
    const startTime = Date.now();
    const maxConcurrent = request.maxConcurrent || this.maxConcurrentTasks;
    const waitForAll = request.waitForAll !== false; // デフォルトは true
    
    console.error(`[TaskExecutor] Starting parallel execution: ${request.description}`);
    console.error(`[TaskExecutor] Running ${request.tasks.length} tasks with max concurrency: ${maxConcurrent}`);
    
    try {
      const results = await this.executeTasksInBatches(request.tasks, maxConcurrent, waitForAll);
      const endTime = Date.now();
      
      const successfulTasks = results.filter(r => r.success).length;
      const failedTasks = results.filter(r => !r.success).length;
      
      return {
        success: waitForAll ? failedTasks === 0 : successfulTasks > 0,
        description: request.description,
        results: results,
        metadata: {
          totalDuration: endTime - startTime,
          concurrentTasks: Math.min(request.tasks.length, maxConcurrent),
          failedTasks: failedTasks,
          successfulTasks: successfulTasks
        }
      };
    } catch (error) {
      const endTime = Date.now();
      
      // エラー時は空の結果リストを返す
      return {
        success: false,
        description: request.description,
        results: [],
        metadata: {
          totalDuration: endTime - startTime,
          concurrentTasks: 0,
          failedTasks: request.tasks.length,
          successfulTasks: 0
        }
      };
    }
  }
  
  // バッチ処理で並列実行
  private async executeTasksInBatches(
    tasks: ParallelTask[], 
    maxConcurrent: number,
    waitForAll: boolean
  ): Promise<ParallelTaskResult[]> {
    const results: ParallelTaskResult[] = [];
    const taskQueue = [...tasks]; // タスクのコピーを作成
    
    while (taskQueue.length > 0) {
      // 現在のバッチを取得
      const currentBatch = taskQueue.splice(0, maxConcurrent);
      
      console.error(`[TaskExecutor] Executing batch of ${currentBatch.length} tasks`);
      
      // バッチ内のタスクを並列実行
      const batchPromises = currentBatch.map(task => this.executeParallelTask(task));
      
      if (waitForAll) {
        // 全てのタスクの完了を待つ
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            const task = currentBatch[index];
            if (!task) throw new Error(`Task at index ${index} is undefined`);
            return this.createFailedResult(task, result.reason);
          }
        }));
      } else {
        // 一つでも成功すれば続行（fail-fast モード）
        try {
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
        } catch (error) {
          // 失敗したタスクも結果に含める
          const settledResults = await Promise.allSettled(batchPromises);
          results.push(...settledResults.map((result, index) => {
            if (result.status === 'fulfilled') {
              return result.value;
            } else {
              const task = currentBatch[index];
              if (!task) throw new Error(`Task at index ${index} is undefined`);
              return this.createFailedResult(task, result.reason);
            }
          }));
        }
      }
    }
    
    return results;
  }
  
  // 単一の並列タスクを実行
  private async executeParallelTask(parallelTask: ParallelTask): Promise<ParallelTaskResult> {
    const startTime = Date.now();
    
    console.error(`[TaskExecutor] Starting parallel task ${parallelTask.id}: ${parallelTask.description}`);
    
    try {
      // 既存のexecuteTaskメソッドを再利用
      const taskRequest: TaskRequest = {
        description: parallelTask.description,
        prompt: parallelTask.prompt,
        mode: parallelTask.mode,
        maxTurns: parallelTask.maxTurns || 10
      };
      
      const result = await this.executeTask(taskRequest);
      const endTime = Date.now();
      
      return {
        id: parallelTask.id,
        description: parallelTask.description,
        success: result.success,
        result: result.result,
        ...(result.error && { error: result.error }),
        metadata: {
          duration: endTime - startTime,
          turns: result.metadata?.turns || 0,
          startTime: startTime,
          endTime: endTime
        }
      };
    } catch (error) {
      const endTime = Date.now();
      
      return this.createFailedResult(parallelTask, error, startTime, endTime);
    }
  }
  
  // 失敗したタスクの結果を作成
  private createFailedResult(
    parallelTask: ParallelTask, 
    error: any, 
    startTime?: number, 
    endTime?: number
  ): ParallelTaskResult {
    const actualStartTime = startTime || Date.now();
    const actualEndTime = endTime || Date.now();
    
    return {
      id: parallelTask.id,
      description: parallelTask.description,
      success: false,
      result: '',
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        duration: actualEndTime - actualStartTime,
        turns: 0,
        startTime: actualStartTime,
        endTime: actualEndTime
      }
    };
  }

  // 内部管理用のメソッド - MCP拡張としてのみ使用
  public getActiveProcessCount(): number {
    return this.activeProcesses.size;
  }
}