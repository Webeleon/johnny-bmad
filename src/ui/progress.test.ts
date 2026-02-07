import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
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

    test('should include ... suffix for non-complete statuses', () => {
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

    test('should have bar width of exactly 16 characters', () => {
      displayProgress(4, 8, 'implementing');
      const output = consoleOutput.join('\n');
      const barMatch = output.match(/\[([█░]+)\]/);
      expect(barMatch).toBeTruthy();
      if (barMatch) {
        expect(barMatch[1].length).toBe(16);
      }
    });

    test('should produce bar with exactly 16 characters for non-even division (3/7)', () => {
      displayProgress(3, 7, 'processing');
      const output = consoleOutput.join('\n');
      const barMatch = output.match(/\[([█░]+)\]/);
      expect(barMatch).toBeTruthy();
      if (barMatch) {
        expect(barMatch[1].length).toBe(16);
      }
    });

    test('should not crash with total=0 edge case', () => {
      expect(() => displayProgress(0, 0, 'empty')).not.toThrow();
    });

    test('should display all empty bar when total=0 (AC #9)', () => {
      displayProgress(0, 0, 'empty');
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story 0/0');
      expect(output).toContain('░░░░░░░░░░░░░░░░');
      // 0 >= 0 is true, so NO ... suffix per AC #3
      expect(output).toContain('empty');
      expect(output).not.toContain('empty...');
    });
  });
});
