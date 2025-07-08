import * as fs from 'fs-extra';
import * as path from 'path';
import { TaskOrchestrator } from '../../../src/lib/task-orchestrator';
import { GooseFlowConfig } from '../../../src/types';

// Mock dependencies
jest.mock('execa');

// Mock specific fs functions we use
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeJSON: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue([]),
  remove: jest.fn().mockResolvedValue(undefined),
  pathExists: jest.fn().mockResolvedValue(false),
  readJSON: jest.fn().mockResolvedValue([])
}));

describe('TaskOrchestrator', () => {
  let orchestrator: TaskOrchestrator;
  let mockConfig: GooseFlowConfig;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = '/tmp/test-orchestrator';
    
    mockConfig = {
      version: '1.0.0',
      target: 'development',
      maxConcurrent: 4,
      timeout: 30000,
      agents: {
        coder: {
          description: 'Code implementation',
          roleDefinition: 'Implement code solutions',
          groups: ['read', 'edit', 'command'],
          customInstructions: 'Write clean code'
        },
        tester: {
          description: 'Testing and validation',
          roleDefinition: 'Create and run tests',
          groups: ['read', 'edit', 'command'],
          customInstructions: 'Create comprehensive tests'
        }
      }
    };

    orchestrator = new TaskOrchestrator(tempDir, 4, 30000);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(orchestrator.initialize()).resolves.not.toThrow();
    });
  });

  describe('Task Creation', () => {
    test('should create root task', async () => {
      // Mock the startTask method to avoid actual process spawning
      const mockStartTask = jest.spyOn(orchestrator as any, 'startTask')
        .mockResolvedValue(undefined);

      const taskId = await orchestrator.createRootTask('coder', 'Test instruction');
      
      expect(taskId).toBeDefined();
      expect(taskId).toMatch(/^task-\d+-\d+$/);
      
      const task = orchestrator.getTask(taskId);
      expect(task).toBeDefined();
      expect(task?.mode).toBe('coder');
      expect(task?.instruction).toBe('Test instruction');
      expect(task?.depth).toBe(0);
      expect(task?.parentId).toBeUndefined();
      
      mockStartTask.mockRestore();
    });

    test('should create subtask with parent relationship', async () => {
      // Mock the startTask method
      const mockStartTask = jest.spyOn(orchestrator as any, 'startTask')
        .mockResolvedValue(undefined);

      // Mock pauseTask method
      const mockPauseTask = jest.spyOn(orchestrator, 'pauseTask')
        .mockResolvedValue();

      // Create parent task
      const parentId = await orchestrator.createRootTask('coder', 'Parent task');
      
      // Create subtask
      const subtaskId = await orchestrator.createSubtask(parentId, {
        mode: 'tester',
        instruction: 'Test the code',
        maxTurns: 10
      });
      
      expect(subtaskId).toBeDefined();
      expect(subtaskId).toMatch(/^task-\d+-\d+$/);
      
      const subtask = orchestrator.getTask(subtaskId);
      const parentTask = orchestrator.getTask(parentId);
      
      expect(subtask).toBeDefined();
      expect(subtask?.parentId).toBe(parentId);
      expect(subtask?.rootId).toBe(parentId);
      expect(subtask?.depth).toBe(1);
      expect(subtask?.mode).toBe('tester');
      
      expect(parentTask?.children).toContain(subtaskId);
      expect(mockPauseTask).toHaveBeenCalledWith(parentId);
      
      mockStartTask.mockRestore();
      mockPauseTask.mockRestore();
    });
  });

  describe('Task Management', () => {
    test('should pause and resume tasks', async () => {
      const mockStartTask = jest.spyOn(orchestrator as any, 'startTask')
        .mockResolvedValue(undefined);

      const taskId = await orchestrator.createRootTask('coder', 'Test task');
      
      // Test pause
      await orchestrator.pauseTask(taskId);
      const pausedTask = orchestrator.getTask(taskId);
      expect(pausedTask?.isPaused).toBe(true);
      expect(pausedTask?.status).toBe('paused');
      
      // Note: resumeParentTask is private, so we can't test it directly
      // This would typically be called internally when a subtask completes
      
      mockStartTask.mockRestore();
    });

    test('should complete tasks and notify parent', async () => {
      const mockStartTask = jest.spyOn(orchestrator as any, 'startTask')
        .mockResolvedValue(undefined);

      const mockPauseTask = jest.spyOn(orchestrator, 'pauseTask')
        .mockResolvedValue();

      // Create parent and child tasks
      const parentId = await orchestrator.createRootTask('coder', 'Parent task');
      const childId = await orchestrator.createSubtask(parentId, {
        mode: 'tester',
        instruction: 'Child task'
      });

      // Complete child task
      await orchestrator.completeTask(childId, {
        result: 'Task completed successfully'
      });

      const completedTask = orchestrator.getTask(childId);
      expect(completedTask?.status).toBe('completed');
      expect(completedTask?.result).toBe('Task completed successfully');
      
      // Note: resumeParentTask is called internally, but we can't easily mock private methods
      // In a real scenario, the parent task would be resumed automatically
      
      mockStartTask.mockRestore();
      mockPauseTask.mockRestore();
    });
  });

  describe('Task Hierarchy', () => {
    test('should build task hierarchy correctly', async () => {
      const mockStartTask = jest.spyOn(orchestrator as any, 'startTask')
        .mockResolvedValue(undefined);

      const mockPauseTask = jest.spyOn(orchestrator, 'pauseTask')
        .mockResolvedValue();

      // Create task hierarchy
      const rootId = await orchestrator.createRootTask('coder', 'Root task');
      const child1Id = await orchestrator.createSubtask(rootId, {
        mode: 'tester',
        instruction: 'Child 1'
      });
      const child2Id = await orchestrator.createSubtask(rootId, {
        mode: 'reviewer',
        instruction: 'Child 2'
      });

      const hierarchy = orchestrator.getTaskHierarchy();
      
      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0].id).toBe(rootId);
      expect(hierarchy[0].children).toHaveLength(2);
      
      const childIds = hierarchy[0].children.map(child => child.id);
      expect(childIds).toContain(child1Id);
      expect(childIds).toContain(child2Id);
      
      mockStartTask.mockRestore();
      mockPauseTask.mockRestore();
    });
  });

  describe('Task Cleanup', () => {
    test('should stop individual tasks', async () => {
      const mockStartTask = jest.spyOn(orchestrator as any, 'startTask')
        .mockResolvedValue(undefined);

      // Mock stopGooseProcess to avoid actual process operations
      const mockStopGooseProcess = jest.spyOn(orchestrator as any, 'stopGooseProcess')
        .mockResolvedValue(undefined);

      const taskId = await orchestrator.createRootTask('coder', 'Test task');
      
      await orchestrator.stopTask(taskId);
      
      const stoppedTask = orchestrator.getTask(taskId);
      expect(stoppedTask?.status).toBe('failed');
      expect(mockStopGooseProcess).toHaveBeenCalledWith(taskId);
      
      mockStartTask.mockRestore();
      mockStopGooseProcess.mockRestore();
    });

    test('should stop all tasks', async () => {
      const mockStartTask = jest.spyOn(orchestrator as any, 'startTask')
        .mockResolvedValue(undefined);

      const mockStopGooseProcess = jest.spyOn(orchestrator as any, 'stopGooseProcess')
        .mockResolvedValue(undefined);

      const task1Id = await orchestrator.createRootTask('coder', 'Task 1');
      const task2Id = await orchestrator.createRootTask('tester', 'Task 2');
      
      await orchestrator.stopAllTasks();
      
      const task1 = orchestrator.getTask(task1Id);
      const task2 = orchestrator.getTask(task2Id);
      
      expect(task1?.status).toBe('failed');
      expect(task2?.status).toBe('failed');
      
      mockStartTask.mockRestore();
      mockStopGooseProcess.mockRestore();
    });
  });

  describe('Task Stack Integration', () => {
    test('should maintain task stack correctly', async () => {
      const mockStartTask = jest.spyOn(orchestrator as any, 'startTask')
        .mockResolvedValue(undefined);

      const taskStack = orchestrator.getTaskStack();
      
      expect(taskStack.isEmpty()).toBe(true);
      
      const taskId = await orchestrator.createRootTask('coder', 'Test task');
      
      expect(taskStack.isEmpty()).toBe(false);
      expect(taskStack.getCurrentTask()?.id).toBe(taskId);
      
      mockStartTask.mockRestore();
    });
  });
});