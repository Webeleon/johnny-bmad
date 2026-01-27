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
      choices: epics.map(epic => ({
        name: `${epic.id}: ${epic.title} (${epic.stories.length} stories)`,
        value: epic.id
      }))
    }
  ]);

  return epics.find(e => e.id === selectedEpic) || null;
}

export async function confirmResume(storyId: string, storyIndex: number): Promise<boolean> {
  const { resume } = await inquirer.prompt<{ resume: boolean }>([
    {
      type: 'confirm',
      name: 'resume',
      message: `Resume from story ${storyId} (story #${storyIndex + 1})?`,
      default: true
    }
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
        { name: 'Abort (exit script)', value: 'abort' }
      ]
    }
  ]);

  return action;
}

export async function confirmAction(message: string, defaultValue = true): Promise<boolean> {
  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultValue
    }
  ]);

  return confirmed;
}

export async function promptForInput(message: string): Promise<string> {
  const { input } = await inquirer.prompt<{ input: string }>([
    {
      type: 'input',
      name: 'input',
      message
    }
  ]);

  return input;
}
