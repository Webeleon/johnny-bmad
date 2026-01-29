import { describe, test, expect, mock, afterEach } from 'bun:test';
import inquirer from 'inquirer';

describe('confirmContinueNextEpic', () => {
  const originalPrompt = inquirer.prompt;

  afterEach(() => {
    inquirer.prompt = originalPrompt;
  });

  test('returns true when user confirms continuation', async () => {
    inquirer.prompt = mock(() => Promise.resolve({ continueNext: true }));

    const { confirmContinueNextEpic } = await import('./user-input.js');
    const result = await confirmContinueNextEpic('epic-2');

    expect(result).toBe(true);
    expect(inquirer.prompt).toHaveBeenCalled();
  });

  test('returns false when user declines continuation', async () => {
    inquirer.prompt = mock(() => Promise.resolve({ continueNext: false }));

    const { confirmContinueNextEpic } = await import('./user-input.js');
    const result = await confirmContinueNextEpic('epic-2');

    expect(result).toBe(false);
  });

  test('includes epic ID in prompt message', async () => {
    let capturedConfig: any;
    inquirer.prompt = mock((config: any) => {
      capturedConfig = config;
      return Promise.resolve({ continueNext: true });
    });

    const { confirmContinueNextEpic } = await import('./user-input.js');
    await confirmContinueNextEpic('epic-42');

    expect(capturedConfig[0].message).toContain('epic-42');
  });
});
