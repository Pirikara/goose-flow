export interface AgentConfig {
  name: string;
  description: string;
  prompt: string;
  initialTask: string;
  outputFile: string;
  nextRoles: string[];
  tools: string[];
  environment: Record<string, string>;
}

export interface AgentInstance {
  id: string;
  config: AgentConfig;
  process: any; // ExecaChildProcess
  status: 'waiting' | 'running' | 'completed' | 'failed';
  output: string[];
  error: string[];
  startTime: Date;
  endTime?: Date;
}

export interface Task {
  id: string;
  type: string;
  role: string;
  data: any;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  assignedAgent?: string;
}

export interface GooseFlowConfig {
  version: string;
  target: string;
  maxConcurrent: number;
  timeout: number;
  agents?: { [key: string]: AgentMode };
}

export interface AgentMode {
  description: string;
  prompt: string;
  tools: string[];
}

export interface ProgressEntry {
  agentId: string;
  agentName: string;
  status: string;
  progress: number;
  currentTask?: string;
  lastUpdate: Date;
}

export interface SecurityScanOptions {
  output: string;
  parallel?: boolean;
  maxAgents?: number;
  timeout?: number;
}

export interface CommandOptions {
  mode?: string;
  task?: string;
  parallel?: boolean;
  maxAgents?: string;
  timeout?: string;
}

// Legacy types for backward compatibility
export interface RoomodeDefinition {
  description: string;
  prompt: string;
  tools: string[];
}

export interface RoomodesConfig {
  [modeName: string]: RoomodeDefinition;
}