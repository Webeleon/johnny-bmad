import { describe, test, expect, spyOn } from 'bun:test';
import { formatErrorWithRecovery, parseArgs, showHelp, main, validateFlags } from './index.js';
import { StatePermissionError, MigrationSaveError, CorruptStateError } from './config.js';

describe('index.ts - Error Handling', () => {
  describe('formatErrorWithRecovery()', () => {
    test('should format ENOSPC error with disk-full recovery guidance', () => {
      const enospcError = new Error('ENOSPC: no space left on device') as NodeJS.ErrnoException;
      enospcError.code = 'ENOSPC';

      const result = formatErrorWithRecovery(enospcError);

      expect(result.message).toBe('[ERROR] Operation failed: disk is full');
      expect(result.recovery).toBe('        Try: Free up disk space and run johnny-bmad again');
    });

    test('should format EACCES error with permission-denied recovery guidance', () => {
      const eaccesError = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
      eaccesError.code = 'EACCES';

      const result = formatErrorWithRecovery(eaccesError);

      expect(result.message).toBe('[ERROR] Operation failed: permission denied');
      expect(result.recovery).toBe('        Try: Check file permissions or run with appropriate access rights');
    });

    test('should format generic filesystem error with generic recovery guidance', () => {
      const genericFsError = new Error('EIO: input/output error') as NodeJS.ErrnoException;
      genericFsError.code = 'EIO';

      const result = formatErrorWithRecovery(genericFsError);

      expect(result.message).toBe('[ERROR] Fatal error: EIO: input/output error');
      expect(result.recovery).toBe('        Try: Run johnny-bmad again to resume from saved state');
    });

    test('should format generic Error with generic recovery guidance', () => {
      const genericError = new Error('Something went wrong');

      const result = formatErrorWithRecovery(genericError);

      expect(result.message).toBe('[ERROR] Fatal error: Something went wrong');
      expect(result.recovery).toBe('        Try: Run johnny-bmad again to resume from saved state');
    });

    test('should format StatePermissionError with built-in recovery guidance', () => {
      const error = new StatePermissionError(
        'Permission denied reading state file at /path/to/state.json',
        'Try: chmod 644 .johnny-bmad-state.json'
      );

      const result = formatErrorWithRecovery(error);

      expect(result.message).toBe('[ERROR] Permission denied reading state file at /path/to/state.json');
      expect(result.recovery).toBe('        Try: chmod 644 .johnny-bmad-state.json');
    });

    test('should format MigrationSaveError with built-in recovery guidance', () => {
      const error = new MigrationSaveError(
        'Migration completed but failed to save new state file',
        'Try: Fix disk/permissions and restart to retry migration'
      );

      const result = formatErrorWithRecovery(error);

      expect(result.message).toBe('[ERROR] Migration completed but failed to save new state file');
      expect(result.recovery).toBe('        Try: Fix disk/permissions and restart to retry migration');
    });

    test('should format non-Error thrown values as strings', () => {
      const thrownString = 'Something bad happened';

      const result = formatErrorWithRecovery(thrownString);

      expect(result.message).toBe('[ERROR] Fatal error: Something bad happened');
      expect(result.recovery).toBe('        Try: Run johnny-bmad again to resume from saved state');
    });

    test('should NOT treat custom errors with numeric .code property as filesystem errors', () => {
      // Custom error with numeric code (not NodeJS.ErrnoException)
      // Cast to 'any' required to construct invalid error shape for type guard edge case testing
      // (project-context.md allows 'any' when documented)
      const customError = new Error('API request failed') as any;
      customError.code = 500; // HTTP status code (number, not string)

      const result = formatErrorWithRecovery(customError);

      // Should use generic error handling, NOT filesystem-specific handling
      expect(result.message).toBe('[ERROR] Fatal error: API request failed');
      expect(result.recovery).toBe('        Try: Run johnny-bmad again to resume from saved state');
      // Should NOT have disk-full or permission messages
      expect(result.message).not.toContain('disk is full');
      expect(result.message).not.toContain('permission denied');
    });

    test('should format CorruptStateError (though main() should catch it before formatErrorWithRecovery)', () => {
      // NOTE: In practice, main() catches CorruptStateError before calling formatErrorWithRecovery()
      // This test documents what WOULD happen if formatErrorWithRecovery() received it incorrectly
      const error = new CorruptStateError('Corrupt state file - user chose to fix manually');

      const result = formatErrorWithRecovery(error);

      // Should get generic error formatting (since CorruptStateError doesn't have recovery property)
      expect(result.message).toBe('[ERROR] Fatal error: Corrupt state file - user chose to fix manually');
      expect(result.recovery).toBe('        Try: Run johnny-bmad again to resume from saved state');
    });
  });
});

describe('index.ts - Argument Parsing', () => {
  describe('parseArgs()', () => {
    test('should parse --batch flag', () => {
      const args = parseArgs(['--batch']);
      expect(args.batch).toBe(true);
    });

    test('should parse -b short flag', () => {
      const args = parseArgs(['-b']);
      expect(args.batch).toBe(true);
    });

    test('should parse --dev-only flag', () => {
      const args = parseArgs(['--dev-only']);
      expect(args.devOnly).toBe(true);
    });

    test('should parse -d short flag', () => {
      const args = parseArgs(['-d']);
      expect(args.devOnly).toBe(true);
    });

    test('should default all boolean flags to false with no args', () => {
      const args = parseArgs([]);
      expect(args.resume).toBe(false);
      expect(args.help).toBe(false);
      expect(args.verbose).toBe(false);
      expect(args.yolo).toBe(false);
      expect(args.batch).toBe(false);
      expect(args.devOnly).toBe(false);
      expect(args.maxIterations).toBeUndefined();
    });

    test('should parse --batch with other flags', () => {
      const args = parseArgs(['--batch', '--yolo', '--verbose']);
      expect(args.batch).toBe(true);
      expect(args.yolo).toBe(true);
      expect(args.verbose).toBe(true);
    });

    test('should parse --dev-only with other flags', () => {
      const args = parseArgs(['--dev-only', '-v', '-y']);
      expect(args.devOnly).toBe(true);
      expect(args.verbose).toBe(true);
      expect(args.yolo).toBe(true);
    });

    test('should preserve existing flag parsing', () => {
      const args = parseArgs(['--resume', '--help', '--verbose', '--yolo']);
      expect(args.resume).toBe(true);
      expect(args.help).toBe(true);
      expect(args.verbose).toBe(true);
      expect(args.yolo).toBe(true);
    });

    test('should ignore unknown flags and not corrupt state', () => {
      const args = parseArgs(['--unknown', '--batch']);
      expect(args.batch).toBe(true);
      expect(args.devOnly).toBe(false);
      expect(args.resume).toBe(false);
      expect(args.help).toBe(false);
      expect(args.verbose).toBe(false);
      expect(args.yolo).toBe(false);
      expect(args.maxIterations).toBeUndefined();
      // unknown flags silently ignored (no error thrown, no state corruption)
    });

    test('should parse --batch and --dev-only together', () => {
      const args = parseArgs(['--batch', '--dev-only']);
      expect(args.batch).toBe(true);
      expect(args.devOnly).toBe(true);
    });

    test('should parse --max-iterations with value', () => {
      const args = parseArgs(['--max-iterations', '5']);
      expect(args.maxIterations).toBe(5);
    });

    test('should parse -m short flag with value', () => {
      const args = parseArgs(['-m', '3']);
      expect(args.maxIterations).toBe(3);
    });

    test('should ignore --max-iterations without valid value', () => {
      const args = parseArgs(['--max-iterations']);
      expect(args.maxIterations).toBeUndefined();
    });

    test('should ignore --max-iterations with non-numeric value', () => {
      const args = parseArgs(['--max-iterations', 'abc']);
      expect(args.maxIterations).toBeUndefined();
    });

    test('should ignore --max-iterations when next arg starts with dash', () => {
      const args = parseArgs(['--max-iterations', '-5']);
      expect(args.maxIterations).toBeUndefined();
    });

    test('should ignore --max-iterations with zero value', () => {
      const args = parseArgs(['--max-iterations', '0']);
      expect(args.maxIterations).toBeUndefined();
    });

    test('should parse --max-iterations combined with --batch', () => {
      const args = parseArgs(['--max-iterations', '3', '--batch']);
      expect(args.maxIterations).toBe(3);
      expect(args.batch).toBe(true);
    });

    test('should parse --max-iterations combined with --dev-only', () => {
      const args = parseArgs(['--max-iterations', '5', '--dev-only']);
      expect(args.maxIterations).toBe(5);
      expect(args.devOnly).toBe(true);
    });

    test('should parse --batch with --dev-only and --max-iterations', () => {
      const args = parseArgs(['--batch', '-m', '7', '--dev-only']);
      expect(args.batch).toBe(true);
      expect(args.maxIterations).toBe(7);
      expect(args.devOnly).toBe(true);
    });

    test('should handle value-consuming flag order interleaving deterministically', () => {
      // Test that argument order doesn't affect parsing result
      const args1 = parseArgs(['--batch', '-m', '5', '--dev-only']);
      const args2 = parseArgs(['-m', '5', '--batch', '--dev-only']);
      const args3 = parseArgs(['--dev-only', '--batch', '-m', '5']);

      // All should produce identical results
      expect(args1.batch).toBe(true);
      expect(args1.maxIterations).toBe(5);
      expect(args1.devOnly).toBe(true);

      expect(args2.batch).toBe(true);
      expect(args2.maxIterations).toBe(5);
      expect(args2.devOnly).toBe(true);

      expect(args3.batch).toBe(true);
      expect(args3.maxIterations).toBe(5);
      expect(args3.devOnly).toBe(true);
    });
  });

  describe('showHelp()', () => {
    test('should display help text with --batch flag documentation', () => {
      const consoleSpy = spyOn(console, 'log');
      try {
        showHelp();

        const helpOutput = consoleSpy.mock.calls.map(call => call[0]).join('\n');

        // Verify --batch flag is documented
        expect(helpOutput).toContain('--batch');
        expect(helpOutput).toContain('-b');
        expect(helpOutput).toContain('Create all stories first, review each one, then exit');
      } finally {
        consoleSpy.mockRestore();
      }
    });

    test('should display help text with --dev-only flag documentation', () => {
      const consoleSpy = spyOn(console, 'log');
      try {
        showHelp();

        const helpOutput = consoleSpy.mock.calls.map(call => call[0]).join('\n');

        // Verify --dev-only flag is documented
        expect(helpOutput).toContain('--dev-only');
        expect(helpOutput).toContain('-d');
        expect(helpOutput).toContain('Skip story creation, implement existing stories only');
      } finally {
        consoleSpy.mockRestore();
      }
    });

    test('should include usage examples for --batch and --dev-only flags', () => {
      const consoleSpy = spyOn(console, 'log');
      try {
        showHelp();

        const helpOutput = consoleSpy.mock.calls.map(call => call[0]).join('\n');

        // Verify examples section includes new flags
        expect(helpOutput).toContain('npx johnny-bmad --batch');
        expect(helpOutput).toContain('npx johnny-bmad --dev-only');
      } finally {
        consoleSpy.mockRestore();
      }
    });

    test('should include --batch --yolo example in help text', () => {
      const consoleSpy = spyOn(console, 'log');
      try {
        showHelp();

        const helpOutput = consoleSpy.mock.calls.map(call => call[0]).join('\n');

        // Verify --batch --yolo example is included
        expect(helpOutput).toContain('npx johnny-bmad --batch --yolo');
        expect(helpOutput).toContain('Create stories without review prompts');
      } finally {
        consoleSpy.mockRestore();
      }
    });

    test('should include documentation link in help text', () => {
      const consoleSpy = spyOn(console, 'log');
      try {
        showHelp();

        const helpOutput = consoleSpy.mock.calls.map(call => call[0]).join('\n');

        // Verify documentation link is included
        expect(helpOutput).toContain('Documentation: https://github.com/webeleon/johnny-bmad');
      } finally {
        consoleSpy.mockRestore();
      }
    });

    test('should include "Start sequential workflow (default)" in examples', () => {
      const consoleSpy = spyOn(console, 'log');
      try {
        showHelp();

        const helpOutput = consoleSpy.mock.calls.map(call => call[0]).join('\n');

        // Verify default workflow example comment
        expect(helpOutput).toContain('Start sequential workflow (default)');
      } finally {
        consoleSpy.mockRestore();
      }
    });

    test('should preserve existing flag descriptions', () => {
      const consoleSpy = spyOn(console, 'log');
      try {
        showHelp();

        const helpOutput = consoleSpy.mock.calls.map(call => call[0]).join('\n');

        // Verify existing flags are preserved
        expect(helpOutput).toContain('--resume');
        expect(helpOutput).toContain('Auto-resume from saved state without prompting');
        expect(helpOutput).toContain('--verbose');
        expect(helpOutput).toContain('Enable verbose/debug output');
        expect(helpOutput).toContain('--yolo');
        expect(helpOutput).toContain('Auto-complete stories when max iterations reached');
        expect(helpOutput).toContain('--max-iterations');
        expect(helpOutput).toContain('Max dev-review cycles per story');
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe('validateFlags()', () => {
    test('should exit with error when --batch and --dev-only used together', () => {
      const errorSpy = spyOn(console, 'error');
      const exitSpy = spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit called');
      }) as any);

      try {
        expect(() => validateFlags({ resume: false, help: false, verbose: false, yolo: false, batch: true, devOnly: true }))
          .toThrow('process.exit called');

        expect(exitSpy).toHaveBeenCalledWith(1);

        // Verify error message
        const errorCalls = errorSpy.mock.calls.flat().join('\n');
        expect(errorCalls).toContain('[ERROR] Cannot use --batch and --dev-only together');
        expect(errorCalls).toContain('Try: Use --batch to create stories, then --dev-only to implement');
      } finally {
        errorSpy.mockRestore();
        exitSpy.mockRestore();
      }
    });

    test('should exit with error when -b and -d short flags used together (integration)', () => {
      const errorSpy = spyOn(console, 'error');
      const exitSpy = spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit called');
      }) as any);

      try {
        const args = parseArgs(['-b', '-d']);
        expect(() => validateFlags(args)).toThrow('process.exit called');

        expect(exitSpy).toHaveBeenCalledWith(1);

        const errorCalls = errorSpy.mock.calls.flat().join('\n');
        expect(errorCalls).toContain('[ERROR] Cannot use --batch and --dev-only together');
      } finally {
        errorSpy.mockRestore();
        exitSpy.mockRestore();
      }
    });

    test('should not exit when only --batch is set', () => {
      const exitSpy = spyOn(process, 'exit').mockImplementation((() => {}) as any);
      try {
        validateFlags({ resume: false, help: false, verbose: false, yolo: false, batch: true, devOnly: false });
        expect(exitSpy).not.toHaveBeenCalled();
      } finally {
        exitSpy.mockRestore();
      }
    });

    test('should not exit when only --dev-only is set', () => {
      const exitSpy = spyOn(process, 'exit').mockImplementation((() => {}) as any);
      try {
        validateFlags({ resume: false, help: false, verbose: false, yolo: false, batch: false, devOnly: true });
        expect(exitSpy).not.toHaveBeenCalled();
      } finally {
        exitSpy.mockRestore();
      }
    });

    test('should not exit when --batch and --yolo are used together', () => {
      const exitSpy = spyOn(process, 'exit').mockImplementation((() => {}) as any);
      try {
        validateFlags({ resume: false, help: false, verbose: false, yolo: true, batch: true, devOnly: false });
        expect(exitSpy).not.toHaveBeenCalled();
      } finally {
        exitSpy.mockRestore();
      }
    });

    test('should not exit when --dev-only and --yolo are used together', () => {
      const exitSpy = spyOn(process, 'exit').mockImplementation((() => {}) as any);
      try {
        validateFlags({ resume: false, help: false, verbose: false, yolo: true, batch: false, devOnly: true });
        expect(exitSpy).not.toHaveBeenCalled();
      } finally {
        exitSpy.mockRestore();
      }
    });

    test('should not exit when no flags are set (default/sequential path)', () => {
      const exitSpy = spyOn(process, 'exit').mockImplementation((() => {}) as any);
      try {
        validateFlags({ resume: false, help: false, verbose: false, yolo: false, batch: false, devOnly: false });
        expect(exitSpy).not.toHaveBeenCalled();
      } finally {
        exitSpy.mockRestore();
      }
    });

    test('should exit with error when all flags --batch --dev-only --yolo used together', () => {
      const errorSpy = spyOn(console, 'error');
      const exitSpy = spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit called');
      }) as any);

      try {
        expect(() => {
          validateFlags({ resume: false, help: false, verbose: false, yolo: true, batch: true, devOnly: true });
        }).toThrow('process.exit called');

        // Mutual exclusion takes priority over yolo
        expect(exitSpy).toHaveBeenCalledWith(1);

        const errorCalls = errorSpy.mock.calls.flat().join('\n');
        expect(errorCalls).toContain('[ERROR] Cannot use --batch and --dev-only together');
      } finally {
        errorSpy.mockRestore();
        exitSpy.mockRestore();
      }
    });

    test('should match exact error message format from AC#1 with 8-space indentation', () => {
      const errorSpy = spyOn(console, 'error');
      const exitSpy = spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit called');
      }) as any);

      try {
        expect(() => {
          validateFlags({ resume: false, help: false, verbose: false, yolo: false, batch: true, devOnly: true });
        }).toThrow('process.exit called');

        // Verify exact message strings including whitespace formatting
        const errorCalls = errorSpy.mock.calls;
        expect(errorCalls.length).toBe(2);
        expect(errorCalls[0][0]).toBe('[ERROR] Cannot use --batch and --dev-only together');
        expect(errorCalls[1][0]).toBe('        Try: Use --batch to create stories, then --dev-only to implement');
      } finally {
        errorSpy.mockRestore();
        exitSpy.mockRestore();
      }
    });
  });

  describe('main() - Integration', () => {
    test('should display help and exit when --help flag is passed', async () => {
      const consoleSpy = spyOn(console, 'log');
      const exitSpy = spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit called');
      }) as any);
      const originalArgv = process.argv;

      try {
        // Set argv to simulate --help flag
        process.argv = ['node', 'index.js', '--help'];

        // main() should call showHelp() and then process.exit(0)
        await expect(main()).rejects.toThrow('process.exit called');

        // Verify showHelp() was called (console.log was invoked)
        expect(consoleSpy.mock.calls.length).toBeGreaterThan(0);
        const helpOutput = consoleSpy.mock.calls.map(call => call[0]).join('\n');
        expect(helpOutput).toContain('johnny-bmad');
        expect(helpOutput).toContain('Options:');

        // Verify process.exit(0) was called
        expect(exitSpy).toHaveBeenCalledWith(0);
      } finally {
        consoleSpy.mockRestore();
        exitSpy.mockRestore();
        process.argv = originalArgv;
      }
    });

    test('should exit with error when --batch and --dev-only flags are both passed', async () => {
      const errorSpy = spyOn(console, 'error');
      const exitSpy = spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit called');
      }) as any);
      const originalArgv = process.argv;

      try {
        // Set argv to simulate --batch --dev-only flags
        process.argv = ['node', 'index.js', '--batch', '--dev-only'];

        // main() should call validateFlags() which calls process.exit(1)
        await expect(main()).rejects.toThrow('process.exit called');

        // Verify error message was displayed
        const errorCalls = errorSpy.mock.calls.flat().join('\n');
        expect(errorCalls).toContain('[ERROR] Cannot use --batch and --dev-only together');
        expect(errorCalls).toContain('Try: Use --batch to create stories, then --dev-only to implement');

        // Verify process.exit(1) was called
        expect(exitSpy).toHaveBeenCalledWith(1);
      } finally {
        errorSpy.mockRestore();
        exitSpy.mockRestore();
        process.argv = originalArgv;
      }
    });

    test('should show error before help when --batch --dev-only --help flags are all passed', async () => {
      const errorSpy = spyOn(console, 'error');
      const logSpy = spyOn(console, 'log');
      const exitSpy = spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit called');
      }) as any);
      const originalArgv = process.argv;

      try {
        // Set argv to simulate --batch --dev-only --help flags
        process.argv = ['node', 'index.js', '--batch', '--dev-only', '--help'];

        // main() should call validateFlags() which calls process.exit(1) BEFORE help display
        await expect(main()).rejects.toThrow('process.exit called');

        // Verify error message was displayed (not help text)
        const errorCalls = errorSpy.mock.calls.flat().join('\n');
        expect(errorCalls).toContain('[ERROR] Cannot use --batch and --dev-only together');
        expect(errorCalls).toContain('Try: Use --batch to create stories, then --dev-only to implement');

        // Verify help text was NOT displayed (console.log should not have been called)
        expect(logSpy).not.toHaveBeenCalled();

        // Verify process.exit(1) was called (error exit, not help exit)
        expect(exitSpy).toHaveBeenCalledWith(1);
      } finally {
        errorSpy.mockRestore();
        logSpy.mockRestore();
        exitSpy.mockRestore();
        process.argv = originalArgv;
      }
    });
  });
});
