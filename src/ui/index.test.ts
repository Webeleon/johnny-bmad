import { describe, expect, test } from 'bun:test';
import type { CelebrationStats, StoryCardData } from './index.js';
import {
  displayAgentActivity,
  displayBanner,
  displayCelebration,
  displayError,
  displayPhaseHeader,
  displayProgress,
  displayResumeMessage,
  displayStatus,
  displayStoryCard,
  promptStoryApproval,
} from './index.js';

describe('ui/index.ts - Barrel Exports', () => {
  describe('displayBanner()', () => {
    test('should be exported as function', () => {
      expect(typeof displayBanner).toBe('function');
    });

    test('should not throw when called', () => {
      expect(() => displayBanner()).not.toThrow();
    });
  });

  describe('displayPhaseHeader()', () => {
    test('should be exported as function', () => {
      expect(typeof displayPhaseHeader).toBe('function');
    });

    test('should not throw when called with phase', () => {
      expect(() => displayPhaseHeader('Test Phase')).not.toThrow();
    });
  });

  describe('displayProgress()', () => {
    test('should be exported as function', () => {
      expect(typeof displayProgress).toBe('function');
    });

    test('should not throw when called with progress data', () => {
      expect(() => displayProgress(1, 8, 'testing')).not.toThrow();
    });
  });

  describe('displayAgentActivity()', () => {
    test('should be exported as function', () => {
      expect(typeof displayAgentActivity).toBe('function');
    });

    test('should not throw when called with agent and activity', () => {
      expect(() => displayAgentActivity('SM', 'Testing')).not.toThrow();
    });
  });

  describe('displayStatus()', () => {
    test('should be exported as function', () => {
      expect(typeof displayStatus).toBe('function');
    });

    test('should not throw when called with "ok" status level', () => {
      expect(() => displayStatus('ok', 'Test message')).not.toThrow();
    });

    test('should not throw when called with "fail" status level', () => {
      expect(() => displayStatus('fail', 'Test message')).not.toThrow();
    });

    test('should not throw when called with "warn" status level', () => {
      expect(() => displayStatus('warn', 'Test message')).not.toThrow();
    });

    test('should not throw when called with "info" status level', () => {
      expect(() => displayStatus('info', 'Test message')).not.toThrow();
    });

    test('should not throw when called with "error" status level', () => {
      expect(() => displayStatus('error', 'Test message')).not.toThrow();
    });
  });

  describe('displayStoryCard()', () => {
    test('should be exported as function', () => {
      expect(typeof displayStoryCard).toBe('function');
    });

    test('should not throw when called with complete story data', () => {
      const storyData: StoryCardData = {
        title: 'Test Story',
        epicId: 'epic-1',
        storyId: '1-1-test-story',
        acceptanceCriteria: ['AC1', 'AC2'],
        tasks: ['Task 1', 'Task 2'],
      };
      expect(() => displayStoryCard(storyData, 1, 8)).not.toThrow();
    });
  });

  describe('promptStoryApproval()', () => {
    test('should be exported as function', () => {
      expect(typeof promptStoryApproval).toBe('function');
    });

    test('stub should resolve to approved', async () => {
      const storyData: StoryCardData = {
        title: 'Test Story',
        epicId: 'epic-1',
        storyId: '1-1-test-story',
        acceptanceCriteria: ['AC1'],
        tasks: ['Task 1'],
      };
      const result = await promptStoryApproval(storyData, 1, 8);
      expect(result).toBe('approved');
    });
  });

  describe('displayError()', () => {
    test('should be exported as function', () => {
      expect(typeof displayError).toBe('function');
    });

    test('should not throw when called with error details', () => {
      expect(() =>
        displayError('TestError', 'description', 'context', 'recovery command')
      ).not.toThrow();
    });
  });

  describe('displayCelebration()', () => {
    test('should be exported as function', () => {
      expect(typeof displayCelebration).toBe('function');
    });

    test('should not throw when called with complete stats', () => {
      const stats: CelebrationStats = {
        stories: 5,
        files: 12,
        duration: '2h 15m',
      };
      expect(() => displayCelebration(stats)).not.toThrow();
    });
  });

  describe('displayResumeMessage()', () => {
    test('should be exported as function', () => {
      expect(typeof displayResumeMessage).toBe('function');
    });

    test('should not throw when called with resume details', () => {
      expect(() => displayResumeMessage('test-epic', 1, 8, 'implementation')).not.toThrow();
    });
  });

  describe('Type Exports', () => {
    test('should export StoryCardData type', () => {
      const testData: StoryCardData = {
        title: 'Test',
        epicId: 'epic-1',
        storyId: '1-1-test',
        acceptanceCriteria: [],
        tasks: [],
      };
      expect(testData).toBeDefined();
    });

    test('should export CelebrationStats type', () => {
      const testStats: CelebrationStats = {
        stories: 1,
        files: 1,
        duration: '1m',
      };
      expect(testStats).toBeDefined();
    });
  });
});
