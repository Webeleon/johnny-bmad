import chalk from 'chalk';
import type { LogLevel } from '../types.js';
import { formatDuration, getSessionElapsed } from './timer.js';

let verboseMode = false;

export function setVerbose(verbose: boolean): void {
  verboseMode = verbose;
}

export function log(level: LogLevel, message: string, ...args: unknown[]): void {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const elapsed = getSessionElapsed();
  const prefix = chalk.gray(`[${timestamp}]`);
  const suffix = chalk.gray(`(${elapsed})`);

  switch (level) {
    case 'info':
      console.log(prefix, chalk.blue('INFO'), message, ...args, suffix);
      break;
    case 'warn':
      console.log(prefix, chalk.yellow('WARN'), message, ...args, suffix);
      break;
    case 'error':
      console.error(prefix, chalk.red('ERROR'), message, ...args, suffix);
      break;
    case 'debug':
      if (verboseMode) {
        console.log(prefix, chalk.gray('DEBUG'), message, ...args, suffix);
      }
      break;
    case 'success':
      console.log(prefix, chalk.green('SUCCESS'), message, ...args, suffix);
      break;
  }
}

export function info(message: string, ...args: unknown[]): void {
  log('info', message, ...args);
}

export function warn(message: string, ...args: unknown[]): void {
  log('warn', message, ...args);
}

export function error(message: string, ...args: unknown[]): void {
  log('error', message, ...args);
}

export function debug(message: string, ...args: unknown[]): void {
  log('debug', message, ...args);
}

export function success(message: string, ...args: unknown[]): void {
  log('success', message, ...args);
}

export function header(title: string): void {
  const elapsed = getSessionElapsed();
  const line = '─'.repeat(60);
  console.log();
  console.log(chalk.cyan(line));
  console.log(chalk.cyan.bold(`  ${title}`), chalk.gray(`(${elapsed})`));
  console.log(chalk.cyan(line));
  console.log();
}

export function subHeader(title: string): void {
  const elapsed = getSessionElapsed();
  console.log();
  console.log(chalk.yellow.bold(`▸ ${title}`), chalk.gray(`(${elapsed})`));
  console.log();
}

export function step(stepNum: number, total: number, message: string): void {
  const elapsed = getSessionElapsed();
  console.log(chalk.magenta(`[${stepNum}/${total}]`), message, chalk.gray(`(${elapsed})`));
}

/**
 * Log a message with agent-specific timing information.
 * @param level - Log level (info, success, etc.)
 * @param message - The message to log
 * @param agentDurationMs - Optional agent-specific duration in milliseconds
 */
export function logWithTiming(
  level: LogLevel,
  message: string,
  agentDurationMs?: number
): void {
  const parts = [message];

  if (agentDurationMs !== undefined) {
    parts.push(chalk.cyan(`(agent: ${formatDuration(agentDurationMs)})`));
  }

  log(level, parts.join(' '));
}

/**
 * Convenience function for info log with timing.
 */
export function infoWithTiming(message: string, agentDurationMs?: number): void {
  logWithTiming('info', message, agentDurationMs);
}

/**
 * Convenience function for success log with timing.
 */
export function successWithTiming(message: string, agentDurationMs?: number): void {
  logWithTiming('success', message, agentDurationMs);
}
