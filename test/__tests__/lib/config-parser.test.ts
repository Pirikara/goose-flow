import * as fs from 'fs-extra';
import * as path from 'path';
import { ConfigParser } from '../../../src/lib/config-parser';
import { createTempDir, cleanupTempDir } from '../../setup';

describe('ConfigParser', () => {
  let tempDir: string;
  let configParser: ConfigParser;
  let configPath: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    configParser = new ConfigParser(tempDir);
    configPath = path.join(tempDir, 'goose-flow.config.json');
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('createDefaultConfig', () => {
    it('should create default configuration file', async () => {
      await configParser.createDefaultConfig();

      expect(await fs.pathExists(configPath)).toBe(true);
      const config = await fs.readJSON(configPath);
      
      expect(config.version).toBe('1.0');
      expect(config.target).toBe('.');
      expect(config.maxConcurrent).toBe(4);
      expect(config.timeout).toBe(1800000);
      expect(config.agents).toBeDefined();
      expect(config.agents.orchestrator).toBeDefined();
      expect(config.agents.coder).toBeDefined();
    });
  });

  describe('loadConfig', () => {
    it('should load existing configuration', async () => {
      const testConfig = {
        version: '1.0',
        target: '.',
        maxConcurrent: 2,
        timeout: 900000,
        output: {
          format: 'json',
          file: 'test-results.json'
        },
        agents: {
          'test-orchestrator': {
            description: 'Test orchestrator for unit testing purposes.',
            prompt: 'You are a test orchestrator for unit testing purposes.',
            tools: ['Read', 'Write', 'TodoWrite']
          }
        }
      };

      await fs.writeJSON(configPath, testConfig);
      
      const loadedConfig = await configParser.loadConfig();
      expect(loadedConfig).toEqual(testConfig);
    });

    it('should throw error if config file does not exist', async () => {
      await expect(configParser.loadConfig()).rejects.toThrow('Configuration file not found');
    });

    it('should cache loaded configuration', async () => {
      await configParser.createDefaultConfig();
      
      const config1 = await configParser.loadConfig();
      const config2 = await configParser.loadConfig();
      
      expect(config1).toBe(config2); // Should be the same object reference
    });
  });

  describe('getModeDefinition', () => {
    beforeEach(async () => {
      await configParser.createDefaultConfig();
    });

    it('should return agent mode definition', async () => {
      const orchestratorMode = await configParser.getModeDefinition('orchestrator');
      
      expect(orchestratorMode.description).toBe('🪃 General workflow orchestration');
      expect(orchestratorMode.roleDefinition).toContain('orchestrator');
      expect(orchestratorMode.groups).toContain('read');
    });

    it('should throw error for non-existent mode', async () => {
      await expect(configParser.getModeDefinition('non-existent-mode'))
        .rejects.toThrow("Agent mode 'non-existent-mode' not found in configuration");
    });
  });

  describe('getAllModes', () => {
    beforeEach(async () => {
      await configParser.createDefaultConfig();
    });

    it('should return all agent modes', async () => {
      const modes = await configParser.getAllModes();
      
      expect(Object.keys(modes)).toContain('orchestrator');
      expect(Object.keys(modes)).toContain('coder');
      expect(Object.keys(modes)).toContain('researcher');
      expect(Object.keys(modes)).toContain('security-orchestrator');
      
      expect(modes.orchestrator.description).toBe('🪃 General workflow orchestration');
    });

    it('should return empty object if no agents defined', async () => {
      const configWithoutAgents = {
        version: '1.0',
        target: '.',
        maxConcurrent: 4,
        timeout: 1800000,
        output: {
          format: 'markdown',
          file: 'results.md'
        }
      };

      await fs.writeJSON(configPath, configWithoutAgents);
      
      const modes = await configParser.getAllModes();
      expect(modes).toEqual({});
    });
  });


  describe('getConfigPath', () => {
    it('should return correct config path', () => {
      const expectedPath = path.join(tempDir, 'goose-flow.config.json');
      expect(configParser.getConfigPath()).toBe(expectedPath);
    });
  });
});