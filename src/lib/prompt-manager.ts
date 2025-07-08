import { ConfigParser } from './config-parser';

/**
 * Manages prompt generation for different agent modes
 * Centralizes all prompt logic and provides consistent formatting
 */
export class PromptManager {
  private configParser: ConfigParser;

  constructor(configParser: ConfigParser) {
    this.configParser = configParser;
  }

  /**
   * Generate mode-specific prompt for orchestrator
   */
  async generateOrchestratorPrompt(): Promise<string> {
    return 'ONLY respond with EXACTLY this format: new_task {mode: "coder", instruction: "task description"} - NO other text, NO explanations, NO tools. Just the exact format.';
  }

  /**
   * Generate mode-specific prompt for other modes
   */
  async generateModePrompt(mode: string): Promise<string> {
    try {
      const modeConfig = await this.configParser.getModeDefinition(mode);
      
      if (mode === 'orchestrator') {
        return this.generateOrchestratorPrompt();
      }

      return `You are in "${mode}" mode. Available tools: new_task, attempt_completion. ${modeConfig.roleDefinition} ${modeConfig.customInstructions} When task is complete, use attempt_completion tool.`;
    } catch (error) {
      console.warn(`Failed to load mode config for ${mode}, using default prompt`);
      return `You are operating in "${mode}" mode. Use attempt_completion when your task is complete.`;
    }
  }

  /**
   * Build complete instruction with task context
   */
  buildTaskInstruction(modePrompt: string, task: string): string {
    return `${modePrompt} THE TASK: ${task} - Execute this task immediately using new_task tool to delegate to appropriate specialized modes or attempt_completion if you can do it yourself.`;
  }

  /**
   * Generate completion message for subtasks
   */
  generateCompletionMessage(taskId: string, result: string): string {
    return `[Subtask completed] Result: ${result}`;
  }

  /**
   * Generate tool response message
   */
  generateToolResponse(response: string): string {
    return `[TOOL_RESPONSE] ${response}`;
  }
}