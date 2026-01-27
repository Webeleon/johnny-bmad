import { spawnClaude } from '../claude/cli.js';
import { getCreateStoryPrompt } from '../claude/prompts.js';
import { info, subHeader, infoWithTiming } from '../utils/logger.js';
import type { EpicStory } from '../types.js';

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
    agentRole: 'Story Creator'
  });

  infoWithTiming('Story creation completed', durationMs);
}
