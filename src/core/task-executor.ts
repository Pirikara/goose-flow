/**
 * タスク実行エンジン
 * Gooseプロセスを起動してサブタスクを実行
 */

import { execa } from 'execa';
import { TaskRequest, TaskResult, GooseProcess } from '../types/index.js';
import { randomUUID } from 'crypto';

export class TaskExecutor {
  private activeProcesses: Map<string, GooseProcess> = new Map();
  private processResults: Map<string, string> = new Map();

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

  // 内部管理用のメソッド - MCP拡張としてのみ使用
  public getActiveProcessCount(): number {
    return this.activeProcesses.size;
  }
}