import { describe, expect, test } from 'bun:test';
import type { SprintStatus } from '../types.js';
import { findOngoingWork, getAllStoriesForEpic, getStoryFilePath } from './files.js';

describe('findOngoingWork', () => {
  test('returns null when no sprint status', () => {
    expect(findOngoingWork(null)).toBeNull();
  });

  test('returns null when no development_status', () => {
    const status: SprintStatus = {
      generated: '2026-01-18',
      project: 'test',
      tracking_system: 'file-system',
      story_location: '_bmad-output/implementation-artifacts',
      development_status: {},
    };
    expect(findOngoingWork(status)).toBeNull();
  });

  test('returns epic with actionable stories (in-progress)', () => {
    const status: SprintStatus = {
      generated: '2026-01-18',
      project: 'test',
      tracking_system: 'file-system',
      story_location: '_bmad-output/implementation-artifacts',
      development_status: {
        'epic-1': 'in-progress',
        '1-1-story-one': 'in-progress',
        '1-2-story-two': 'done',
      },
    };
    const result = findOngoingWork(status);
    expect(result).not.toBeNull();
    expect(result?.epicId).toBe('epic-1');
    expect(result?.stories).toHaveLength(1);
    expect(result?.stories[0].id).toBe('1-1-story-one');
  });

  test('returns epic with actionable stories (ready-for-dev)', () => {
    const status: SprintStatus = {
      generated: '2026-01-18',
      project: 'test',
      tracking_system: 'file-system',
      story_location: '_bmad-output/implementation-artifacts',
      development_status: {
        'epic-2': 'in-progress',
        '2-1-story-one': 'done',
        '2-2-story-two': 'ready-for-dev',
      },
    };
    const result = findOngoingWork(status);
    expect(result).not.toBeNull();
    expect(result?.epicId).toBe('epic-2');
    expect(result?.stories).toHaveLength(1);
    expect(result?.stories[0].id).toBe('2-2-story-two');
  });

  test('returns epic with backlog stories as actionable', () => {
    // Backlog stories should now be picked up as actionable work
    const status: SprintStatus = {
      generated: '2026-01-18',
      project: 'kana-quizz',
      tracking_system: 'file-system',
      story_location: '_bmad-output/implementation-artifacts',
      development_status: {
        'epic-8': 'in-progress',
        '8-1-pool-change-feedback': 'done',
        '8-2-pool-reset-function': 'backlog',
        '8-3-pool-resize-function': 'backlog',
      },
    };
    const result = findOngoingWork(status);
    expect(result).not.toBeNull();
    expect(result?.epicId).toBe('epic-8');
    expect(result?.stories).toHaveLength(2); // backlog stories are now actionable
    expect(result?.stories.map((s) => s.id)).toContain('8-2-pool-reset-function');
    expect(result?.stories.map((s) => s.id)).toContain('8-3-pool-resize-function');
  });

  test('returns null when epic and all stories are done', () => {
    // When everything is done, there's no ongoing work
    const status: SprintStatus = {
      generated: '2026-01-18',
      project: 'test',
      tracking_system: 'file-system',
      story_location: '_bmad-output/implementation-artifacts',
      development_status: {
        'epic-1': 'done',
        '1-1-story-one': 'done',
        '1-2-story-two': 'done',
      },
    };
    const result = findOngoingWork(status);
    expect(result).toBeNull();
  });

  test('derives epic ID from story ID when epic entry missing', () => {
    const status: SprintStatus = {
      generated: '2026-01-18',
      project: 'test',
      tracking_system: 'file-system',
      story_location: '_bmad-output/implementation-artifacts',
      development_status: {
        '3-1-story-one': 'in-progress',
      },
    };
    const result = findOngoingWork(status);
    expect(result).not.toBeNull();
    expect(result?.epicId).toBe('epic-3');
    expect(result?.stories).toHaveLength(1);
  });
});

describe('getAllStoriesForEpic', () => {
  test('returns empty array when no sprint status', () => {
    expect(getAllStoriesForEpic(null, 'epic-1')).toEqual([]);
  });

  test('returns all stories for the epic regardless of status', () => {
    const status: SprintStatus = {
      generated: '2026-01-18',
      project: 'kana-quizz',
      tracking_system: 'file-system',
      story_location: '_bmad-output/implementation-artifacts',
      development_status: {
        'epic-8': 'in-progress',
        '8-1-pool-change-feedback': 'done',
        '8-2-pool-reset-function': 'backlog',
        '8-3-pool-resize-function': 'backlog',
        'epic-9': 'backlog',
        '9-1-other-story': 'backlog',
      },
    };
    const result = getAllStoriesForEpic(status, 'epic-8');
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.id)).toContain('8-1-pool-change-feedback');
    expect(result.map((s) => s.id)).toContain('8-2-pool-reset-function');
    expect(result.map((s) => s.id)).toContain('8-3-pool-resize-function');
  });

  test('does not include stories from other epics', () => {
    const status: SprintStatus = {
      generated: '2026-01-18',
      project: 'test',
      tracking_system: 'file-system',
      story_location: '_bmad-output/implementation-artifacts',
      development_status: {
        '1-1-story': 'done',
        '1-2-story': 'backlog',
        '2-1-story': 'backlog',
      },
    };
    const result = getAllStoriesForEpic(status, 'epic-1');
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).not.toContain('2-1-story');
  });

  test('excludes epic entries from results', () => {
    const status: SprintStatus = {
      generated: '2026-01-18',
      project: 'test',
      tracking_system: 'file-system',
      story_location: '_bmad-output/implementation-artifacts',
      development_status: {
        'epic-5': 'in-progress',
        '5-1-story': 'in-progress',
      },
    };
    const result = getAllStoriesForEpic(status, 'epic-5');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('5-1-story');
  });
});

describe('getStoryFilePath', () => {
  test('returns correct path for story ID', () => {
    const cwd = '/project';
    const storyId = '5-3-implement-dev-agent-execution-with-retry';
    const result = getStoryFilePath(cwd, storyId);
    expect(result).toBe(
      '/project/_bmad-output/implementation-artifacts/5-3-implement-dev-agent-execution-with-retry.md'
    );
  });

  test('handles different story ID formats', () => {
    const cwd = '/home/user/my-project';
    const storyId = '1-1-define-enhanced-state-typescript-interface';
    const result = getStoryFilePath(cwd, storyId);
    expect(result).toBe(
      '/home/user/my-project/_bmad-output/implementation-artifacts/1-1-define-enhanced-state-typescript-interface.md'
    );
  });

  test('handles relative paths', () => {
    const cwd = '.';
    const storyId = '5-1-shell';
    const result = getStoryFilePath(cwd, storyId);
    // Note: path.join normalizes './' to ''
    expect(result).toBe('_bmad-output/implementation-artifacts/5-1-shell.md');
  });

  // Path traversal validation tests
  test('throws error for parent directory traversal (..)', () => {
    const cwd = '/project';
    const storyId = '../etc/passwd';
    expect(() => getStoryFilePath(cwd, storyId)).toThrow(
      'Invalid storyId "../etc/passwd": path traversal not allowed'
    );
  });

  test('throws error for parent directory in middle of ID', () => {
    const cwd = '/project';
    const storyId = '5-1-../hidden';
    expect(() => getStoryFilePath(cwd, storyId)).toThrow(
      'Invalid storyId "5-1-../hidden": path traversal not allowed'
    );
  });

  test('throws error for forward slash in storyId', () => {
    const cwd = '/project';
    const storyId = '5-1/subdir/story';
    expect(() => getStoryFilePath(cwd, storyId)).toThrow(
      'Invalid storyId "5-1/subdir/story": path traversal not allowed'
    );
  });

  test('throws error for backslash in storyId', () => {
    const cwd = '/project';
    const storyId = '5-1\\subdir\\story';
    expect(() => getStoryFilePath(cwd, storyId)).toThrow(
      'Invalid storyId "5-1\\subdir\\story": path traversal not allowed'
    );
  });

  test('throws error for null byte in storyId', () => {
    const cwd = '/project';
    const storyId = '5-1\x00malicious';
    expect(() => getStoryFilePath(cwd, storyId)).toThrow(
      'Invalid storyId "5-1\x00malicious": path traversal not allowed'
    );
  });
});
