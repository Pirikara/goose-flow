import * as fs from 'fs-extra';
import * as path from 'path';

// Global test setup
beforeEach(() => {
  // Reset console spies if any
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up any test artifacts
  jest.restoreAllMocks();
});

// Helper functions for tests
export const createTempDir = async (): Promise<string> => {
  const tempDir = path.join(__dirname, 'temp', `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  await fs.ensureDir(tempDir);
  return tempDir;
};

export const cleanupTempDir = async (tempDir: string): Promise<void> => {
  if (await fs.pathExists(tempDir)) {
    await fs.remove(tempDir);
  }
};

export const createMockConfig = (): any => {
  return {
    version: '1.0',
    target: '.',
    maxConcurrent: 4,
    timeout: 1800000,
    output: {
      format: 'markdown',
      file: 'execution-summary.md'
    },
    agents: {
      orchestrator: {
        description: 'Test orchestrator',
        prompt: 'Test prompt for orchestrator',
        tools: ['TodoWrite', 'TodoRead', 'Task']
      },
      coder: {
        description: 'Test coder',
        prompt: 'Test prompt for coder',
        tools: ['Read', 'Write', 'Edit']
      }
    }
  };
};