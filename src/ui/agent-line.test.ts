import { describe, expect, test } from 'bun:test';
import chalk from 'chalk';
import { displayAgentActivity } from './agent-line.js';

describe('agent-line.ts - Agent Activity Line', () => {
  describe('displayAgentActivity()', () => {
    // Capture console.log output for testing
    const captureLogs = (fn: () => void): string[] => {
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      };
      fn();
      console.log = originalLog;
      return logs;
    };

    // Capture both console.log and console.warn for testing
    const captureAllOutput = (fn: () => void): { logs: string[]; warns: string[] } => {
      const logs: string[] = [];
      const warns: string[] = [];
      const originalLog = console.log;
      const originalWarn = console.warn;
      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      };
      console.warn = (...args: unknown[]) => {
        warns.push(args.map(String).join(' '));
      };
      fn();
      console.log = originalLog;
      console.warn = originalWarn;
      return { logs, warns };
    };

    test('should output [SM] with cyan color and 8-char padding', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('SM', 'Checking sprint status');
      });

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain('[SM]');
      expect(logs[0]).toContain('Checking sprint status');
      // Check that it uses cyan (chalk adds ANSI codes)
      expect(logs[0]).toContain(chalk.cyan('[SM]    ')); // 4 trailing spaces = 8 chars total
    });

    test('should output [Story] with blue color and 8-char padding', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('Story', 'Creating user story');
      });

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain('[Story]');
      expect(logs[0]).toContain('Creating user story');
      expect(logs[0]).toContain(chalk.blue('[Story] ')); // 1 trailing space = 8 chars total
    });

    test('should output [Dev] with green color and 8-char padding', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('Dev', 'Implementing feature');
      });

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain('[Dev]');
      expect(logs[0]).toContain('Implementing feature');
      expect(logs[0]).toContain(chalk.green('[Dev]   ')); // 3 trailing spaces = 8 chars total
    });

    test('should output [Review] with magenta color and 8-char padding', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('Review', 'Reviewing code');
      });

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain('[Review]');
      expect(logs[0]).toContain('Reviewing code');
      expect(logs[0]).toContain(chalk.magenta('[Review]')); // 0 trailing spaces = 8 chars total
    });

    test('should handle unknown agent with white color and 8-char padding', () => {
      const output = captureAllOutput(() => {
        displayAgentActivity('Bot', 'Doing something');
      });

      expect(output.logs.length).toBe(1);
      expect(output.logs[0]).toContain('[Bot]');
      expect(output.logs[0]).toContain('Doing something');
      // Unknown should use white/default color
      // "Bot" is 3 chars, label is padded to 8 chars: [Bot]    + 4 spaces = 8 total
      expect(output.logs[0]).toContain(chalk.white('[Bot]    ')); // 4 trailing spaces = 8 total
      // Should NOT warn about truncation for short names
      expect(output.warns.length).toBe(0);
    });

    test('should truncate very long unknown agent names with ellipsis', () => {
      const output = captureAllOutput(() => {
        displayAgentActivity('UnknownAgent', 'Processing');
      });

      expect(output.logs.length).toBe(1);
      // "UnknownAgent" is 12 chars, should be truncated to 3 chars + "..." = "Unk..."
      expect(output.logs[0]).toContain('[Unk...]');
      expect(output.logs[0]).toContain('Processing');
      // Should warn about truncation
      expect(output.warns.length).toBe(1);
      expect(output.warns[0]).toContain('Agent name "UnknownAgent" is too long');
      expect(output.warns[0]).toContain('Truncated to "Unk..."');
    });

    test('should include activity string in output', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('SM', 'Running tests and validations');
      });

      expect(logs[0]).toContain('Running tests and validations');
    });

    test('should handle short unknown agent names without warning', () => {
      const output = captureAllOutput(() => {
        displayAgentActivity('Bot', 'Processing request');
      });

      expect(output.logs.length).toBe(1);
      expect(output.logs[0]).toContain('[Bot]');
      expect(output.logs[0]).toContain('Processing request');
      // Short names should not trigger warning
      expect(output.warns.length).toBe(0);
    });

    test('should include activity with ellipsis suffix', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('Dev', 'Writing code');
      });

      expect(logs[0]).toContain('Writing code...');
    });

    test('should match exact format: [{Label}] {activity}...', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('SM', 'Checking sprint status');
      });

      // Strip ANSI codes to verify exact text format
      // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape codes requires matching control characters
      const stripAnsi = (str: string): string => str.replace(/\u001b\[\d+m/g, '');
      const plain = stripAnsi(logs[0]);

      // Format: [Label with padding] + single space + activity + '...'
      // Label is 8 chars for alignment: [SM]    [Story] [Dev]   [Review]
      // Then 1 separator space, then activity, then ellipsis
      expect(plain).toBe('[SM]     Checking sprint status...');
    });

    test('verbose mode should include timestamp in label', () => {
      // Capture current time BEFORE calling function to avoid race condition
      const beforeCall = new Date();
      const logs = captureLogs(() => {
        displayAgentActivity('SM', 'Checking sprint status', true);
      });
      const afterCall = new Date();

      expect(logs.length).toBe(1);
      // Should have format [SM HH:MM:SS]
      expect(logs[0]).toMatch(/\[SM \d{2}:\d{2}:\d{2}\]/);
      expect(logs[0]).toContain('Checking sprint status');

      // Extract timestamp from output and verify format
      const timestampMatch = logs[0].match(/\[SM (\d{2}):(\d{2}):(\d{2})\]/);
      expect(timestampMatch).toBeTruthy();
      if (timestampMatch) {
        const [, hours, minutes, seconds] = timestampMatch;
        // Verify each component is a valid 2-digit number
        expect(Number(hours)).toBeGreaterThanOrEqual(0);
        expect(Number(hours)).toBeLessThanOrEqual(23);
        expect(Number(minutes)).toBeGreaterThanOrEqual(0);
        expect(Number(minutes)).toBeLessThanOrEqual(59);
        expect(Number(seconds)).toBeGreaterThanOrEqual(0);
        expect(Number(seconds)).toBeLessThanOrEqual(59);

        // Verify timestamp is within reasonable time range (beforeCall to afterCall + 1 second buffer)
        // This prevents race conditions where second rolls over between calls
        const callSecond = beforeCall.getSeconds();
        const outputSecond = Number(seconds);
        const _afterSecond = afterCall.getSeconds();

        // Allow for second rollover (e.g., 59 -> 00)
        const secondDiff = (outputSecond - callSecond + 60) % 60;
        expect(secondDiff).toBeLessThanOrEqual(2); // Allow at most 2 seconds difference
      }
    });

    test('verbose mode should use correct timestamp format', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('Dev', 'Implementing', true);
      });

      // Extract timestamp portion
      const timestampMatch = logs[0].match(/\d{2}:\d{2}:\d{2}/);
      expect(timestampMatch).toBeTruthy();
      if (timestampMatch) {
        const parts = timestampMatch[0].split(':');
        expect(parts.length).toBe(3);
        // Each part should be 2 digits
        parts.forEach((part) => {
          expect(part.length).toBe(2);
          expect(Number(part)).toBeGreaterThanOrEqual(0);
        });
      }
    });

    test('non-verbose mode should not include timestamp', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('SM', 'Working', false);
      });

      expect(logs[0]).not.toMatch(/\d{2}:\d{2}:\d{2}/);
      expect(logs[0]).toContain('[SM]');
    });

    test('verbose mode should work with all agent types', () => {
      const agents = ['SM', 'Story', 'Dev', 'Review'];
      agents.forEach((agent) => {
        const logs = captureLogs(() => {
          displayAgentActivity(agent, 'Test activity', true);
        });

        expect(logs[0]).toMatch(new RegExp(`\\[${agent} \\d{2}:\\d{2}:\\d{2}\\]`));
      });
    });

    test('should use chalk which respects NO_COLOR environment variable', () => {
      // Note: chalk v5 automatically respects NO_COLOR, but the color level is
      // determined at module import time. This test verifies that we're using
      // chalk correctly by checking that chalk's colored output is included.
      //
      // For manual testing: Run `NO_COLOR=1 bun run src/index.ts` (or any script)
      // to verify that chalk produces plain text output when NO_COLOR is set.
      // This works because chalk detects NO_COLOR at import time.

      // Verify that our output uses chalk by checking for the chalk-colored label
      const logs = captureLogs(() => {
        displayAgentActivity('SM', 'Testing chalk usage');
      });

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain('[SM]');
      expect(logs[0]).toContain('Testing chalk usage');

      // Verify that chalk is being used - the output contains the chalk-colored string
      // When chalk is used, it returns a string that may include ANSI codes
      // (unless NO_COLOR is set at import time, in which case chalk returns plain text)
      expect(logs[0]).toContain(chalk.cyan('[SM]    '));
    });

    test('label padding should align consistently at 8 chars (non-verbose)', () => {
      const allLogs: string[] = [];

      // Capture all agent outputs
      const agents = ['SM', 'Story', 'Dev', 'Review'];
      agents.forEach((agent) => {
        const logs = captureLogs(() => {
          displayAgentActivity(agent, 'Activity');
        });
        allLogs.push(logs[0]);
      });

      // Strip ANSI codes to check actual text alignment
      // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape codes requires matching control characters
      const stripAnsi = (str: string): string => str.replace(/\u001b\[\d+m/g, '');

      allLogs.forEach((log) => {
        const plain = stripAnsi(log);
        // Label should be exactly 8 chars including brackets, followed by space, then activity
        // Format: [Label  ] Activity... (8 chars + 1 space + activity)
        const labelPart = plain.substring(0, 8);
        expect(labelPart).toMatch(/^\[.+/); // Starts with bracket
        expect(labelPart.length).toBe(8);
        expect(plain.charAt(8)).toBe(' '); // 9th char should be space separator
      });

      // EXPLICIT ASSERTION: Verify expected label widths for each agent
      // This catches accidental padding changes
      const plainLogs = allLogs.map((log) =>
        // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape codes requires matching control characters
        log.replace(/\u001b\[\d+m/g, '')
      );

      // Each label part (first 8 chars) should match expected padding
      expect(plainLogs[0].substring(0, 8)).toBe('[SM]    '); // 4 trailing spaces
      expect(plainLogs[1].substring(0, 8)).toBe('[Story] '); // 1 trailing space
      expect(plainLogs[2].substring(0, 8)).toBe('[Dev]   '); // 3 trailing spaces
      expect(plainLogs[3].substring(0, 8)).toBe('[Review]'); // 0 trailing spaces
    });

    test('should handle empty activity string gracefully', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('SM', '');
      });

      expect(logs.length).toBe(1);
      // Empty activity should still produce label with ellipsis
      expect(logs[0]).toContain('[SM]');
      expect(logs[0]).toContain('...'); // Ellipsis still added even with empty activity
      // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escape codes requires matching control characters
      const plain = logs[0].replace(/\u001b\[\d+m/g, '');
      expect(plain).toBe('[SM]     ...'); // 8-char label + space + ellipsis
    });
  });
});
