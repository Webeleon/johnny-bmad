import { readFile, writeFile, rename, unlink } from 'fs/promises';
import { join } from 'path';
import type { State, LegacyState } from './types.js';
import { debug } from './utils/logger.js';

const STATE_FILE = '.johnny-bmad-state.json';

export function getStateFilePath(cwd: string): string {
  return join(cwd, STATE_FILE);
}

/**
 * Validates if an object is a valid v1+ State
 */
function isValidState(obj: unknown): obj is State {
  if (!obj || typeof obj !== 'object') return false;

  const state = obj as Record<string, unknown>;

  // Check required top-level fields (non-empty strings)
  if (typeof state.currentEpic !== 'string' || state.currentEpic.trim() === '') return false;
  if (typeof state.lastUpdated !== 'string' || state.lastUpdated.trim() === '') return false;

  // Check workflow object
  if (!state.workflow || typeof state.workflow !== 'object') return false;
  const workflow = state.workflow as Record<string, unknown>;
  if (!['sequential', 'batch', 'dev-only'].includes(workflow.mode as string)) return false;
  if (!['story-creation', 'review', 'implementation'].includes(workflow.phase as string)) return false;
  if (typeof workflow.currentStoryIndex !== 'number' || workflow.currentStoryIndex < 0) return false;
  if (typeof workflow.devReviewIteration !== 'number' || workflow.devReviewIteration < 0) return false;

  // Check stories object
  if (!state.stories || typeof state.stories !== 'object') return false;
  const stories = state.stories as Record<string, unknown>;
  if (!Array.isArray(stories.completed)) return false;

  // Validate all completed array elements are non-empty strings
  if (!stories.completed.every((item: unknown) => typeof item === 'string' && item.trim() !== '')) return false;

  if (!stories.approvals || typeof stories.approvals !== 'object') return false;

  // Validate stories.approvals values are valid StoryApprovalStatus
  const approvals = stories.approvals as Record<string, unknown>;
  const validStatuses = ['approved', 'needs-changes', 'pending'];
  for (const status of Object.values(approvals)) {
    if (!validStatuses.includes(status as string)) return false;
  }

  return true;
}

/**
 * Validates if an object is a legacy v0.2.0 state (requires migration)
 */
function isLegacyState(obj: unknown): obj is LegacyState {
  if (!obj || typeof obj !== 'object') return false;

  const state = obj as Record<string, unknown>;

  // Legacy state has flat structure with these exact fields (matching isValidState order)
  // Check required top-level string fields (non-empty)
  if (typeof state.currentEpic !== 'string' || state.currentEpic.trim() === '') return false;
  if (typeof state.lastUpdated !== 'string' || state.lastUpdated.trim() === '') return false;

  // Check numeric fields (non-negative)
  if (typeof state.currentStoryIndex !== 'number' || state.currentStoryIndex < 0) return false;
  if (typeof state.devReviewIteration !== 'number' || state.devReviewIteration < 0) return false;

  // Check array field - validate all elements are non-empty strings (matching isValidState consistency)
  if (!Array.isArray(state.completedStories)) return false;
  if (!state.completedStories.every((item: unknown) => typeof item === 'string' && item.trim() !== '')) return false;

  // Ensure it's NOT v1 structure (no nested workflow/stories objects)
  if ('workflow' in state || 'stories' in state) return false;

  return true;
}

export async function loadState(cwd: string): Promise<State | null> {
  try {
    const statePath = getStateFilePath(cwd);
    const content = await readFile(statePath, 'utf-8');

    // Parse JSON and validate structure
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      debug(`State file corrupted: invalid JSON at ${statePath}`);
      return null;
    }

    // Validate it's a valid v1+ State
    if (isValidState(parsed)) {
      debug(`Loaded v1+ state from ${statePath}`);
      return parsed;
    }

    // Check if it's a legacy v0.2.0 state (needs migration in Story 1.2)
    if (isLegacyState(parsed)) {
      debug(`Detected legacy v0.2.0 state at ${statePath} - migration needed`);
      // For now, return null (migration will be implemented in Story 1.2)
      return null;
    }

    // State file exists but has invalid/unknown structure
    debug(`State file has invalid structure at ${statePath}`);
    return null;
  } catch {
    debug('No existing state file found');
    return null;
  }
}

export async function saveState(cwd: string, state: State): Promise<void> {
  const statePath = getStateFilePath(cwd);
  const tmpPath = `${statePath}.tmp`;
  state.lastUpdated = new Date().toISOString();

  // Atomic write: write to .tmp file, then rename (Rule 8 from project-context.md)
  await writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
  await rename(tmpPath, statePath);

  debug(`Saved state to ${statePath}`);
}

export function createInitialState(epicId: string): State {
  return {
    currentEpic: epicId,
    lastUpdated: new Date().toISOString(),
    workflow: {
      mode: 'sequential',
      phase: 'implementation',
      currentStoryIndex: 0,
      devReviewIteration: 0
    },
    stories: {
      completed: [],
      approvals: {}
    }
  };
}

export async function clearState(cwd: string): Promise<void> {
  try {
    await unlink(getStateFilePath(cwd));
    debug('Cleared state file');
  } catch {
    // Ignore if file doesn't exist
  }
}
