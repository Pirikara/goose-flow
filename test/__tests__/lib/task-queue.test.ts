import * as fs from 'fs-extra';
import * as path from 'path';
import { TaskQueue } from '../../../src/lib/task-queue';
import { Task } from '../../../src/types';
import { createTempDir, cleanupTempDir } from '../../setup';

describe('TaskQueue', () => {
  let tempDir: string;
  let taskQueue: TaskQueue;
  let taskFilePath: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    taskFilePath = path.join(tempDir, 'task-queue.json');
    taskQueue = new TaskQueue(taskFilePath);
    await taskQueue.initialize();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('addTask', () => {
    it('should add a new task and return task ID', async () => {
      const taskData = {
        type: 'analysis',
        role: 'orchestrator',
        data: { message: 'test task' },
        status: 'pending' as const
      };

      const taskId = await taskQueue.addTask(taskData);

      expect(taskId).toMatch(/^task-\d+-[a-z0-9]+$/);
      
      const task = taskQueue.getTask(taskId);
      expect(task).toBeDefined();
      expect(task!.type).toBe('analysis');
      expect(task!.role).toBe('orchestrator');
      expect(task!.status).toBe('pending');
      expect(task!.createdAt).toBeInstanceOf(Date);
      expect(task!.updatedAt).toBeInstanceOf(Date);
    });

    it('should persist tasks to file', async () => {
      const taskData = {
        type: 'code-generation',
        role: 'coder',
        data: {},
        status: 'pending' as const
      };

      await taskQueue.addTask(taskData);

      expect(await fs.pathExists(taskFilePath)).toBe(true);
      const savedTasks = await fs.readJSON(taskFilePath);
      expect(savedTasks).toHaveLength(1);
      expect(savedTasks[0].type).toBe('code-generation');
    });
  });

  describe('updateTask', () => {
    let taskId: string;

    beforeEach(async () => {
      taskId = await taskQueue.addTask({
        type: 'test',
        role: 'tester',
        data: {},
        status: 'pending'
      });
    });

    it('should update existing task', async () => {
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await taskQueue.updateTask(taskId, {
        status: 'completed',
        data: { result: 'success' }
      });

      const task = taskQueue.getTask(taskId);
      expect(task!.status).toBe('completed');
      expect(task!.data.result).toBe('success');
      expect(task!.updatedAt.getTime()).toBeGreaterThan(task!.createdAt.getTime());
    });

    it('should throw error for non-existent task', async () => {
      await expect(taskQueue.updateTask('non-existent', { status: 'completed' }))
        .rejects.toThrow('Task non-existent not found');
    });
  });

  describe('removeTask', () => {
    it('should remove existing task', async () => {
      const taskId = await taskQueue.addTask({
        type: 'test',
        role: 'tester',
        data: {},
        status: 'pending'
      });

      await taskQueue.removeTask(taskId);

      expect(taskQueue.getTask(taskId)).toBeUndefined();
    });
  });

  describe('getTasksByRole', () => {
    beforeEach(async () => {
      await taskQueue.addTask({
        type: 'task1',
        role: 'orchestrator',
        data: {},
        status: 'pending'
      });

      await taskQueue.addTask({
        type: 'task2',
        role: 'coder',
        data: {},
        status: 'pending'
      });

      await taskQueue.addTask({
        type: 'task3',
        role: 'orchestrator',
        data: {},
        status: 'completed'
      });
    });

    it('should return tasks for specific role', async () => {
      const orchestratorTasks = taskQueue.getTasksByRole('orchestrator');
      expect(orchestratorTasks).toHaveLength(2);
      expect(orchestratorTasks.every(task => task.role === 'orchestrator')).toBe(true);

      const coderTasks = taskQueue.getTasksByRole('coder');
      expect(coderTasks).toHaveLength(1);
      expect(coderTasks[0].role).toBe('coder');
    });
  });

  describe('getTasksByStatus', () => {
    beforeEach(async () => {
      await taskQueue.addTask({
        type: 'task1',
        role: 'orchestrator',
        data: {},
        status: 'pending'
      });

      await taskQueue.addTask({
        type: 'task2',
        role: 'coder',
        data: {},
        status: 'in-progress'
      });

      await taskQueue.addTask({
        type: 'task3',
        role: 'tester',
        data: {},
        status: 'completed'
      });
    });

    it('should return pending tasks', () => {
      const pendingTasks = taskQueue.getPendingTasks();
      expect(pendingTasks).toHaveLength(1);
      expect(pendingTasks[0].status).toBe('pending');
    });

    it('should return in-progress tasks', () => {
      const inProgressTasks = taskQueue.getInProgressTasks();
      expect(inProgressTasks).toHaveLength(1);
      expect(inProgressTasks[0].status).toBe('in-progress');
    });

    it('should return completed tasks', () => {
      const completedTasks = taskQueue.getCompletedTasks();
      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0].status).toBe('completed');
    });

    it('should return failed tasks', () => {
      const failedTasks = taskQueue.getFailedTasks();
      expect(failedTasks).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should clear all tasks', async () => {
      await taskQueue.addTask({
        type: 'task1',
        role: 'orchestrator',
        data: {},
        status: 'pending'
      });

      await taskQueue.addTask({
        type: 'task2',
        role: 'coder',
        data: {},
        status: 'completed'
      });

      expect(taskQueue.getAllTasks()).toHaveLength(2);

      await taskQueue.clear();

      expect(taskQueue.getAllTasks()).toHaveLength(0);
    });
  });

  describe('file persistence', () => {
    it('should load existing tasks from file', async () => {
      const existingTasks: Task[] = [
        {
          id: 'task-1',
          type: 'existing',
          role: 'orchestrator',
          data: {},
          status: 'pending',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01')
        }
      ];

      await fs.writeJSON(taskFilePath, existingTasks);

      // Create new TaskQueue after file exists
      const newTaskQueue = new TaskQueue(taskFilePath);
      await newTaskQueue.initialize();
      
      const tasks = newTaskQueue.getAllTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task-1');
      expect(tasks[0].type).toBe('existing');
    });

    it('should handle non-existent file gracefully', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.json');
      const newTaskQueue = new TaskQueue(nonExistentPath);
      await newTaskQueue.initialize();

      expect(newTaskQueue.getAllTasks()).toHaveLength(0);
    });
  });
});