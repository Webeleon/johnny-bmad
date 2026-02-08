import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { displayPhaseHeader } from './phase-header.js';

describe('phase-header.ts - Phase Header', () => {
  let consoleOutput: string[];
  let originalLog: typeof console.log;
  let originalTerm: string | undefined;
  let originalAscii: string | undefined;

  beforeEach(() => {
    consoleOutput = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.map(String).join(' '));
    };
    originalTerm = process.env.TERM;
    originalAscii = process.env.JOHNNY_BMAD_ASCII;
  });

  afterEach(() => {
    console.log = originalLog;
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

  describe('displayPhaseHeader()', () => {
    test('should display phase header with Unicode separators', () => {
      displayPhaseHeader('Story Creation');
      const output = consoleOutput.join('\n');
      expect(output).toContain('━━━');
      expect(output).toContain('Phase: Story Creation');
    });

    test('should include the phase name passed as argument', () => {
      displayPhaseHeader('Review');
      const output = consoleOutput.join('\n');
      expect(output).toContain('Review');
    });

    test('should include "Phase:" label text', () => {
      displayPhaseHeader('Implementation');
      const output = consoleOutput.join('\n');
      expect(output).toContain('Phase:');
    });

    test('should use Unicode separator ━ by default', () => {
      displayPhaseHeader('Story Creation');
      const output = consoleOutput.join('\n');
      expect(output).toContain('━');
    });

    test('should use ASCII fallback = when TERM=dumb', () => {
      process.env.TERM = 'dumb';
      displayPhaseHeader('Story Creation');
      const output = consoleOutput.join('\n');
      expect(output).toContain('===');
      expect(output).not.toContain('━');
    });

    test('should use ASCII fallback = when JOHNNY_BMAD_ASCII=1', () => {
      process.env.JOHNNY_BMAD_ASCII = '1';
      displayPhaseHeader('Story Creation');
      const output = consoleOutput.join('\n');
      expect(output).toContain('===');
      expect(output).not.toContain('━');
    });

    test('should support "Story Creation" phase', () => {
      displayPhaseHeader('Story Creation');
      const output = consoleOutput.join('\n');
      expect(output).toContain('Story Creation');
    });

    test('should support "Review" phase', () => {
      displayPhaseHeader('Review');
      const output = consoleOutput.join('\n');
      expect(output).toContain('Review');
    });

    test('should support "Implementation" phase', () => {
      displayPhaseHeader('Implementation');
      const output = consoleOutput.join('\n');
      expect(output).toContain('Implementation');
    });

    test('should display a blank line before the header', () => {
      displayPhaseHeader('Story Creation');
      // First element should be empty string (blank line)
      expect(consoleOutput[0]).toBe('');
      // Second element should contain the header
      expect(consoleOutput[1]).toContain('Phase:');
    });
  });
});
