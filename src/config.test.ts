import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { writeFile, unlink, rm, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadState, saveState, createInitialState, getStateFilePath, clearState } from './config.js';
import type { State, LegacyState } from './types.js';

let TEST_DIR: string;
const STATE_FILE = '.johnny-bmad-state.json';

describe('config.ts - State Management', () => {
  beforeEach(async () => {
    // Create unique temp directory for each test using OS tmpdir
    TEST_DIR = await mkdtemp(join(tmpdir(), 'johnny-bmad-test-'));
  });

  afterEach(async () => {
    // Clean up entire test directory
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getStateFilePath()', () => {
    test('should return correct state file path', () => {
      const path = getStateFilePath(TEST_DIR);
      expect(path).toBe(join(TEST_DIR, STATE_FILE));
    });
  });

  describe('createInitialState()', () => {
    test('should create initial state with correct structure', () => {
      const state = createInitialState('epic-1');

      expect(state.currentEpic).toBe('epic-1');
      expect(state.lastUpdated).toBeDefined();
      expect(typeof state.lastUpdated).toBe('string');

      expect(state.workflow).toBeDefined();
      expect(state.workflow.mode).toBe('sequential');
      expect(state.workflow.phase).toBe('implementation');
      expect(state.workflow.currentStoryIndex).toBe(0);
      expect(state.workflow.devReviewIteration).toBe(0);

      expect(state.stories).toBeDefined();
      expect(Array.isArray(state.stories.completed)).toBe(true);
      expect(state.stories.completed).toHaveLength(0);
      expect(state.stories.approvals).toBeDefined();
      expect(Object.keys(state.stories.approvals)).toHaveLength(0);
    });
  });

  describe('saveState()', () => {
    test('should save state to file using atomic write pattern', async () => {
      const state = createInitialState('epic-1');
      await saveState(TEST_DIR, state);

      const path = getStateFilePath(TEST_DIR);
      const { readFile } = await import('fs/promises');
      const content = await readFile(path, 'utf-8');
      const loaded = JSON.parse(content);

      expect(loaded.currentEpic).toBe('epic-1');
      expect(loaded.workflow.mode).toBe('sequential');
      expect(loaded.stories.completed).toHaveLength(0);
    });

    test('should update lastUpdated timestamp on save', async () => {
      const state = createInitialState('epic-1');
      const originalTimestamp = state.lastUpdated;

      // Wait 10ms to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await saveState(TEST_DIR, state);

      expect(state.lastUpdated).not.toBe(originalTimestamp);
    });

    test('should not leave .tmp file after successful save', async () => {
      const state = createInitialState('epic-1');
      await saveState(TEST_DIR, state);

      const tmpPath = `${getStateFilePath(TEST_DIR)}.tmp`;
      const { access } = await import('fs/promises');
      await expect(access(tmpPath)).rejects.toThrow();
    });
  });

  describe('loadState() - Valid v1+ State', () => {
    test('should load valid v1+ state successfully', async () => {
      const state = createInitialState('epic-2');
      await saveState(TEST_DIR, state);

      const loaded = await loadState(TEST_DIR);

      expect(loaded).not.toBeNull();
      expect(loaded?.currentEpic).toBe('epic-2');
      expect(loaded?.workflow.mode).toBe('sequential');
      expect(loaded?.stories.completed).toHaveLength(0);
    });

    test('should return null when no state file exists', async () => {
      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should load state with all workflow modes', async () => {
      const modes: Array<'sequential' | 'batch' | 'dev-only'> = ['sequential', 'batch', 'dev-only'];

      for (const mode of modes) {
        const state = createInitialState('epic-1');
        state.workflow.mode = mode;
        await saveState(TEST_DIR, state);

        const loaded = await loadState(TEST_DIR);
        expect(loaded?.workflow.mode).toBe(mode);
      }
    });

    test('should load state with all workflow phases', async () => {
      const phases: Array<'story-creation' | 'review' | 'implementation'> = ['story-creation', 'review', 'implementation'];

      for (const phase of phases) {
        const state = createInitialState('epic-1');
        state.workflow.phase = phase;
        await saveState(TEST_DIR, state);

        const loaded = await loadState(TEST_DIR);
        expect(loaded?.workflow.phase).toBe(phase);
      }
    });

    test('should load state with completed stories', async () => {
      const state = createInitialState('epic-1');
      state.stories.completed = ['story-1', 'story-2', 'story-3'];
      await saveState(TEST_DIR, state);

      const loaded = await loadState(TEST_DIR);
      expect(loaded?.stories.completed).toHaveLength(3);
      expect(loaded?.stories.completed).toContain('story-1');
    });

    test('should load state with story approvals', async () => {
      const state = createInitialState('epic-1');
      state.stories.approvals = {
        'story-1': 'approved',
        'story-2': 'needs-changes',
        'story-3': 'pending'
      };
      await saveState(TEST_DIR, state);

      const loaded = await loadState(TEST_DIR);
      expect(loaded?.stories.approvals['story-1']).toBe('approved');
      expect(loaded?.stories.approvals['story-2']).toBe('needs-changes');
      expect(loaded?.stories.approvals['story-3']).toBe('pending');
    });
  });

  describe('loadState() - Corrupted State', () => {
    test('should return null for corrupted JSON', async () => {
      const path = getStateFilePath(TEST_DIR);
      await writeFile(path, '{ invalid json content }', 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null for empty file', async () => {
      const path = getStateFilePath(TEST_DIR);
      await writeFile(path, '', 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null for non-object JSON', async () => {
      const path = getStateFilePath(TEST_DIR);
      await writeFile(path, '"just a string"', 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null for array JSON', async () => {
      const path = getStateFilePath(TEST_DIR);
      await writeFile(path, '[]', 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null for null JSON', async () => {
      const path = getStateFilePath(TEST_DIR);
      await writeFile(path, 'null', 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });
  });

  describe('loadState() - Invalid State Structure', () => {
    test('should return null when missing workflow object', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        stories: { completed: [], approvals: {} }
        // Missing workflow object
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when missing stories object', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: 0 }
        // Missing stories object
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when workflow.mode is invalid', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'invalid-mode', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: 0 },
        stories: { completed: [], approvals: {} }
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when workflow.phase is invalid', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'invalid-phase', currentStoryIndex: 0, devReviewIteration: 0 },
        stories: { completed: [], approvals: {} }
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when stories.completed is not an array', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: 0 },
        stories: { completed: 'not-an-array', approvals: {} }
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when currentStoryIndex is not a number', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 'not-a-number', devReviewIteration: 0 },
        stories: { completed: [], approvals: {} }
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when stories.approvals has invalid status value', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: 0 },
        stories: {
          completed: [],
          approvals: {
            'story-1': 'invalid-status' // Not a valid StoryApprovalStatus
          }
        }
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when stories.approvals has mixed valid and invalid statuses', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: 0 },
        stories: {
          completed: ['story-1', 'story-2'],
          approvals: {
            'story-1': 'approved', // Valid
            'story-2': 'garbage', // Invalid - should reject entire state
            'story-3': 'pending'  // Valid
          }
        }
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when currentEpic is empty string', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: '',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: 0 },
        stories: { completed: [], approvals: {} }
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when currentEpic is whitespace only', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: '   ',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: 0 },
        stories: { completed: [], approvals: {} }
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when lastUpdated is empty string', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: 'epic-1',
        lastUpdated: '',
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: 0 },
        stories: { completed: [], approvals: {} }
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when stories.completed contains non-string element', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: 0 },
        stories: {
          completed: ['story-1', 123, 'story-2'], // 123 is not a string
          approvals: {}
        }
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when stories.completed contains null element', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: 0 },
        stories: {
          completed: ['story-1', null, 'story-2'], // null is not a string
          approvals: {}
        }
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when currentStoryIndex is negative', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: -1, devReviewIteration: 0 },
        stories: { completed: [], approvals: {} }
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when devReviewIteration is negative', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: -5 },
        stories: { completed: [], approvals: {} }
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when stories.completed contains empty string', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: 0 },
        stories: {
          completed: ['story-1', '', 'story-2'], // Empty string is invalid
          approvals: {}
        }
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null when stories.completed contains whitespace-only string', async () => {
      const path = getStateFilePath(TEST_DIR);
      const invalidState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: 0 },
        stories: {
          completed: ['story-1', '   ', 'story-2'], // Whitespace-only is invalid
          approvals: {}
        }
      };
      await writeFile(path, JSON.stringify(invalidState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });
  });

  describe('loadState() - Valid Positive Values', () => {
    test('should accept positive currentStoryIndex values', async () => {
      const path = getStateFilePath(TEST_DIR);
      const validState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 5, devReviewIteration: 0 },
        stories: { completed: [], approvals: {} }
      };
      await writeFile(path, JSON.stringify(validState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).not.toBeNull();
      expect(loaded?.workflow.currentStoryIndex).toBe(5);
    });

    test('should accept positive devReviewIteration values', async () => {
      const path = getStateFilePath(TEST_DIR);
      const validState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: 3 },
        stories: { completed: [], approvals: {} }
      };
      await writeFile(path, JSON.stringify(validState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).not.toBeNull();
      expect(loaded?.workflow.devReviewIteration).toBe(3);
    });

    test('should accept large positive values for currentStoryIndex', async () => {
      const path = getStateFilePath(TEST_DIR);
      const validState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 999, devReviewIteration: 0 },
        stories: { completed: [], approvals: {} }
      };
      await writeFile(path, JSON.stringify(validState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).not.toBeNull();
      expect(loaded?.workflow.currentStoryIndex).toBe(999);
    });

    test('should accept large positive values for devReviewIteration', async () => {
      const path = getStateFilePath(TEST_DIR);
      const validState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: 100 },
        stories: { completed: [], approvals: {} }
      };
      await writeFile(path, JSON.stringify(validState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).not.toBeNull();
      expect(loaded?.workflow.devReviewIteration).toBe(100);
    });

    test('should accept zero values for currentStoryIndex and devReviewIteration', async () => {
      const path = getStateFilePath(TEST_DIR);
      const validState = {
        currentEpic: 'epic-1',
        lastUpdated: new Date().toISOString(),
        workflow: { mode: 'sequential', phase: 'implementation', currentStoryIndex: 0, devReviewIteration: 0 },
        stories: { completed: [], approvals: {} }
      };
      await writeFile(path, JSON.stringify(validState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).not.toBeNull();
      expect(loaded?.workflow.currentStoryIndex).toBe(0);
      expect(loaded?.workflow.devReviewIteration).toBe(0);
    });
  });

  describe('loadState() - Legacy v0.2.0 State', () => {
    test('should return null for legacy v0.2.0 state (migration not yet implemented)', async () => {
      const path = getStateFilePath(TEST_DIR);
      const legacyState: LegacyState = {
        currentEpic: 'epic-1',
        currentStoryIndex: 2,
        devReviewIteration: 1,
        completedStories: ['story-1', 'story-2'],
        lastUpdated: new Date().toISOString()
      };
      await writeFile(path, JSON.stringify(legacyState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      // Should return null because migration is not implemented yet (Story 1.2)
      expect(loaded).toBeNull();
    });

    test('should detect legacy state with empty completedStories', async () => {
      const path = getStateFilePath(TEST_DIR);
      const legacyState: LegacyState = {
        currentEpic: 'epic-1',
        currentStoryIndex: 0,
        devReviewIteration: 0,
        completedStories: [],
        lastUpdated: new Date().toISOString()
      };
      await writeFile(path, JSON.stringify(legacyState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null for legacy state with non-string completedStories element', async () => {
      const path = getStateFilePath(TEST_DIR);
      const legacyState = {
        currentEpic: 'epic-1',
        currentStoryIndex: 0,
        devReviewIteration: 0,
        completedStories: ['story-1', 123, 'story-2'], // 123 is not a string
        lastUpdated: new Date().toISOString()
      };
      await writeFile(path, JSON.stringify(legacyState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null for legacy state with empty string in completedStories', async () => {
      const path = getStateFilePath(TEST_DIR);
      const legacyState = {
        currentEpic: 'epic-1',
        currentStoryIndex: 0,
        devReviewIteration: 0,
        completedStories: ['story-1', '', 'story-2'], // Empty string is invalid
        lastUpdated: new Date().toISOString()
      };
      await writeFile(path, JSON.stringify(legacyState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });

    test('should return null for legacy state with whitespace-only string in completedStories', async () => {
      const path = getStateFilePath(TEST_DIR);
      const legacyState = {
        currentEpic: 'epic-1',
        currentStoryIndex: 0,
        devReviewIteration: 0,
        completedStories: ['story-1', '   ', 'story-2'], // Whitespace-only is invalid
        lastUpdated: new Date().toISOString()
      };
      await writeFile(path, JSON.stringify(legacyState), 'utf-8');

      const loaded = await loadState(TEST_DIR);
      expect(loaded).toBeNull();
    });
  });

  describe('clearState()', () => {
    test('should delete state file if exists', async () => {
      const state = createInitialState('epic-1');
      await saveState(TEST_DIR, state);

      const path = getStateFilePath(TEST_DIR);
      const { access } = await import('fs/promises');

      // Verify file exists (access should not throw)
      await access(path);

      // Clear state
      await clearState(TEST_DIR);

      // Verify file is deleted
      await expect(access(path)).rejects.toThrow();
    });

    test('should not throw if state file does not exist', async () => {
      await expect(clearState(TEST_DIR)).resolves.toBeUndefined();
    });
  });
});
