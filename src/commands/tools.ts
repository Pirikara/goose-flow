import chalk from 'chalk';
import { ConfigParser } from '../lib/config-parser';
import { TOOL_GROUPS, ALWAYS_AVAILABLE_TOOLS } from '../types';

interface ToolOptions {
  mode?: string;
}

// Tool descriptions for better understanding
const TOOL_DESCRIPTIONS: Record<string, string> = {
  // Always available tools
  'ask_followup_question': 'Ask clarifying questions to better understand requirements',
  'attempt_completion': 'Mark the current task as completed and provide results',
  'switch_mode': 'Switch to a different agent mode for specialized tasks',
  'new_task': 'Create a new subtask and delegate to specialized agent',
  
  // Read tools
  'read_file': 'Read the contents of a file',
  'search_files': 'Search for specific content across multiple files',
  'list_files': 'List files and directories in a given path',
  'list_code_definition_names': 'List function/class definitions in code files',
  
  // Edit tools
  'write_to_file': 'Write content to a file (create or overwrite)',
  'apply_diff': 'Apply a unified diff patch to a file',
  'insert_content': 'Insert content at a specific line in a file',
  'search_and_replace': 'Search for text patterns and replace them',
  
  // Browser tools
  'browser_action': 'Perform web browser actions for research and testing',
  
  // Command tools
  'execute_command': 'Execute shell commands in the system',
  
  // MCP tools
  'use_mcp_tool': 'Use Model Context Protocol tools for extended functionality',
  'access_mcp_resource': 'Access resources through Model Context Protocol'
};

export async function tools(options: ToolOptions): Promise<void> {
  console.log(chalk.blue('🔧 Available Tools in goose-flow'));
  console.log(chalk.gray('═'.repeat(50)));
  
  if (options.mode) {
    await showToolsForMode(options.mode);
  } else {
    await showAllTools();
  }
  
  console.log(chalk.yellow('\n💡 Usage examples:'));
  console.log(chalk.gray('   goose-flow tools --mode orchestrator  # Show tools for orchestrator mode'));
  console.log(chalk.gray('   goose-flow tools                      # Show all available tools'));
}

async function showAllTools(): Promise<void> {
  console.log(chalk.cyan('\n📋 Always Available Tools:'));
  console.log(chalk.gray('─'.repeat(30)));
  
  for (const tool of ALWAYS_AVAILABLE_TOOLS) {
    const description = TOOL_DESCRIPTIONS[tool] || 'No description available';
    console.log(chalk.green(`  ✓ ${tool}`));
    console.log(chalk.gray(`    ${description}`));
  }
  
  console.log(chalk.cyan('\n🔍 Tool Categories:'));
  console.log(chalk.gray('─'.repeat(30)));
  
  for (const [category, tools] of Object.entries(TOOL_GROUPS)) {
    console.log(chalk.yellow(`\n${getCategoryIcon(category)} ${category.toUpperCase()}:`));
    
    for (const tool of tools) {
      const description = TOOL_DESCRIPTIONS[tool] || 'No description available';
      console.log(chalk.white(`  • ${tool}`));
      console.log(chalk.gray(`    ${description}`));
    }
  }
  
  console.log(chalk.cyan('\n📊 Tool Summary:'));
  console.log(chalk.gray('─'.repeat(30)));
  console.log(chalk.white(`Always Available: ${ALWAYS_AVAILABLE_TOOLS.length} tools`));
  
  let totalTools = ALWAYS_AVAILABLE_TOOLS.length;
  for (const tools of Object.values(TOOL_GROUPS)) {
    totalTools += tools.length;
  }
  console.log(chalk.white(`Total Available: ${totalTools} tools`));
}

async function showToolsForMode(modeName: string): Promise<void> {
  try {
    const configParser = new ConfigParser(process.cwd());
    await configParser.loadConfig();
    
    // Check if mode exists
    try {
      await configParser.getModeDefinition(modeName);
    } catch (error) {
      console.error(chalk.red(`❌ Mode '${modeName}' not found.`));
      console.log(chalk.yellow('💡 Use "goose-flow modes" to see available modes'));
      return;
    }
    
    const modes = await configParser.getAllModes();
    const modeConfig = modes[modeName];
    
    console.log(chalk.cyan(`\n🤖 Tools for Agent Mode: ${modeName}`));
    console.log(chalk.gray(`Description: ${modeConfig.description}`));
    console.log(chalk.gray('─'.repeat(40)));
    
    // Always available tools
    console.log(chalk.green('\n✅ Always Available:'));
    for (const tool of ALWAYS_AVAILABLE_TOOLS) {
      const description = TOOL_DESCRIPTIONS[tool] || 'No description available';
      console.log(chalk.white(`  • ${tool}`));
      console.log(chalk.gray(`    ${description}`));
    }
    
    // Mode-specific tools from groups
    console.log(chalk.green('\n🔧 Mode-Specific Tools:'));
    const availableTools = new Set<string>();
    
    for (const group of modeConfig.groups) {
      let groupName: string;
      let restrictions: { cmdRegex?: string; fileRegex?: string } | undefined;
      
      if (Array.isArray(group)) {
        [groupName, restrictions] = group;
      } else {
        groupName = group;
      }
      
      const categoryTools = TOOL_GROUPS[groupName as keyof typeof TOOL_GROUPS];
      if (categoryTools) {
        console.log(chalk.yellow(`\n  ${getCategoryIcon(groupName)} ${groupName.toUpperCase()}:`));
        
        if (restrictions) {
          console.log(chalk.gray(`    Restrictions:`));
          if (restrictions.cmdRegex) {
            console.log(chalk.gray(`      Command regex: ${restrictions.cmdRegex}`));
          }
          if (restrictions.fileRegex) {
            console.log(chalk.gray(`      File regex: ${restrictions.fileRegex}`));
          }
        }
        
        for (const tool of categoryTools) {
          const description = TOOL_DESCRIPTIONS[tool] || 'No description available';
          console.log(chalk.white(`    • ${tool}`));
          console.log(chalk.gray(`      ${description}`));
          availableTools.add(tool);
        }
      }
    }
    
    // Summary
    console.log(chalk.cyan('\n📊 Summary:'));
    console.log(chalk.gray('─'.repeat(20)));
    console.log(chalk.white(`Always Available: ${ALWAYS_AVAILABLE_TOOLS.length} tools`));
    console.log(chalk.white(`Mode-Specific: ${availableTools.size} tools`));
    console.log(chalk.white(`Total: ${ALWAYS_AVAILABLE_TOOLS.length + availableTools.size} tools`));
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to load configuration. Run "goose-flow init" first.'));
    console.log(chalk.yellow('💡 Run "goose-flow init" to create goose-flow.config.json'));
  }
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    read: '📖',
    edit: '✏️',
    browser: '🌐',
    command: '💻',
    mcp: '🔌',
    modes: '🔀'
  };
  
  return icons[category] || '🔧';
}