import inquirer from 'inquirer';
import type { Epic } from '../types.js';

export async function selectEpic(epics: Epic[]): Promise<Epic | null> {
  if (epics.length === 0) {
    return null;
  }

  const { selectedEpic } = await inquirer.prompt<{ selectedEpic: string }>([
    {
      type: 'list',
      name: 'selectedEpic',
      message: 'Select an epic to implement:',
      choices: epics.map((epic) => ({
        name: `${epic.id}: ${epic.title} (${epic.stories.length} stories)`,
        value: epic.id,
      })),
    },
  ]);

  return epics.find((e) => e.id === selectedEpic) || null;
}

export async function confirmResume(storyId: string, storyIndex: number): Promise<boolean> {
  const { resume } = await inquirer.prompt<{ resume: boolean }>([
    {
      type: 'confirm',
      name: 'resume',
      message: `Resume from story ${storyId} (story #${storyIndex + 1})?`,
      default: true,
    },
  ]);

  return resume;
}

export type MaxIterationsAction = 'continue' | 'complete' | 'skip' | 'abort';

export async function handleMaxIterations(
  storyId: string,
  iterations: number
): Promise<MaxIterationsAction> {
  const { action } = await inquirer.prompt<{ action: MaxIterationsAction }>([
    {
      type: 'list',
      name: 'action',
      message: `Story ${storyId} has gone through ${iterations} dev-review cycles without completion. What would you like to do?`,
      choices: [
        { name: 'Continue (reset iteration counter)', value: 'continue' },
        { name: 'Mark as complete (run final dev pass, then commit)', value: 'complete' },
        { name: 'Skip story (mark as blocked)', value: 'skip' },
        { name: 'Abort (exit script)', value: 'abort' },
      ],
    },
  ]);

  return action;
}

export async function confirmAction(message: string, defaultValue = true): Promise<boolean> {
  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue,
    },
  ]);

  return confirmed;
}

export async function promptForInput(message: string): Promise<string> {
  const { input } = await inquirer.prompt<{ input: string }>([
    {
      type: 'input',
      name: 'input',
      message,
    },
  ]);

  return input;
}

export async function confirmContinueNextEpic(nextEpicId: string): Promise<boolean> {
  const { continueNext } = await inquirer.prompt<{ continueNext: boolean }>([
    {
      type: 'confirm',
      name: 'continueNext',
      message: `Epic complete! Continue with next epic (${nextEpicId})?`,
      default: true,
    },
  ]);
  return continueNext;
}

export type MaxIterationsPromptAction = 'skip' | 'retry' | 'abort';

/**
 * Prompt user for action when max dev/review iterations reached (Story 5-5)
 *
 * Displays the standard prompt format:
 * [S] Skip story  [R] Retry  [A] Abort
 *
 * @param storyId - Story ID for display
 * @param maxIterations - Maximum iterations that were reached
 * @returns Promise<'skip' | 'retry' | 'abort'> - User's chosen action
 * @throws {Error} If inquirer prompt fails unexpectedly
 * @exits Process exits with code 1 when user selects 'abort' (handled by caller)
 *
 * @example
 * ```typescript
 * const action = await promptMaxIterationsAction('5-5-loop', 3);
 * // User sees: [S] Skip story  [R] Retry  [A] Abort
 * // Returns: 'skip', 'retry', or 'abort'
 * ```
 *
 * @since 1.0.0
 */
export async function promptMaxIterationsAction(
  storyId: string,
  maxIterations: number
): Promise<MaxIterationsPromptAction> {
  const { action } = await inquirer.prompt<{ action: MaxIterationsPromptAction }>([
    {
      type: 'list',
      name: 'action',
      message: `Max iterations (${maxIterations}) reached for ${storyId}\n       Manual intervention required`,
      choices: [
        { name: '[S] Skip story', value: 'skip' },
        { name: '[R] Retry', value: 'retry' },
        { name: '[A] Abort', value: 'abort' },
      ],
    },
  ]);

  return action;
}
