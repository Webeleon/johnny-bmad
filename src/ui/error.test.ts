import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { displayError } from './error.js';

describe('error.ts - Error Block Component', () => {
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

  describe('displayError()', () => {
    test('should output formatted error block with all parameters', () => {
      const logs = captureLogs(() => {
        displayError('API Error', 'Rate limited', 'Story 4/8', 'wait 60s and restart');
      });

      expect(logs).toHaveLength(3);
      expect(logs[0]).toContain('[ERROR]');
      expect(logs[0]).toContain('API Error');
      expect(logs[0]).toContain('Rate limited');
      expect(logs[1]).toContain('State saved at Story 4/8');
      expect(logs[2]).toContain('Try: wait 60s and restart');
    });

    test('should always include "Try:" line (critical requirement)', () => {
      const logs = captureLogs(() => {
        displayError('Test Error', 'Test description', 'Test context', 'Test recovery');
      });

      expect(logs).toHaveLength(3);
      expect(logs[2]).toContain('Try:');
      expect(logs[2]).toContain('Test recovery');
    });

    test('should use proper indentation for context and Try lines', () => {
      const logs = captureLogs(() => {
        displayError('API Error', 'Rate limited', 'Story 4/8', 'wait 60s and restart');
      });

      // Context line should have 8 spaces indent
      expect(logs[1]).toMatch(/^\s{8}State saved at/);
      // Try line should have 8 spaces indent
      expect(logs[2]).toMatch(/^\s{8}Try:/);
    });

    test('should handle empty strings', () => {
      const logs = captureLogs(() => {
        displayError('', '', '', '');
      });

      expect(logs).toHaveLength(3);
      expect(logs[0]).toContain('[ERROR]');
      expect(logs[1]).toContain('State saved at');
      expect(logs[2]).toContain('Try:');
    });

    test('should handle special characters in parameters', () => {
      const logs = captureLogs(() => {
        displayError(
          'API Error',
          'Error: file not found at /path/to/file',
          'Story 4/8',
          'rm /path/to/file'
        );
      });

      expect(logs).toHaveLength(3);
      expect(logs[0]).toContain('[ERROR]');
      expect(logs[0]).toContain('Error: file not found at /path/to/file');
      expect(logs[2]).toContain('rm /path/to/file');
    });

    test('should handle multi-line context and recovery commands', () => {
      const logs = captureLogs(() => {
        displayError(
          'Build Error',
          'Compilation failed',
          'Story 4/8',
          'fix syntax errors\nrun build again'
        );
      });

      expect(logs).toHaveLength(3);
      expect(logs[2]).toContain('Try:');
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
        displayError('API Error', 'Rate limited', 'Story 4/8', 'wait 60s and restart');
      });

      expect(logs).toHaveLength(3);
      const firstLine = logs[0];

      // Verify [ERROR] label is present (text still shows without color)
      expect(firstLine).toContain('[ERROR]');
      expect(firstLine).toContain('API Error');

      // Verify no ANSI color codes are present
      expect(firstLine).not.toContain('\x1b[');
      expect(firstLine).not.toContain('\u001b[');
    });

    test('should format error block exactly as specified in UX spec', () => {
      const logs = captureLogs(() => {
        displayError('API Error', 'Rate limited', 'Story 4/8', 'wait 60s and restart');
      });

      // Check exact format matches UX specification
      expect(logs[0]).toMatch(/^\[ERROR\] API Error: Rate limited$/);
      expect(logs[1]).toMatch(/^\s{8}State saved at Story 4\/8$/);
      expect(logs[2]).toMatch(/^\s{8}Try: wait 60s and restart$/);
    });
  });
});
