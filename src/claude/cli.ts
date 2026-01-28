import { spawn } from 'child_process';
import type { ClaudeOptions, ClaudeResult } from '../types.js';
import { debug, isVerbose, agentLifecycle } from '../utils/logger.js';
import { createLabeledStream } from '../utils/stream-wrapper.js';

export function spawnClaude(opts: ClaudeOptions): Promise<ClaudeResult> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const args: string[] = [
      '--model', opts.model,
      '-p', opts.prompt
    ];

    if (opts.allowedTools && opts.allowedTools.length > 0) {
      args.push('--allowedTools', opts.allowedTools.join(','));
    }

    debug(`Spawning Claude with model: ${opts.model}`);
    debug(`Prompt length: ${opts.prompt.length} chars`);
    debug(`Working directory: ${opts.cwd}`);

    // Log agent start
    if (opts.agentRole) {
      agentLifecycle(opts.agentRole, 'start');
    }

    // Determine if we need labeled output for verbose mode
    const useLabeled = isVerbose() && opts.agentRole;

    const proc = spawn('claude', args, {
      cwd: opts.cwd,
      stdio: useLabeled ? ['inherit', 'pipe', 'pipe'] : 'inherit'
    });

    // In verbose mode, pipe through labeled streams
    if (useLabeled && proc.stdout && proc.stderr) {
      const stdoutStream = createLabeledStream(opts.agentRole!, 'stdout', process.stdout);
      const stderrStream = createLabeledStream(opts.agentRole!, 'stderr', process.stderr);
      proc.stdout.pipe(stdoutStream);
      proc.stderr.pipe(stderrStream);
    }

    proc.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      if (code !== 0) {
        // Log failure
        if (opts.agentRole) {
          agentLifecycle(opts.agentRole, 'fail', { exitCode: code || undefined, durationMs });
        }
        reject(new Error(`Claude exited with code ${code}`));
      } else {
        // Log successful completion
        if (opts.agentRole) {
          agentLifecycle(opts.agentRole, 'complete', { durationMs });
        }
        resolve({ durationMs });
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

export function checkClaudeInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('claude', ['--version'], {
      stdio: 'pipe'
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });

    proc.on('error', () => {
      resolve(false);
    });
  });
}
