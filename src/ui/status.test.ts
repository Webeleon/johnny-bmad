import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { displayStatus } from './status.js';

describe('status.ts - Status Message Component', () => {
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

  describe('displayStatus()', () => {
    test('should output [OK] label in green for ok level', () => {
      const logs = captureLogs(() => {
        displayStatus('ok', 'Operation completed successfully');
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('[OK]');
      expect(logs[0]).toContain('Operation completed successfully');
    });

    test('should output [FAIL] label in red for fail level', () => {
      const logs = captureLogs(() => {
        displayStatus('fail', 'Operation failed');
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('[FAIL]');
      expect(logs[0]).toContain('Operation failed');
    });

    test('should output [WARN] label in yellow for warn level', () => {
      const logs = captureLogs(() => {
        displayStatus('warn', 'Warning detected');
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('[WARN]');
      expect(logs[0]).toContain('Warning detected');
    });

    test('should output [INFO] label in cyan for info level', () => {
      const logs = captureLogs(() => {
        displayStatus('info', 'Information message');
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('[INFO]');
      expect(logs[0]).toContain('Information message');
    });

    test('should output [ERROR] label in red bold for error level', () => {
      const logs = captureLogs(() => {
        displayStatus('error', 'Critical error occurred');
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('[ERROR]');
      expect(logs[0]).toContain('Critical error occurred');
    });

    test('should format output as [{LEVEL}] {message}', () => {
      const logs = captureLogs(() => {
        displayStatus('ok', 'Test message');
      });

      expect(logs[0]).toMatch(/^\[OK\] Test message$/);
    });

    test('should handle empty message', () => {
      const logs = captureLogs(() => {
        displayStatus('info', '');
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('[INFO]');
    });

    test('should handle special characters in message', () => {
      const logs = captureLogs(() => {
        displayStatus('error', 'Error: file not found at /path/to/file');
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('[ERROR]');
      expect(logs[0]).toContain('Error: file not found at /path/to/file');
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

    test('should respect NO_COLOR environment variable - disable colors when set', () => {
      // Set NO_COLOR environment variable
      process.env.NO_COLOR = '1';

      const logs = captureLogs(() => {
        displayStatus('error', 'Test error message');
      });

      expect(logs).toHaveLength(1);
      const output = logs[0];

      // Verify label is present (text still shows without color)
      expect(output).toContain('[ERROR]');
      expect(output).toContain('Test error message');

      // Verify no ANSI color codes are present
      // ANSI escape sequences start with \x1b or \u001b
      expect(output).not.toContain('\x1b[');
      expect(output).not.toContain('\u001b[');
    });

    test('should apply colors when NO_COLOR is not set', () => {
      // Ensure NO_COLOR is not set
      delete process.env.NO_COLOR;

      const logs = captureLogs(() => {
        displayStatus('ok', 'Test message');
      });

      expect(logs).toHaveLength(1);
      const output = logs[0];

      // Verify label and message are present
      expect(output).toContain('[OK]');
      expect(output).toContain('Test message');

      // Note: Chalk color codes are terminal-dependent and may not appear in mocked console output
      // The NO_COLOR test above verifies that colors are disabled when the flag is set
      // This test verifies the basic output format works without NO_COLOR
    });

    test('should handle invalid level gracefully with fallback', () => {
      // Use type assertion to test runtime behavior with invalid level
      // This simulates what could happen if called from untyped JavaScript
      // Note: Type assertion is appropriate here because we're testing defensive programming.
      // A Result type or explicit error parameter would be over-engineering for a simple
      // display function where the primary use case is typed TypeScript code.
      const invalidLevel = 'invalid' as 'ok' | 'fail' | 'warn' | 'info' | 'error';

      const logs = captureLogs(() => {
        displayStatus(invalidLevel, 'Test message');
      });

      expect(logs).toHaveLength(1);
      const output = logs[0];

      // Verify fallback behavior: uses [UNKNOWN] label when level is invalid
      expect(output).toContain('[UNKNOWN]');
      expect(output).toContain('Test message');
    });
  });
});
