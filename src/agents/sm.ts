import { spawnClaude } from '../claude/cli.js';
import { getSmAgentPrompt } from '../claude/prompts.js';
import { info, header, infoWithTiming } from '../utils/logger.js';

export async function runSmAgent(cwd: string): Promise<void> {
  header('SM Agent - Sprint Status Check');
  info('Checking sprint status and regenerating if needed...');

  const { durationMs } = await spawnClaude({
    model: 'opus',
    prompt: getSmAgentPrompt(),
    cwd,
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    agentRole: 'SM'
  });

  infoWithTiming('SM agent completed', durationMs);
}
