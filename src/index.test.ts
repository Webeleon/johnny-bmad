import { describe, test, expect } from 'bun:test';
import { formatErrorWithRecovery } from './index.js';
import { StatePermissionError, MigrationSaveError } from './config.js';

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
  });
});
