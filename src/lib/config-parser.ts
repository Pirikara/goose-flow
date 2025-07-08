import * as fs from 'fs-extra';
import * as path from 'path';
import { GooseFlowConfig, AgentMode } from '../types';

export class ConfigParser {
  private configPath: string;
  private config: GooseFlowConfig | null = null;

  constructor(projectDir: string) {
    this.configPath = path.join(projectDir, 'goose-flow.config.json');
  }

  async loadConfig(): Promise<GooseFlowConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      if (await fs.pathExists(this.configPath)) {
        this.config = await fs.readJSON(this.configPath);
        return this.config!;
      } else {
        throw new Error(`Configuration file not found: ${this.configPath}`);
      }
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error}`);
    }
  }

  async getModeDefinition(modeName: string): Promise<AgentMode> {
    const config = await this.loadConfig();
    
    if (!config.agents || !config.agents[modeName]) {
      throw new Error(`Agent mode '${modeName}' not found in configuration`);
    }
    
    return config.agents[modeName];
  }

  async getAllModes(): Promise<{ [key: string]: AgentMode }> {
    const config = await this.loadConfig();
    return config.agents || {};
  }


  async createDefaultConfig(): Promise<void> {
    const defaultConfig: GooseFlowConfig = {
      version: '1.0',
      target: '.',
      maxConcurrent: 4,
      timeout: 1800000, // 30 minutes
      agents: {
        "orchestrator": {
          "description": "🪃 General workflow orchestration",
          "roleDefinition": "You are Roo, a strategic workflow orchestrator who coordinates complex tasks by delegating them to appropriate specialized modes. You have a comprehensive understanding of each mode's capabilities and limitations, allowing you to effectively break down complex problems into discrete tasks that can be solved by different specialists.",
          "groups": ["read"],
          "customInstructions": "Your role is to coordinate complex workflows by delegating tasks to specialized modes. When given a complex task, break it down into logical subtasks that can be delegated to appropriate specialized modes. Use the new_task tool to delegate. Choose the most appropriate mode for the subtask's specific goal and provide comprehensive instructions. Track and manage the progress of all subtasks. When all subtasks are completed, synthesize the results and provide a comprehensive overview."
        },
        "coder": {
          "description": "Autonomous code generation and implementation",
          "roleDefinition": "You are an expert programmer focused on writing clean, efficient, and well-documented code.",
          "groups": ["read", "edit", "command"],
          "customInstructions": "Write clean, efficient, and well-documented code. Follow established patterns and conventions."
        },
        "researcher": {
          "description": "Deep research and comprehensive analysis",
          "roleDefinition": "You are a research specialist focused on gathering comprehensive information.",
          "groups": ["read", "browser", "edit"],
          "customInstructions": "Gather comprehensive information and provide detailed analysis."
        },
        "tester": {
          "description": "Comprehensive testing and validation",
          "roleDefinition": "You are a testing specialist focused on comprehensive testing.",
          "groups": ["read", "edit", "command"],
          "customInstructions": "Create and execute comprehensive tests to ensure code quality."
        },
        "security-orchestrator": {
          "description": "Security analysis orchestration",
          "roleDefinition": "You are Roo, a strategic security workflow orchestrator who coordinates complex security assessments by delegating them to appropriate specialized security modes.",
          "groups": ["read"],
          "customInstructions": "Coordinate complex security workflows by delegating tasks to specialized security modes. Break down security assessment tasks into logical security subtasks. Use the new_task tool to delegate to appropriate modes: static-auditor for code analysis, vuln-validator for validation, report-writer for documentation. Synthesize results into comprehensive security overview."
        },
        "static-auditor": {
          "description": "Static code security analysis", 
          "roleDefinition": "Specialized in detecting code vulnerabilities",
          "groups": [
            "read", 
            "mcp",
            ["command", { "cmdRegex": "^(semgrep|eslint|bandit|brakeman|bundle-audit|yarn audit|npm audit)\\s" }]
          ],
          "customInstructions": "Perform static analysis using approved security tools. Only use whitelisted security analysis commands."
        },
        "vuln-validator": {
          "description": "Vulnerability validation and risk assessment",
          "roleDefinition": "Validates and assesses security findings", 
          "groups": [
            "read", 
            ["edit", { "fileRegex": "\\.(md|txt|json)$" }],
            ["command", { "cmdRegex": "^(curl|wget|ping|nslookup|dig)\\s" }]
          ],
          "customInstructions": "Validate findings and assess risk levels. Only edit documentation files and use approved validation tools."
        },
        "report-writer": {
          "description": "Security report generation",
          "roleDefinition": "Creates comprehensive security reports",
          "groups": [
            "read", 
            ["edit", { "fileRegex": "\\.(md|txt|pdf|docx?)$" }]
          ],
          "customInstructions": "Generate professional security assessment reports. Focus on documentation and report generation only."
        }
      }
    };

    await fs.ensureDir(path.dirname(this.configPath));
    await fs.writeJSON(this.configPath, defaultConfig, { spaces: 2 });
  }

  getConfigPath(): string {
    return this.configPath;
  }
}