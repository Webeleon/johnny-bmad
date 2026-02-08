import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { displayBanner } from './banner.js';

describe('banner.ts - ASCII Banner', () => {
  let consoleOutput: string[];
  let originalLog: typeof console.log;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Capture console.log output
    consoleOutput = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.map(String).join(' '));
    };

    // Preserve original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore console.log
    console.log = originalLog;

    // Restore environment
    process.env = originalEnv;
  });

  describe('displayBanner()', () => {
    test('should display JOHNNY BMAD ASCII art', () => {
      displayBanner();

      const output = consoleOutput.join('\n');

      // The banner uses Unicode box-drawing and block characters, not literal text
      // Check for the Unicode block character (█) and box-drawing chars
      expect(output).toMatch(/██/); // Contains Unicode blocks
      expect(output).toMatch(/[╔╗╚╝║═]/); // Contains box-drawing characters
    });

    test('should include Go Johnny Go! tagline', () => {
      displayBanner();

      const output = consoleOutput.join('\n');
      expect(output).toContain('Go Johnny Go!');
    });

    // NOTE: NO_COLOR support is handled automatically by chalk v5 at module initialization.
    // Testing NO_COLOR requires process-level spawn (integration test), not unit test.
    // Setting process.env.NO_COLOR after chalk import has no effect.
    // See: ARCH-8 in architecture docs, chalk v5.4.1 respects NO_COLOR by design.

    test('should use ASCII fallback when JOHNNY_BMAD_ASCII is set', () => {
      // Signal ASCII-only mode
      process.env.JOHNNY_BMAD_ASCII = '1';

      displayBanner();

      const output = consoleOutput.join('\n');

      // Should contain the tagline
      expect(output).toContain('Go Johnny Go!');

      // Should contain ASCII characters like # and =
      expect(output).toMatch(/[#=]/);

      // Should NOT contain Unicode box-drawing characters
      expect(output).not.toMatch(/[╔╗╚╝║═╦╩╠╣╬]/);
      expect(output).not.toMatch(/█/);
      expect(output).not.toMatch(/🎸/); // No guitar emoji in ASCII version
    });

    test('should use ASCII fallback when TERM=dumb', () => {
      // Signal limited terminal capability
      process.env.TERM = 'dumb';

      displayBanner();

      const output = consoleOutput.join('\n');

      // Should contain the tagline
      expect(output).toContain('Go Johnny Go!');

      // Should contain ASCII characters
      expect(output).toMatch(/[#=]/);

      // Should NOT contain Unicode box-drawing characters
      expect(output).not.toMatch(/[╔╗╚╝║═╦╩╠╣╬]/);
      expect(output).not.toMatch(/█/);
      expect(output).not.toMatch(/🎸/);
    });
  });
});
