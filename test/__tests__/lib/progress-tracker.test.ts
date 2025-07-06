import * as fs from 'fs-extra';
import * as path from 'path';
import { ProgressTracker } from '../../../src/lib/progress-tracker';
import { ProgressEntry } from '../../../src/types';
import { createTempDir, cleanupTempDir } from '../../setup';

describe('ProgressTracker', () => {
  let tempDir: string;
  let progressTracker: ProgressTracker;
  let progressFilePath: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    progressFilePath = path.join(tempDir, 'progress.json');
    progressTracker = new ProgressTracker(progressFilePath);
    await progressTracker.initialize();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('updateProgress', () => {
    it('should create new progress entry', async () => {
      await progressTracker.updateProgress('agent-1', {
        agentName: 'orchestrator',
        status: 'running',
        progress: 50,
        currentTask: 'analyzing project'
      });

      const progress = progressTracker.getProgress('agent-1');
      expect(progress).toBeDefined();
      expect(progress!.agentId).toBe('agent-1');
      expect(progress!.agentName).toBe('orchestrator');
      expect(progress!.status).toBe('running');
      expect(progress!.progress).toBe(50);
      expect(progress!.currentTask).toBe('analyzing project');
      expect(progress!.lastUpdate).toBeInstanceOf(Date);
    });

    it('should update existing progress entry', async () => {
      await progressTracker.updateProgress('agent-1', {
        agentName: 'orchestrator',
        status: 'running',
        progress: 25
      });

      const initialProgress = progressTracker.getProgress('agent-1');
      const initialTime = initialProgress!.lastUpdate;

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      await progressTracker.updateProgress('agent-1', {
        status: 'completed',
        progress: 100
      });

      const updatedProgress = progressTracker.getProgress('agent-1');
      expect(updatedProgress!.agentName).toBe('orchestrator'); // Should retain
      expect(updatedProgress!.status).toBe('completed'); // Should update
      expect(updatedProgress!.progress).toBe(100); // Should update
      expect(updatedProgress!.lastUpdate.getTime()).toBeGreaterThan(initialTime.getTime());
    });

    it('should persist progress to file', async () => {
      await progressTracker.updateProgress('agent-1', {
        agentName: 'coder',
        status: 'running',
        progress: 75
      });

      expect(await fs.pathExists(progressFilePath)).toBe(true);
      const savedProgress = await fs.readJSON(progressFilePath);
      expect(savedProgress).toHaveLength(1);
      expect(savedProgress[0].agentId).toBe('agent-1');
      expect(savedProgress[0].agentName).toBe('coder');
    });
  });

  describe('removeAgent', () => {
    beforeEach(async () => {
      await progressTracker.updateProgress('agent-1', {
        agentName: 'orchestrator',
        status: 'completed',
        progress: 100
      });
    });

    it('should remove agent progress', async () => {
      await progressTracker.removeAgent('agent-1');

      expect(progressTracker.getProgress('agent-1')).toBeUndefined();
    });
  });

  describe('getAllProgress', () => {
    beforeEach(async () => {
      await progressTracker.updateProgress('agent-1', {
        agentName: 'orchestrator',
        status: 'completed',
        progress: 100
      });

      await progressTracker.updateProgress('agent-2', {
        agentName: 'coder',
        status: 'running',
        progress: 60
      });

      await progressTracker.updateProgress('agent-3', {
        agentName: 'tester',
        status: 'failed',
        progress: 30
      });
    });

    it('should return all progress entries', () => {
      const allProgress = progressTracker.getAllProgress();
      expect(allProgress).toHaveLength(3);
      
      const agentIds = allProgress.map(p => p.agentId);
      expect(agentIds).toContain('agent-1');
      expect(agentIds).toContain('agent-2');
      expect(agentIds).toContain('agent-3');
    });
  });

  describe('getActiveAgents', () => {
    beforeEach(async () => {
      await progressTracker.updateProgress('agent-1', {
        agentName: 'orchestrator',
        status: 'completed',
        progress: 100
      });

      await progressTracker.updateProgress('agent-2', {
        agentName: 'coder',
        status: 'running',
        progress: 60
      });

      await progressTracker.updateProgress('agent-3', {
        agentName: 'tester',
        status: 'waiting',
        progress: 0
      });

      await progressTracker.updateProgress('agent-4', {
        agentName: 'reviewer',
        status: 'failed',
        progress: 25
      });
    });

    it('should return only running and waiting agents', () => {
      const activeAgents = progressTracker.getActiveAgents();
      expect(activeAgents).toHaveLength(2);
      
      const statuses = activeAgents.map(a => a.status);
      expect(statuses).toContain('running');
      expect(statuses).toContain('waiting');
      expect(statuses).not.toContain('completed');
      expect(statuses).not.toContain('failed');
    });
  });

  describe('getCompletedAgents', () => {
    beforeEach(async () => {
      await progressTracker.updateProgress('agent-1', {
        agentName: 'orchestrator',
        status: 'completed',
        progress: 100
      });

      await progressTracker.updateProgress('agent-2', {
        agentName: 'coder',
        status: 'running',
        progress: 60
      });
    });

    it('should return only completed agents', () => {
      const completedAgents = progressTracker.getCompletedAgents();
      expect(completedAgents).toHaveLength(1);
      expect(completedAgents[0].status).toBe('completed');
      expect(completedAgents[0].agentName).toBe('orchestrator');
    });
  });

  describe('getFailedAgents', () => {
    beforeEach(async () => {
      await progressTracker.updateProgress('agent-1', {
        agentName: 'orchestrator',
        status: 'completed',
        progress: 100
      });

      await progressTracker.updateProgress('agent-2', {
        agentName: 'coder',
        status: 'failed',
        progress: 30
      });
    });

    it('should return only failed agents', () => {
      const failedAgents = progressTracker.getFailedAgents();
      expect(failedAgents).toHaveLength(1);
      expect(failedAgents[0].status).toBe('failed');
      expect(failedAgents[0].agentName).toBe('coder');
    });
  });

  describe('getOverallProgress', () => {
    it('should return 0 for no agents', () => {
      expect(progressTracker.getOverallProgress()).toBe(0);
    });

    it('should calculate average progress', async () => {
      await progressTracker.updateProgress('agent-1', {
        agentName: 'orchestrator',
        status: 'completed',
        progress: 100
      });

      await progressTracker.updateProgress('agent-2', {
        agentName: 'coder',
        status: 'running',
        progress: 50
      });

      await progressTracker.updateProgress('agent-3', {
        agentName: 'tester',
        status: 'waiting',
        progress: 0
      });

      // Average: (100 + 50 + 0) / 3 = 50
      expect(progressTracker.getOverallProgress()).toBe(50);
    });
  });

  describe('isAllCompleted', () => {
    it('should return false for no agents', () => {
      expect(progressTracker.isAllCompleted()).toBe(false);
    });

    it('should return true when all agents completed or failed', async () => {
      await progressTracker.updateProgress('agent-1', {
        agentName: 'orchestrator',
        status: 'completed',
        progress: 100
      });

      await progressTracker.updateProgress('agent-2', {
        agentName: 'coder',
        status: 'failed',
        progress: 30
      });

      expect(progressTracker.isAllCompleted()).toBe(true);
    });

    it('should return false when some agents are still active', async () => {
      await progressTracker.updateProgress('agent-1', {
        agentName: 'orchestrator',
        status: 'completed',
        progress: 100
      });

      await progressTracker.updateProgress('agent-2', {
        agentName: 'coder',
        status: 'running',
        progress: 50
      });

      expect(progressTracker.isAllCompleted()).toBe(false);
    });
  });

  describe('hasFailures', () => {
    it('should return false when no agents failed', async () => {
      await progressTracker.updateProgress('agent-1', {
        agentName: 'orchestrator',
        status: 'completed',
        progress: 100
      });

      expect(progressTracker.hasFailures()).toBe(false);
    });

    it('should return true when at least one agent failed', async () => {
      await progressTracker.updateProgress('agent-1', {
        agentName: 'orchestrator',
        status: 'completed',
        progress: 100
      });

      await progressTracker.updateProgress('agent-2', {
        agentName: 'coder',
        status: 'failed',
        progress: 30
      });

      expect(progressTracker.hasFailures()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all progress', async () => {
      await progressTracker.updateProgress('agent-1', {
        agentName: 'orchestrator',
        status: 'completed',
        progress: 100
      });

      expect(progressTracker.getAllProgress()).toHaveLength(1);

      await progressTracker.clear();

      expect(progressTracker.getAllProgress()).toHaveLength(0);
    });
  });

  describe('file persistence', () => {
    it('should load existing progress from file', async () => {
      const existingProgress: ProgressEntry[] = [
        {
          agentId: 'agent-1',
          agentName: 'existing-agent',
          status: 'running',
          progress: 75,
          lastUpdate: new Date('2023-01-01')
        }
      ];

      await fs.writeJSON(progressFilePath, existingProgress);

      const newProgressTracker = new ProgressTracker(progressFilePath);
      await newProgressTracker.initialize();
      
      const progress = newProgressTracker.getAllProgress();

      expect(progress).toHaveLength(1);
      expect(progress[0].agentId).toBe('agent-1');
      expect(progress[0].agentName).toBe('existing-agent');
    });

    it('should handle non-existent file gracefully', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.json');
      const newProgressTracker = new ProgressTracker(nonExistentPath);
      await newProgressTracker.initialize();

      expect(newProgressTracker.getAllProgress()).toHaveLength(0);
    });
  });
});