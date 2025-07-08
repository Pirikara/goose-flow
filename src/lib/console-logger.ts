import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { GooseFlowError } from './errors';
import { FILE_PATHS } from './constants';

/**
 * @fileoverview Enhanced logging system for goose-flow
 * 
 * Provides structured, context-aware logging with both console and file output.
 * Integrates with the error handling system to provide comprehensive debugging
 * and monitoring capabilities.
 * 
 * Features:
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR)
 * - Structured logging with context information
 * - File-based logging with automatic rotation
 * - Integration with GooseFlowError system
 * - Performance monitoring and metrics
 * - Task-specific logging and filtering
 * 
 * @author Claude Code
 * @version 1.0.0
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Context information for log entries
 * Provides structured metadata about where and when a log entry was created
 * @interface LogContext
 */
export interface LogContext {
  /** ID of the task associated with this log entry */
  taskId?: string;
  /** Mode of operation (e.g., 'orchestrator', 'coder', 'researcher') */
  mode?: string;
  /** Specific operation being performed */
  operation?: string;
  /** Session identifier for grouping related logs */
  sessionId?: string;
  /** Additional context-specific data */
  [key: string]: unknown;
}

/**
 * Structured log entry for storage and analysis
 * @interface LogEntry
 */
export interface LogEntry {
  /** When the log entry was created */
  timestamp: Date;
  /** Severity level of the log entry */
  level: LogLevel;
  /** Human-readable log message */
  message: string;
  /** Contextual information about the log entry */
  context?: LogContext;
  /** Associated error if this is an error log */
  error?: GooseFlowError;
  /** Additional structured data */
  data?: Record<string, unknown>;
}

/**
 * Configuration options for the logger
 * @interface LoggerOptions
 */
export interface LoggerOptions {
  /** Minimum log level to output */
  level: LogLevel;
  /** Whether to include timestamps in console output */
  timestamp: boolean;
  /** Whether to use colors in console output */
  colors: boolean;
  /** Whether to enable file logging */
  logToFile: boolean;
  /** Directory for log files */
  logDirectory: string;
  /** Maximum number of log files to keep */
  maxLogFiles: number;
  /** Whether to include stack traces in error logs */
  includeStackTrace: boolean;
}

/**
 * Enhanced console and file logger with structured logging capabilities
 * 
 * Provides comprehensive logging functionality with context awareness,
 * file persistence, and integration with the GooseFlowError system.
 * 
 * @class ConsoleLogger
 * @example
 * ```typescript
 * const logger = new ConsoleLogger({ level: LogLevel.DEBUG, logToFile: true });
 * 
 * logger.info('Task started', { taskId: 'task-123', mode: 'coder' });
 * logger.error(new TaskError('Task failed', ErrorCode.TASK_EXECUTION_FAILED));
 * 
 * const taskLogs = logger.getTaskLogs('task-123');
 * await logger.exportLogs('./debug.json', { taskId: 'task-123' });
 * ```
 */
export class ConsoleLogger {
  private options: LoggerOptions;
  private activeSpinners: Map<string, NodeJS.Timeout> = new Map();
  private lastProgressLine: string = '';
  private logEntries: LogEntry[] = [];
  private logFileStream?: fs.WriteStream;

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = {
      level: process.env.GOOSE_FLOW_LOG_LEVEL ? 
        parseInt(process.env.GOOSE_FLOW_LOG_LEVEL) : LogLevel.INFO,
      timestamp: false,
      colors: true,
      logToFile: true,
      logDirectory: FILE_PATHS.LOGS_DIR,
      maxLogFiles: 10,
      includeStackTrace: false,
      ...options
    };
    
    if (this.options.logToFile) {
      this.initializeFileLogging();
    }
  }
  
  private async initializeFileLogging(): Promise<void> {
    try {
      await fs.ensureDir(this.options.logDirectory);
      const logFileName = `goose-flow-${new Date().toISOString().slice(0, 10)}.log`;
      const logFilePath = path.join(this.options.logDirectory, logFileName);
      
      this.logFileStream = fs.createWriteStream(logFilePath, { flags: 'a' });
      
      // Clean up old log files
      await this.cleanupOldLogs();
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
    }
  }
  
  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.options.logDirectory);
      const logFiles = files
        .filter(file => file.startsWith('goose-flow-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.options.logDirectory, file),
          stats: fs.statSync(path.join(this.options.logDirectory, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
      
      // Remove old log files beyond maxLogFiles
      const filesToDelete = logFiles.slice(this.options.maxLogFiles);
      for (const file of filesToDelete) {
        await fs.remove(file.path);
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.options.level;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: GooseFlowError, prefix?: string): void {
    if (!this.shouldLog(level)) return;
    
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      error,
    };
    
    // Store log entry for analysis
    this.logEntries.push(logEntry);
    
    // Console output
    const formattedMessage = this.formatMessage(level, message, context, prefix);
    this.outputToConsole(level, formattedMessage);
    
    // File output
    if (this.options.logToFile && this.logFileStream) {
      this.outputToFile(logEntry);
    }
  }
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext, prefix?: string): string {
    let formatted = '';
    
    if (this.options.timestamp) {
      const timestamp = new Date().toISOString().slice(11, 19);
      formatted += chalk.gray(`[${timestamp}] `);
    }
    
    // Add context information
    if (context) {
      const contextParts: string[] = [];
      if (context.taskId) contextParts.push(`task:${context.taskId.slice(-6)}`);
      if (context.mode) contextParts.push(`mode:${context.mode}`);
      if (context.operation) contextParts.push(`op:${context.operation}`);
      
      if (contextParts.length > 0) {
        formatted += chalk.cyan(`[${contextParts.join(',')}] `);
      }
    }

    if (prefix) {
      formatted += `${prefix} `;
    }

    return formatted + message;
  }
  
  private outputToConsole(level: LogLevel, message: string): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.log(chalk.gray(message));
        break;
      case LogLevel.INFO:
        console.log(message);
        break;
      case LogLevel.WARN:
        console.warn(chalk.yellow(message));
        break;
      case LogLevel.ERROR:
        console.error(chalk.red(message));
        break;
    }
  }
  
  private outputToFile(logEntry: LogEntry): void {
    if (!this.logFileStream) return;
    
    const fileLogEntry = {
      timestamp: logEntry.timestamp.toISOString(),
      level: LogLevel[logEntry.level],
      message: logEntry.message,
      context: logEntry.context,
      error: logEntry.error?.toJSON(),
    };
    
    this.logFileStream.write(JSON.stringify(fileLogEntry) + '\n');
  }

  debug(message: string, context?: LogContext, prefix?: string): void {
    this.log(LogLevel.DEBUG, message, context, undefined, prefix);
  }

  info(message: string, context?: LogContext, prefix?: string): void {
    this.log(LogLevel.INFO, message, context, undefined, prefix);
  }

  warn(message: string, context?: LogContext, prefix?: string): void {
    this.log(LogLevel.WARN, message, context, undefined, prefix);
  }

  error(message: string, context?: LogContext, prefix?: string): void;
  error(error: GooseFlowError, context?: LogContext, prefix?: string): void;
  error(messageOrError: string | GooseFlowError, context?: LogContext, prefix?: string): void {
    if (typeof messageOrError === 'string') {
      this.log(LogLevel.ERROR, messageOrError, context, undefined, prefix);
    } else {
      this.log(LogLevel.ERROR, messageOrError.message, context, messageOrError, prefix);
    }
  }

  // Task-specific logging
  taskStarted(taskId: string, mode: string, instruction: string): void {
    const shortId = taskId.slice(-6);
    this.info('');
    this.info(chalk.blue('┌─────────────────────────────────────────────────┐'));
    this.info(chalk.blue('│') + chalk.cyan(` 🚀 Task Started: ${mode}`.padEnd(47)) + chalk.blue('│'));
    this.info(chalk.blue('│') + chalk.gray(` ID: ${shortId}`.padEnd(47)) + chalk.blue('│'));
    this.info(chalk.blue('│') + ` Task: ${instruction.slice(0, 40)}${instruction.length > 40 ? '...' : ''}`.padEnd(47) + chalk.blue('│'));
    this.info(chalk.blue('└─────────────────────────────────────────────────┘'));
    this.info('');
  }

  taskCompleted(taskId: string, mode: string, result?: string): void {
    const shortId = taskId.slice(-6);
    this.info('');
    this.info(chalk.green('┌─────────────────────────────────────────────────┐'));
    this.info(chalk.green('│') + chalk.cyan(` ✅ Task Completed: ${mode}`.padEnd(47)) + chalk.green('│'));
    this.info(chalk.green('│') + chalk.gray(` ID: ${shortId}`.padEnd(47)) + chalk.green('│'));
    if (result) {
      this.info(chalk.green('│') + ` Result: ${result.slice(0, 38)}${result.length > 38 ? '...' : ''}`.padEnd(47) + chalk.green('│'));
    }
    this.info(chalk.green('└─────────────────────────────────────────────────┘'));
    this.info('');
  }

  taskFailed(taskId: string, mode: string, error?: string): void {
    const shortId = taskId.slice(-6);
    this.info('');
    this.info(chalk.red('┌─────────────────────────────────────────────────┐'));
    this.info(chalk.red('│') + chalk.yellow(` ❌ Task Failed: ${mode}`.padEnd(47)) + chalk.red('│'));
    this.info(chalk.red('│') + chalk.gray(` ID: ${shortId}`.padEnd(47)) + chalk.red('│'));
    if (error) {
      this.info(chalk.red('│') + ` Error: ${error.slice(0, 39)}${error.length > 39 ? '...' : ''}`.padEnd(47) + chalk.red('│'));
    }
    this.info(chalk.red('└─────────────────────────────────────────────────┘'));
    this.info('');
  }

  taskProgress(taskId: string, mode: string, progress: number, status: string, activity?: string): void {
    const shortId = taskId.slice(-6);
    const progressBar = this.createProgressBar(progress);
    const statusIcon = this.getStatusIcon(status);
    
    // Clear previous progress line
    if (this.lastProgressLine) {
      process.stdout.write('\x1b[1A\x1b[K'); // Move up and clear line
    }
    
    let line = `${statusIcon} ${chalk.cyan(mode.padEnd(12))} ${chalk.gray(shortId)} ${progressBar} ${progress.toFixed(0).padStart(3)}%`;
    
    if (activity) {
      line += ` ${chalk.gray('›')} ${activity.slice(0, 30)}${activity.length > 30 ? '...' : ''}`;
    }
    
    console.log(line);
    this.lastProgressLine = line;
  }

  private createProgressBar(progress: number, width: number = 20): string {
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    
    const filledBar = chalk.cyan('█'.repeat(filled));
    const emptyBar = chalk.gray('░'.repeat(empty));
    
    return `[${filledBar}${emptyBar}]`;
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'running': return chalk.yellow('⚡');
      case 'completed': return chalk.green('✅');
      case 'failed': return chalk.red('❌');
      case 'paused': return chalk.blue('⏸️');
      case 'pending': return chalk.gray('⏳');
      default: return chalk.gray('●');
    }
  }

  taskOutput(taskId: string, mode: string, output: string, isError: boolean = false): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const cleanOutput = output.trim();
    if (cleanOutput.length === 0) return;
    
    // Filter out noise
    if (this.isNoiseOutput(cleanOutput)) return;
    
    const context: LogContext = {
      taskId,
      mode,
      operation: 'taskOutput'
    };
    
    if (isError) {
      this.error(cleanOutput, context);
    } else {
      this.debug(cleanOutput, context);
    }
  }

  private isNoiseOutput(output: string): boolean {
    const noisePatterns = [
      /^Reading file:/,
      /^Processing file:/,
      /^\s*$/,
      /^DEBUG:/,
      /^INFO:/,
      /^Scanning/,
      /^Found \d+ files/,
      /^Loaded \d+ rules/,
    ];
    
    return noisePatterns.some(pattern => pattern.test(output));
  }

  orchestrationHeader(modes: string[]): void {
    this.info('');
    this.info(chalk.blue('╔═══════════════════════════════════════════════════════════════╗'));
    this.info(chalk.blue('║') + chalk.cyan(' 🚀 GOOSE-FLOW SECURITY ORCHESTRATION STARTED'.padEnd(61)) + chalk.blue('║'));
    this.info(chalk.blue('║') + ''.padEnd(61) + chalk.blue('║'));
    this.info(chalk.blue('║') + chalk.white(` Agents: ${modes.join(' → ')}`).padEnd(61) + chalk.blue('║'));
    this.info(chalk.blue('║') + chalk.gray(` Time: ${new Date().toLocaleString()}`).padEnd(61) + chalk.blue('║'));
    this.info(chalk.blue('╚═══════════════════════════════════════════════════════════════╝'));
    this.info('');
  }

  orchestrationSummary(completed: number, failed: number, total: number): void {
    this.info('');
    this.info(chalk.blue('╔═══════════════════════════════════════════════════════════════╗'));
    this.info(chalk.blue('║') + chalk.cyan(' 📊 ORCHESTRATION SUMMARY'.padEnd(61)) + chalk.blue('║'));
    this.info(chalk.blue('║') + ''.padEnd(61) + chalk.blue('║'));
    this.info(chalk.blue('║') + chalk.green(` ✅ Completed: ${completed}`).padEnd(61) + chalk.blue('║'));
    this.info(chalk.blue('║') + chalk.red(` ❌ Failed: ${failed}`).padEnd(61) + chalk.blue('║'));
    this.info(chalk.blue('║') + chalk.cyan(` 📈 Total: ${total}`).padEnd(61) + chalk.blue('║'));
    this.info(chalk.blue('║') + ''.padEnd(61) + chalk.blue('║'));
    this.info(chalk.blue('║') + chalk.gray(` Finished: ${new Date().toLocaleString()}`).padEnd(61) + chalk.blue('║'));
    this.info(chalk.blue('╚═══════════════════════════════════════════════════════════════╝'));
    this.info('');
  }

  separator(title?: string): void {
    if (title) {
      this.info(chalk.gray('─'.repeat(20) + ` ${title} ` + '─'.repeat(20)));
    } else {
      this.info(chalk.gray('─'.repeat(50)));
    }
  }

  clearProgress(): void {
    if (this.lastProgressLine) {
      process.stdout.write('\x1b[1A\x1b[K'); // Move up and clear line
      this.lastProgressLine = '';
    }
  }
  
  /**
   * Log performance metrics for operations
   * 
   * @param {string} operation - Name of the operation
   * @param {number} duration - Duration in milliseconds
   * @param {LogContext} [context] - Additional context information
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    const perfContext: LogContext = {
      ...context,
      operation,
      duration,
    };
    
    this.debug(`Performance: ${operation} completed in ${duration}ms`, perfContext);
  }
  
  /**
   * Log structured data for debugging
   */
  structured(level: LogLevel, message: string, data: Record<string, unknown>, context?: LogContext): void {
    const structuredContext: LogContext = {
      ...context,
      structuredData: data,
    };
    
    this.log(level, message, structuredContext);
  }
  
  /**
   * Get recent log entries for analysis
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logEntries.slice(-count);
  }
  
  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logEntries.filter(entry => entry.level === level);
  }
  
  /**
   * Get logs for specific task
   */
  getTaskLogs(taskId: string): LogEntry[] {
    return this.logEntries.filter(entry => entry.context?.taskId === taskId);
  }
  
  /**
   * Export logs to a JSON file with optional filtering
   * 
   * @param {string} filePath - Path to save the exported logs
   * @param {Object} [filters] - Optional filters to apply
   * @param {LogLevel} [filters.level] - Filter by log level
   * @param {string} [filters.taskId] - Filter by task ID
   * @param {Date} [filters.startTime] - Filter by start time
   * @param {Date} [filters.endTime] - Filter by end time
   * @returns {Promise<void>}
   * @throws {Error} If file write fails
   */
  async exportLogs(filePath: string, filters?: { level?: LogLevel; taskId?: string; startTime?: Date; endTime?: Date }): Promise<void> {
    let logsToExport = this.logEntries;
    
    if (filters) {
      logsToExport = this.logEntries.filter(entry => {
        if (filters.level !== undefined && entry.level !== filters.level) return false;
        if (filters.taskId && entry.context?.taskId !== filters.taskId) return false;
        if (filters.startTime && entry.timestamp < filters.startTime) return false;
        if (filters.endTime && entry.timestamp > filters.endTime) return false;
        return true;
      });
    }
    
    const exportData = {
      exportTime: new Date().toISOString(),
      totalEntries: logsToExport.length,
      filters,
      logs: logsToExport.map(entry => ({
        timestamp: entry.timestamp.toISOString(),
        level: LogLevel[entry.level],
        message: entry.message,
        context: entry.context,
        error: entry.error?.toJSON(),
      })),
    };
    
    await fs.writeJson(filePath, exportData, { spaces: 2 });
  }
  
  /**
   * Close file logging stream
   */
  async close(): Promise<void> {
    if (this.logFileStream) {
      return new Promise((resolve) => {
        this.logFileStream!.end(resolve);
      });
    }
  }
  
  /**
   * Clear log entries from memory (keep file logs)
   */
  clearMemoryLogs(): void {
    this.logEntries = [];
  }
}

// Global logger instance
export const logger = new ConsoleLogger();

/**
 * Factory function to create a logger with predefined context
 * 
 * Creates a logger instance that automatically includes the specified
 * context in all log entries. Useful for creating task-specific or
 * operation-specific loggers.
 * 
 * @param {LogContext} context - Context to include in all log entries
 * @returns {Object} Logger instance with context-aware methods
 * @example
 * ```typescript
 * const taskLogger = createContextLogger({ taskId: 'task-123', mode: 'coder' });
 * taskLogger.info('Task started'); // Automatically includes task context
 * ```
 */
export function createContextLogger(context: LogContext): {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string | GooseFlowError) => void;
  performance: (operation: string, duration: number) => void;
} {
  return {
    debug: (message: string) => logger.debug(message, context),
    info: (message: string) => logger.info(message, context),
    warn: (message: string) => logger.warn(message, context),
    error: (messageOrError: string | GooseFlowError) => {
      if (typeof messageOrError === 'string') {
        logger.error(messageOrError, context);
      } else {
        logger.error(messageOrError, context);
      }
    },
    performance: (operation: string, duration: number) => logger.performance(operation, duration, context),
  };
}

/**
 * Decorator to automatically log method performance
 * 
 * Measures execution time of methods and logs performance metrics.
 * Works with both synchronous and asynchronous methods.
 * 
 * @param {string} operation - Name of the operation (defaults to method name)
 * @param {LogContext} [context] - Additional context for the performance log
 * @returns {Function} Method decorator
 * @example
 * ```typescript
 * class TaskProcessor {
 *   @logPerformance('processTask', { component: 'TaskProcessor' })
 *   async processTask(task: Task) {
 *     // Method implementation
 *   }
 * }
 * ```
 */
export function logPerformance(operation: string, context?: LogContext) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        logger.performance(`${operation || propertyKey}`, duration, context);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.performance(`${operation || propertyKey} (failed)`, duration, context);
        throw error;
      }
    };
    
    return descriptor;
  };
}