import { spawnClaude } from '../claude/cli.js';
import { getSmAgentPrompt } from '../claude/prompts.js';
import { info, header } from '../utils/logger.js';

export async function runSmAgent(cwd: string): Promise<void> {
  header('SM Agent - Sprint Status Check');
  info('Checking sprint status and regenerating if needed...');

  await spawnClaude({
    model: 'opus',
    prompt: getSmAgentPrompt(),
    cwd,
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep']
  });

  info('SM agent completed');
}
