import { spawn, execSync } from 'child_process';
import { info, warn, debug } from '../utils/logger.js';

function runGitCommand(args: string[], cwd: string): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn('git', args, {
      cwd,
      stdio: ['inherit', 'pipe', 'pipe']
    });

    const chunks: Buffer[] = [];

    proc.stdout.on('data', (data: Buffer) => {
      chunks.push(data);
    });

    proc.stderr.on('data', (data: Buffer) => {
      chunks.push(data);
    });

    proc.on('close', (code) => {
      const output = Buffer.concat(chunks).toString('utf-8');
      resolve({ code: code ?? 1, output });
    });

    proc.on('error', () => {
      resolve({ code: 1, output: '' });
    });
  });
}

function runGitCommandSync(args: string[], cwd: string): { code: number; output: string } {
  try {
    const output = execSync(['git', ...args].join(' '), {
      cwd,
      encoding: 'utf-8',
      stdio: ['inherit', 'pipe', 'pipe']
    });
    return { code: 0, output: output || '' };
  } catch (err: unknown) {
    const error = err as { status?: number; stdout?: string };
    return { code: error.status ?? 1, output: error.stdout ?? '' };
  }
}

export async function commitStoryChanges(
  cwd: string,
  storyId: string,
  storyTitle: string
): Promise<boolean> {
  info(`Committing changes for ${storyId}...`);

  // Check if there are changes to commit
  const statusResult = await runGitCommand(['status', '--porcelain'], cwd);

  if (!statusResult.output.trim()) {
    warn('No changes to commit');
    return false;
  }

  debug(`Changes detected:\n${statusResult.output}`);

  // Stage all changes
  const addResult = await runGitCommand(['add', '-A'], cwd);
  if (addResult.code !== 0) {
    warn('Failed to stage changes');
    return false;
  }

  // Create commit message
  const commitMessage = `feat(${storyId}): ${storyTitle}`;

  // Commit changes
  const commitResult = await runGitCommand(['commit', '-m', commitMessage], cwd);
  if (commitResult.code !== 0) {
    warn('Failed to commit changes');
    return false;
  }

  info(`Committed: ${commitMessage}`);
  return true;
}

export function isGitRepo(cwd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd,
      stdio: ['inherit', 'pipe', 'pipe']
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });

    proc.on('error', () => {
      resolve(false);
    });
  });
}
