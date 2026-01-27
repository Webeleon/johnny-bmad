import { spawnClaude } from '../claude/cli.js';
import { getDevStoryPrompt } from '../claude/prompts.js';
import { info, subHeader, infoWithTiming } from '../utils/logger.js';

export async function runDevAgent(
  cwd: string,
  storyId: string,
  storyFilePath: string
): Promise<void> {
  subHeader(`Dev Agent: ${storyId}`);
  info('Implementing story...');

  const { durationMs } = await spawnClaude({
    model: 'sonnet',
    prompt: getDevStoryPrompt(storyId, storyFilePath),
    cwd,
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    agentRole: 'Dev'
  });

  infoWithTiming('Dev agent completed', durationMs);
}
