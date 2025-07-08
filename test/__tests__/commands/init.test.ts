import * as fs from 'fs-extra';
import { init } from '../../../src/commands/init';
import { createTempDir, cleanupTempDir } from '../../setup';

// Mock console.log to avoid output during tests
const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

describe('init command', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);
    consoleSpy.mockClear();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupTempDir(tempDir);
  });

  it('should initialize goose-flow project successfully', async () => {
    await init();

    // Check directory structure
    expect(await fs.pathExists('.goose-flow')).toBe(true);
    expect(await fs.pathExists('.goose-flow/workspace')).toBe(true);
    expect(await fs.pathExists('.goose-flow/logs')).toBe(true);
    expect(await fs.pathExists('.goose-flow/workspace/results')).toBe(true);

    // Check configuration files
    expect(await fs.pathExists('goose-flow.config.json')).toBe(true);

    // Check initial workspace files
    expect(await fs.pathExists('.goose-flow/workspace/progress.json')).toBe(true);

    // Check .gitignore
    expect(await fs.pathExists('.goose-flow/.gitignore')).toBe(true);

    // Verify console output
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('🚀 Initializing goose-flow swarm orchestration...')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('✅ goose-flow swarm orchestration initialized successfully!')
    );
  });

  it('should load configuration correctly', async () => {
    await init();

    const config = await fs.readJSON('goose-flow.config.json');
    expect(config.version).toBe('1.0');
    expect(config.target).toBe('.');
    expect(config.maxConcurrent).toBe(4);
    expect(config.timeout).toBe(1800000);
    expect(config.agents).toBeDefined();
  });

  it('should create default agents correctly', async () => {
    await init();

    const config = await fs.readJSON('goose-flow.config.json');
    expect(config.agents).toHaveProperty('orchestrator');
    expect(config.agents).toHaveProperty('coder');
    expect(config.agents).toHaveProperty('security-orchestrator');
    expect(config.agents).toHaveProperty('static-auditor');
    expect(config.agents).toHaveProperty('vuln-validator');
    expect(config.agents).toHaveProperty('report-writer');

    // Check structure of a mode
    const orchestrator = config.agents.orchestrator;
    expect(orchestrator).toHaveProperty('description');
    expect(orchestrator).toHaveProperty('roleDefinition');
    expect(orchestrator).toHaveProperty('groups');
    expect(orchestrator).toHaveProperty('customInstructions');
    expect(Array.isArray(orchestrator.groups)).toBe(true);
  });

  it('should not overwrite existing initialization', async () => {
    // First initialization
    await init();
    
    const originalConfig = await fs.readJSON('goose-flow.config.json');
    
    // Modify config
    originalConfig.maxConcurrent = 8;
    await fs.writeJSON('goose-flow.config.json', originalConfig);

    // Second initialization should not overwrite
    await init();

    const config = await fs.readJSON('goose-flow.config.json');
    expect(config.maxConcurrent).toBe(8);

    // Configuration file should still exist
    expect(await fs.pathExists('goose-flow.config.json')).toBe(true);
  });

  it('should create default configuration with agents', async () => {
    await init();

    const config = await fs.readJSON('goose-flow.config.json');
    expect(config.agents['orchestrator']).toEqual({
      description: '🪃 General workflow orchestration',
      roleDefinition: expect.stringContaining('orchestrator'),
      groups: expect.arrayContaining(['read']),
      customInstructions: expect.stringContaining('new_task')
    });
  });

  it('should initialize empty workspace files', async () => {
    await init();

    const progress = await fs.readJSON('.goose-flow/workspace/progress.json');
    expect(progress).toEqual([]);
  });

  it('should create proper .gitignore content', async () => {
    await init();

    const gitignore = await fs.readFile('.goose-flow/.gitignore', 'utf-8');
    expect(gitignore).toContain('.goose-flow/workspace/');
    expect(gitignore).toContain('.goose-flow/logs/');
    expect(gitignore).toContain('*.log');
    expect(gitignore).toContain('# goose-flow workspace');
    expect(gitignore).toContain('# goose-flow.config.json');
  });
});