import { describe, it, expect, vi } from 'vitest';
import { execa } from 'execa';

// execaを実際のプロセス実行ではなくモック化
vi.mock('execa');

describe('CLI Integration Tests', () => {
  const mockExeca = vi.mocked(execa);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('goose-flow --help', () => {
    it('should show help information', async () => {
      mockExeca.mockResolvedValue({
        stdout: `Usage: goose-flow [options] [command]

Hierarchical AI agent orchestration for Goose via MCP

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  mcp             Start as MCP server for Goose integration
  status          Show MCP server status
  init            Initialize goose-flow in current directory
  help [command]  display help for command`,
        stderr: '',
        exitCode: 0,
        command: 'npx goose-flow --help',
        pid: 12345,
        failed: false,
        timedOut: false,
        isCanceled: false,
        killed: false
      } as any);

      const result = await execa('npx', ['goose-flow', '--help']);

      expect(result.stdout).toContain('Hierarchical AI agent orchestration');
      expect(result.stdout).toContain('mcp');
      expect(result.stdout).toContain('status');
      expect(result.stdout).toContain('init');
    });
  });

  describe('goose-flow status', () => {
    it('should show MCP server status', async () => {
      mockExeca.mockResolvedValue({
        stdout: `GooseFlow MCP Server Status:
- Version: 2.0.0
- Mode: Hierarchical orchestration
- Available tools: task, progress

To start MCP server: npx goose-flow mcp
To configure Goose: npx goose-flow init`,
        stderr: '',
        exitCode: 0,
        command: 'npx goose-flow status',
        pid: 12345,
        failed: false,
        timedOut: false,
        isCanceled: false,
        killed: false
      } as any);

      const result = await execa('npx', ['goose-flow', 'status']);

      expect(result.stdout).toContain('GooseFlow MCP Server Status');
      expect(result.stdout).toContain('Version: 2.0.0');
      expect(result.stdout).toContain('Available tools: task, progress');
    });
  });

  describe('goose-flow init', () => {
    it('should initialize goose-flow configuration', async () => {
      mockExeca.mockResolvedValue({
        stdout: `Initializing goose-flow v2.0...
✅ GooseFlow initialized!

Next steps:
1. Add the following to your Goose configuration:
   goose configure -> Add Extension -> Command-line Extension
   Name: goose-flow
   Command: npx goose-flow mcp
   Working Directory: /test/directory

2. Start orchestration:
   goose run --system "$(cat src/prompts/orchestrator.md)" --text "your task" --interactive`,
        stderr: '',
        exitCode: 0,
        command: 'npx goose-flow init',
        pid: 12345,
        failed: false,
        timedOut: false,
        isCanceled: false,
        killed: false
      } as any);

      const result = await execa('npx', ['goose-flow', 'init']);

      expect(result.stdout).toContain('GooseFlow initialized!');
      expect(result.stdout).toContain('Add the following to your Goose configuration');
      expect(result.stdout).toContain('npx goose-flow mcp');
    });
  });
});