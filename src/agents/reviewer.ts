import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { getReviewStoryPrompt } from '../claude/prompts.js';
import { info, subHeader, debug, infoWithTiming } from '../utils/logger.js';

export interface ReviewResult {
  passed: boolean;
  output: string;
  durationMs: number;
}

export function runReviewAgent(
  cwd: string,
  storyId: string,
  storyFilePath: string
): Promise<ReviewResult> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    subHeader(`Review Agent: ${storyId}`);
    info('Reviewing implementation...');

    const prompt = getReviewStoryPrompt(storyId, storyFilePath);

    const proc = spawn(
      'claude',
      ['--model', 'opus', '-p', prompt, '--allowedTools', 'Read,Write,Edit,Bash,Glob,Grep'],
      {
        cwd,
        stdio: ['inherit', 'pipe', 'inherit']
      }
    );

    const chunks: Buffer[] = [];

    proc.stdout.on('data', (data: Buffer) => {
      chunks.push(data);
      process.stdout.write(data);
    });

    proc.on('close', (code) => {
      const durationMs = Date.now() - startTime;

      if (code !== 0) {
        reject(new Error(`Review agent exited with code ${code}`));
        return;
      }

      const output = Buffer.concat(chunks).toString('utf-8');

      // Check sprint-status.yaml for story status
      try {
        const statusPath = join(cwd, '_bmad-output/implementation-artifacts/sprint-status.yaml');
        const statusContent = readFileSync(statusPath, 'utf-8');
        const status = parseYaml(statusContent);

        const storyStatus = status?.development_status?.[storyId];
        const passed = storyStatus === 'done';

        if (passed) {
          infoWithTiming('Review PASSED - story marked done in sprint-status.yaml', durationMs);
          resolve({ passed: true, output, durationMs });
        } else {
          infoWithTiming(`Review FAILED - story status is "${storyStatus}"`, durationMs);
          resolve({ passed: false, output, durationMs });
        }
      } catch (err) {
        // Fall back to stdout detection if yaml read fails
        debug(`Failed to read sprint-status.yaml: ${err}`);
        const passed = output.includes('REVIEW_PASSED');
        if (passed) {
          infoWithTiming('Review PASSED (detected from output)', durationMs);
          resolve({ passed: true, output, durationMs });
        } else {
          infoWithTiming('Review status unclear - treating as needs more work', durationMs);
          resolve({ passed: false, output, durationMs });
        }
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}
