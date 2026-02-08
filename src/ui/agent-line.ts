import chalk from 'chalk';

const AGENT_COLORS: Record<string, (str: string) => string> = {
  SM: chalk.cyan,
  Story: chalk.blue,
  Dev: chalk.green,
  Review: chalk.magenta,
};

const AGENT_LABELS: Record<string, string> = {
  SM: '[SM]     ', // 5 trailing spaces = 8 chars total
  Story: '[Story]  ', // 2 trailing spaces = 8 chars total
  Dev: '[Dev]    ', // 4 trailing spaces = 8 chars total
  Review: '[Review] ', // 1 trailing space = 8 chars total
};

/**
 * Displays an agent activity line with color-coded label.
 * Format: [{Label}] {activity}...
 * Verbose mode adds timestamp: [{Label} HH:MM:SS] {activity}...
 */
export function displayAgentActivity(
  agent: string,
  activity: string,
  verbose: boolean = false
): void {
  const colorFn = AGENT_COLORS[agent] || chalk.white;
  let label: string;

  if (verbose) {
    // Verbose format: [Agent HH:MM:SS]
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${hours}:${minutes}:${seconds}`;
    label = `[${agent} ${timestamp}]`;
  } else {
    // Non-verbose format: Use padded label or generate for unknown agents
    label = AGENT_LABELS[agent] || `[${agent}]`.padEnd(8, ' ');
  }

  const coloredLabel = colorFn(label);
  console.log(`${coloredLabel} ${activity}...`);
}
