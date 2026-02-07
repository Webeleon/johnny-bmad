import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { debug, warn } from '../utils/logger.js';

export interface ModelConfig {
  sm: string;
  storyCreator: string;
  dev: string;
  reviewer: string;
  version: number;
}

const CONFIG_FILE = 'models.json';
const CONFIG_DIR = '.johnny-bmad';

/**
 * Current model config file format version
 * Enables future migrations when config structure changes
 */
export const CONFIG_VERSION = 1;

/**
 * Error thrown when model config operation fails for non-permission reasons
 */
export class ModelConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelConfigError';
  }
}

/**
 * Error thrown when model config file cannot be accessed due to permission issues
 * Provides recovery guidance to prevent user confusion
 */
export class ModelConfigPermissionError extends Error {
  constructor(message: string, public readonly recovery: string) {
    super(message);
    this.name = 'ModelConfigPermissionError';
  }
}

/**
 * Constructs full path to model config file
 *
 * @param cwd - Current working directory
 * @returns Absolute path to .johnny-bmad/models.json
 */
export function getModelConfigPath(cwd: string): string {
  return join(cwd, CONFIG_DIR, CONFIG_FILE);
}

/**
 * Validates if an object is a valid ModelConfig
 * Exported for unit testing only
 *
 * @internal
 * @param obj - Object to validate
 * @returns true if object matches ModelConfig structure
 */
export function isValidModelConfig(obj: unknown): obj is ModelConfig {
  if (!obj || typeof obj !== 'object') return false;
  const config = obj as Record<string, unknown>;

  return (
    typeof config.sm === 'string' &&
    config.sm.trim() !== '' &&
    typeof config.storyCreator === 'string' &&
    config.storyCreator.trim() !== '' &&
    typeof config.dev === 'string' &&
    config.dev.trim() !== '' &&
    typeof config.reviewer === 'string' &&
    config.reviewer.trim() !== '' &&
    typeof config.version === 'number' &&
    Number.isInteger(config.version) &&
    config.version > 0
  );
}

/**
 * Validates if a cwd parameter is safe to use in file operations
 * Blocks path traversal attacks while allowing both absolute and relative paths
 * Exported for unit testing only
 *
 * @internal
 * @param cwd - Current working directory to validate
 * @returns true if cwd is safe to use in file path construction
 */
export function isValidCwd(cwd: string): boolean {
  if (typeof cwd !== 'string' || cwd.trim() === '') return false;

  const path = cwd.trim();

  // Block path traversal and home directory expansion
  if (path.includes('..') || path.includes('~')) {
    return false;
  }

  // Allow alphanumeric, hyphens, underscores, dots, slashes (covers absolute and relative paths)
  const pathPattern = /^[a-zA-Z0-9_\-./]+$/;
  return pathPattern.test(path);
}

/**
 * Loads model config from .johnny-bmad/models.json
 *
 * @param cwd - Current working directory
 * @returns ModelConfig if file exists and is valid, null otherwise
 * @throws {ModelConfigPermissionError} When file cannot be read due to permissions
 */
export function loadModelConfig(cwd: string): ModelConfig | null {
  if (!isValidCwd(cwd)) {
    warn('Invalid cwd parameter provided');
    return null;
  }

  const path = getModelConfigPath(cwd);

  if (!existsSync(path)) {
    debug('No model config file found');
    return null;
  }

  try {
    const content = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(content);

    if (!isValidModelConfig(parsed)) {
      warn('Invalid model config structure');
      return null;
    }

    if (parsed.version !== CONFIG_VERSION) {
      warn(`Model config version mismatch: expected ${CONFIG_VERSION}, got ${parsed.version}`);
      return null;
    }

    debug('Loaded model config');
    return parsed;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EACCES') {
      throw new ModelConfigPermissionError(
        'Permission denied reading model config',
        'Try: chmod 644 .johnny-bmad/models.json or check file ownership'
      );
    }
    debug(`Error loading model config: ${err.message || 'unknown error'}`);
    return null;
  }
}

/**
 * Saves model config to .johnny-bmad/models.json
 * Creates directory if it doesn't exist
 *
 * @param cwd - Current working directory
 * @param config - ModelConfig object to save
 * @throws {ModelConfigError} When validation fails or directory creation fails
 * @throws {ModelConfigPermissionError} When file cannot be written due to permissions
 */
export function saveModelConfig(cwd: string, config: ModelConfig): void {
  if (!isValidCwd(cwd)) {
    throw new ModelConfigError('Invalid cwd parameter provided');
  }

  if (!isValidModelConfig(config)) {
    throw new ModelConfigError('Invalid model config structure');
  }

  if (config.version !== CONFIG_VERSION) {
    throw new ModelConfigError(`Model config version mismatch: expected ${CONFIG_VERSION}, got ${config.version}`);
  }

  const dirPath = join(cwd, CONFIG_DIR);

  try {
    mkdirSync(dirPath, { recursive: true });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== 'EEXIST') {
      throw new ModelConfigError(`Failed to create config directory: ${err.message}`);
    }
  }

  const path = getModelConfigPath(cwd);

  try {
    writeFileSync(path, JSON.stringify(config, null, 2), 'utf-8');
    debug('Saved model config');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EACCES') {
      throw new ModelConfigPermissionError(
        'Permission denied writing model config',
        'Try: chmod 644 .johnny-bmad/models.json or check directory ownership'
      );
    }
    throw new ModelConfigError(`Failed to save model config: ${err.message}`);
  }
}

/**
 * Checks if model config file exists
 *
 * @param cwd - Current working directory
 * @returns true if .johnny-bmad/models.json exists, false otherwise
 */
export function modelConfigExists(cwd: string): boolean {
  if (!isValidCwd(cwd)) {
    return false;
  }

  const path = getModelConfigPath(cwd);
  return existsSync(path);
}
