# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- `npm run build`: Compile TypeScript to JavaScript in dist/
- `npm run dev`: Run with ts-node for development 
- `npm run test`: Run full Jest test suite
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Generate test coverage report
- `npm run lint`: Run ESLint checks
- `npm run typecheck`: Run TypeScript type checking
- `npm run ci`: Run all checks (typecheck + lint + test)

## Project Architecture

This is a TypeScript Node.js CLI tool called **goose-flow** that provides hierarchical multi-agent orchestration capabilities for AI development workflows. It transforms Goose into an orchestration platform where AI agents can create subtasks, pause parent tasks, and coordinate through a Roo-Code-style boomerang delegation pattern.

### Core Architecture: Internal Orchestration

**Key Concept**: goose-flow implements **internal orchestration** where goose acts as the LLM provider and the orchestration logic is built into goose-flow itself. This is NOT an MCP extension approach.

**TaskOrchestrator (`src/lib/task-orchestrator.ts`)**
- Core orchestration engine managing agent lifecycle and hierarchical task coordination
- Implements LIFO TaskStack for parent-child task relationships with pause/resume
- Handles goose process management and inter-process communication
- Integrates with structured error handling and logging systems

**OrchestrationHandler (`src/lib/orchestration-handler.ts`)**
- Parses LLM output for orchestration tool calls (`new_task`, `attempt_completion`)
- Handles tool execution and response generation
- Provides event-driven coordination between orchestrator and agents

**TaskStack (`src/lib/task-stack.ts`)**
- LIFO stack implementation for hierarchical task management
- Manages parent-child relationships and task state transitions
- Supports pause/resume operations for boomerang delegation pattern

### Essential Components

**PromptManager (`src/lib/prompt-manager.ts`)**
- Centralized prompt generation and management
- Mode-specific prompts for different agent types
- Unified prompt formatting and instruction building

**Error Handling System (`src/lib/errors.ts`)**
- Structured error classes: TaskError, ProcessError, OrchestrationError, SystemError
- Error context tracking with task IDs, operations, and severity levels
- Integrated with logging system for comprehensive debugging

**Logging System (`src/lib/console-logger.ts`)**
- Context-aware structured logging with task/operation metadata
- File-based logging with automatic rotation and cleanup
- Performance monitoring and metrics collection
- Integration with error system for comprehensive debugging

**Safety & Progress (`src/lib/safety-manager.ts`, `src/lib/progress-tracker.ts`)**
- Safety constraints: task depth limits, concurrent task limits, timeouts
- Real-time progress tracking with JSON-based state persistence
- Task hierarchy monitoring and status reporting

### Agent Configuration

**ConfigParser (`src/lib/config-parser.ts`)**
- Manages `goose-flow.config.json` with 21 pre-defined agent modes
- Agent types: orchestrator, coder, architect, tester, researcher, security-orchestrator, etc.
- Each agent has specific prompts and capabilities optimized for its role

### Orchestration Flow

1. **Root Task Creation**: TaskOrchestrator creates root task and starts goose process
2. **Tool Call Detection**: OrchestrationHandler monitors goose output for `new_task`/`attempt_completion`
3. **Subtask Delegation**: Parent task pauses, child task created with new goose process
4. **Boomerang Completion**: Child completes, parent automatically resumes with results
5. **Hierarchical Coordination**: Multiple levels of delegation supported with safety limits

### Internal Orchestration Tools

Agents use these tools for task coordination (parsed from LLM output):

**`new_task {mode: "coder", instruction: "implement authentication"}`**
- Creates subtask with specified mode and instruction
- Parent task automatically pauses until subtask completion

**`attempt_completion {result: "Task completed successfully"}`**
- Marks current task as completed
- Resumes parent task with completion result

## Development Workflow

### Project Structure After Init
```
project-root/
├── goose-flow.config.json    # Agent configuration with 21 pre-defined modes
├── .goose-flow/              # Workspace directory
│   ├── workspace/
│   │   ├── tasks/           # Active task sessions (one per task ID)
│   │   ├── results/         # Agent outputs and artifacts
│   │   └── progress.json    # Real-time progress tracking
│   ├── logs/                # Structured logs with automatic rotation
│   └── .gitignore          # Workspace gitignore
```

### Testing Strategy
- Jest with ts-jest preset, 30-second timeout for long operations
- Tests in `test/__tests__/` directory with comprehensive coverage
- Mocked dependencies: chalk, execa, fs operations
- Test coverage excludes CLI entry point, includes all core logic

### Code Conventions
- TypeScript with strict mode enabled, 100% type safety
- Interface-driven design with comprehensive error handling
- Structured logging with context information
- Event-driven architecture with EventEmitter patterns
- Safety-first approach with limits and constraints

## Important Notes

- **Node.js 20+**: Required for modern LLM integration features
- **Goose Dependency**: Requires Goose CLI installed and configured with LLM provider
- **Internal Orchestration**: Uses goose as LLM provider, orchestration logic is internal to goose-flow
- **Hierarchical Tasks**: Supports deep task hierarchies with automatic pause/resume
- **Error Recovery**: Comprehensive error handling with context and recovery hints
- **Performance Monitoring**: Built-in performance tracking and metrics collection

## Common Development Tasks

### Run Orchestration
```bash
npm run dev -- run --mode orchestrator --task "coordinate development tasks"
```

### Test Single Component
```bash
npm test -- task-orchestrator.test.ts
npm run test:watch -- --testNamePattern="TaskOrchestrator"
```

### Debug with Logging
```bash
# Enable debug logging
GOOSE_FLOW_LOG_LEVEL=0 npm run dev -- run --mode coder --task "test task"
```

### Check Orchestration Status
```bash
npm run dev -- status
```

### List Available Tools
```bash
# Show all available tools
npm run dev -- tools

# Show tools for specific mode
npm run dev -- tools --mode orchestrator
npm run dev -- tools --mode coder
```

### Architecture Verification
```bash
# Verify type safety and build
npm run ci

# Test orchestration functionality
npm run dev -- run --mode orchestrator --task "simple test"
```

Always run `npm run ci` before committing to ensure code quality, type safety, and comprehensive test coverage.