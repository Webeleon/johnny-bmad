import { describe, test, expect } from 'bun:test';
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

    test('should output [SM] with cyan color and 8-char padding', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('SM', 'Checking sprint status');
      });

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain('[SM]');
      expect(logs[0]).toContain('Checking sprint status');
      // Check that it uses cyan (chalk adds ANSI codes)
      expect(logs[0]).toContain(chalk.cyan('[SM]     ')); // 5 trailing spaces
    });

    test('should output [Story] with blue color and 8-char padding', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('Story', 'Creating user story');
      });

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain('[Story]');
      expect(logs[0]).toContain('Creating user story');
      expect(logs[0]).toContain(chalk.blue('[Story]  ')); // 2 trailing spaces
    });

    test('should output [Dev] with green color and 8-char padding', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('Dev', 'Implementing feature');
      });

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain('[Dev]');
      expect(logs[0]).toContain('Implementing feature');
      expect(logs[0]).toContain(chalk.green('[Dev]    ')); // 4 trailing spaces
    });

    test('should output [Review] with magenta color and 8-char padding', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('Review', 'Reviewing code');
      });

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain('[Review]');
      expect(logs[0]).toContain('Reviewing code');
      expect(logs[0]).toContain(chalk.magenta('[Review] ')); // 1 trailing space
    });

    test('should handle unknown agent with white color and padded to 8 chars', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('Unknown', 'Doing something');
      });

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain('[Unknown');
      expect(logs[0]).toContain('Doing something');
      // Unknown should use white/default color
      expect(logs[0]).toContain(chalk.white('[Unknown]')); // 1 trailing space to reach 8 chars
    });

    test('should include activity string in output', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('SM', 'Running tests and validations');
      });

      expect(logs[0]).toContain('Running tests and validations');
    });

    test('should include activity with ellipsis suffix', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('Dev', 'Writing code');
      });

      expect(logs[0]).toContain('Writing code...');
    });

    test('verbose mode should include timestamp in label', () => {
      const logs = captureLogs(() => {
        displayAgentActivity('SM', 'Checking sprint status', true);
      });

      expect(logs.length).toBe(1);
      // Should have format [SM HH:MM:SS]
      expect(logs[0]).toMatch(/\[SM \d{2}:\d{2}:\d{2}\]/);
      expect(logs[0]).toContain('Checking sprint status');
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
      const stripAnsi = (str: string): string => str.replace(/\u001b\[\d+m/g, '');

      allLogs.forEach((log) => {
        const plain = stripAnsi(log);
        // Label should be exactly 8 chars including brackets, followed by space, then activity
        // Format: [Label  ] Activity...
        const labelMatch = plain.match(/^\[.{1,7}\]\s+Activity/);
        expect(labelMatch).toBeTruthy();
      });
    });
  });
});
