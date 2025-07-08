/**
 * @fileoverview Custom error classes for goose-flow application
 * Provides structured error handling with categorization and recovery hints.
 * This module implements a comprehensive error handling system that integrates
 * with the logging system to provide detailed error context and recovery information.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

/**
 * Error codes categorized by domain for structured error handling
 * @enum {string}
 */

export enum ErrorCode {
  // Task related errors
  TASK_CREATION_FAILED = 'TASK_CREATION_FAILED',
  TASK_EXECUTION_FAILED = 'TASK_EXECUTION_FAILED',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  TASK_TIMEOUT = 'TASK_TIMEOUT',
  TASK_VALIDATION_FAILED = 'TASK_VALIDATION_FAILED',
  
  // Process related errors
  PROCESS_START_FAILED = 'PROCESS_START_FAILED',
  PROCESS_COMMUNICATION_FAILED = 'PROCESS_COMMUNICATION_FAILED',
  PROCESS_UNEXPECTED_EXIT = 'PROCESS_UNEXPECTED_EXIT',
  
  // Configuration errors
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_PARSE_FAILED = 'CONFIG_PARSE_FAILED',
  
  // Orchestration errors
  ORCHESTRATION_PARSE_FAILED = 'ORCHESTRATION_PARSE_FAILED',
  ORCHESTRATION_TOOL_FAILED = 'ORCHESTRATION_TOOL_FAILED',
  DELEGATION_FAILED = 'DELEGATION_FAILED',
  
  // System errors
  FILE_OPERATION_FAILED = 'FILE_OPERATION_FAILED',
  SAFETY_LIMIT_EXCEEDED = 'SAFETY_LIMIT_EXCEEDED',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  
  // Network/API errors
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  API_RATE_LIMITED = 'API_RATE_LIMITED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
}

/**
 * Severity levels for error classification
 * @enum {string}
 */
export enum ErrorSeverity {
  /** Low severity - informational errors that don't affect core functionality */
  LOW = 'low',
  /** Medium severity - errors that may impact user experience */
  MEDIUM = 'medium',
  /** High severity - errors that significantly impact functionality */
  HIGH = 'high',
  /** Critical severity - errors that prevent system operation */
  CRITICAL = 'critical',
}

/**
 * Context information for error instances
 * Provides additional metadata about where and when an error occurred
 * @interface ErrorContext
 */
export interface ErrorContext {
  /** ID of the task where the error occurred */
  taskId?: string;
  /** Mode of operation when error occurred (e.g., 'orchestrator', 'coder') */
  mode?: string;
  /** Specific operation that failed */
  operation?: string;
  /** Timestamp when error occurred (automatically set) */
  timestamp?: Date;
  /** Stack trace of the error (automatically captured) */
  stackTrace?: string;
  /** Additional context data specific to the error */
  additionalData?: Record<string, unknown>;
}

/**
 * Base error class for all goose-flow errors
 * 
 * Provides structured error handling with context, severity levels,
 * and recovery hints. All application-specific errors should extend this class.
 * 
 * @abstract
 * @extends Error
 * @example
 * ```typescript
 * const error = new TaskError(
 *   'Task not found',
 *   ErrorCode.TASK_NOT_FOUND,
 *   { taskId: 'task-123', operation: 'getTask' }
 * );
 * ```
 */
export abstract class GooseFlowError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  
  constructor(
    message: string,
    code: ErrorCode,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext = {},
    recoverable = false,
    retryable = false
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.context = {
      ...context,
      timestamp: new Date(),
      stackTrace: this.stack
    };
    this.recoverable = recoverable;
    this.retryable = retryable;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Convert error to JSON format for logging and serialization
   * 
   * @returns {Record<string, unknown>} Structured error data
   * @example
   * ```typescript
   * const errorData = error.toJSON();
   * logger.error(JSON.stringify(errorData));
   * ```
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      context: this.context,
      recoverable: this.recoverable,
      retryable: this.retryable
    };
  }
}

/**
 * Task related errors
 */
export class TaskError extends GooseFlowError {
  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) {
    super(message, code, severity, context, true, true);
  }
}

/**
 * Process related errors
 */
export class ProcessError extends GooseFlowError {
  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    severity: ErrorSeverity = ErrorSeverity.HIGH
  ) {
    super(message, code, severity, context, true, false);
  }
}

/**
 * Configuration related errors
 */
export class ConfigError extends GooseFlowError {
  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    severity: ErrorSeverity = ErrorSeverity.HIGH
  ) {
    super(message, code, severity, context, false, false);
  }
}

/**
 * Orchestration related errors
 */
export class OrchestrationError extends GooseFlowError {
  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) {
    super(message, code, severity, context, true, true);
  }
}

/**
 * System related errors
 */
export class SystemError extends GooseFlowError {
  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    severity: ErrorSeverity = ErrorSeverity.CRITICAL
  ) {
    super(message, code, severity, context, false, false);
  }
}

/**
 * Network/API related errors
 */
export class NetworkError extends GooseFlowError {
  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) {
    super(message, code, severity, context, true, true);
  }
}

/**
 * Safety violation errors
 */
export class SafetyError extends GooseFlowError {
  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    severity: ErrorSeverity = ErrorSeverity.HIGH
  ) {
    super(message, code, severity, context, false, false);
  }
}

/**
 * Factory function to create appropriate GooseFlowError instance from unknown error
 * 
 * Automatically determines the correct error type based on the error code
 * and creates an instance of the appropriate error class.
 * 
 * @param {unknown} error - Original error or error message
 * @param {ErrorCode} code - Error code to categorize the error
 * @param {ErrorContext} context - Additional context information
 * @returns {GooseFlowError} Appropriate error instance based on code
 * 
 * @example
 * ```typescript
 * try {
 *   // some operation
 * } catch (error) {
 *   const gooseError = createGooseFlowError(
 *     error,
 *     ErrorCode.TASK_EXECUTION_FAILED,
 *     { taskId: 'task-123', operation: 'executeTask' }
 *   );
 *   throw gooseError;
 * }
 * ```
 */
export function createGooseFlowError(
  error: unknown,
  code: ErrorCode,
  context: ErrorContext = {}
): GooseFlowError {
  const message = error instanceof Error ? error.message : String(error);
  
  // Determine error type based on code
  switch (code) {
    case ErrorCode.TASK_CREATION_FAILED:
    case ErrorCode.TASK_EXECUTION_FAILED:
    case ErrorCode.TASK_NOT_FOUND:
    case ErrorCode.TASK_TIMEOUT:
    case ErrorCode.TASK_VALIDATION_FAILED:
      return new TaskError(message, code, context);
      
    case ErrorCode.PROCESS_START_FAILED:
    case ErrorCode.PROCESS_COMMUNICATION_FAILED:
    case ErrorCode.PROCESS_UNEXPECTED_EXIT:
      return new ProcessError(message, code, context);
      
    case ErrorCode.CONFIG_NOT_FOUND:
    case ErrorCode.CONFIG_INVALID:
    case ErrorCode.CONFIG_PARSE_FAILED:
      return new ConfigError(message, code, context);
      
    case ErrorCode.ORCHESTRATION_PARSE_FAILED:
    case ErrorCode.ORCHESTRATION_TOOL_FAILED:
    case ErrorCode.DELEGATION_FAILED:
      return new OrchestrationError(message, code, context);
      
    case ErrorCode.SAFETY_LIMIT_EXCEEDED:
      return new SafetyError(message, code, context);
      
    case ErrorCode.API_REQUEST_FAILED:
    case ErrorCode.API_RATE_LIMITED:
    case ErrorCode.CONNECTION_FAILED:
      return new NetworkError(message, code, context);
      
    default:
      return new SystemError(message, code, context);
  }
}