import { Task, TaskStackEntry, OrchestrationEvent } from '../types';
import { EventEmitter } from 'events';

export class TaskStack extends EventEmitter {
  private stack: TaskStackEntry[] = [];
  private maxDepth: number;

  constructor(maxDepth: number = 10) {
    super();
    this.maxDepth = maxDepth;
  }

  push(task: Task): void {
    if (this.stack.length >= this.maxDepth) {
      throw new Error(`Maximum task depth exceeded: ${this.maxDepth}`);
    }

    const entry: TaskStackEntry = {
      task,
      timestamp: new Date()
    };

    this.stack.push(entry);
    
    this.emitEvent({
      type: 'task_created',
      taskId: task.id,
      parentId: task.parentId,
      timestamp: new Date()
    });

    console.log(`[TaskStack] Task ${task.id} pushed to stack (depth: ${this.stack.length})`);
  }

  pop(): Task | undefined {
    const entry = this.stack.pop();
    if (!entry) {
      return undefined;
    }

    const task = entry.task;
    console.log(`[TaskStack] Task ${task.id} popped from stack (depth: ${this.stack.length})`);
    
    return task;
  }

  peek(): Task | undefined {
    if (this.stack.length === 0) {
      return undefined;
    }
    return this.stack[this.stack.length - 1].task;
  }

  size(): number {
    return this.stack.length;
  }

  isEmpty(): boolean {
    return this.stack.length === 0;
  }

  getHierarchy(): string[] {
    return this.stack.map(entry => entry.task.id);
  }

  getCurrentTask(): Task | undefined {
    return this.peek();
  }

  findTask(taskId: string): Task | undefined {
    const entry = this.stack.find(entry => entry.task.id === taskId);
    return entry?.task;
  }

  findParentTask(taskId: string): Task | undefined {
    const currentIndex = this.stack.findIndex(entry => entry.task.id === taskId);
    if (currentIndex <= 0) {
      return undefined;
    }
    return this.stack[currentIndex - 1].task;
  }

  getTaskDepth(taskId: string): number {
    const index = this.stack.findIndex(entry => entry.task.id === taskId);
    return index >= 0 ? index : -1;
  }

  getRootTask(): Task | undefined {
    if (this.stack.length === 0) {
      return undefined;
    }
    return this.stack[0].task;
  }

  getAllTasks(): Task[] {
    return this.stack.map(entry => entry.task);
  }

  getActiveTaskChain(): Task[] {
    return this.getAllTasks();
  }

  updateTask(taskId: string, updates: Partial<Task>): boolean {
    const entry = this.stack.find(entry => entry.task.id === taskId);
    if (!entry) {
      return false;
    }

    Object.assign(entry.task, updates, { updatedAt: new Date() });
    
    // Emit status change events
    if (updates.status) {
      const eventType = this.getEventTypeFromStatus(updates.status);
      if (eventType) {
        this.emitEvent({
          type: eventType,
          taskId,
          parentId: entry.task.parentId,
          timestamp: new Date()
        });
      }
    }

    return true;
  }

  removeTask(taskId: string): Task | undefined {
    const index = this.stack.findIndex(entry => entry.task.id === taskId);
    if (index === -1) {
      return undefined;
    }

    const entry = this.stack.splice(index, 1)[0];
    console.log(`[TaskStack] Task ${taskId} removed from stack at index ${index}`);
    
    return entry.task;
  }

  clear(): void {
    const tasks = this.getAllTasks();
    this.stack = [];
    
    // Emit completion events for all tasks
    tasks.forEach(task => {
      this.emitEvent({
        type: 'task_completed',
        taskId: task.id,
        parentId: task.parentId,
        timestamp: new Date()
      });
    });

    console.log('[TaskStack] Stack cleared');
  }

  getStackInfo(): {
    size: number;
    maxDepth: number;
    currentTask?: string;
    hierarchy: string[];
  } {
    return {
      size: this.size(),
      maxDepth: this.maxDepth,
      currentTask: this.getCurrentTask()?.id,
      hierarchy: this.getHierarchy()
    };
  }

  private getEventTypeFromStatus(status: string): OrchestrationEvent['type'] | null {
    switch (status) {
      case 'paused':
        return 'task_paused';
      case 'running':
        return 'task_resumed';
      case 'completed':
        return 'task_completed';
      case 'failed':
        return 'task_failed';
      default:
        return null;
    }
  }

  private emitEvent(event: OrchestrationEvent): void {
    this.emit('orchestration_event', event);
    this.emit(event.type, event);
  }

  // Debug methods
  printStack(): void {
    console.log('[TaskStack] Current stack:');
    this.stack.forEach((entry, index) => {
      const task = entry.task;
      console.log(`  ${index}: ${task.id} (${task.mode}) - ${task.status}`);
    });
  }

  toJSON() {
    return {
      stack: this.stack,
      size: this.size(),
      maxDepth: this.maxDepth,
      hierarchy: this.getHierarchy()
    };
  }
}