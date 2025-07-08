import { Task } from '../types';

interface TaskLimits {
  maxDepth: number;        // Maximum nesting level (default: 5)
  maxChildren: number;     // Maximum subtasks per parent (default: 10)
  maxTotalTasks: number;   // Maximum total tasks in session (default: 50)
  maxDuration: number;     // Maximum execution time (default: 30 minutes)
}

export class SafetyManager {
  private taskLimits: TaskLimits = {
    maxDepth: 5,
    maxChildren: 10, 
    maxTotalTasks: 50,
    maxDuration: 1800000 // 30 minutes
  };

  private sessionStartTime: Date = new Date();
  private totalTaskCount: number = 0;

  constructor(limits?: Partial<TaskLimits>) {
    if (limits) {
      this.taskLimits = { ...this.taskLimits, ...limits };
    }
  }

  validateTaskCreation(parentTask: Task | undefined, newTaskMode: string, allTasks: Map<string, Task>): boolean {
    // Check total task count
    this.totalTaskCount = allTasks.size + 1; // +1 for the new task
    if (this.totalTaskCount > this.taskLimits.maxTotalTasks) {
      throw new Error(`Maximum total tasks exceeded: ${this.taskLimits.maxTotalTasks}`);
    }

    // Check session duration
    const sessionDuration = Date.now() - this.sessionStartTime.getTime();
    if (sessionDuration > this.taskLimits.maxDuration) {
      throw new Error(`Maximum session duration exceeded: ${this.taskLimits.maxDuration}ms`);
    }

    if (parentTask) {
      // Check depth limit
      if (parentTask.depth >= this.taskLimits.maxDepth) {
        throw new Error(`Maximum task depth exceeded: ${this.taskLimits.maxDepth}`);
      }

      // Check children limit
      if (parentTask.children.length >= this.taskLimits.maxChildren) {
        throw new Error(`Maximum children per task exceeded: ${this.taskLimits.maxChildren}`);
      }

      // Check for identical subtask loops
      const recentSiblings = parentTask.children
        .map(id => allTasks.get(id))
        .filter(task => task !== undefined && task.mode === newTaskMode)
        .length;
      
      if (recentSiblings >= 3) {
        throw new Error(`Potential infinite loop detected: ${newTaskMode} created too frequently`);
      }
    }

    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validateCommandExecution(command: string, _mode: string): boolean {
    // Check for dangerous commands
    const dangerousCommands = [
      /^sudo\s/,
      /^rm\s+-rf\s+\//,
      /^dd\s+if=/,
      /^mkfs\./,
      /^fdisk\s/,
      /^format\s/,
      /^del\s+\/s\s+\/q\s+\*/i,
      /^rmdir\s+\/s\s+\/q\s+\*/i
    ];

    for (const pattern of dangerousCommands) {
      if (pattern.test(command)) {
        throw new Error(`Dangerous command blocked: ${command}`);
      }
    }

    return true;
  }

  validateFileOperation(filePath: string, operation: 'read' | 'write' | 'delete'): boolean {
    // Check for sensitive file patterns
    const sensitivePatterns = [
      /\/etc\/passwd$/,
      /\/etc\/shadow$/,
      /\/etc\/sudoers$/,
      /\.ssh\/id_rsa$/,
      /\.ssh\/id_ed25519$/,
      /\.env$/,
      /\.secret$/,
      /\.key$/,
      /\.pem$/,
      /password/i,
      /secret/i,
      /token/i
    ];

    if (operation === 'write' || operation === 'delete') {
      for (const pattern of sensitivePatterns) {
        if (pattern.test(filePath)) {
          throw new Error(`Sensitive file operation blocked: ${operation} on ${filePath}`);
        }
      }
    }

    // Block system directory modifications
    const systemPaths = [
      /^\/bin\//,
      /^\/sbin\//,
      /^\/usr\/bin\//,
      /^\/usr\/sbin\//,
      /^\/etc\//,
      /^\/boot\//,
      /^\/proc\//,
      /^\/sys\//,
      /^C:\\Windows\\/i,
      /^C:\\Program Files\\/i
    ];

    if (operation === 'write' || operation === 'delete') {
      for (const pattern of systemPaths) {
        if (pattern.test(filePath)) {
          throw new Error(`System path modification blocked: ${operation} on ${filePath}`);
        }
      }
    }

    return true;
  }

  getSessionStats(): {
    totalTasks: number;
    sessionDuration: number;
    limitsStatus: {
      tasksRemaining: number;
      timeRemaining: number;
      depthLimit: number;
      childrenLimit: number;
    };
  } {
    const sessionDuration = Date.now() - this.sessionStartTime.getTime();
    
    return {
      totalTasks: this.totalTaskCount,
      sessionDuration,
      limitsStatus: {
        tasksRemaining: this.taskLimits.maxTotalTasks - this.totalTaskCount,
        timeRemaining: this.taskLimits.maxDuration - sessionDuration,
        depthLimit: this.taskLimits.maxDepth,
        childrenLimit: this.taskLimits.maxChildren
      }
    };
  }

  reset(): void {
    this.sessionStartTime = new Date();
    this.totalTaskCount = 0;
  }

  updateLimits(limits: Partial<TaskLimits>): void {
    this.taskLimits = { ...this.taskLimits, ...limits };
  }
}