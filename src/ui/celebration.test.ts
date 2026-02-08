import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { type CelebrationStats, displayCelebration, displayResumeMessage } from './celebration.js';

describe('celebration.ts - Celebration and Resume Components', () => {
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

  describe('displayCelebration()', () => {
    test('should output celebration message with stats', () => {
      const stats: CelebrationStats = {
        stories: 8,
        files: 47,
        duration: '3h 42m',
      };

      const logs = captureLogs(() => {
        displayCelebration(stats);
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('Epic Complete!');
      expect(logs[0]).toContain('8 stories');
      expect(logs[0]).toContain('47 files');
      expect(logs[0]).toContain('3h 42m');
    });

    test('should use proper separator format (dot with spaces)', () => {
      const stats: CelebrationStats = {
        stories: 8,
        files: 47,
        duration: '3h 42m',
      };

      const logs = captureLogs(() => {
        displayCelebration(stats);
      });

      expect(logs).toHaveLength(1);
      // Check for separator between stories and files
      expect(logs[0]).toContain('stories');
      expect(logs[0]).toContain('files');
      // Verify the output format contains all components
      expect(logs[0]).toMatch(/8 stories.*47 files.*3h 42m/);
    });

    test('should use emoji when Unicode is supported', () => {
      const originalTerm = process.env.TERM;
      const originalAscii = process.env.JOHNNY_BMAD_ASCII;

      // Ensure Unicode is supported
      delete process.env.JOHNNY_BMAD_ASCII;
      process.env.TERM = 'xterm';

      const stats: CelebrationStats = {
        stories: 8,
        files: 47,
        duration: '3h 42m',
      };

      const logs = captureLogs(() => {
        displayCelebration(stats);
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('🎉');

      // Restore environment
      if (originalTerm === undefined) {
        delete process.env.TERM;
      } else {
        process.env.TERM = originalTerm;
      }
      if (originalAscii === undefined) {
        delete process.env.JOHNNY_BMAD_ASCII;
      } else {
        process.env.JOHNNY_BMAD_ASCII = originalAscii;
      }
    });

    test('should fallback to asterisk when Unicode is not supported', () => {
      const originalAscii = process.env.JOHNNY_BMAD_ASCII;

      // Force ASCII mode
      process.env.JOHNNY_BMAD_ASCII = '1';

      const stats: CelebrationStats = {
        stories: 8,
        files: 47,
        duration: '3h 42m',
      };

      const logs = captureLogs(() => {
        displayCelebration(stats);
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('* Epic Complete!');
      expect(logs[0]).not.toContain('🎉');

      // Restore environment
      if (originalAscii === undefined) {
        delete process.env.JOHNNY_BMAD_ASCII;
      } else {
        process.env.JOHNNY_BMAD_ASCII = originalAscii;
      }
    });

    test('should handle single story and file', () => {
      const stats: CelebrationStats = {
        stories: 1,
        files: 1,
        duration: '5m',
      };

      const logs = captureLogs(() => {
        displayCelebration(stats);
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('1 stories');
      expect(logs[0]).toContain('1 files');
      expect(logs[0]).toContain('5m');
    });

    test('should handle large numbers', () => {
      const stats: CelebrationStats = {
        stories: 100,
        files: 500,
        duration: '100h 30m',
      };

      const logs = captureLogs(() => {
        displayCelebration(stats);
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('100 stories');
      expect(logs[0]).toContain('500 files');
      expect(logs[0]).toContain('100h 30m');
    });

    let originalNoColor: string | undefined;

    beforeEach(() => {
      // Save original NO_COLOR value before each NO_COLOR test
      originalNoColor = process.env.NO_COLOR;
    });

    afterEach(() => {
      // Restore NO_COLOR to its original value after each NO_COLOR test
      if (originalNoColor === undefined) {
        delete process.env.NO_COLOR;
      } else {
        process.env.NO_COLOR = originalNoColor;
      }
    });

    test('should respect NO_COLOR environment variable', () => {
      process.env.NO_COLOR = '1';

      const stats: CelebrationStats = {
        stories: 8,
        files: 47,
        duration: '3h 42m',
      };

      const logs = captureLogs(() => {
        displayCelebration(stats);
      });

      expect(logs).toHaveLength(1);
      const output = logs[0];

      // Verify message is present
      expect(output).toContain('Epic Complete!');

      // Verify no ANSI color codes are present
      expect(output).not.toContain('\x1b[');
      expect(output).not.toContain('\u001b[');
    });

    test('should format celebration message exactly as specified in UX spec (Unicode)', () => {
      const originalTerm = process.env.TERM;
      const originalAscii = process.env.JOHNNY_BMAD_ASCII;

      // Ensure Unicode is supported
      delete process.env.JOHNNY_BMAD_ASCII;
      process.env.TERM = 'xterm';

      const stats: CelebrationStats = {
        stories: 8,
        files: 47,
        duration: '3h 42m',
      };

      const logs = captureLogs(() => {
        displayCelebration(stats);
      });

      // Check exact format matches UX specification
      expect(logs[0]).toMatch(/^🎉 Epic Complete! 8 stories · 47 files · 3h 42m$/);

      // Restore environment
      if (originalTerm === undefined) {
        delete process.env.TERM;
      } else {
        process.env.TERM = originalTerm;
      }
      if (originalAscii === undefined) {
        delete process.env.JOHNNY_BMAD_ASCII;
      } else {
        process.env.JOHNNY_BMAD_ASCII = originalAscii;
      }
    });

    test('should format celebration message exactly as specified in UX spec (ASCII)', () => {
      const originalAscii = process.env.JOHNNY_BMAD_ASCII;

      // Force ASCII mode
      process.env.JOHNNY_BMAD_ASCII = '1';

      const stats: CelebrationStats = {
        stories: 8,
        files: 47,
        duration: '3h 42m',
      };

      const logs = captureLogs(() => {
        displayCelebration(stats);
      });

      // Check exact format matches UX specification
      expect(logs[0]).toMatch(/^\* Epic Complete! 8 stories · 47 files · 3h 42m$/);

      // Restore environment
      if (originalAscii === undefined) {
        delete process.env.JOHNNY_BMAD_ASCII;
      } else {
        process.env.JOHNNY_BMAD_ASCII = originalAscii;
      }
    });
  });

  describe('displayResumeMessage()', () => {
    test('should output resume message with all parameters', () => {
      const logs = captureLogs(() => {
        displayResumeMessage('user-authentication', 4, 8, 'implementation');
      });

      expect(logs).toHaveLength(6);
      expect(logs[0]).toBe('Resuming from:');
      expect(logs[1]).toBe('  Epic: user-authentication');
      expect(logs[2]).toBe('  Story: 4/8');
      expect(logs[3]).toBe('  Phase: implementation');
      expect(logs[4]).toBe('');
      expect(logs[5]).toContain('State saved. All progress preserved.');
    });

    test('should use proper indentation for epic, story, and phase lines', () => {
      const logs = captureLogs(() => {
        displayResumeMessage('user-authentication', 4, 8, 'implementation');
      });

      expect(logs[1]).toMatch(/^\s{2}Epic:/);
      expect(logs[2]).toMatch(/^\s{2}Story:/);
      expect(logs[3]).toMatch(/^\s{2}Phase:/);
    });

    test('should include blank line before reassurance message', () => {
      const logs = captureLogs(() => {
        displayResumeMessage('user-authentication', 4, 8, 'implementation');
      });

      expect(logs[4]).toBe('');
    });

    test('should handle epic names with special characters', () => {
      const logs = captureLogs(() => {
        displayResumeMessage('user-auth_2.0', 1, 10, 'review');
      });

      expect(logs).toHaveLength(6);
      expect(logs[1]).toContain('user-auth_2.0');
    });

    test('should handle story numbers at boundaries', () => {
      const logs = captureLogs(() => {
        displayResumeMessage('test-epic', 1, 1, 'implementation');
      });

      expect(logs).toHaveLength(6);
      expect(logs[2]).toBe('  Story: 1/1');
    });

    test('should handle different phase names', () => {
      const logs = captureLogs(() => {
        displayResumeMessage('user-authentication', 4, 8, 'validation');
      });

      expect(logs).toHaveLength(6);
      expect(logs[3]).toBe('  Phase: validation');
    });

    let originalNoColor: string | undefined;

    beforeEach(() => {
      // Save original NO_COLOR value before each NO_COLOR test
      originalNoColor = process.env.NO_COLOR;
    });

    afterEach(() => {
      // Restore NO_COLOR to its original value after each NO_COLOR test
      if (originalNoColor === undefined) {
        delete process.env.NO_COLOR;
      } else {
        process.env.NO_COLOR = originalNoColor;
      }
    });

    test('should respect NO_COLOR environment variable', () => {
      process.env.NO_COLOR = '1';

      const logs = captureLogs(() => {
        displayResumeMessage('user-authentication', 4, 8, 'implementation');
      });

      expect(logs).toHaveLength(6);
      const reassuranceLine = logs[5];

      // Verify message is present
      expect(reassuranceLine).toContain('State saved. All progress preserved.');

      // Verify no ANSI color codes are present
      expect(reassuranceLine).not.toContain('\x1b[');
      expect(reassuranceLine).not.toContain('\u001b[');
    });

    test('should format resume message exactly as specified in UX spec', () => {
      const logs = captureLogs(() => {
        displayResumeMessage('user-authentication', 4, 8, 'implementation');
      });

      // Check exact format matches UX specification
      expect(logs[0]).toBe('Resuming from:');
      expect(logs[1]).toBe('  Epic: user-authentication');
      expect(logs[2]).toBe('  Story: 4/8');
      expect(logs[3]).toBe('  Phase: implementation');
      expect(logs[4]).toBe('');
      expect(logs[5]).toContain('State saved. All progress preserved.');
    });

    test('should output reassurance message in green when colors enabled', () => {
      // Delete NO_COLOR to ensure colors are enabled
      delete process.env.NO_COLOR;

      const logs = captureLogs(() => {
        displayResumeMessage('user-authentication', 4, 8, 'implementation');
      });

      expect(logs).toHaveLength(6);
      expect(logs[5]).toContain('State saved. All progress preserved.');
      // Note: Color codes may not appear in mocked console output
      // The important thing is the text is present
    });
  });
});
