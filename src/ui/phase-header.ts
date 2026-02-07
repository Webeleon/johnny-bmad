import chalk from 'chalk';

const UNICODE_SEPARATOR = '━━━';
const ASCII_SEPARATOR = '===';

/**
 * Check if Unicode is supported by the terminal.
 * Returns false for TERM=dumb or when explicitly requested via JOHNNY_BMAD_ASCII.
 */
function isUnicodeSupported(): boolean {
  return process.env.TERM !== 'dumb' && process.env.JOHNNY_BMAD_ASCII !== '1';
}

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
