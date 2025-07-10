# goose-flow

> **MCP extension for Goose** - adds task delegation capabilities through hierarchical process spawning.

## What is goose-flow?

goose-flow is a **Model Context Protocol (MCP) server** that extends Goose with task delegation capabilities. It allows Goose to spawn subtasks using separate goose processes, enabling hierarchical task management and specialized agent coordination.

```bash
# Traditional single-agent approach
goose run --text "Create a simple calculator"

# With goose-flow MCP extension
goose-flow orchestrate "Create a simple calculator"
# Now Goose can automatically delegate subtasks to specialized agents
```

## Key Features

- **🔧 MCP Server Extension** - Integrates seamlessly with Goose via MCP protocol
- **📋 Task Delegation** - Spawn subtasks using separate goose processes
- **🎯 Process Management** - Automatic process lifecycle management with unique task IDs
- **📊 Progress Tracking** - Real-time task status and progress monitoring
- **🛡️ Error Handling** - Comprehensive error handling and process cleanup
- **⚡ Simple Architecture** - Focused, lightweight implementation

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

## Setup & Usage

### 1. Install & Build

```bash
git clone <repository-url>
cd goose-flow
npm install
npm run build
npm link  # Make goose-flow available globally
```

### 2. Configure Goose Extension

Add goose-flow as an extension to your goose configuration:

```bash
goose configure
# Select "Add Extension" -> "Command-line Extension"
# Name: goose-flow
# Command: npx goose-flow mcp
# Working Directory: /path/to/your/project
```

This adds goose-flow to your `~/.config/goose/config.yaml`:

```yaml
extensions:
  goose-flow:
    args:
    - goose-flow
    - mcp
    cmd: npx
    description: Task orchestration extension for hierarchical agent delegation
    enabled: true
    name: goose-flow
    timeout: 600
    type: stdio
```

### 3. Use goose-flow

Once configured, the MCP server starts automatically when goose runs. Simply use:

```bash
# Option 1: Convenience command
goose-flow orchestrate "Create a simple calculator with basic operations"

# Option 2: Direct goose command
goose run --system "$(cat src/prompts/orchestrator.md)" --text "Create a simple calculator"
```

The orchestrator will automatically use the `task` tool to delegate subtasks:

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

## Available Commands

| Command | Description |
|---------|-------------|
| `goose-flow mcp` | Start MCP server for Goose integration |
| `goose-flow status` | Show current MCP server status |
| `goose-flow orchestrate <task>` | Run goose with orchestrator prompt (convenience command) |

## MCP Tools

When integrated with Goose, goose-flow provides these tools:

### `task` Tool
Delegates a subtask to a separate goose process:

```json
{
  "name": "task",
  "arguments": {
    "description": "Brief task description",
    "prompt": "Detailed task instructions",
    "mode": "coder",
    "maxTurns": 10
  }
}
```

**Parameters:**
- `description`: Brief description of the task
- `prompt`: Detailed instructions for the subtask
- `mode`: Agent mode (default: "coder")
- `maxTurns`: Maximum turns for the subtask (default: 10)

### `progress` Tool
Tracks and displays orchestration progress:

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

```bash
goose-flow orchestrate "Create a Todo application"
```

The orchestrator will automatically:
1. Use progress tool to create plan
2. Delegate UI design: task(mode="architect", prompt="Design Todo app UI")
3. Delegate implementation: task(mode="coder", prompt="Implement Todo app based on design")
4. Delegate testing: task(mode="tester", prompt="Test Todo app functionality")
5. Report completion with integrated results

### Complex Multi-Phase Project

```bash
goose-flow orchestrate "Build a REST API with authentication"
```

The orchestrator will automatically:
1. Research phase: task(mode="researcher", prompt="Research REST API best practices")
2. Design phase: task(mode="architect", prompt="Design API architecture with auth")
3. Implementation: task(mode="coder", prompt="Implement API endpoints and auth")
4. Testing: task(mode="tester", prompt="Create comprehensive API tests")
5. Review: task(mode="reviewer", prompt="Review code quality and security")

## Configuration

### Project Structure

```
goose-flow/
├── src/
│   └── prompts/
│       └── orchestrator.md   # Orchestrator prompt template
├── dist/                     # Compiled JavaScript
└── package.json
```

### Extension Configuration

After running `goose configure`, goose-flow will be added to your goose configuration at `~/.config/goose/config.yaml`:

```yaml
extensions:
  goose-flow:
    args:
    - goose-flow
    - mcp
    cmd: npx
    description: Task orchestration extension for hierarchical agent delegation
    enabled: true
    name: goose-flow
    timeout: 600
    type: stdio
```

This means the MCP server starts automatically when goose runs - no separate server startup required.

## Architecture

### MCP Integration Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Goose Agent   │────│  MCP Protocol   │────│  Goose-Flow     │
│  (Orchestrator) │    │                 │    │  MCP Server     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Task Executor  │
                                                │  (Spawn Goose)  │
                                                └─────────────────┘
```

### Core Components

- **MCP Server** (`src/mcp/server.ts`): Implements MCP protocol for Goose integration
- **Task Executor** (`src/core/task-executor.ts`): Spawns and manages goose processes
- **CLI Interface** (`src/cli/index.ts`): Provides command-line interface
- **Type System** (`src/types/index.ts`): Comprehensive type definitions

## Requirements

- **Node.js 20+** (required for modern ESM and MCP features)
- **[Goose CLI](https://github.com/block/goose)** installed and configured
- **LLM provider access** (OpenAI, Claude, etc.)

## Development

### Development Scripts

```bash
npm run build        # Compile TypeScript to JavaScript
npm run mcp          # Run MCP server with ts-node for development
npm run test         # Run Vitest test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate test coverage report
npm run typecheck    # TypeScript type checking
npm run ci          # Run all checks (typecheck + test)
```

### Testing

The project includes comprehensive test coverage:

```bash
npm test             # Run all tests
npm run test:watch   # Watch mode for development
npm run test:coverage # Coverage report
```

**Test suites:**
- Task execution and process management
- MCP server integration
- CLI command functionality
- Error handling and recovery

### Development Workflow

```bash
# Build and link for development
npm run build
npm run link-dev

# Configure goose extension (one-time setup)
goose configure

# Test the orchestrator
goose-flow orchestrate "test task"

# Check status
goose-flow status
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
DEBUG=goose-flow:* npx goose-flow mcp
```

## License

MIT