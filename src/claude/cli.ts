import { spawn } from 'child_process';
import type { ClaudeOptions } from '../types.js';
import { debug } from '../utils/logger.js';

export function spawnClaude(opts: ClaudeOptions): Promise<void> {
  return new Promise((resolve, reject) => {
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

    const proc = spawn('claude', args, {
      cwd: opts.cwd,
      stdio: 'inherit'
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Claude exited with code ${code}`));
      } else {
        resolve();
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
