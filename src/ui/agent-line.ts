import chalk from 'chalk';

const AGENT_COLORS: Record<string, (str: string) => string> = {
  SM: chalk.cyan,
  Story: chalk.blue,
  Dev: chalk.green,
  Review: chalk.magenta,
};

const AGENT_LABELS: Record<string, string> = {
  SM: '[SM]    ', // 4 trailing spaces = 8 chars total
  Story: '[Story] ', // 1 trailing space = 8 chars total
  Dev: '[Dev]   ', // 3 trailing spaces = 8 chars total
  Review: '[Review]', // 0 trailing spaces = 8 chars total
};

/**
 * Displays an agent activity line with color-coded label.
 * Format: [{Label}] {activity}...
 * Verbose mode adds timestamp: [{Label} HH:MM:SS] {activity}...
 * @param agent - Agent name (SM, Story, Dev, Review) or custom name
 * @param activity - Description of what the agent is doing
 * @param verbose - Whether to include timestamp in output (default: false)
 */
export function displayAgentActivity(
  agent: string,
  activity: string,
  verbose: boolean = false
): void {
  const colorFn = AGENT_COLORS[agent] || chalk.white;
  let label: string;

  if (verbose) {
    // Verbose format: [Agent HH:MM:SS] - use agent name directly
    // Note: This does NOT use AGENT_LABELS padding because the timestamp
    // provides variable width. This is intentional per AC#4 specification.
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${hours}:${minutes}:${seconds}`;
    label = `[${agent} ${timestamp}]`;
  } else {
    // Non-verbose format: Use padded label if available
    if (AGENT_LABELS[agent]) {
      label = AGENT_LABELS[agent];
    } else {
      // For unknown agents, use 6-char limit with padding to 8 total to align with AC#3
      // This gives consistent alignment: [ + up to 6 chars + ] = 8 total
      const maxAgentLength = 6; // 6 chars + 2 brackets = 8 total
      const labelWidth = 8; // Width for unknown agent labels (same as known agents per AC#3)
      if (agent.length > maxAgentLength) {
        // Truncate with ellipsis for better UX - show first 3 chars + "..."
        const visibleChars = 3;
        const truncatedAgent = `${agent.slice(0, visibleChars)}...`;
        console.warn(
          `[Warning] Agent name "${agent}" is too long for display. ` +
            `Truncated to "${truncatedAgent}". Use names ≤${maxAgentLength} chars or add to AGENT_LABELS.`
        );
        label = `[${truncatedAgent}]`; // "Unk" + "..." = 6 chars + brackets = 8 total
      } else {
        label = `[${agent}]`.padEnd(labelWidth, ' ');
      }
    }
  }

  const coloredLabel = colorFn(label);
  console.log(`${coloredLabel} ${activity}...`);
}
