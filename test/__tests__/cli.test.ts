import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createTempDir, cleanupTempDir } from '../setup';

const execAsync = promisify(exec);

describe('CLI Integration Tests', () => {
  let tempDir: string;
  let originalCwd: string;
  let cliPath: string;

  beforeAll(async () => {
    // Build the project first
    await execAsync('npm run build', { cwd: path.join(__dirname, '../../') });
    cliPath = path.join(__dirname, '../../dist/cli.js');
  });

  beforeEach(async () => {
    tempDir = await createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  });

  describe('--help flag', () => {
    it('should show help information', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" --help`);
      
      expect(stdout).toContain('Multi-agent orchestration tool for Goose');
      expect(stdout).toContain('Commands:');
      expect(stdout).toContain('init');
      expect(stdout).toContain('run');
      expect(stdout).toContain('modes');
      expect(stdout).toContain('status');
    });
  });

  describe('--version flag', () => {
    it('should show version information', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" --version`);
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('init command', () => {
    it('should initialize project successfully', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" init`);
      
      expect(stdout).toContain('🚀 Initializing goose-flow swarm orchestration');
      expect(stdout).toContain('✅ goose-flow swarm orchestration initialized successfully!');
      
      // Check created files
      expect(await fs.pathExists('.goose-flow')).toBe(true);
      expect(await fs.pathExists('goose-flow.config.json')).toBe(true);
    });

    it('should show warning when already initialized', async () => {
      // First initialization
      await execAsync(`node "${cliPath}" init`);
      
      // Second initialization
      const { stdout } = await execAsync(`node "${cliPath}" init`);
      expect(stdout).toContain('⚠️  goose-flow is already initialized');
    });
  });

  describe('modes command', () => {
    beforeEach(async () => {
      // Create config file first
      const testConfig = {
        version: '1.0',
        target: '.',
        maxConcurrent: 4,
        timeout: 1800000,
        output: {
          format: 'markdown',
          file: 'results.md'
        },
        agents: {
          'test-mode': {
            description: 'Test mode for CLI testing',
            prompt: 'Test prompt',
            tools: ['Read', 'Write']
          }
        }
      };
      await fs.writeJSON('goose-flow.config.json', testConfig);
    });

    it('should list available modes', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" modes`);
      
      expect(stdout).toContain('📋 Available Agent Modes:');
      expect(stdout).toContain('🔸 test-mode');
      expect(stdout).toContain('Test mode for CLI testing');
      expect(stdout).toContain('Tools: Read, Write');
      expect(stdout).toContain('💡 Usage examples:');
    });

    it('should show error when no .roomodes file exists', async () => {
      // Remove .roomodes file
      await fs.remove('.roomodes');
      
      try {
        await execAsync(`node "${cliPath}" modes`);
      } catch (error: any) {
        expect(error.stdout).toContain('❌ Failed to load .roomodes');
      }
    });
  });

  describe('run command', () => {
    beforeEach(async () => {
      // Initialize project first
      await execAsync(`node "${cliPath}" init`);
    });

    it('should show available modes when no mode specified', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" run`);
      
      expect(stdout).toContain('🚀 Starting goose-flow swarm orchestration');
      expect(stdout).toContain('📋 No modes specified. Available agent modes:');
      expect(stdout).toContain('💡 Usage examples:');
    });

    it('should show error for invalid mode', async () => {
      try {
        await execAsync(`node "${cliPath}" run --mode invalid-mode`);
        // If it doesn't throw, fail the test
        expect(true).toBe(false);
      } catch (error: any) {
        // Error message is written to stderr, but process output might be in stdout
        const output = error.stdout + error.stderr;
        expect(output).toContain('💡 Use "goose-flow modes" to see available modes');
      }
    });

    // Note: We can't easily test actual agent execution without mocking goose
    // Those tests would require more complex setup with process mocking
  });

  describe('status command', () => {
    beforeEach(async () => {
      // Initialize project first
      await execAsync(`node "${cliPath}" init`);
    });

    it('should show status when no agents running', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" status`);
      
      expect(stdout).toContain('📊 goose-flow Status Report');
      expect(stdout).toContain('🔍 Overall Status');
      expect(stdout).toContain('Total Agents: 0');
      expect(stdout).toContain('💡 No active workflows detected');
    });
  });

  describe('error handling', () => {
    it('should show error for invalid command', async () => {
      try {
        await execAsync(`node "${cliPath}" invalid-command`);
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stderr).toContain("error: unknown command 'invalid-command'");
      }
    });
  });

  describe('help for subcommands', () => {
    it('should show help for run command', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" run --help`);
      
      expect(stdout).toContain('Run multi-agent swarm orchestration');
      expect(stdout).toContain('--mode <modes>');
      expect(stdout).toContain('--task <description>');
      expect(stdout).toContain('--parallel');
      expect(stdout).toContain('--max-agents');
    });

    it('should show help for init command', async () => {
      const { stdout } = await execAsync(`node "${cliPath}" init --help`);
      
      expect(stdout).toContain('Initialize goose-flow in current directory');
    });
  });
});