import * as fs from 'fs-extra';
import * as path from 'path';
import { ProgressEntry } from '../types';

export class ProgressTracker {
  private filePath: string;
  private progress: Map<string, ProgressEntry> = new Map();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async initialize(): Promise<void> {
    await this.loadProgress();
  }

  async updateProgress(agentId: string, entry: Partial<ProgressEntry>): Promise<void> {
    const existing = this.progress.get(agentId);
    const updated: ProgressEntry = {
      agentId,
      agentName: entry.agentName || existing?.agentName || 'unknown',
      status: entry.status || existing?.status || 'unknown',
      progress: entry.progress || existing?.progress || 0,
      currentTask: entry.currentTask || existing?.currentTask,
      lastUpdate: new Date()
    };

    this.progress.set(agentId, updated);
    await this.saveProgress();
  }

  async removeAgent(agentId: string): Promise<void> {
    this.progress.delete(agentId);
    await this.saveProgress();
  }

  getProgress(agentId: string): ProgressEntry | undefined {
    return this.progress.get(agentId);
  }

  getAllProgress(): ProgressEntry[] {
    return Array.from(this.progress.values());
  }

  getActiveAgents(): ProgressEntry[] {
    return Array.from(this.progress.values()).filter(
      entry => entry.status === 'running' || entry.status === 'waiting'
    );
  }

  getCompletedAgents(): ProgressEntry[] {
    return Array.from(this.progress.values()).filter(
      entry => entry.status === 'completed'
    );
  }

  getFailedAgents(): ProgressEntry[] {
    return Array.from(this.progress.values()).filter(
      entry => entry.status === 'failed'
    );
  }

  getOverallProgress(): number {
    const entries = Array.from(this.progress.values());
    if (entries.length === 0) return 0;
    
    const totalProgress = entries.reduce((sum, entry) => sum + entry.progress, 0);
    return totalProgress / entries.length;
  }

  isAllCompleted(): boolean {
    const entries = Array.from(this.progress.values());
    return entries.length > 0 && entries.every(entry => 
      entry.status === 'completed' || entry.status === 'failed'
    );
  }

  hasFailures(): boolean {
    return Array.from(this.progress.values()).some(entry => 
      entry.status === 'failed'
    );
  }

  async clear(): Promise<void> {
    this.progress.clear();
    await this.saveProgress();
  }

  async removeStaleEntries(maxAge: number = 3600000): Promise<void> {
    const now = Date.now();
    const entries = Array.from(this.progress.values());
    
    for (const entry of entries) {
      const lastUpdateTime = entry.lastUpdate instanceof Date 
        ? entry.lastUpdate.getTime() 
        : new Date(entry.lastUpdate).getTime();
      const age = now - lastUpdateTime;
      if (age > maxAge) {
        this.progress.delete(entry.agentId);
      }
    }
    
    if (entries.length !== this.progress.size) {
      await this.saveProgress();
    }
  }

  private async loadProgress(): Promise<void> {
    try {
      if (await fs.pathExists(this.filePath)) {
        const data = await fs.readJSON(this.filePath);
        this.progress = new Map(data.map((entry: ProgressEntry) => [entry.agentId, entry]));
      }
    } catch (error) {
      console.warn(`Failed to load progress from ${this.filePath}:`, error);
      this.progress = new Map();
    }
  }

  private async saveProgress(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.filePath));
      const data = Array.from(this.progress.values());
      await fs.writeJSON(this.filePath, data, { spaces: 2 });
    } catch (error) {
      console.error(`Failed to save progress to ${this.filePath}:`, error);
      throw error;
    }
  }
}