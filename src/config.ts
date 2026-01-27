import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { State } from './types.js';
import { debug } from './utils/logger.js';

const STATE_FILE = '.johnny-bmad-state.json';

export function getStateFilePath(cwd: string): string {
  return join(cwd, STATE_FILE);
}

export async function loadState(cwd: string): Promise<State | null> {
  try {
    const statePath = getStateFilePath(cwd);
    const content = await readFile(statePath, 'utf-8');
    const state = JSON.parse(content) as State;
    debug(`Loaded state from ${statePath}`);
    return state;
  } catch {
    debug('No existing state file found');
    return null;
  }
}

export async function saveState(cwd: string, state: State): Promise<void> {
  const statePath = getStateFilePath(cwd);
  state.lastUpdated = new Date().toISOString();
  await writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
  debug(`Saved state to ${statePath}`);
}

export function createInitialState(epicId: string): State {
  return {
    currentEpic: epicId,
    currentStoryIndex: 0,
    devReviewIteration: 0,
    completedStories: [],
    lastUpdated: new Date().toISOString()
  };
}

export async function clearState(cwd: string): Promise<void> {
  try {
    const { unlink } = await import('fs/promises');
    await unlink(getStateFilePath(cwd));
    debug('Cleared state file');
  } catch {
    // Ignore if file doesn't exist
  }
}
