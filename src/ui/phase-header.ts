import chalk from 'chalk';
import { isUnicodeSupported } from './unicode-support.js';

const UNICODE_SEPARATOR = '━━━';
const ASCII_SEPARATOR = '===';

/**
 * Displays a phase header with separators.
 * Uses cyan color for structural headers, respects NO_COLOR environment variable.
 * Falls back to ASCII separators if Unicode is not supported.
 */
export function displayPhaseHeader(phase: string): void {
  const sep = isUnicodeSupported() ? UNICODE_SEPARATOR : ASCII_SEPARATOR;
  console.log(); // Blank line before header (matches logger.ts header() pattern)
  console.log(chalk.cyan(`${sep} Phase: ${phase} ${sep}`));
}
