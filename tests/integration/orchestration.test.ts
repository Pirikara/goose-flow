import { describe, it, expect, vi } from 'vitest';
import { TaskExecutor } from '../../src/core/task-executor.js';
import { TaskRequest } from '../../src/types/index.js';

// execaをモック化してGooseプロセスの実行をシミュレート
vi.mock('execa', () => ({
  execa: vi.fn()
}));

const { execa } = await import('execa');
const mockExeca = vi.mocked(execa);

describe('Orchestration Integration Tests', () => {
  let taskExecutor: TaskExecutor;

  beforeEach(() => {
    taskExecutor = new TaskExecutor();
    vi.clearAllMocks();
  });

  describe('End-to-End Task Flow', () => {
    it('should handle architect -> coder -> tester workflow', async () => {
      // Mock sequence: architect task
      mockExeca.mockResolvedValueOnce({
        pid: 12345,
        stdout: `# Calculator Architecture Design

## Overview
A simple command-line calculator with basic arithmetic operations.

## Components
1. Input validation
2. Operation processor  
3. Error handling
4. Output formatter

## API Design
\`\`\`python
def calculate(num1, operator, num2)
\`\`\``,
        stderr: ''
      });

      // Mock sequence: coder task
      mockExeca.mockResolvedValueOnce({
        pid: 12346,
        stdout: `def calculate(num1, operator, num2):
    try:
        if operator == '+':
            result = num1 + num2
        elif operator == '-':
            result = num1 - num2
        elif operator == '*':
            result = num1 * num2
        elif operator == '/':
            if num2 == 0:
                print("Error: Division by zero is not allowed.")
                return
            result = num1 / num2
        else:
            print("Error: Invalid operator.")
            return
        print(f"The result is: {result}")
    except Exception as e:
        print(f"An error occurred: {e}")`,
        stderr: ''
      });

      // Mock sequence: tester task
      mockExeca.mockResolvedValueOnce({
        pid: 12347,
        stdout: `Test Results:
✅ Addition test: PASSED
✅ Subtraction test: PASSED  
✅ Multiplication test: PASSED
✅ Division test: PASSED
✅ Division by zero test: PASSED
✅ Invalid operator test: PASSED

All tests completed successfully.`,
        stderr: ''
      });

      // Execute architect task
      const architectRequest: TaskRequest = {
        description: 'Design calculator architecture',
        prompt: 'Design a simple calculator with basic operations',
        mode: 'architect',
        maxTurns: 15
      };

      const architectResult = await taskExecutor.executeTask(architectRequest);
      expect(architectResult.success).toBe(true);
      expect(architectResult.result).toContain('Calculator Architecture Design');

      // Execute coder task
      const coderRequest: TaskRequest = {
        description: 'Implement calculator logic',
        prompt: 'Implement the calculator based on the architecture design',
        mode: 'coder',
        maxTurns: 20
      };

      const coderResult = await taskExecutor.executeTask(coderRequest);
      expect(coderResult.success).toBe(true);
      expect(coderResult.result).toContain('def calculate');

      // Execute tester task
      const testerRequest: TaskRequest = {
        description: 'Test calculator implementation',
        prompt: 'Test all calculator operations and edge cases',
        mode: 'tester',
        maxTurns: 15
      };

      const testerResult = await taskExecutor.executeTask(testerRequest);
      expect(testerResult.success).toBe(true);
      expect(testerResult.result).toContain('All tests completed successfully');

      // Verify correct Goose commands were called
      expect(mockExeca).toHaveBeenCalledTimes(3);
      expect(mockExeca).toHaveBeenNthCalledWith(1, 'goose', [
        'run',
        '--text', 'Design a simple calculator with basic operations',
        '--no-session',
        '--quiet',
        '--max-turns', '15'
      ], expect.any(Object));
    });

    it('should handle task failure gracefully', async () => {
      // Mock a failing Goose process
      mockExeca.mockRejectedValue(new Error('Goose not found'));

      const request: TaskRequest = {
        description: 'Failing task',
        prompt: 'This task will fail',
        mode: 'coder'
      };

      const result = await taskExecutor.executeTask(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Goose not found');
      expect(typeof result.metadata?.duration).toBe('number');
    });
  });

  describe('Progress Tracking', () => {
    it('should track task execution metrics', async () => {
      mockExeca.mockResolvedValue({
        pid: 12345,
        stdout: 'Task completed',
        stderr: ''
      });

      const startTime = Date.now();
      const request: TaskRequest = {
        description: 'Metrics test',
        prompt: 'Test task for metrics',
        mode: 'coder'
      };

      const result = await taskExecutor.executeTask(request);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(typeof result.metadata?.duration).toBe('number');
      expect(result.metadata?.model).toBe('goose-agent');
    });
  });
});