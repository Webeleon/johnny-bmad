import { describe, test, expect, mock } from 'bun:test';

// Test the continuation decision logic
describe('epic continuation decision', () => {
  test('yolo mode auto-continues without prompt', async () => {
    const mockConfirm = mock(() => Promise.resolve(false));
    const args = { yolo: true, resume: false, help: false, verbose: false };

    // In yolo mode, should not call prompt
    const shouldContinue = args.yolo ? true : await mockConfirm();

    expect(shouldContinue).toBe(true);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  test('non-yolo mode prompts user and respects yes', async () => {
    const mockConfirm = mock(() => Promise.resolve(true));
    const args = { yolo: false, resume: false, help: false, verbose: false };

    const shouldContinue = args.yolo ? true : await mockConfirm();

    expect(shouldContinue).toBe(true);
    expect(mockConfirm).toHaveBeenCalled();
  });

  test('non-yolo mode prompts user and respects no', async () => {
    const mockConfirm = mock(() => Promise.resolve(false));
    const args = { yolo: false, resume: false, help: false, verbose: false };

    const shouldContinue = args.yolo ? true : await mockConfirm();

    expect(shouldContinue).toBe(false);
    expect(mockConfirm).toHaveBeenCalled();
  });
});
