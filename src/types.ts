// Legacy AgentConfig and AgentInstance interfaces removed
// Replaced by TaskOrchestrator and Task interfaces

export interface Task {
  id: string;
  type: string;
  role: string;
  data: any;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  assignedAgent?: string;
  // Orchestration properties
  parentId?: string;
  rootId?: string;
  depth: number;
  mode: string;
  isPaused: boolean;
  pausedMode?: string;
  result?: string;
  children: string[];
  instruction?: string;
  sessionName?: string;
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
  roleDefinition: string;
  groups: (string | [string, { cmdRegex?: string; fileRegex?: string }])[];
  customInstructions: string;
}

// Tool groups system
export interface ToolGroups {
  read: string[];
  edit: string[];
  browser: string[];
  command: string[];
  mcp: string[];
  modes: string[];
}

// Always available tools
export const ALWAYS_AVAILABLE_TOOLS = [
  'ask_followup_question',
  'attempt_completion', 
  'switch_mode',
  'new_task'
];

// Tool groups mapping
export const TOOL_GROUPS: ToolGroups = {
  read: ['read_file', 'search_files', 'list_files', 'list_code_definition_names'],
  edit: ['write_to_file', 'apply_diff', 'insert_content', 'search_and_replace'], 
  browser: ['browser_action'],
  command: ['execute_command'],
  mcp: ['use_mcp_tool', 'access_mcp_resource'],
  modes: ['switch_mode', 'new_task']
};

export interface ProgressEntry {
  agentId: string;
  agentName: string;
  status: string;
  progress: number;
  currentTask?: string;
  lastUpdate: Date;
}

// SecurityScanOptions removed - replaced by orchestration system

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

// Orchestration types
export interface GooseProcess {
  taskId: string;
  process: any; // ExecaChildProcess
  mode: string;
  tools: string[];
  sessionName: string;
  status: 'starting' | 'running' | 'paused' | 'completed' | 'failed';
}

export interface TaskStackEntry {
  task: Task;
  timestamp: Date;
}

export interface OrchestrationEvent {
  type: 'task_created' | 'task_paused' | 'task_resumed' | 'task_completed' | 'task_failed';
  taskId: string;
  parentId?: string;
  data?: any;
  timestamp: Date;
}

export interface CreateSubtaskRequest {
  mode: string;
  instruction: string;
  tools?: string[];
  maxTurns?: number;
}

export interface CompleteTaskRequest {
  result: string;
  summary?: string;
}

export interface TaskHierarchy {
  id: string;
  mode: string;
  status: string;
  depth: number;
  children: TaskHierarchy[];
  startTime: Date;
  endTime?: Date;
  result?: string;
}