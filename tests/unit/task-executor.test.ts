import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskExecutor } from '../../src/core/task-executor.js';
import { TaskRequest } from '../../src/types/index.js';

// execaをモック化
vi.mock('execa', () => ({
  execa: vi.fn()
}));

const { execa } = await import('execa');
const mockExeca = vi.mocked(execa);

describe('TaskExecutor', () => {
  let taskExecutor: TaskExecutor;

  beforeEach(() => {
    taskExecutor = new TaskExecutor();
    vi.clearAllMocks();
  });

  describe('executeTask', () => {
    it('should execute a simple task successfully', async () => {
      // Mock execa to return successful result
      mockExeca.mockResolvedValue({
        pid: 12345,
        stdout: 'Hello World!',
        stderr: ''
      });

      const request: TaskRequest = {
        description: 'Say hello',
        prompt: 'Say hello world',
        mode: 'coder',
        maxTurns: 5
      };

      const result = await taskExecutor.executeTask(request);

      expect(result.success).toBe(true);
      expect(result.result).toBe('Hello World!');
      expect(typeof result.metadata?.duration).toBe('number');
      expect(mockExeca).toHaveBeenCalledWith('goose', [
        'run',
        '--text', 'Say hello world',
        '--no-session',
        '--quiet',
        '--max-turns', '5'
      ], expect.any(Object));
    });

    it('should handle task execution failure', async () => {
      // Mock execa to throw an error
      mockExeca.mockRejectedValue(new Error('Goose command failed'));

      const request: TaskRequest = {
        description: 'Failing task',
        prompt: 'This will fail',
        mode: 'coder',
        maxTurns: 3
      };

      const result = await taskExecutor.executeTask(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Goose command failed');
      expect(result.result).toBe('');
    });

    it('should use default values for optional parameters', async () => {
      mockExeca.mockResolvedValue({
        pid: 12345,
        stdout: 'Default task result',
        stderr: ''
      });

      const request: TaskRequest = {
        description: 'Default task',
        prompt: 'Task with defaults'
      };

      await taskExecutor.executeTask(request);

      expect(mockExeca).toHaveBeenCalledWith('goose', [
        'run',
        '--text', 'Task with defaults',
        '--no-session',
        '--quiet',
        '--max-turns', '10'
      ], expect.any(Object));
    });

    it('should handle stderr output', async () => {
      mockExeca.mockResolvedValue({
        pid: 12345,
        stdout: 'Success with warnings',
        stderr: 'Warning: Some issue'
      });

      const request: TaskRequest = {
        description: 'Task with warnings',
        prompt: 'Task that produces warnings'
      };

      const result = await taskExecutor.executeTask(request);

      expect(result.success).toBe(true);
      expect(result.result).toContain('Success with warnings');
      expect(result.result).toContain('Warning: Some issue');
    });
  });

  describe('getActiveProcessCount', () => {
    it('should return 0 when no processes are active', () => {
      expect(taskExecutor.getActiveProcessCount()).toBe(0);
    });
  });
});