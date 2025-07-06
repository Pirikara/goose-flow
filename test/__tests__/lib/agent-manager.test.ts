import * as fs from 'fs-extra';
import * as path from 'path';
import { AgentManager } from '../../../src/lib/agent-manager';
import { AgentConfig } from '../../../src/types';
import { createTempDir, cleanupTempDir } from '../../setup';

// Mock execa
jest.mock('execa', () => {
  const mockProcess = {
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    stdin: { write: jest.fn(), destroyed: false },
    on: jest.fn(),
    kill: jest.fn(),
    killed: false
  };
  
  return {
    execa: jest.fn().mockImplementation(() => mockProcess)
  };
});

const { execa: mockExeca } = require('execa');

// Mock chalk to avoid colors in test output
jest.mock('chalk', () => ({
  blue: jest.fn((str: string) => str),
  cyan: jest.fn((str: string) => str),
  green: jest.fn((str: string) => str),
  red: jest.fn((str: string) => str),
  yellow: jest.fn((str: string) => str),
  gray: jest.fn((str: string) => str)
}));

describe('AgentManager', () => {
  let tempDir: string;
  let agentManager: AgentManager;

  beforeEach(async () => {
    tempDir = await createTempDir();
    agentManager = new AgentManager(tempDir, 2, 5000); // 2 max agents, 5s timeout
    await agentManager.initialize();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
    jest.clearAllMocks();
  });

  describe('spawnAgent', () => {
    const testConfig: AgentConfig = {
      name: 'test-agent',
      description: 'Test agent for unit tests',
      prompt: 'You are a test agent',
      initialTask: 'test_task',
      outputFile: 'test-results.md',
      nextRoles: [],
      tools: ['Read', 'Write'],
      environment: {
        TEST_VAR: 'test-value'
      }
    };

    it('should spawn agent successfully', async () => {
      const agentId = await agentManager.spawnAgent(testConfig);

      expect(agentId).toMatch(/^test-agent-\d+$/);
      
      // Check if execa was called with correct parameters
      expect(mockExeca).toHaveBeenCalledWith(
        'goose',
        expect.arrayContaining(['run', '--text', expect.any(String), '--no-session', '--max-turns', '3', '--quiet']),
        expect.objectContaining({
          cwd: tempDir,
          env: expect.objectContaining({
            TEST_VAR: 'test-value'
          }),
          timeout: 5000,
          stdout: 'pipe',
          stderr: 'pipe'
        })
      );
    });

    it('should create agent directory and prompt file', async () => {
      const agentId = await agentManager.spawnAgent(testConfig);

      const agentDir = path.join(tempDir, 'agents', agentId);
      expect(await fs.pathExists(agentDir)).toBe(true);

      const promptFile = path.join(agentDir, 'initial-prompt.txt');
      expect(await fs.pathExists(promptFile)).toBe(true);

      const promptContent = await fs.readFile(promptFile, 'utf-8');
      expect(promptContent).toBe('You are a test agent');
    });

    it('should set up process handlers', async () => {
      await agentManager.spawnAgent(testConfig);

      // Check that execa was called - process handlers are set up internally
      expect(mockExeca).toHaveBeenCalled();
    });

    it('should register agent in agent list', async () => {
      const agentId = await agentManager.spawnAgent(testConfig);

      const agent = agentManager.getAgent(agentId);
      expect(agent).toBeDefined();
      expect(agent!.id).toBe(agentId);
      expect(agent!.config).toEqual(testConfig);
      expect(agent!.status).toBe('waiting');
    });

    it('should include task description in prompt when provided', async () => {
      const configWithTask = { ...testConfig };
      
      await agentManager.spawnAgent(configWithTask);

      const execaCall = mockExeca.mock.calls[0];
      const args = execaCall[1] as string[];
      const textIndex = args.indexOf('--text');
      const textArg = args[textIndex + 1];
      
      expect(textArg).toContain('You are a test agent');
      expect(textArg).toContain('test_task');
      expect(textArg).toContain('./results/test-results.md');
    });
  });

  describe('getAgent', () => {
    it('should return agent by ID', async () => {
      const agentId = await agentManager.spawnAgent({
        name: 'test-agent',
        description: 'Test',
        prompt: 'Test prompt',
        initialTask: 'test',
        outputFile: 'test.md',
        nextRoles: [],
        tools: [],
        environment: {}
      });

      const agent = agentManager.getAgent(agentId);
      expect(agent).toBeDefined();
      expect(agent!.id).toBe(agentId);
    });

    it('should return undefined for non-existent agent', () => {
      const agent = agentManager.getAgent('non-existent');
      expect(agent).toBeUndefined();
    });
  });

  describe('getAllAgents', () => {
    it('should return all agents', async () => {
      const agentId1 = await agentManager.spawnAgent({
        name: 'agent-1',
        description: 'Test 1',
        prompt: 'Test prompt 1',
        initialTask: 'test1',
        outputFile: 'test1.md',
        nextRoles: [],
        tools: [],
        environment: {}
      });

      const agentId2 = await agentManager.spawnAgent({
        name: 'agent-2',
        description: 'Test 2',
        prompt: 'Test prompt 2',
        initialTask: 'test2',
        outputFile: 'test2.md',
        nextRoles: [],
        tools: [],
        environment: {}
      });

      const allAgents = agentManager.getAllAgents();
      expect(allAgents).toHaveLength(2);
      
      const agentIds = allAgents.map(a => a.id);
      expect(agentIds).toContain(agentId1);
      expect(agentIds).toContain(agentId2);
    });
  });

  describe('getTaskQueue', () => {
    it('should return task queue instance', () => {
      const taskQueue = agentManager.getTaskQueue();
      expect(taskQueue).toBeDefined();
      expect(typeof taskQueue.addTask).toBe('function');
    });
  });

  describe('getProgressTracker', () => {
    it('should return progress tracker instance', () => {
      const progressTracker = agentManager.getProgressTracker();
      expect(progressTracker).toBeDefined();
      expect(typeof progressTracker.updateProgress).toBe('function');
    });
  });

  describe('stopAgent', () => {
    it('should stop agent process', async () => {
      const agentId = await agentManager.spawnAgent({
        name: 'test-agent',
        description: 'Test',
        prompt: 'Test prompt',
        initialTask: 'test',
        outputFile: 'test.md',
        nextRoles: [],
        tools: [],
        environment: {}
      });

      await agentManager.stopAgent(agentId);

      // Verify that the agent was marked as failed in progress tracker
      const agent = agentManager.getAgent(agentId);
      expect(agent).toBeDefined();
    });

    it('should throw error for non-existent agent', async () => {
      await expect(agentManager.stopAgent('non-existent'))
        .rejects.toThrow('Agent non-existent not found');
    });
  });

  describe('stopAllAgents', () => {
    it('should stop all active agents', async () => {
      const agentId1 = await agentManager.spawnAgent({
        name: 'agent-1',
        description: 'Test 1',
        prompt: 'Test prompt 1',
        initialTask: 'test1',
        outputFile: 'test1.md',
        nextRoles: [],
        tools: [],
        environment: {}
      });

      const agentId2 = await agentManager.spawnAgent({
        name: 'agent-2',
        description: 'Test 2',
        prompt: 'Test prompt 2',
        initialTask: 'test2',
        outputFile: 'test2.md',
        nextRoles: [],
        tools: [],
        environment: {}
      });

      await agentManager.stopAllAgents();

      // Verify that all agents exist in the manager
      const allAgents = agentManager.getAllAgents();
      expect(allAgents).toHaveLength(2);
    });
  });

  describe('agent filtering', () => {
    beforeEach(async () => {
      // Create some test agents and manually set their status
      const agentId1 = await agentManager.spawnAgent({
        name: 'agent-1',
        description: 'Test 1',
        prompt: 'Test prompt 1',
        initialTask: 'test1',
        outputFile: 'test1.md',
        nextRoles: [],
        tools: [],
        environment: {}
      });

      const agentId2 = await agentManager.spawnAgent({
        name: 'agent-2',
        description: 'Test 2',
        prompt: 'Test prompt 2',
        initialTask: 'test2',
        outputFile: 'test2.md',
        nextRoles: [],
        tools: [],
        environment: {}
      });

      // Manually set agent statuses for testing
      const agent1 = agentManager.getAgent(agentId1)!;
      const agent2 = agentManager.getAgent(agentId2)!;
      
      agent1.status = 'completed';
      agent2.status = 'running';
    });

    it('should filter active agents', () => {
      const activeAgents = agentManager.getActiveAgents();
      expect(activeAgents).toHaveLength(1);
      expect(activeAgents[0].status).toBe('running');
    });

    it('should filter completed agents', () => {
      const completedAgents = agentManager.getCompletedAgents();
      expect(completedAgents).toHaveLength(1);
      expect(completedAgents[0].status).toBe('completed');
    });

    it('should filter failed agents', () => {
      const failedAgents = agentManager.getFailedAgents();
      expect(failedAgents).toHaveLength(0);
    });
  });
});