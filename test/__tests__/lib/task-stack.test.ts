import { TaskStack } from '../../../src/lib/task-stack';
import { Task } from '../../../src/types';

describe('TaskStack', () => {
  let taskStack: TaskStack;
  let mockTask1: Task;
  let mockTask2: Task;

  beforeEach(() => {
    taskStack = new TaskStack(5);
    
    const now = new Date();
    mockTask1 = {
      id: 'task-1',
      type: 'test',
      role: 'coder',
      data: {},
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      parentId: undefined,
      rootId: undefined,
      depth: 0,
      mode: 'coder',
      isPaused: false,
      children: [],
      instruction: 'Test task 1'
    };

    mockTask2 = {
      id: 'task-2',
      type: 'test',
      role: 'tester',
      data: {},
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      parentId: 'task-1',
      rootId: 'task-1',
      depth: 1,
      mode: 'tester',
      isPaused: false,
      children: [],
      instruction: 'Test task 2'
    };
  });

  describe('Basic Stack Operations', () => {
    test('should start empty', () => {
      expect(taskStack.isEmpty()).toBe(true);
      expect(taskStack.size()).toBe(0);
      expect(taskStack.getCurrentTask()).toBeUndefined();
    });

    test('should push tasks correctly', () => {
      taskStack.push(mockTask1);
      
      expect(taskStack.isEmpty()).toBe(false);
      expect(taskStack.size()).toBe(1);
      expect(taskStack.getCurrentTask()).toBe(mockTask1);
    });

    test('should pop tasks correctly', () => {
      taskStack.push(mockTask1);
      taskStack.push(mockTask2);
      
      const popped = taskStack.pop();
      
      expect(popped).toBe(mockTask2);
      expect(taskStack.size()).toBe(1);
      expect(taskStack.getCurrentTask()).toBe(mockTask1);
    });

    test('should peek without modifying stack', () => {
      taskStack.push(mockTask1);
      taskStack.push(mockTask2);
      
      const peeked = taskStack.peek();
      
      expect(peeked).toBe(mockTask2);
      expect(taskStack.size()).toBe(2);
    });
  });

  describe('Hierarchy Management', () => {
    test('should track task hierarchy', () => {
      taskStack.push(mockTask1);
      taskStack.push(mockTask2);
      
      const hierarchy = taskStack.getHierarchy();
      
      expect(hierarchy).toEqual(['task-1', 'task-2']);
    });

    test('should find root task', () => {
      taskStack.push(mockTask1);
      taskStack.push(mockTask2);
      
      const rootTask = taskStack.getRootTask();
      
      expect(rootTask).toBe(mockTask1);
    });

    test('should find parent task', () => {
      taskStack.push(mockTask1);
      taskStack.push(mockTask2);
      
      const parentTask = taskStack.findParentTask('task-2');
      
      expect(parentTask).toBe(mockTask1);
    });

    test('should get task depth correctly', () => {
      taskStack.push(mockTask1);
      taskStack.push(mockTask2);
      
      expect(taskStack.getTaskDepth('task-1')).toBe(0);
      expect(taskStack.getTaskDepth('task-2')).toBe(1);
      expect(taskStack.getTaskDepth('nonexistent')).toBe(-1);
    });
  });

  describe('Task Updates', () => {
    test('should update task properties', () => {
      taskStack.push(mockTask1);
      
      const updated = taskStack.updateTask('task-1', {
        status: 'running'
      });
      
      expect(updated).toBe(true);
      expect(mockTask1.status).toBe('running');
    });

    test('should fail to update nonexistent task', () => {
      const updated = taskStack.updateTask('nonexistent', {
        status: 'running'
      });
      
      expect(updated).toBe(false);
    });
  });

  describe('Stack Limits', () => {
    test('should enforce max depth limit', () => {
      // Fill stack to max depth
      for (let i = 0; i < 5; i++) {
        const task = { ...mockTask1, id: `task-${i}` };
        taskStack.push(task);
      }
      
      // Attempting to push beyond limit should throw
      expect(() => {
        taskStack.push({ ...mockTask1, id: 'overflow-task' });
      }).toThrow('Maximum task depth exceeded: 5');
    });
  });

  describe('Event Emission', () => {
    test('should emit events on status changes', (done) => {
      taskStack.push(mockTask1);
      
      taskStack.on('task_paused', (event) => {
        expect(event.taskId).toBe('task-1');
        expect(event.type).toBe('task_paused');
        done();
      });
      
      taskStack.updateTask('task-1', { status: 'paused' });
    });
  });

  describe('Stack Information', () => {
    test('should provide comprehensive stack info', () => {
      taskStack.push(mockTask1);
      taskStack.push(mockTask2);
      
      const info = taskStack.getStackInfo();
      
      expect(info.size).toBe(2);
      expect(info.maxDepth).toBe(5);
      expect(info.currentTask).toBe('task-2');
      expect(info.hierarchy).toEqual(['task-1', 'task-2']);
    });
  });

  describe('Cleanup', () => {
    test('should clear all tasks', () => {
      taskStack.push(mockTask1);
      taskStack.push(mockTask2);
      
      taskStack.clear();
      
      expect(taskStack.isEmpty()).toBe(true);
      expect(taskStack.size()).toBe(0);
    });

    test('should remove specific task', () => {
      taskStack.push(mockTask1);
      taskStack.push(mockTask2);
      
      const removed = taskStack.removeTask('task-1');
      
      expect(removed).toBe(mockTask1);
      expect(taskStack.size()).toBe(1);
      expect(taskStack.findTask('task-1')).toBeUndefined();
    });
  });
});