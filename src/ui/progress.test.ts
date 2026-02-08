import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import chalk from 'chalk';
import { displayProgress } from './progress.js';

describe('progress.ts - Progress Bar', () => {
  let consoleOutput: string[];
  let originalLog: typeof console.log;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    consoleOutput = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.map(String).join(' '));
    };
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    console.log = originalLog;
    process.env = originalEnv;
  });

  describe('displayProgress()', () => {
    test('should display progress with Unicode bar at 50%', () => {
      displayProgress(4, 8, 'implementing');
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story 4/8');
      expect(output).toContain('████████░░░░░░░░');
      expect(output).toContain('implementing...');
    });

    test('should display progress at 0% with all empty bar', () => {
      displayProgress(0, 8, 'starting');
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story 0/8');
      expect(output).toContain('░░░░░░░░░░░░░░░░');
      expect(output).toContain('starting...');
    });

    test('should display progress at 100% with all filled bar', () => {
      displayProgress(8, 8, 'complete');
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story 8/8');
      expect(output).toContain('████████████████');
      expect(output).toContain('complete');
    });

    test('should include ... suffix when current < total', () => {
      displayProgress(3, 10, 'testing');
      const output = consoleOutput.join('\n');
      expect(output).toContain('testing...');
    });

    test('should NOT include ... suffix when current >= total', () => {
      displayProgress(8, 8, 'complete');
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story 8/8');
      expect(output).toContain('complete');
      expect(output).not.toContain('complete...');
    });

    test('should NOT include ... suffix even with non-complete status at 100%', () => {
      displayProgress(10, 10, 'finishing');
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story 10/10');
      expect(output).toContain('finishing');
      expect(output).not.toContain('finishing...');
    });

    test('should include Story X/Y label format', () => {
      displayProgress(2, 5, 'building');
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story 2/5');
    });

    test('should use ASCII fallback with # and - when JOHNNY_BMAD_ASCII=1', () => {
      process.env.JOHNNY_BMAD_ASCII = '1';
      displayProgress(4, 8, 'implementing');
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story 4/8');
      expect(output).toContain('########--------');
      expect(output).toContain('implementing...');
    });

    test('should use ASCII fallback with # and - when TERM=dumb', () => {
      process.env.TERM = 'dumb';
      displayProgress(4, 8, 'implementing');
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story 4/8');
      expect(output).toContain('########--------');
      expect(output).toContain('implementing...');
    });

    test('should have exactly 16 characters in ASCII fallback bar at 50%', () => {
      process.env.JOHNNY_BMAD_ASCII = '1';
      displayProgress(4, 8, 'implementing');
      const output = consoleOutput.join('\n');
      // Extract the ASCII bar content between [ and ]
      const barMatch = output.match(/\[([#-]+)\]/);
      expect(barMatch).toBeTruthy();
      expect(barMatch?.[1].length).toBe(16);
      // Verify it's ASCII chars (8 filled # + 8 empty -)
      expect(barMatch?.[1]).toBe('########--------');
    });

    test('should have exactly 16 characters in ASCII bar for non-even division (3/7)', () => {
      process.env.JOHNNY_BMAD_ASCII = '1';
      displayProgress(3, 7, 'processing');
      const output = consoleOutput.join('\n');
      // Extract ASCII bar with regex matching # and -
      const barMatch = output.match(/\[([#-]+)\]/);
      expect(barMatch).toBeTruthy();
      expect(barMatch?.[1].length).toBe(16);
      // 3/7 = ~43% → Math.round(0.43 * 16) = 7 filled
      expect(barMatch?.[1]).toBe('#######---------');
    });

    test('should have exactly 16 characters in ASCII bar at 0%', () => {
      process.env.JOHNNY_BMAD_ASCII = '1';
      displayProgress(0, 8, 'starting');
      const output = consoleOutput.join('\n');
      const barMatch = output.match(/\[([#-]+)\]/);
      expect(barMatch).toBeTruthy();
      expect(barMatch?.[1].length).toBe(16);
      expect(barMatch?.[1]).toBe('----------------');
    });

    test('should have exactly 16 characters in ASCII bar at 100%', () => {
      process.env.JOHNNY_BMAD_ASCII = '1';
      displayProgress(8, 8, 'complete');
      const output = consoleOutput.join('\n');
      const barMatch = output.match(/\[([#-]+)\]/);
      expect(barMatch).toBeTruthy();
      expect(barMatch?.[1].length).toBe(16);
      expect(barMatch?.[1]).toBe('################');
    });

    test('should have bar width of exactly 16 characters', () => {
      displayProgress(4, 8, 'implementing');
      const output = consoleOutput.join('\n');
      // Extract the bar content between [ and ]
      const barMatch = output.match(/\[([█░]+)\]/);
      expect(barMatch).toBeTruthy();
      expect(barMatch?.[1].length).toBe(16);
    });

    test('should produce bar with exactly 16 characters for non-even division (3/7)', () => {
      displayProgress(3, 7, 'processing');
      const output = consoleOutput.join('\n');
      const barMatch = output.match(/\[([█░]+)\]/);
      expect(barMatch).toBeTruthy();
      expect(barMatch?.[1].length).toBe(16);
    });

    test('should not crash with total=0 edge case', () => {
      expect(() => displayProgress(0, 0, 'empty')).not.toThrow();
    });

    test('should display all empty bar characters when total=0', () => {
      displayProgress(0, 0, 'empty');
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story 0/0');
      expect(output).toContain('░░░░░░░░░░░░░░░░');
      // AC #3: Suffix based on current >= total check: 0 >= 0 is true, so no dots
      expect(output).not.toContain('empty...');
    });

    test('should not crash when current > total (clamped to max bar width)', () => {
      expect(() => displayProgress(10, 8, 'overflow')).not.toThrow();
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story 10/8');
      // Bar should be clamped to max width (all filled)
      const barMatch = output.match(/\[([█░]+)\]/);
      expect(barMatch).toBeTruthy();
      expect(barMatch?.[1].length).toBe(16);
      expect(barMatch?.[1]).toBe('████████████████');
    });

    test('should not crash with negative current value (clamped to 0)', () => {
      expect(() => displayProgress(-1, 8, 'negative')).not.toThrow();
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story -1/8');
      // Bar should be clamped to 0 filled (all empty)
      const barMatch = output.match(/\[([█░]+)\]/);
      expect(barMatch).toBeTruthy();
      expect(barMatch?.[1].length).toBe(16);
      expect(barMatch?.[1]).toBe('░░░░░░░░░░░░░░░░');
    });

    test('should handle negative total parameter gracefully', () => {
      expect(() => displayProgress(2, -5, 'broken')).not.toThrow();
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story 2/-5');
      // With negative total, produces empty bar (division guard: total > 0 check)
      const barMatch = output.match(/\[([█░]+)\]/);
      expect(barMatch).toBeTruthy();
      expect(barMatch?.[1].length).toBe(16);
      expect(barMatch?.[1]).toBe('░░░░░░░░░░░░░░░░');
      // Status with no dots since 2 >= -5 is true
      expect(output).not.toContain('broken...');
    });

    test('should apply cyan color styling via chalk.cyan()', () => {
      // Force chalk to use color level 3 (truecolor) by setting chalk instance level
      // This ensures ANSI codes are included in output even during testing
      const originalLevel = chalk.level;
      const tempLog = console.log;
      let rawArg: unknown;

      try {
        chalk.level = 3;

        // Capture raw console.log args to preserve ANSI codes
        console.log = (arg: unknown) => {
          rawArg = arg;
          tempLog(arg);
        };

        displayProgress(4, 8, 'implementing');

        // Convert to string (preserves ANSI codes when chalk.level=3)
        const rawString = String(rawArg);

        // Verify ANSI cyan escape code (\x1b[36m) is present in raw output
        // This proves chalk.cyan() wrapper is actually applied at progress.ts:22
        expect(rawString).toContain('\x1b[36m');

        // Also verify expected content
        expect(rawString).toContain('Story 4/8');
        expect(rawString).toContain('implementing...');
      } finally {
        // Always restore console.log and chalk.level even if test throws
        console.log = tempLog;
        chalk.level = originalLevel;
      }
    });

    test('should handle NaN current value without producing broken output', () => {
      expect(() => displayProgress(NaN, 8, 'test')).not.toThrow();
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story NaN/8');
      // Bar should fall back to all empty (16 chars) instead of broken 0-width bar
      const barMatch = output.match(/\[([█░#-]+)\]/);
      expect(barMatch).toBeTruthy();
      expect(barMatch?.[1].length).toBe(16);
      // With NaN input, should produce all empty bar
      expect(barMatch?.[1]).toBe('░░░░░░░░░░░░░░░░');
    });

    test('should handle NaN total parameter without crashing', () => {
      expect(() => displayProgress(4, NaN, 'test')).not.toThrow();
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story 4/NaN');
      // With NaN total: NaN > 0 is false, so bar renders empty
      const barMatch = output.match(/\[([█░#-]+)\]/);
      expect(barMatch).toBeTruthy();
      expect(barMatch?.[1].length).toBe(16);
      expect(barMatch?.[1]).toBe('░░░░░░░░░░░░░░░░');
      // 4 >= NaN is false, so ... suffix should be present
      expect(output).toContain('test...');
    });
  });
});
