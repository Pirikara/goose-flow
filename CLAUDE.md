# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- `npm run build`: Compile TypeScript to JavaScript in dist/
- `npm run mcp`: Run MCP server with ts-node for development
- `npm run test`: Run Vitest test suite
- `npm run test:watch`: Run Vitest in watch mode
- `npm run test:coverage`: Generate test coverage report with @vitest/coverage-v8
- `npm run typecheck`: Run TypeScript type checking
- `npm run ci`: Run all checks (typecheck + test)

## Project Architecture

This is a TypeScript Node.js CLI tool called **goose-flow** that acts as an **MCP (Model Context Protocol) server** to extend Goose with hierarchical task orchestration capabilities. The project provides a simple CLI interface and an MCP server that enables Goose to delegate tasks to spawned goose processes.

### Core Architecture: MCP Extension

**Key Concept**: goose-flow is an **MCP server extension** for Goose that provides hierarchical task delegation. When configured as an MCP server, it allows Goose to spawn subtasks using separate goose processes.

**TaskExecutor (`src/core/task-executor.ts`)**
- Core execution engine that spawns goose processes for task execution
- Manages active processes with unique task IDs
- Handles process lifecycle and result collection
- Integrates with execa for process management

**MCP Server (`src/mcp/server.ts`)**
- Implements MCP protocol for Goose integration
- Provides tools for task execution and progress tracking
- Handles communication between Goose and task executor

### Essential Components

**CLI Interface (`src/cli/index.ts`)**
- Simple CLI with 3 commands: `mcp`, `status`, `orchestrate`
- Commander.js-based command parsing
- Status reporting and orchestrator convenience functionality

**Type System (`src/types/index.ts`)**
- TaskRequest, TaskResult, and GooseProcess interfaces
- Comprehensive type definitions for all components
- Ensures type safety across the application

### MCP Integration Flow

1. **Server Start**: MCP server starts and registers available tools
2. **Task Request**: Goose requests task execution through MCP protocol
3. **Process Spawn**: TaskExecutor spawns new goose process for the task
4. **Result Collection**: Process output is collected and parsed
5. **Response**: Results are returned to Goose through MCP protocol

### Available CLI Commands

**`goose-flow mcp`**
- Starts the MCP server for Goose integration
- Primary command for enabling hierarchical orchestration

**`goose-flow status`**
- Shows current MCP server status and configuration
- Displays version and available tools

**`goose-flow orchestrate <task>`**
- Convenience command to run goose with orchestrator prompt
- Automatically handles prompt loading and goose execution


## Development Workflow

### Project Structure
```
goose-flow/
├── src/
│   ├── cli/index.ts          # CLI entry point
│   ├── core/task-executor.ts # Task execution engine
│   ├── mcp/                  # MCP server implementation
│   │   ├── index.ts          # MCP server entry point
│   │   └── server.ts         # MCP server logic
│   ├── prompts/              # Agent prompts
│   │   └── orchestrator.md   # Orchestrator prompt template
│   └── types/index.ts        # Type definitions
├── tests/                    # Test suites
│   ├── integration/          # Integration tests
│   └── unit/                 # Unit tests
├── dist/                     # Compiled JavaScript
└── vitest.config.ts          # Test configuration
```

### Testing Strategy
- Vitest with Node.js environment, 30-second timeout for long operations
- Tests in `tests/` directory with unit and integration separation
- Mocked dependencies: execa for process spawning
- Test coverage configured with @vitest/coverage-v8

### Code Conventions
- TypeScript with strict mode enabled
- ESM modules (`"type": "module"` in package.json)
- Interface-driven design with comprehensive error handling
- Simple and focused architecture following KISS principle

## Important Notes

- **Node.js 20+**: Required for modern ESM and LLM integration features
- **Goose Dependency**: Requires Goose CLI installed and configured with LLM provider
- **MCP Extension**: Functions as an MCP server extension, not standalone orchestration
- **Process Management**: Spawns goose subprocesses for task execution
- **Simple Architecture**: Focused on MCP integration rather than complex orchestration

## Common Development Tasks

### Start MCP Server
```bash
npm run mcp
# or after building
npm run build && npm start
```

### Test Development
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- task-executor.test.ts

# Generate coverage report
npm run test:coverage
```

### Development and Debugging
```bash
# Build and link for development
npm run build
npm run link-dev

# Configure goose extension (one-time setup)
goose configure

# Test orchestrator
goose-flow orchestrate "test task"

# Check status
goose-flow status
```

### CI/CD
```bash
# Run all checks (used in CI)
npm run ci

# Type checking only
npm run typecheck

# Build for production
npm run build
```

Always run `npm run ci` before committing to ensure code quality, type safety, and test coverage.

## Integration with Goose

Add the MCP server to your Goose configuration:

1. Run `goose configure`
2. Select "Add Extension" → "Command-line Extension"
3. Name: goose-flow
4. Command: `npx goose-flow mcp`
5. Working Directory: your project directory

### Usage Pattern

Once configured as an extension, goose-flow runs automatically when goose starts:
- `goose-flow orchestrate "your task"`
- `goose run --system "$(cat src/prompts/orchestrator.md)" --text "your task"`

No separate MCP server startup required - the extension handles this automatically.

The MCP server provides task delegation capabilities to Goose through the `task` and `progress` tools.
