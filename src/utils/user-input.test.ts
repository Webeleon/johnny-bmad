import { describe, test, expect, mock, afterEach } from 'bun:test';
import inquirer from 'inquirer';

describe('confirmContinueNextEpic', () => {
  const originalPrompt = inquirer.prompt;

  function makePromptMock<TArgs extends any[], TResult>(fn: (...args: TArgs) => Promise<TResult>): typeof inquirer.prompt {
    const m = mock(fn) as unknown as typeof inquirer.prompt;
    // inquirer@9 types expect PromptModule properties on the function.
    // Preserve them from the real prompt to keep strict typecheck happy.
    (m as any).prompts = (originalPrompt as any).prompts;
    (m as any).registerPrompt = (originalPrompt as any).registerPrompt;
    (m as any).restoreDefaultPrompts = (originalPrompt as any).restoreDefaultPrompts;
    return m;
  }

  afterEach(() => {
    inquirer.prompt = originalPrompt;
  });

  test('returns true when user confirms continuation', async () => {
    inquirer.prompt = makePromptMock(() => Promise.resolve({ continueNext: true }));

    const { confirmContinueNextEpic } = await import('./user-input.js');
    const result = await confirmContinueNextEpic('epic-2');

    expect(result).toBe(true);
    expect(inquirer.prompt).toHaveBeenCalled();
  });

  test('returns false when user declines continuation', async () => {
    inquirer.prompt = makePromptMock(() => Promise.resolve({ continueNext: false }));

    const { confirmContinueNextEpic } = await import('./user-input.js');
    const result = await confirmContinueNextEpic('epic-2');

    expect(result).toBe(false);
  });

  test('includes epic ID in prompt message', async () => {
    let capturedConfig: any;
    inquirer.prompt = makePromptMock((config: any) => {
      capturedConfig = config;
      return Promise.resolve({ continueNext: true });
    });

    const { confirmContinueNextEpic } = await import('./user-input.js');
    await confirmContinueNextEpic('epic-42');

    expect(capturedConfig[0].message).toContain('epic-42');
  });
});
