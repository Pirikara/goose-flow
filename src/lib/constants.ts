/**
 * Application constants and configuration values
 */

// Task orchestration defaults
export const TASK_DEFAULTS = {
  MAX_TURNS: 10,
  MAX_TURNS_ORCHESTRATOR: 50,
  MAX_DEPTH: 5,
  MAX_CHILDREN: 10,
  MAX_TOTAL_TASKS: 50,
  MAX_CONCURRENT: 4,
  TIMEOUT: 1800000, // 30 minutes
  STACK_MAX_DEPTH: 10,
} as const;

// Progress tracking
export const PROGRESS_DEFAULTS = {
  INITIAL_PROGRESS: 10,
  STARTING_PROGRESS: 15,
  ANALYZING_PROGRESS: 30,
  SCANNING_PROGRESS: 45,
  PROCESSING_PROGRESS: 60,
  GENERATING_PROGRESS: 80,
  COMPLETING_PROGRESS: 95,
  COMPLETED_PROGRESS: 100,
  FAILED_PROGRESS: 0,
} as const;

// Mode definitions
export const AVAILABLE_MODES = [
  'orchestrator',
  'coder',
  'researcher', 
  'tester',
  'reviewer',
  'debugger',
  'architect',
  'documenter',
  'analyzer',
] as const;

export type AvailableMode = typeof AVAILABLE_MODES[number];

// Tool patterns
export const TOOL_PATTERNS = {
  NEW_TASK: /new_task\s*\{([^}]+)\}/gi,
  ATTEMPT_COMPLETION: /attempt_completion\s*\{([^}]+)\}/gi,
  XML_NEW_TASK: /<new_task>\s*<mode>([^<]+)<\/mode>\s*<instruction>([^<]+)<\/instruction>(?:\s*<tools>([^<]+)<\/tools>)?(?:\s*<maxTurns>([^<]+)<\/maxTurns>)?\s*<\/new_task>/gi,
  XML_COMPLETION: /<attempt_completion>\s*<result>([^<]+)<\/result>(?:\s*<summary>([^<]+)<\/summary>)?\s*<\/attempt_completion>/gi,
  TOOL_CHECK: /(?:new_task|attempt_completion)\s*\{/,
  XML_TOOL_CHECK: /<(?:new_task|attempt_completion)>/,
} as const;

// File paths
export const FILE_PATHS = {
  PROGRESS_FILE: 'progress.json',
  CONFIG_FILE: 'goose-flow.config.json',
  WORKSPACE_DIR: '.goose-flow/workspace',
  TASKS_DIR: 'tasks',
  LOGS_DIR: 'logs',
  RESULTS_DIR: 'results',
} as const;

// Process settings
export const PROCESS_SETTINGS = {
  STDIN_ENCODING: 'utf8',
  INSTRUCTION_DELAY: 2000, // 2 seconds
  RESPONSE_TIMEOUT: 30000, // 30 seconds
  COMPLETION_TIMEOUT: 10000, // 10 seconds
  WAIT_INTERVAL: 100, // 100ms
} as const;

// Logging levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn', 
  INFO: 'info',
  DEBUG: 'debug',
} as const;

// Safety constraints
export const SAFETY_LIMITS = {
  MAX_RETRIES: 3,
  SESSION_MAX_DURATION: 3600000, // 1 hour
  TASK_CREATION_LIMIT: 100,
  MEMORY_LIMIT_MB: 512,
} as const;