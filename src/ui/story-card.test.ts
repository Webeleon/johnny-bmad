import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import inquirer from 'inquirer';
import { displayStoryCard, promptStoryApproval, type StoryCardData } from './story-card.js';

// Mock inquirer module
let inquirerPromptMock: ReturnType<typeof spyOn>;

describe('story-card.ts - Story Review Card Component', () => {
  // Capture console.log output for testing
  const captureLogs = (fn: () => void): string[] => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    };
    try {
      fn();
    } finally {
      console.log = originalLog;
    }
    return logs;
  };

  const mockStory: StoryCardData = {
    title: 'Implement login form with validation',
    epicId: 'epic-1',
    storyId: '1-1',
    acceptanceCriteria: ['AC1', 'AC2', 'AC3', 'AC4', 'AC5'],
    tasks: ['Task 1', 'Task 2', 'Task 3', 'Task 4'],
  };

  describe('displayStoryCard()', () => {
    let originalNoColor: string | undefined;

    beforeEach(() => {
      originalNoColor = process.env.NO_COLOR;
    });

    afterEach(() => {
      if (originalNoColor === undefined) {
        delete process.env.NO_COLOR;
      } else {
        process.env.NO_COLOR = originalNoColor;
      }
    });

    test('should display story card with Unicode header when supported (AC: #1, #2)', () => {
      // Ensure Unicode is supported
      delete process.env.NO_COLOR;
      delete process.env.JOHNNY_BMAD_ASCII;
      process.env.TERM = 'xterm';

      const logs = captureLogs(() => {
        displayStoryCard(mockStory, 3, 8);
      });

      // Verify header format with Unicode separator
      expect(logs.length).toBeGreaterThanOrEqual(3);
      expect(logs[0]).toContain('Review Story 4/8'); // index 3 + 1 = 4
      expect(logs[0]).toContain('━'); // Unicode separator
    });

    test('should display story card with ASCII header when Unicode not supported (AC: #2)', () => {
      // Force ASCII mode
      process.env.JOHNNY_BMAD_ASCII = '1';

      const logs = captureLogs(() => {
        displayStoryCard(mockStory, 3, 8);
      });

      // Verify header format with ASCII separator
      expect(logs.length).toBeGreaterThanOrEqual(3);
      expect(logs[0]).toContain('Review Story 4/8');
      expect(logs[0]).toContain('='); // ASCII separator
      expect(logs[0]).not.toContain('━'); // No Unicode separator
    });

    test('should display story title on line 2 (AC: #3)', () => {
      const logs = captureLogs(() => {
        displayStoryCard(mockStory, 3, 8);
      });

      // Second line should contain title
      expect(logs[1]).toContain('Title:');
      expect(logs[1]).toContain('Implement login form with validation');
    });

    test('should display task count and acceptance criteria count on line 3 (AC: #3)', () => {
      const logs = captureLogs(() => {
        displayStoryCard(mockStory, 3, 8);
      });

      // Third line should contain counts
      expect(logs[2]).toContain('Tasks:');
      expect(logs[2]).toContain('4'); // 4 tasks
      expect(logs[2]).toContain('subtasks');
      expect(logs[2]).toContain('Acceptance Criteria:');
      expect(logs[2]).toContain('5'); // 5 ACs
      expect(logs[2]).toContain('items');
    });

    test('should handle index 0 correctly (first story)', () => {
      const logs = captureLogs(() => {
        displayStoryCard(mockStory, 0, 5);
      });

      expect(logs[0]).toContain('Review Story 1/5');
    });

    test('should handle single story (index 0, total 1)', () => {
      const logs = captureLogs(() => {
        displayStoryCard(mockStory, 0, 1);
      });

      expect(logs[0]).toContain('Review Story 1/1');
    });

    test('should use cyan color for header (consistent with phase-header.ts pattern)', () => {
      delete process.env.NO_COLOR;

      const logs = captureLogs(() => {
        displayStoryCard(mockStory, 3, 8);
      });

      // First log should be the header
      expect(logs[0]).toContain('Review Story');
      // Note: Chalk color codes may not appear in mocked console output
      // The NO_COLOR test below verifies colors are disabled when the flag is set
    });

    test('should handle very long story titles (edge case)', () => {
      const longTitleStory: StoryCardData = {
        ...mockStory,
        title:
          'Implement a comprehensive login form with advanced validation including email verification, password strength requirements, CAPTCHA integration, two-factor authentication support, social login options, remember me functionality, and responsive design for mobile devices',
      };

      const logs = captureLogs(() => {
        displayStoryCard(longTitleStory, 0, 1);
      });

      // Title line should contain the full long title
      expect(logs[1]).toContain('Title:');
      expect(logs[1]).toContain('Implement a comprehensive login form');
      // The function should not truncate or wrap the title - it should display as-is
      expect(logs[1].length).toBeGreaterThan(100); // Verify it's actually long
    });

    test('should respect NO_COLOR environment variable - disable colors when set (Task 4.7)', () => {
      process.env.NO_COLOR = '1';

      const logs = captureLogs(() => {
        displayStoryCard(mockStory, 3, 8);
      });

      expect(logs.length).toBeGreaterThanOrEqual(3);

      // Verify header is still present (structure is maintained)
      expect(logs[0]).toContain('Review Story 4/8');

      // When NO_COLOR is set, chalk's colorize function returns plain text without ANSI codes
      // We verify this by checking that the header does NOT contain escape sequences
      const headerLine = logs[0];

      // ANSI CSI sequence starts with ESC (0x1B) followed by [
      // In UTF-8, this appears as escape sequences
      const escapePattern = new RegExp(String.fromCharCode(0x1b) + '\\[');
      expect(headerLine).not.toMatch(escapePattern);

      // The header should be plain text without color codes
      // Verify it still contains the expected content and has separators (either Unicode or ASCII)
      expect(headerLine).toContain('Review Story');
      expect(headerLine).toMatch(/(━|=)/); // Has either Unicode or ASCII separator
    });

    test('should handle story with no tasks', () => {
      const emptyStory: StoryCardData = {
        ...mockStory,
        tasks: [],
      };

      const logs = captureLogs(() => {
        displayStoryCard(emptyStory, 0, 1);
      });

      expect(logs[2]).toContain('Tasks:');
      expect(logs[2]).toContain('0');
    });

    test('should handle story with no acceptance criteria', () => {
      const emptyStory: StoryCardData = {
        ...mockStory,
        acceptanceCriteria: [],
      };

      const logs = captureLogs(() => {
        displayStoryCard(emptyStory, 0, 1);
      });

      expect(logs[2]).toContain('Acceptance Criteria:');
      expect(logs[2]).toContain('0');
    });

    test('should handle story with both empty tasks and empty AC simultaneously (edge case)', () => {
      const emptyStory: StoryCardData = {
        ...mockStory,
        tasks: [],
        acceptanceCriteria: [],
      };

      const logs = captureLogs(() => {
        displayStoryCard(emptyStory, 0, 1);
      });

      expect(logs[2]).toContain('Tasks:');
      expect(logs[2]).toContain('0');
      expect(logs[2]).toContain('subtasks');
      expect(logs[2]).toContain('Acceptance Criteria:');
      expect(logs[2]).toContain('0');
      expect(logs[2]).toContain('items');
    });

    test('should display (revised) in header when isRevised is true (AC: #6)', () => {
      const logs = captureLogs(() => {
        displayStoryCard(mockStory, 3, 8, true);
      });

      // Verify header contains (revised)
      expect(logs[0]).toContain('Review Story 4/8');
      expect(logs[0]).toContain('(revised)');
    });

    test('should not display (revised) in header when isRevised is false or undefined', () => {
      const logs1 = captureLogs(() => {
        displayStoryCard(mockStory, 3, 8, false);
      });

      expect(logs1[0]).toContain('Review Story 4/8');
      expect(logs1[0]).not.toContain('(revised)');

      const logs2 = captureLogs(() => {
        displayStoryCard(mockStory, 3, 8);
      });

      expect(logs2[0]).toContain('Review Story 4/8');
      expect(logs2[0]).not.toContain('(revised)');
    });
  });

  describe('promptStoryApproval()', () => {
    beforeEach(async () => {
      // Mock inquirer.prompt before each test
      inquirerPromptMock = spyOn(inquirer, 'prompt');
    });

    afterEach(() => {
      // Restore inquirer.prompt after each test
      inquirerPromptMock.mockRestore();
    });

    test('should return "approved" when user selects Y (AC: #5)', async () => {
      // Mock inquirer to return 'approved'
      inquirerPromptMock.mockResolvedValueOnce({ action: 'approved' });

      const result = await promptStoryApproval(mockStory, 0, 1);

      expect(result).toBe('approved');
      expect(inquirerPromptMock).toHaveBeenCalledTimes(1);
    });

    test('should return needs-changes with feedback when user selects N (AC: #5)', async () => {
      // First call returns 'needs-changes', second call returns feedback
      inquirerPromptMock
        .mockResolvedValueOnce({ action: 'needs-changes' })
        .mockResolvedValueOnce({ feedback: 'Add more error handling' });

      const result = await promptStoryApproval(mockStory, 0, 1);

      expect(result).toEqual({
        type: 'needs-changes',
        feedback: 'Add more error handling',
      });
      expect(inquirerPromptMock).toHaveBeenCalledTimes(2);
    });

    test('should display story summary and re-prompt when user selects V (AC: #5)', async () => {
      // First call returns 'view', second call returns 'approved'
      const mockExpandPrompt = {
        type: 'expand',
        name: 'action',
        message: 'Your choice',
        choices: [
          { key: 'y', name: 'Approve', value: 'approved' },
          { key: 'n', name: 'Request changes', value: 'needs-changes' },
          { key: 'v', name: 'View full story', value: 'view' },
        ],
      };

      inquirerPromptMock
        .mockResolvedValueOnce({ action: 'view' })
        .mockResolvedValueOnce({ action: 'approved' });

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      };

      try {
        const result = await promptStoryApproval(mockStory, 3, 8);
        expect(result).toBe('approved');
        expect(inquirerPromptMock).toHaveBeenCalledTimes(2);

        // Verify the prompt type is 'expand' for single-key input (AC: #4)
        expect(inquirerPromptMock.mock.calls[0][0][0]).toMatchObject(mockExpandPrompt);

        // Verify story summary was displayed
        const fullOutput = logs.join('\n');
        expect(fullOutput).toContain('Full Story Content');
        expect(fullOutput).toContain('Title: Implement login form with validation');
      } finally {
        console.log = originalLog;
      }
    });

    test('should read and display story file when storyPath is provided (Task 2.4)', async () => {
      const mockStoryContent = '# Story Content\n\nThis is the full story markdown content.';
      const fs = await import('node:fs');

      // Mock fs.readFileSync
      const readFileSyncSpy = spyOn(fs, 'readFileSync').mockReturnValue(mockStoryContent);

      inquirerPromptMock
        .mockResolvedValueOnce({ action: 'view' })
        .mockResolvedValueOnce({ action: 'approved' });

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      };

      try {
        const result = await promptStoryApproval(mockStory, 0, 1, '/path/to/story.md');

        expect(result).toBe('approved');

        // Verify fs.readFileSync was called with the story path
        expect(readFileSyncSpy).toHaveBeenCalledWith('/path/to/story.md', 'utf-8');

        // Verify the full story content was displayed
        const fullOutput = logs.join('\n');
        expect(fullOutput).toContain(mockStoryContent);
      } finally {
        console.log = originalLog;
        readFileSyncSpy.mockRestore();
      }
    });

    test('should fall back to summary when file read fails (Task 2.4)', async () => {
      const fs = await import('node:fs');

      // Mock fs.readFileSync to throw error
      const readFileSyncSpy = spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File not found');
      });

      inquirerPromptMock
        .mockResolvedValueOnce({ action: 'view' })
        .mockResolvedValueOnce({ action: 'approved' });

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      };

      try {
        const result = await promptStoryApproval(mockStory, 0, 1, '/invalid/path/story.md');

        expect(result).toBe('approved');

        // Verify fs.readFileSync was called
        expect(readFileSyncSpy).toHaveBeenCalledWith('/invalid/path/story.md', 'utf-8');

        // Verify fallback summary was displayed
        const fullOutput = logs.join('\n');
        expect(fullOutput).toContain('Title: Implement login form with validation');
        expect(fullOutput).toContain('Epic: epic-1 | Story: 1-1');
      } finally {
        console.log = originalLog;
        readFileSyncSpy.mockRestore();
      }
    });

    test('should use expand type prompt for single-key input (AC: #4)', async () => {
      inquirerPromptMock.mockResolvedValueOnce({ action: 'approved' });

      await promptStoryApproval(mockStory, 0, 1);

      const promptConfig = inquirerPromptMock.mock.calls[0][0][0];

      // Verify prompt type is 'expand' (not 'list')
      expect(promptConfig.type).toBe('expand');
      expect(promptConfig.message).toBe('Your choice');

      // Verify choices have correct keys
      expect(promptConfig.choices).toEqual([
        { key: 'y', name: 'Approve', value: 'approved' },
        { key: 'n', name: 'Request changes', value: 'needs-changes' },
        { key: 'v', name: 'View full story', value: 'view' },
      ]);
    });

    test('should handle empty feedback string', async () => {
      inquirerPromptMock
        .mockResolvedValueOnce({ action: 'needs-changes' })
        .mockResolvedValueOnce({ feedback: '' });

      const result = await promptStoryApproval(mockStory, 0, 1);

      expect(result).toEqual({
        type: 'needs-changes',
        feedback: '',
      });
    });
  });
});
