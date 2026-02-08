import chalk from 'chalk';

const STATUS_COLORS: Record<string, (str: string) => string> = {
  ok: chalk.green,
  fail: chalk.red,
  warn: chalk.yellow,
  info: chalk.cyan,
  error: chalk.red.bold,
};

const STATUS_LABELS: Record<string, string> = {
  ok: '[OK]',
  fail: '[FAIL]',
  warn: '[WARN]',
  info: '[INFO]',
  error: '[ERROR]',
};

/**
 * Displays a status message with color-coded label.
 * Format: [{LEVEL}] {message}
 * Status levels: ok (green), fail (red), warn (yellow), info (cyan), error (red bold)
 * Labels remain visible without color (accessibility compliance - works on monochrome displays)
 * Respects NO_COLOR environment variable (chalk auto-handles this)
 * @param level - Status level (ok, fail, warn, info, error)
 * @param message - Status message to display
 */
export function displayStatus(
  level: 'ok' | 'fail' | 'warn' | 'info' | 'error',
  message: string
): void {
  const colorFn = STATUS_COLORS[level];
  const label = STATUS_LABELS[level];

  // Defensive: handle invalid level (should never happen with proper TypeScript types,
  // but provides graceful fallback if called from untyped JavaScript)
  if (!colorFn || !label) {
    console.log(`[UNKNOWN] ${message}`);
    return;
  }

  const coloredLabel = colorFn(label);
  console.log(`${coloredLabel} ${message}`);
}
