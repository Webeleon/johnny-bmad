import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { rmSync, mkdirSync } from 'fs';
import {
  loadModelConfig,
  saveModelConfig,
  modelConfigExists,
  isValidModelConfig,
  isValidCwd,
  ModelConfig,
  ModelConfigError,
  ModelConfigPermissionError,
  CONFIG_VERSION
} from './models.js';

describe('Model Config', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = `test-config-${Date.now()}`;
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { force: true, recursive: true });
  });

  test('should return null when config does not exist', () => {
    const config = loadModelConfig(testDir);
    expect(config).toBeNull();
  });

  test('should return false for modelConfigExists when file does not exist', () => {
    const exists = modelConfigExists(testDir);
    expect(exists).toBe(false);
  });

  test('should save and load model config', () => {
    const config: ModelConfig = {
      sm: 'claude:opus',
      storyCreator: 'claude:opus',
      dev: 'claude:sonnet',
      reviewer: 'claude:opus',
      version: CONFIG_VERSION
    };

    saveModelConfig(testDir, config);

    const loadedConfig = loadModelConfig(testDir);
    expect(loadedConfig).toBeDefined();
    expect(loadedConfig?.sm).toBe(config.sm);
    expect(loadedConfig?.storyCreator).toBe(config.storyCreator);
    expect(loadedConfig?.dev).toBe(config.dev);
    expect(loadedConfig?.reviewer).toBe(config.reviewer);
    expect(loadedConfig?.version).toBe(config.version);
  });

  test('should return true for modelConfigExists after saving', () => {
    const config: ModelConfig = {
      sm: 'claude:opus',
      storyCreator: 'claude:opus',
      dev: 'claude:sonnet',
      reviewer: 'claude:opus',
      version: CONFIG_VERSION
    };

    saveModelConfig(testDir, config);

    const exists = modelConfigExists(testDir);
    expect(exists).toBe(true);
  });

  test('should reject invalid model config structure', () => {
    const invalidConfig = {
      sm: 'claude:opus',
      storyCreator: 'claude:opus',
      dev: 'claude:sonnet'
      // Missing 'reviewer' field
    } as unknown;

    expect(() => {
      saveModelConfig(testDir, invalidConfig as ModelConfig);
    }).toThrow(ModelConfigError);
  });

  test('should reject config with wrong version', () => {
    const config: ModelConfig = {
      sm: 'claude:opus',
      storyCreator: 'claude:opus',
      dev: 'claude:sonnet',
      reviewer: 'claude:opus',
      version: 999 // Wrong version
    };

    expect(() => {
      saveModelConfig(testDir, config);
    }).toThrow(ModelConfigError);
  });

  test('should reject empty string model IDs', () => {
    const config: ModelConfig = {
      sm: '',
      storyCreator: 'claude:opus',
      dev: 'claude:sonnet',
      reviewer: 'claude:opus',
      version: CONFIG_VERSION
    };

    expect(() => {
      saveModelConfig(testDir, config);
    }).toThrow(ModelConfigError);
  });

  test('should validate cwd parameter - accept absolute paths', () => {
    expect(isValidCwd('/absolute/path')).toBe(true);
    expect(isValidCwd('/Users/username/project')).toBe(true);
  });

  test('should validate cwd parameter - reject path traversal', () => {
    expect(isValidCwd('../parent-dir')).toBe(false);
    expect(isValidCwd('./sub/../../parent')).toBe(false);
    expect(isValidCwd('~/home/dir')).toBe(false);
  });

  test('should validate cwd parameter - accept valid paths', () => {
    expect(isValidCwd('relative/path')).toBe(true);
    expect(isValidCwd('./current-dir')).toBe(true);
    expect(isValidCwd('sub/directory')).toBe(true);
    expect(isValidCwd('.')).toBe(true);
  });

  test('should validate cwd parameter - reject empty or whitespace', () => {
    expect(isValidCwd('')).toBe(false);
    expect(isValidCwd('   ')).toBe(false);
    expect(isValidCwd('\t\n')).toBe(false);
  });

  test('should validate model config structure', () => {
    const validConfig: ModelConfig = {
      sm: 'claude:opus',
      storyCreator: 'claude:opus',
      dev: 'claude:sonnet',
      reviewer: 'claude:opus',
      version: CONFIG_VERSION
    };

    expect(isValidModelConfig(validConfig)).toBe(true);
  });

  test('should reject model config with non-string sm field', () => {
    const config = {
      sm: 123,
      storyCreator: 'claude:opus',
      dev: 'claude:sonnet',
      reviewer: 'claude:opus',
      version: CONFIG_VERSION
    };

    expect(isValidModelConfig(config)).toBe(false);
  });

  test('should reject model config with zero or negative version', () => {
    const config1 = {
      sm: 'claude:opus',
      storyCreator: 'claude:opus',
      dev: 'claude:sonnet',
      reviewer: 'claude:opus',
      version: 0
    };

    const config2 = {
      sm: 'claude:opus',
      storyCreator: 'claude:opus',
      dev: 'claude:sonnet',
      reviewer: 'claude:opus',
      version: -1
    };

    expect(isValidModelConfig(config1)).toBe(false);
    expect(isValidModelConfig(config2)).toBe(false);
  });

  test('should load null for config with invalid version', () => {
    const config: ModelConfig = {
      sm: 'claude:opus',
      storyCreator: 'claude:opus',
      dev: 'claude:sonnet',
      reviewer: 'claude:opus',
      version: CONFIG_VERSION
    };

    saveModelConfig(testDir, config);

    const loadedConfig = loadModelConfig(testDir);
    expect(loadedConfig).not.toBeNull();
    expect(loadedConfig?.version).toBe(CONFIG_VERSION);
  });
});
