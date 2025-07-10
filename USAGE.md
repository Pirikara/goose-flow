# Goose-Flow 2.0 Usage Guide

Welcome to Goose-Flow 2.0! This version features a complete redesign based on Claude Code's approach, providing a robust MCP extension for hierarchical task orchestration.

## Overview

Goose-Flow 2.0 transforms Goose into a powerful orchestration platform where AI agents can:
- **Delegate tasks** to specialized sub-agents
- **Coordinate complex workflows** through structured tool calls
- **Maintain clean contexts** through parent-child task separation
- **Track progress** through systematic task management

## Quick Start

### 1. Installation & Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Initialize goose-flow in your project
npx goose-flow init
```

### 2. Configure Goose

Add the MCP server to your Goose configuration:

```json
{
  "mcp": {
    "servers": {
      "goose-flow": {
        "command": "npx",
        "args": ["goose-flow", "mcp"]
      }
    }
  }
}
```

### 3. Start Orchestrating

Use Goose with the orchestrator prompt to enable task delegation:

```bash
# Start goose with the orchestrator prompt
goose session start --system-prompt "$(cat src-new/prompts/orchestrator.md)"
```

## Core Concepts

### Task Delegation

The `task` tool allows you to delegate subtasks to specialized agents:

```json
{
  "name": "task",
  "arguments": {
    "description": "Implement user authentication",
    "prompt": "Create a secure user authentication system with login, logout, and password reset functionality.",
    "mode": "coder",
    "maxTurns": 15
  }
}
```

### Progress Tracking

The `progress` tool helps track and display orchestration progress:

```json
{
  "name": "progress",
  "arguments": {
    "action": "create",
    "description": "Design system architecture"
  }
}
```

## Agent Modes

Choose the appropriate mode for each subtask:

- **`coder`**: For implementation tasks and code writing
- **`researcher`**: For information gathering and analysis
- **`tester`**: For testing and validation
- **`architect`**: For system design and architecture
- **`reviewer`**: For code review and quality assurance

## Example Workflows

### Simple Task Delegation

```
User: "Create a Todo application"

Orchestrator:
1. Creates progress plan
2. Delegates UI design to architect
3. Delegates implementation to coder
4. Delegates testing to tester
5. Integrates results and reports completion
```

### Complex Multi-Phase Project

```
User: "Build a full-stack e-commerce platform"

Orchestrator:
1. Research requirements (researcher)
2. Design architecture (architect)
3. Implement backend API (coder)
4. Create frontend (coder)
5. Set up database (coder)
6. Implement payment system (coder)
7. Test entire system (tester)
8. Review and optimize (reviewer)
```

## CLI Commands

### Standalone Execution

```bash
# Execute a single task
npx goose-flow run --task "Create a simple web server" --mode coder

# Check active processes
npx goose-flow status

# Initialize project
npx goose-flow init
```

### MCP Server Mode

```bash
# Start as MCP server (used by Goose)
npx goose-flow mcp
```

## Best Practices

### 1. Clear Task Descriptions

✅ **Good:**
```json
{
  "description": "Implement JWT authentication",
  "prompt": "Create a JWT-based authentication system with login, logout, token refresh, and middleware for protected routes. Use modern security practices."
}
```

❌ **Bad:**
```json
{
  "description": "Do auth stuff",
  "prompt": "Make authentication work"
}
```

### 2. Appropriate Mode Selection

- Use `architect` for design and planning
- Use `coder` for implementation
- Use `tester` for validation and testing
- Use `researcher` for information gathering

### 3. Progressive Complexity

Start with high-level planning, then break down into specific implementation tasks.

### 4. Error Handling

If a subtask fails, adapt your approach:
- Retry with clearer instructions
- Break down into smaller tasks
- Change to a different mode if appropriate

## Architecture

### MCP Integration

Goose-Flow 2.0 works as an MCP (Model Context Protocol) extension:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Goose Agent   │────│  MCP Protocol   │────│  Goose-Flow     │
│  (Orchestrator) │    │                 │    │  Task Engine    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Child Agents   │
                                                │  (Specialized)  │
                                                └─────────────────┘
```

### Task Hierarchy

```
Root Task (Orchestrator)
├── Design Phase (Architect)
├── Implementation Phase (Coder)
│   ├── Backend API (Coder)
│   └── Frontend UI (Coder)
└── Testing Phase (Tester)
    ├── Unit Tests (Tester)
    └── Integration Tests (Tester)
```

## Troubleshooting

### Common Issues

1. **MCP Server Not Starting**
   - Check that goose-flow is built: `npm run build`
   - Verify MCP configuration in Goose settings

2. **Task Execution Fails**
   - Check that Goose is properly installed
   - Verify the task prompt is clear and actionable

3. **No Progress Updates**
   - Ensure you're using the progress tool regularly
   - Check console output for error messages

### Debug Mode

```bash
# Enable verbose logging
DEBUG=goose-flow:* npx goose-flow run --task "debug task"
```

## Migration from v1.0

If you're upgrading from Goose-Flow 1.0:

1. **New Architecture**: v2.0 uses MCP instead of text parsing
2. **Tool Changes**: `new_task` and `attempt_completion` are replaced with the `task` tool
3. **Configuration**: New MCP configuration required
4. **Prompts**: Use the new orchestrator prompt template

## Contributing

To contribute to Goose-Flow 2.0:

1. Fork the repository
2. Create a feature branch
3. Implement your changes in `src-new/`
4. Add tests and documentation
5. Submit a pull request

## Support

For issues and questions:
- Check the troubleshooting section
- Review the example workflows
- Open an issue on GitHub

---

**Goose-Flow 2.0** - Transform your Goose into a powerful orchestration platform!