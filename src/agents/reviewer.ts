import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { parse as parseYaml } from 'yaml';
import { getReviewStoryPrompt } from '../claude/prompts.js';
import {
  agentLifecycle,
  debug,
  info,
  infoWithTiming,
  isVerbose,
  subHeader,
} from '../utils/logger.js';
import { createLabeledStream } from '../utils/stream-wrapper.js';

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

    // Log agent start
    agentLifecycle('Review', 'start');

    const prompt = getReviewStoryPrompt(storyId, storyFilePath);

    const verbose = isVerbose();

    // Use 'pipe' for stdin so the child cannot put the terminal in raw mode
    // (which would swallow Ctrl+C). The -p flag + --allowedTools make stdin unnecessary.
    const proc = spawn(
      'claude',
      ['--model', 'opus', '-p', prompt, '--allowedTools', 'Read,Write,Edit,Bash,Glob,Grep'],
      {
        cwd,
        stdio: ['pipe', 'pipe', verbose ? 'pipe' : 'inherit'],
      }
    );

    // Close stdin immediately - child doesn't need it in -p mode
    proc.stdin?.end();

    // On Ctrl+C: kill child and exit parent immediately
    const onSignal = (signal: NodeJS.Signals) => {
      proc.kill(signal);
      process.exit(130);
    };
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);

    // In verbose mode, pipe stderr through labeled stream
    if (verbose && proc.stderr) {
      const stderrStream = createLabeledStream('Review', 'stderr', process.stderr);
      proc.stderr.pipe(stderrStream);
    }

    const chunks: Buffer[] = [];

    proc.stdout.on('data', (data: Buffer) => {
      chunks.push(data);

      // In verbose mode, prefix stdout lines
      if (isVerbose()) {
        const chunk = data.toString();
        const lines = chunk.split('\n');
        const color = chalk.yellow; // Review agent color
        for (const line of lines.slice(0, -1)) {
          // Skip last empty line
          process.stdout.write(`${color('[Review] ') + line}\n`);
        }
        // Handle incomplete last line
        if (lines[lines.length - 1]) {
          process.stdout.write(color('[Review] ') + lines[lines.length - 1]);
        }
      } else {
        process.stdout.write(data);
      }
    });

    proc.on('close', (code, _signal) => {
      // Clean up signal handlers
      process.removeListener('SIGINT', onSignal);
      process.removeListener('SIGTERM', onSignal);

      const durationMs = Date.now() - startTime;

      if (code !== 0) {
        // Log failure
        agentLifecycle('Review', 'fail', { exitCode: code || undefined, durationMs });
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

        // Log completion
        agentLifecycle('Review', 'complete', { durationMs });

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

        // Log completion
        agentLifecycle('Review', 'complete', { durationMs });

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
      process.removeListener('SIGINT', onSignal);
      process.removeListener('SIGTERM', onSignal);
      reject(err);
    });
  });
}
