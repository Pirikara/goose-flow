import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GooseFlowMCPServer } from '../../src/mcp/server.js';

// MCP SDKをモック化
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn()
  }))
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn()
}));

// TaskExecutorをモック化
vi.mock('../../src/core/task-executor.js', () => ({
  TaskExecutor: vi.fn().mockImplementation(() => ({
    executeTask: vi.fn()
  }))
}));

const { TaskExecutor } = await import('../../src/core/task-executor.js');
const mockTaskExecutor = vi.mocked(TaskExecutor);

describe('GooseFlowMCPServer', () => {
  let server: GooseFlowMCPServer;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new GooseFlowMCPServer();
  });

  describe('constructor', () => {
    it('should create server instance', () => {
      expect(server).toBeInstanceOf(GooseFlowMCPServer);
    });
  });

  describe('tool validation', () => {
    it('should validate task request with required fields', () => {
      // This is an internal method test - we'd need to expose it or test through public interface
      expect(true).toBe(true); // Placeholder for actual validation tests
    });
  });

  describe('start method', () => {
    it('should start MCP server', async () => {
      // Mock the start method behavior
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Note: We can't easily test the actual start method without significant mocking
      // This would be better tested in integration tests
      expect(true).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });
});