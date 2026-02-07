import { spawn } from 'child_process';
import type { LLMProvider, Model, InvokeOptions, LLMResult } from '../types.js';

export abstract class CliProvider implements LLMProvider {
  abstract cliCommand: string;
  abstract modelFlag: string;
  abstract promptFlag: string;
  toolsFlag?: string;

  readonly type = 'cli' as const;
  private readonly RETRY_DELAYS = [2000, 4000, 8000];

  abstract get id(): string;
  abstract get name(): string;

  async checkAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(this.cliCommand, ['--version'], {
        stdio: 'pipe'
      });

      child.on('error', () => resolve(false));
      child.on('close', (code) => resolve(code === 0));
      setTimeout(() => {
        child.kill();
        resolve(false);
      }, 5000);
    });
  }

  abstract listModels(): Promise<Model[]>;

  async invoke(options: InvokeOptions): Promise<LLMResult> {
    const maxRetries = options.maxRetries ?? 3;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.spawnCli(options);
        return {
          durationMs: Date.now() - startTime,
          output: result,
          retries: attempt
        };
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        const delay = this.RETRY_DELAYS.at(attempt) ?? this.RETRY_DELAYS.at(-1) ?? 8000;
        console.error(`Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }

  private async spawnCli(options: InvokeOptions): Promise<string | undefined> {
    const args: string[] = [this.modelFlag, options.model, this.promptFlag, options.prompt];

    if (options.allowedTools && this.toolsFlag) {
      args.push(this.toolsFlag, options.allowedTools.join(','));
    }

    const captureOutput = options.agentRole?.toLowerCase() === 'review' || options.agentRole?.toLowerCase() === 'reviewer';
    const child = spawn(this.cliCommand, args, {
      stdio: captureOutput ? ['inherit', 'pipe', 'pipe'] : 'inherit',
      cwd: options.cwd ?? process.cwd()
    });

    let output = '';
    let errorOutput = '';
    if (captureOutput) {
      if (child.stdout) {
        output = await this.streamToString(child.stdout);
      }
      if (child.stderr) {
        errorOutput = await this.streamToString(child.stderr);
      }
    }

    return new Promise((resolve, reject) => {
      const timeoutMs = 30 * 60 * 1000; // 30 minutes - CLI sessions can be long-running
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`${this.name} timed out after 30m`));
      }, timeoutMs);

      child.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve(output + errorOutput);
        } else {
          reject(new Error(`${this.name} exited with code ${code}`));
        }
      });
    });
  }

  private async streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => {
        chunks.length = 0;
        reject(err);
      });
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
  }

  supportsTools(_model: string): boolean {
    return true;
  }

  needsApiKey(): boolean {
    return false;
  }
}
