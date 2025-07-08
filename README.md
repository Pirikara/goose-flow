# goose-flow

> **Hierarchical AI agent orchestration for Goose** - specialized agents working together through task delegation and coordination.

## What is goose-flow?

goose-flow transforms Goose into a **hierarchical orchestration platform** where AI agents can create subtasks, pause parent tasks, and coordinate through a structured delegation pattern. Instead of single-agent interactions, you get **intelligent task hierarchies** where agents automatically break down complex tasks and coordinate execution.

```bash
# Traditional single-agent approach
goose session

# goose-flow hierarchical orchestration
goose-flow run --mode orchestrator --task "build user authentication API"
```

## Key Features

- **🏗️ Hierarchical Task Management** - LIFO stack-based parent-child task relationships
- **⏸️ Automatic Pause/Resume** - Parent tasks pause while subtasks execute  
- **🔧 Internal Orchestration** - `new_task` and `attempt_completion` tools parsed from agent output
- **📊 Real-time Progress Tracking** - Live status monitoring and task hierarchy visualization
- **🤖 21 Pre-configured Agents** - Ready-to-use specialized agent modes
- **🛡️ Safety & Error Handling** - Comprehensive error handling with structured logging
- **🎯 Event-driven Architecture** - Responsive task coordination and status updates

## Installation & Setup

### Development Setup

Since goose-flow is in development and not published to npm:

```bash
git clone <repository-url>
cd goose-flow
npm install
npm run build
npm link  # Link globally for development
```

### Initialize Project

```bash
goose-flow init
```

This creates:
- `goose-flow.config.json` - Agent configuration and definitions
- `.goose-flow/workspace/` - Task orchestration workspace
- `.goose-flow/logs/` - Execution logs

## Basic Usage

### Single Agent Mode

```bash
# Run a single orchestrator agent
goose-flow run --mode orchestrator --task "coordinate development tasks"

# Code generation
goose-flow run --mode coder --task "implement user registration API"

# Security analysis
goose-flow run --mode security-orchestrator --task "perform security analysis"
```

### Hierarchical Orchestration

When using the orchestrator mode, it will automatically create hierarchical task structures:

```bash
# Orchestrator creates subtasks automatically
goose-flow run --mode orchestrator --task "build complete authentication system"

# The orchestrator might create a hierarchy like:
# └── orchestrator (parent, paused)
#     ├── architect (creates system design)
#     ├── coder (implements the code)  
#     └── tester (validates the implementation)
```

### Check Status

```bash
# View current orchestration status
goose-flow status

# List available agent modes
goose-flow modes
```

## Available Agent Types

goose-flow includes 21 pre-configured agent modes:

### Development Agents
- `orchestrator` - Multi-agent task coordination with subtask creation
- `coder` - Code generation and implementation  
- `architect` - System design and architecture planning
- `tester` - Testing and validation
- `reviewer` - Code review and quality optimization
- `debugger` - Issue diagnosis and systematic fixing
- `optimizer` - Performance optimization

### Specialized Agents
- `researcher` - Research and comprehensive analysis
- `documenter` - Documentation generation and maintenance
- `designer` - UI/UX design and user experience
- `innovator` - Creative problem solving and innovation
- `analyzer` - Code and data analysis

### Workflow Agents
- `swarm-coordinator` - Swarm coordination and management
- `memory-manager` - Knowledge and memory management
- `batch-executor` - Parallel task execution specialist
- `workflow-manager` - Workflow automation and process management

### Development Methodology
- `tdd` - Test-driven development methodology

### Security Agents
- `security-orchestrator` - Security analysis orchestration
- `static-auditor` - Static code security analysis
- `vuln-validator` - Vulnerability validation and risk assessment
- `report-writer` - Security report generation

## Orchestration Tools

Agents use these tools for task coordination (parsed from their output):

### `new_task`
Creates a new subtask in the hierarchy. The parent task automatically pauses until the subtask completes.

```
new_task {mode: "coder", instruction: "implement authentication endpoints"}
```

### `attempt_completion`
Marks the current task as completed and resumes the parent task.

```
attempt_completion {result: "Successfully implemented authentication system"}
```

## Configuration

### Agent Configuration

Edit `goose-flow.config.json` to customize agent behavior:

```json
{
  "version": "1.0",
  "target": ".",
  "maxConcurrent": 4,
  "timeout": 1800000,
  "agents": {
    "custom-agent": {
      "description": "Custom specialized agent",
      "prompt": "You are an expert programmer...",
      "tools": ["attempt_completion"]
    }
  }
}
```

### Project Structure

After initialization and running orchestration:

```
project-root/
├── goose-flow.config.json    # Agent configuration
├── .goose-flow/               # Workspace directory
│   ├── workspace/
│   │   ├── tasks/            # Active task sessions
│   │   ├── results/          # Agent outputs
│   │   └── progress.json     # Progress tracking
│   ├── logs/                 # Structured execution logs
│   └── .gitignore           # Workspace gitignore
```

## Commands

| Command | Description |
|---------|-------------|
| `goose-flow init` | Initialize project with configuration |
| `goose-flow run [options]` | Execute agent orchestration |
| `goose-flow status` | Show hierarchical task status |
| `goose-flow modes` | List available agent types |
| `goose-flow tools [options]` | List available tools and their usage |

### Run Command Options

- `--mode <agent>` - Agent mode to run
- `--task <description>` - Task description for the agent
- `--max-agents <n>` - Maximum concurrent agents (default: 4)
- `--timeout <ms>` - Agent timeout in milliseconds (default: 1800000)

### Tools Command Options

- `--mode <mode>` - Show tools available for specific agent mode

## Examples

### Development Workflow

```bash
# Hierarchical development with orchestrator
goose-flow run --mode orchestrator --task "create REST API with authentication"

# Test-driven development
goose-flow run --mode tdd --task "implement user service with comprehensive tests"

# Architecture design
goose-flow run --mode architect --task "design microservices architecture"
```

### Security Analysis

```bash
# Security orchestration
goose-flow run --mode security-orchestrator --task "complete security audit"

# Quick vulnerability scan
goose-flow run --mode static-auditor --task "scan for security vulnerabilities"
```

### Research and Documentation

```bash
# Technology research
goose-flow run --mode researcher --task "compare GraphQL vs REST performance"

# Documentation generation
goose-flow run --mode documenter --task "generate comprehensive API documentation"
```

### Tool Discovery

```bash
# List all available tools
goose-flow tools

# Show tools for specific agent mode
goose-flow tools --mode orchestrator
goose-flow tools --mode coder
goose-flow tools --mode security-orchestrator
```

## How Task Orchestration Works

1. **Task Creation**: Root task is created in the TaskStack (LIFO hierarchy)
2. **Agent Execution**: Agent starts executing with its specialized prompt and tools
3. **Tool Detection**: System monitors agent output for `new_task` or `attempt_completion` calls
4. **Subtask Creation**: When `new_task` is detected, parent task pauses and subtask is created
5. **Subtask Execution**: New subtask runs independently with its own goose session
6. **Completion Flow**: When subtask completes, parent task automatically resumes
7. **Result Propagation**: Subtask results are passed to the resumed parent task

```
Root Task (orchestrator)
├── Paused: "create authentication system"
├── Active Subtask: architect
│   └── Completes: "system design ready"
├── Resumed: receives design, creates next subtask
└── Active Subtask: coder
    └── Implements based on design
```

## Requirements

- **Node.js 20+** (required for modern LLM integration features)
- **[Goose CLI](https://github.com/block/goose)** installed and configured
- **LLM provider access** (OpenAI, Claude, etc.)

## Development

### Development Scripts

```bash
npm run build        # Compile TypeScript to JavaScript
npm run dev          # Run with ts-node for development
npm run test         # Run complete Jest test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate test coverage report
npm run lint         # Run ESLint checks
npm run typecheck    # TypeScript type checking
npm run ci          # Run all checks (typecheck + lint + test)
```

### Testing

The project includes comprehensive test coverage:

```bash
npm test             # Run all tests
npm run test:watch   # Watch mode for development
npm run test:coverage # Coverage report
```

**Test suites:**
- Task orchestration and hierarchy management
- TaskStack LIFO operations
- Agent configuration and mode management
- Progress tracking and status reporting
- Error handling and logging
- CLI integration and commands

## Architecture

- **TaskOrchestrator**: Manages agent lifecycle and hierarchical task coordination
- **TaskStack**: LIFO stack implementation for parent-child task relationships
- **OrchestrationHandler**: Parses agent output for orchestration tool calls
- **PromptManager**: Centralized prompt generation for different agent modes
- **Error System**: Structured error handling with context and severity levels
- **Logging System**: Context-aware logging with file persistence and rotation
- **Safety Manager**: Enforces task limits and timeout constraints
- **Progress Tracker**: Real-time status updates and task monitoring

## License

MIT
