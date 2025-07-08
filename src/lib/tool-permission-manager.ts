import { AgentMode, TOOL_GROUPS, ALWAYS_AVAILABLE_TOOLS } from '../types';

interface ToolRestriction {
  cmdRegex?: string;
  fileRegex?: string;
}

export class ToolPermissionManager {
  private modes: { [key: string]: AgentMode };

  constructor(modes: { [key: string]: AgentMode }) {
    this.modes = modes;
  }

  updateModes(modes: { [key: string]: AgentMode }): void {
    this.modes = modes;
  }

  isToolAllowed(tool: string, mode: string): boolean {
    // Always allow orchestration tools
    if (ALWAYS_AVAILABLE_TOOLS.includes(tool)) {
      return true;
    }
    
    const modeConfig = this.modes[mode];
    if (!modeConfig) return false;
    
    // Check if tool is in any of the mode's allowed groups
    for (const group of modeConfig.groups) {
      let groupName: string;
      let restrictions: ToolRestriction | undefined;
      
      if (Array.isArray(group)) {
        [groupName, restrictions] = group;
      } else {
        groupName = group;
      }
      
      if (TOOL_GROUPS[groupName as keyof typeof TOOL_GROUPS]?.includes(tool)) {
        // If there are restrictions, check them
        if (restrictions) {
          return this.checkToolRestrictions(tool, restrictions);
        }
        return true;
      }
    }
    
    return false;
  }
  
  private checkToolRestrictions(tool: string, restrictions: ToolRestriction): boolean {
    // For now, we'll implement basic regex checking
    // In a full implementation, this would need to check against actual command/file parameters
    
    if (restrictions.cmdRegex && tool === 'execute_command') {
      // Command regex restrictions would be checked at execution time
      return true; // Allow for now, check at runtime
    }
    
    if (restrictions.fileRegex && (tool === 'write_to_file' || tool === 'apply_diff')) {
      // File regex restrictions would be checked at execution time
      return true; // Allow for now, check at runtime
    }
    
    return true;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAvailableTools(_mode: string): string[] {
    // Return only orchestration tools for now to avoid builtin tool issues
    return ['new_task', 'attempt_completion'];
  }

  validateCommandExecution(command: string, mode: string): boolean {
    const modeConfig = this.modes[mode];
    if (!modeConfig) return false;
    
    for (const group of modeConfig.groups) {
      if (Array.isArray(group)) {
        const [groupName, restrictions] = group;
        if (groupName === 'command' && restrictions?.cmdRegex) {
          const regex = new RegExp(restrictions.cmdRegex);
          return regex.test(command);
        }
      } else if (group === 'command') {
        return true; // No restrictions
      }
    }
    
    return false;
  }

  validateFileOperation(filePath: string, mode: string): boolean {
    const modeConfig = this.modes[mode];
    if (!modeConfig) return false;
    
    for (const group of modeConfig.groups) {
      if (Array.isArray(group)) {
        const [groupName, restrictions] = group;
        if (groupName === 'edit' && restrictions?.fileRegex) {
          const regex = new RegExp(restrictions.fileRegex);
          return regex.test(filePath);
        }
      } else if (group === 'edit') {
        return true; // No restrictions
      }
    }
    
    return false;
  }
}