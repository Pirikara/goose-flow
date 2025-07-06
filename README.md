# goose-flow

> **Multi-agent orchestration for Goose** - coordinate specialized AI agents to work together on complex development tasks.

## What is goose-flow?

goose-flow transforms Goose into a **swarm orchestration platform** where multiple specialized AI agents collaborate autonomously. Instead of single-agent interactions, you coordinate **teams of agents** that work together to complete complex development tasks.

```bash
# Traditional single-agent approach
goose session

# goose-flow swarm orchestration
goose-flow run --mode orchestrator,coder,tester --task "build user authentication API"
```

## Installation & Setup

### Development Setup (Current)

Since goose-flow is not yet published to npm, use local development setup:

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
- `goose-flow.config.json` - Unified configuration with agent definitions
- `.goose-flow/` - Workspace directory
- Initial project structure

## Basic Usage

### Run Agent Swarms

```bash
# Single agent
goose-flow run --mode orchestrator --task "coordinate development tasks"

# Multiple agents (sequential)
goose-flow run --mode architect,coder,tester --task "implement user registration"

# Multiple agents (parallel)
goose-flow run --mode coder,tester --parallel --task "add unit tests"

# Security analysis workflow
goose-flow run --mode security-orchestrator,static-auditor,vuln-validator,report-writer
```

### List Available Agents

```bash
goose-flow modes
```

## Available Agent Types

goose-flow includes 21 pre-defined agent modes:

**Development Agents:**
- `orchestrator` - Multi-agent task coordination
- `coder` - Code generation and implementation  
- `architect` - System design and architecture
- `tester` - Testing and validation
- `reviewer` - Code review and quality
- `debugger` - Issue diagnosis and fixing
- `optimizer` - Performance optimization

**Specialized Agents:**
- `researcher` - Research and analysis
- `documenter` - Documentation generation
- `designer` - UI/UX design
- `innovator` - Creative problem solving
- `analyzer` - Code and data analysis

**Workflow Agents:**
- `swarm-coordinator` - Swarm management
- `memory-manager` - Knowledge management
- `batch-executor` - Parallel task execution
- `workflow-manager` - Process automation

**Development Methodology:**
- `tdd` - Test-driven development

**Security Agents:**
- `security-orchestrator` - Security analysis coordination
- `static-auditor` - Static code analysis
- `vuln-validator` - Vulnerability validation
- `report-writer` - Security reporting

## Configuration

### Agent Configuration

Edit `goose-flow.config.json` to customize agents:

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
      "tools": ["Read", "Write", "Edit", "Bash"]
    }
  }
}
```

### Project Structure

After initialization:

```
project-root/
├── goose-flow.config.json    # Unified configuration
├── .goose-flow/               # Workspace directory
│   ├── workspace/
│   │   ├── agents/           # Agent working directories
│   │   ├── results/          # Agent outputs
│   │   ├── task-queue.json   # Task coordination
│   │   └── progress.json     # Progress tracking
│   └── logs/                 # Execution logs
```

## Commands

| Command | Description |
|---------|-------------|
| `goose-flow init` | Initialize project |
| `goose-flow modes` | List available agent types |
| `goose-flow run [options]` | Execute agent workflows |
| `goose-flow status` | Show system status |

### Run Command Options

- `--mode <agents>` - Comma-separated agent types
- `--task <description>` - Task description for agents
- `--parallel` - Run agents simultaneously (default: sequential)
- `--max-agents <n>` - Maximum concurrent agents (default: 4)
- `--timeout <ms>` - Agent timeout in milliseconds (default: 1800000)

## Examples

### Development Workflow

```bash
# Architecture and implementation
goose-flow run --mode architect,coder --task "design and implement REST API"

# Test-driven development
goose-flow run --mode tdd --task "implement user authentication with tests"

# Code review and optimization
goose-flow run --mode reviewer,optimizer --task "improve code quality"
```

### Security Analysis

```bash
# Complete security audit
goose-flow run --mode security-orchestrator,static-auditor,vuln-validator,report-writer


# Quick security scan
goose-flow run --mode static-auditor --task "scan for security vulnerabilities"
```

### Research and Documentation

```bash
# Technology research
goose-flow run --mode researcher --task "compare GraphQL vs REST APIs"

# Documentation generation
goose-flow run --mode documenter --task "generate API documentation"
```

## Requirements

- Node.js 18+
- [Goose CLI](https://github.com/block/goose) installed and configured
- LLM provider access (OpenAI, Claude, etc.)

## Development

### Development Scripts

```bash
npm run build        # Build TypeScript
npm run dev          # Run with ts-node
npm run test         # Run test suite
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
npm link            # Link for global development
```

### Testing

```bash
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

## License

MIT