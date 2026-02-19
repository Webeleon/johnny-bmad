import { spawnClaude } from '../claude/cli.js';
import { getCreateStoryPrompt, getUpdateStoryPrompt } from '../claude/prompts.js';
import type { EpicStory } from '../types.js';
import { info, infoWithTiming, subHeader } from '../utils/logger.js';

/**
 * Create a new story using the Story Creator agent
 *
 * This function spawns the Story Creator agent (Claude Opus) to generate a comprehensive
 * story file with acceptance criteria, tasks, and developer notes based on the epic story.
 *
 * @param cwd - Current working directory
 * @param story - Epic story object containing story ID and title
 * @param epicId - Parent epic identifier for context
 * @returns Promise that resolves when the story creation is complete
 *
 * @internal
 */
export async function runStoryCreator(
  cwd: string,
  story: EpicStory,
  epicId: string
): Promise<void> {
  subHeader(`Creating Story: ${story.id}`);
  info(`Story: ${story.title}`);

  const { durationMs } = await spawnClaude({
    model: 'opus',
    prompt: getCreateStoryPrompt(story.id, story.title, epicId),
    cwd,
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep'],
    agentRole: 'Story Creator',
  });

  infoWithTiming('Story creation completed', durationMs);
}

/**
 * Update an existing story with user feedback
 *
 * This function re-invokes the Story Creator agent with feedback from the user,
 * allowing iterative refinement of stories during the review phase.
 *
 * @param cwd - Current working directory
 * @param storyId - Story identifier to update
 * @param storyFilePath - Path to the story file to update
 * @param feedback - User's change request feedback
 * @returns Promise that resolves when the story update is complete
 *
 * @internal
 */
export async function runStoryUpdater(
  cwd: string,
  storyId: string,
  storyFilePath: string,
  feedback: string
): Promise<void> {
  info(`[Story] Updating ${storyId}...`);
  info(`Change request: ${feedback}`);

  const { durationMs } = await spawnClaude({
    model: 'opus',
    prompt: getUpdateStoryPrompt(storyId, storyFilePath, feedback),
    cwd,
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep'],
    agentRole: 'Story Creator',
  });

  infoWithTiming('Story update completed', durationMs);
}
