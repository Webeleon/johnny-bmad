import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { isUnicodeSupported } from './unicode-support.js';

describe('unicode-support.ts - Unicode Terminal Detection', () => {
  let originalTerm: string | undefined;
  let originalAscii: string | undefined;

  beforeEach(() => {
    originalTerm = process.env.TERM;
    originalAscii = process.env.JOHNNY_BMAD_ASCII;
  });

  afterEach(() => {
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

  describe('isUnicodeSupported()', () => {
    test('should return true when Unicode is supported', () => {
      process.env.TERM = 'xterm-256color';
      delete process.env.JOHNNY_BMAD_ASCII;
      expect(isUnicodeSupported()).toBe(true);
    });

    test('should return false when TERM=dumb', () => {
      process.env.TERM = 'dumb';
      delete process.env.JOHNNY_BMAD_ASCII;
      expect(isUnicodeSupported()).toBe(false);
    });

    test('should return false when JOHNNY_BMAD_ASCII=1', () => {
      process.env.TERM = 'xterm-256color';
      process.env.JOHNNY_BMAD_ASCII = '1';
      expect(isUnicodeSupported()).toBe(false);
    });

    test('should return false when both TERM=dumb and JOHNNY_BMAD_ASCII=1', () => {
      process.env.TERM = 'dumb';
      process.env.JOHNNY_BMAD_ASCII = '1';
      expect(isUnicodeSupported()).toBe(false);
    });
  });
});
