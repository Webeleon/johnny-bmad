import chalk from 'chalk';

/**
 * Displays a formatted error block with error type, description, context, and recovery guidance.
 * Format:
 *   [ERROR] {errorType}: {description}
 *           State saved at {context}
 *           Try: {recoveryCmd}
 *
 * The "Try:" line is ALWAYS present to provide actionable recovery guidance.
 * Respects NO_COLOR environment variable (chalk auto-handles this).
 * @param errorType - Type of error (e.g., "API Error", "Validation Error")
 * @param description - Brief description of the error
 * @param context - Context where error occurred. For story progress, include "Story " prefix (e.g., "Story 4/8")
 * @param recoveryCmd - Actionable recovery command or instruction
 */
export function displayError(
  errorType: string,
  description: string,
  context: string,
  recoveryCmd: string
): void {
  if (!recoveryCmd || recoveryCmd.trim() === '') {
    throw new Error(
      'recoveryCmd must be a non-empty string (AC#2: actionable recovery guidance required)'
    );
  }

  const errorLabel = chalk.red.bold('[ERROR]');
  const firstLine = `${errorLabel} ${errorType}: ${description}`;
  const contextLine = `        State saved at ${context}`;
  const recoveryLine = `        Try: ${recoveryCmd}`;

  console.log(firstLine);
  console.log(contextLine);
  console.log(recoveryLine);
}
