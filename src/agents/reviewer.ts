import { readFile } from 'fs/promises';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { getReviewStoryPrompt } from '../claude/prompts.js';
import { registry } from '../providers/registry.js';
import type { InvokeOptions } from '../types.js';
import { info, subHeader, debug, infoWithTiming, agentLifecycle } from '../utils/logger.js';

export interface ReviewResult {
  passed: boolean;
  output: string;
  durationMs: number;
}

export async function runReviewAgent(
  cwd: string,
  storyId: string,
  storyFilePath: string,
  model?: string
): Promise<ReviewResult> {
  const startTime = Date.now();

  subHeader(`Review Agent: ${storyId}`);
  info('Reviewing implementation...');

  agentLifecycle('Review', 'start');

  const options: InvokeOptions = {
    model: model || 'opus',
    prompt: getReviewStoryPrompt(storyId, storyFilePath),
    cwd,
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    agentRole: 'Review'
  };

  try {
    const output = await registry.invokeModel(options.model, options);
    const durationMs = Date.now() - startTime;

    agentLifecycle('Review', 'complete', { durationMs });

    let passed = false;

    try {
      const statusPath = join(cwd, '_bmad-output/implementation-artifacts/sprint-status.yaml');
      const statusContent = await readFile(statusPath, 'utf-8');
      const status = parseYaml(statusContent);

      const storyStatus = status?.development_status?.[storyId];
      passed = storyStatus === 'done';

      if (passed) {
        infoWithTiming('Review PASSED - story marked done in sprint-status.yaml', durationMs);
      } else {
        infoWithTiming(`Review FAILED - story status is "${storyStatus || 'unknown'}"`, durationMs);
      }
    } catch (err) {
      debug(`Failed to read sprint-status.yaml: ${err}`);
      passed = output.includes('REVIEW_PASSED');

      if (passed) {
        infoWithTiming('Review PASSED (detected from output)', durationMs);
      } else {
        infoWithTiming('Review status unclear - treating as needs more work', durationMs);
      }
    }

    return { passed, output, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    agentLifecycle('Review', 'fail', { durationMs });
    throw error;
  }
}
