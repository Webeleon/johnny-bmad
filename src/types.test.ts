import { describe, expect, test } from 'bun:test';
import type {
  LegacyState,
  State,
  StoriesState,
  StoryApprovalStatus,
  WorkflowMode,
  WorkflowPhase,
  WorkflowState,
} from './types.js';

describe('types.ts - Type Definitions', () => {
  describe('WorkflowMode type union', () => {
    test('should accept valid workflow modes', () => {
      const sequential: WorkflowMode = 'sequential';
      const batch: WorkflowMode = 'batch';
      const devOnly: WorkflowMode = 'dev-only';

      expect(sequential).toBe('sequential');
      expect(batch).toBe('batch');
      expect(devOnly).toBe('dev-only');
    });

    test('should be a string literal union', () => {
      const mode: WorkflowMode = 'sequential';
      expect(typeof mode).toBe('string');
    });
  });

  describe('WorkflowPhase type union', () => {
    test('should accept valid workflow phases', () => {
      const storyCreation: WorkflowPhase = 'story-creation';
      const review: WorkflowPhase = 'review';
      const implementation: WorkflowPhase = 'implementation';

      expect(storyCreation).toBe('story-creation');
      expect(review).toBe('review');
      expect(implementation).toBe('implementation');
    });

    test('should be a string literal union', () => {
      const phase: WorkflowPhase = 'implementation';
      expect(typeof phase).toBe('string');
    });
  });

  describe('StoryApprovalStatus type union', () => {
    test('should accept valid approval statuses', () => {
      const approved: StoryApprovalStatus = 'approved';
      const needsChanges: StoryApprovalStatus = 'needs-changes';
      const pending: StoryApprovalStatus = 'pending';

      expect(approved).toBe('approved');
      expect(needsChanges).toBe('needs-changes');
      expect(pending).toBe('pending');
    });

    test('should be a string literal union', () => {
      const status: StoryApprovalStatus = 'approved';
      expect(typeof status).toBe('string');
    });
  });

  describe('WorkflowState interface', () => {
    test('should accept valid workflow state', () => {
      const workflowState: WorkflowState = {
        mode: 'sequential',
        phase: 'implementation',
        currentStoryIndex: 0,
        devReviewIteration: 0,
      };

      expect(workflowState.mode).toBe('sequential');
      expect(workflowState.phase).toBe('implementation');
      expect(workflowState.currentStoryIndex).toBe(0);
      expect(workflowState.devReviewIteration).toBe(0);
    });

    test('should require all fields', () => {
      // Type-level test: this would fail to compile if any field is missing
      const workflowState: WorkflowState = {
        mode: 'batch',
        phase: 'story-creation',
        currentStoryIndex: 5,
        devReviewIteration: 2,
      };

      expect(Object.keys(workflowState)).toHaveLength(4);
    });
  });

  describe('StoriesState interface', () => {
    test('should accept valid stories state', () => {
      const storiesState: StoriesState = {
        completed: ['story-1', 'story-2'],
        approvals: {
          'story-1': 'approved',
          'story-2': 'needs-changes',
          'story-3': 'pending',
        },
      };

      expect(storiesState.completed).toHaveLength(2);
      expect(storiesState.approvals['story-1']).toBe('approved');
    });

    test('should accept empty completed array', () => {
      const storiesState: StoriesState = {
        completed: [],
        approvals: {},
      };

      expect(storiesState.completed).toHaveLength(0);
      expect(Object.keys(storiesState.approvals)).toHaveLength(0);
    });

    test('should accept approvals as Record', () => {
      const approvals: Record<string, StoryApprovalStatus> = {
        'epic-1-story-1': 'approved',
        'epic-1-story-2': 'pending',
      };

      const storiesState: StoriesState = {
        completed: [],
        approvals,
      };

      expect(storiesState.approvals['epic-1-story-1']).toBe('approved');
    });
  });

  describe('State interface (v1 schema)', () => {
    test('should accept valid v1 state', () => {
      const state: State = {
        currentEpic: 'epic-1',
        lastUpdated: '2026-02-04T00:00:00.000Z',
        workflow: {
          mode: 'sequential',
          phase: 'implementation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      expect(state.currentEpic).toBe('epic-1');
      expect(state.workflow.mode).toBe('sequential');
      expect(state.stories.completed).toHaveLength(0);
    });

    test('should preserve backward compatibility fields', () => {
      const state: State = {
        currentEpic: 'epic-2',
        lastUpdated: '2026-02-04T00:00:00.000Z',
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 3,
          devReviewIteration: 1,
        },
        stories: {
          completed: ['story-1', 'story-2'],
          approvals: {
            'story-1': 'approved',
            'story-2': 'approved',
          },
        },
      };

      // Backward compatible fields should exist at top level
      expect(state.currentEpic).toBe('epic-2');
      expect(state.lastUpdated).toBe('2026-02-04T00:00:00.000Z');
    });

    test('should require nested workflow and stories objects', () => {
      const state: State = {
        currentEpic: 'epic-1',
        lastUpdated: '2026-02-04T00:00:00.000Z',
        workflow: {
          mode: 'dev-only',
          phase: 'implementation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      expect(state.workflow).toBeDefined();
      expect(state.stories).toBeDefined();
      expect(typeof state.workflow).toBe('object');
      expect(typeof state.stories).toBe('object');
    });
  });

  describe('LegacyState interface (v0.2.0 schema)', () => {
    test('should accept valid legacy state', () => {
      const legacyState: LegacyState = {
        currentEpic: 'epic-1',
        currentStoryIndex: 2,
        devReviewIteration: 1,
        completedStories: ['story-1', 'story-2'],
        lastUpdated: '2026-02-04T00:00:00.000Z',
      };

      expect(legacyState.currentEpic).toBe('epic-1');
      expect(legacyState.currentStoryIndex).toBe(2);
      expect(legacyState.devReviewIteration).toBe(1);
      expect(legacyState.completedStories).toHaveLength(2);
    });

    test('should have flat structure (no nested objects)', () => {
      const legacyState: LegacyState = {
        currentEpic: 'epic-1',
        currentStoryIndex: 0,
        devReviewIteration: 0,
        completedStories: [],
        lastUpdated: '2026-02-04T00:00:00.000Z',
      };

      // Legacy state should NOT have nested workflow or stories objects
      expect('workflow' in legacyState).toBe(false);
      expect('stories' in legacyState).toBe(false);
    });

    test('should match v0.2.0 field names exactly', () => {
      const legacyState: LegacyState = {
        currentEpic: 'epic-1',
        currentStoryIndex: 0,
        devReviewIteration: 0,
        completedStories: [],
        lastUpdated: '2026-02-04T00:00:00.000Z',
      };

      // These field names must match v0.2.0 exactly for migration
      expect(legacyState).toHaveProperty('currentEpic');
      expect(legacyState).toHaveProperty('currentStoryIndex');
      expect(legacyState).toHaveProperty('devReviewIteration');
      expect(legacyState).toHaveProperty('completedStories');
      expect(legacyState).toHaveProperty('lastUpdated');
    });
  });

  describe('Migration compatibility', () => {
    test('should demonstrate field mapping from LegacyState to State', () => {
      const legacyState: LegacyState = {
        currentEpic: 'epic-1',
        currentStoryIndex: 2,
        devReviewIteration: 1,
        completedStories: ['story-1', 'story-2'],
        lastUpdated: '2026-02-04T00:00:00.000Z',
      };

      // Simulate migration (actual migration logic is in Story 1.2)
      const migratedState: State = {
        currentEpic: legacyState.currentEpic,
        lastUpdated: legacyState.lastUpdated,
        workflow: {
          mode: 'sequential', // Default for migration
          phase: 'implementation', // Default for migration
          currentStoryIndex: legacyState.currentStoryIndex,
          devReviewIteration: legacyState.devReviewIteration,
        },
        stories: {
          completed: legacyState.completedStories,
          approvals: {}, // New field, empty on migration
        },
      };

      expect(migratedState.currentEpic).toBe('epic-1');
      expect(migratedState.workflow.currentStoryIndex).toBe(2);
      expect(migratedState.workflow.devReviewIteration).toBe(1);
      expect(migratedState.stories.completed).toHaveLength(2);
    });
  });

  describe('Type strictness validation', () => {
    test('should enforce strict types for workflow mode', () => {
      const state: State = {
        currentEpic: 'epic-1',
        lastUpdated: '2026-02-04T00:00:00.000Z',
        workflow: {
          mode: 'sequential', // Must be one of the three valid modes
          phase: 'implementation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      // TypeScript would prevent: mode: 'invalid-mode'
      expect(['sequential', 'batch', 'dev-only']).toContain(state.workflow.mode);
    });

    test('should enforce strict types for workflow phase', () => {
      const state: State = {
        currentEpic: 'epic-1',
        lastUpdated: '2026-02-04T00:00:00.000Z',
        workflow: {
          mode: 'sequential',
          phase: 'story-creation', // Must be one of the three valid phases
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      // TypeScript would prevent: phase: 'invalid-phase'
      expect(['story-creation', 'review', 'implementation']).toContain(state.workflow.phase);
    });

    test('should enforce strict types for approval status', () => {
      const state: State = {
        currentEpic: 'epic-1',
        lastUpdated: '2026-02-04T00:00:00.000Z',
        workflow: {
          mode: 'sequential',
          phase: 'implementation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {
            'story-1': 'approved', // Must be one of the three valid statuses
            'story-2': 'pending',
          },
        },
      };

      // TypeScript would prevent: approvals: { 'story-1': 'invalid-status' }
      expect(['approved', 'needs-changes', 'pending']).toContain(
        state.stories.approvals['story-1']
      );
    });
  });
});
