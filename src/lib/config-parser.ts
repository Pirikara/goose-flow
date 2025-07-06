import * as fs from 'fs-extra';
import * as path from 'path';
import { GooseFlowConfig, AgentConfig, AgentMode } from '../types';

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

  async convertToAgentConfig(modeName: string, task?: string): Promise<AgentConfig> {
    const modeDefinition = await this.getModeDefinition(modeName);
    
    return {
      name: modeName,
      description: modeDefinition.description,
      prompt: modeDefinition.prompt,
      initialTask: task || `Execute ${modeName} workflow`,
      outputFile: `${modeName}-results.md`,
      nextRoles: [],
      tools: modeDefinition.tools,
      environment: {
        AGENT_MODE: modeName
      }
    };
  }

  async createDefaultConfig(): Promise<void> {
    const defaultConfig: GooseFlowConfig = {
      version: '1.0',
      target: '.',
      maxConcurrent: 4,
      timeout: 1800000, // 30 minutes
      agents: {
        "orchestrator": {
          "description": "Multi-agent task orchestration and coordination",
          "prompt": "You are an AI orchestrator coordinating multiple specialized agents to complete complex tasks efficiently using TodoWrite, TodoRead, Task, and Memory tools.",
          "tools": [
            "TodoWrite",
            "TodoRead", 
            "Task",
            "Memory",
            "Bash"
          ]
        },
        "coder": {
          "description": "Autonomous code generation and implementation",
          "prompt": "You are an expert programmer focused on writing clean, efficient, and well-documented code using batch file operations.",
          "tools": [
            "Read",
            "Write",
            "Edit", 
            "Bash",
            "Glob",
            "Grep",
            "TodoWrite"
          ]
        },
        "researcher": {
          "description": "Deep research and comprehensive analysis",
          "prompt": "You are a research specialist focused on gathering comprehensive information using parallel WebSearch/WebFetch and Memory coordination.",
          "tools": [
            "WebSearch",
            "WebFetch",
            "Read",
            "Write",
            "Memory",
            "TodoWrite",
            "Task"
          ]
        },
        "tdd": {
          "description": "Test-driven development methodology",
          "prompt": "You follow strict test-driven development practices using TodoWrite for test planning and batch operations for test execution.",
          "tools": [
            "Read",
            "Write",
            "Edit",
            "Bash",
            "TodoWrite",
            "Task"
          ]
        },
        "architect": {
          "description": "System design and architecture planning",
          "prompt": "You are a software architect focused on designing scalable, maintainable system architectures using Memory for design coordination.",
          "tools": [
            "Read",
            "Write",
            "Glob",
            "Memory",
            "TodoWrite",
            "Task"
          ]
        },
        "reviewer": {
          "description": "Code review and quality optimization", 
          "prompt": "You are a code reviewer focused on improving code quality using batch file analysis and systematic review processes.",
          "tools": [
            "Read",
            "Edit",
            "Grep",
            "Bash",
            "TodoWrite",
            "Memory"
          ]
        },
        "debugger": {
          "description": "Debug and fix issues systematically",
          "prompt": "You are a debugging specialist using TodoWrite for systematic debugging and Memory for tracking issue patterns.",
          "tools": [
            "Read",
            "Edit",
            "Bash",
            "Grep",
            "TodoWrite",
            "Memory"
          ]
        },
        "tester": {
          "description": "Comprehensive testing and validation",
          "prompt": "You are a testing specialist using TodoWrite for test planning and parallel execution for comprehensive coverage.",
          "tools": [
            "Read",
            "Write",
            "Edit",
            "Bash",
            "TodoWrite",
            "Task"
          ]
        },
        "analyzer": {
          "description": "Code and data analysis specialist",
          "prompt": "You are an analysis specialist using batch operations for efficient data processing and Memory for insight coordination.",
          "tools": [
            "Read",
            "Grep",
            "Bash",
            "Write",
            "Memory",
            "TodoWrite",
            "Task"
          ]
        },
        "optimizer": {
          "description": "Performance optimization specialist",
          "prompt": "You are a performance optimization specialist using systematic analysis and TodoWrite for optimization planning.",
          "tools": [
            "Read",
            "Edit",
            "Bash",
            "Grep",
            "TodoWrite",
            "Memory"
          ]
        },
        "documenter": {
          "description": "Documentation generation and maintenance",
          "prompt": "You are a documentation specialist using batch file operations and Memory for comprehensive documentation coordination.",
          "tools": [
            "Read",
            "Write",
            "Glob",
            "Memory",
            "TodoWrite"
          ]
        },
        "designer": {
          "description": "UI/UX design and user experience",
          "prompt": "You are a UI/UX designer using Memory for design coordination and TodoWrite for design process management.",
          "tools": [
            "Read",
            "Write",
            "Edit",
            "Memory",
            "TodoWrite"
          ]
        },
        "innovator": {
          "description": "Creative problem solving and innovation",
          "prompt": "You are an innovation specialist using WebSearch for inspiration and Memory for idea coordination across sessions.",
          "tools": [
            "Read",
            "Write",
            "WebSearch",
            "Memory",
            "TodoWrite",
            "Task"
          ]
        },
        "swarm-coordinator": {
          "description": "Swarm coordination and management",
          "prompt": "You coordinate swarms of AI agents using TodoWrite for task management, Task for agent launching, and Memory for coordination.",
          "tools": [
            "TodoWrite",
            "TodoRead",
            "Task",
            "Memory",
            "Bash"
          ]
        },
        "memory-manager": {
          "description": "Memory and knowledge management",
          "prompt": "You manage knowledge and memory systems using Memory tools for persistent storage and TodoWrite for knowledge organization.",
          "tools": [
            "Memory",
            "Read",
            "Write",
            "TodoWrite",
            "TodoRead"
          ]
        },
        "batch-executor": {
          "description": "Parallel task execution specialist",
          "prompt": "You excel at executing multiple tasks in parallel using batch tool operations and Task coordination for maximum efficiency.",
          "tools": [
            "Task",
            "Bash",
            "Read",
            "Write",
            "TodoWrite",
            "Memory"
          ]
        },
        "workflow-manager": {
          "description": "Workflow automation and process management",
          "prompt": "You design and manage automated workflows using TodoWrite for process planning and Task coordination for execution.",
          "tools": [
            "TodoWrite",
            "TodoRead",
            "Task",
            "Bash",
            "Memory"
          ]
        },
        "security-orchestrator": {
          "description": "Security analysis orchestration",
          "prompt": "You are a security orchestrator coordinating vulnerability assessments. Analyze project structure, identify security targets, and coordinate security scanning across multiple specialized agents.",
          "tools": [
            "TodoWrite",
            "TodoRead",
            "Task",
            "Read",
            "Bash",
            "Memory"
          ]
        },
        "static-auditor": {
          "description": "Static code security analysis",
          "prompt": "You are a static analysis specialist using semgrep and other tools to detect security vulnerabilities in code. Focus on identifying injection flaws, insecure configurations, and common security anti-patterns.",
          "tools": [
            "Read",
            "Bash",
            "Grep",
            "Write",
            "Memory"
          ]
        },
        "vuln-validator": {
          "description": "Vulnerability validation and risk assessment",
          "prompt": "You validate detected vulnerabilities, assess their risk levels, eliminate false positives, and prioritize remediation efforts based on impact and exploitability.",
          "tools": [
            "Read",
            "Write", 
            "Bash",
            "Memory",
            "TodoWrite"
          ]
        },
        "report-writer": {
          "description": "Security report generation and documentation",
          "prompt": "You create comprehensive security reports by aggregating findings from security analysis, providing executive summaries, detailed vulnerability descriptions, and actionable remediation recommendations.",
          "tools": [
            "Read",
            "Write",
            "Memory",
            "TodoWrite"
          ]
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