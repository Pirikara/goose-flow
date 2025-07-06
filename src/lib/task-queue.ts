import * as fs from 'fs-extra';
import * as path from 'path';
import { Task } from '../types';

export class TaskQueue {
  private filePath: string;
  private tasks: Map<string, Task> = new Map();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async initialize(): Promise<void> {
    await this.loadTasks();
  }

  async addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTask: Task = {
      id,
      ...task,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(id, newTask);
    await this.saveTasks();
    return id;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task ${id} not found`);
    }

    Object.assign(task, updates, { updatedAt: new Date() });
    await this.saveTasks();
  }

  async removeTask(id: string): Promise<void> {
    this.tasks.delete(id);
    await this.saveTasks();
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTasksByRole(role: string): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.role === role);
  }

  getTasksByStatus(status: Task['status']): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }

  getPendingTasks(): Task[] {
    return this.getTasksByStatus('pending');
  }

  getInProgressTasks(): Task[] {
    return this.getTasksByStatus('in-progress');
  }

  getCompletedTasks(): Task[] {
    return this.getTasksByStatus('completed');
  }

  getFailedTasks(): Task[] {
    return this.getTasksByStatus('failed');
  }

  async clear(): Promise<void> {
    this.tasks.clear();
    await this.saveTasks();
  }

  private async loadTasks(): Promise<void> {
    try {
      if (await fs.pathExists(this.filePath)) {
        const data = await fs.readJSON(this.filePath);
        this.tasks = new Map(data.map((task: Task) => [task.id, task]));
      }
    } catch (error) {
      console.warn(`Failed to load tasks from ${this.filePath}:`, error);
      this.tasks = new Map();
    }
  }

  private async saveTasks(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.filePath));
      const data = Array.from(this.tasks.values());
      await fs.writeJSON(this.filePath, data, { spaces: 2 });
    } catch (error) {
      console.error(`Failed to save tasks to ${this.filePath}:`, error);
      throw error;
    }
  }
}