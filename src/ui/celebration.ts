import chalk from 'chalk';
import { isUnicodeSupported } from './unicode-support.js';

export interface CelebrationStats {
  stories: number;
  files: number;
  duration: string;
}

/**
 * Displays a celebration message when an epic is completed.
 * Format (Unicode): 🎉 Epic Complete! {stories} stories · {files} files · {duration}
 * Format (ASCII fallback): * Epic Complete! {stories} stories · {files} files · {duration}
 *
 * Uses magenta bold styling for the full output line.
 * Falls back to ASCII asterisk when terminal doesn't support emoji.
 * Respects NO_COLOR environment variable (chalk auto-handles this).
 * @param stats - Statistics including stories completed, files changed, and duration
 */
export function displayCelebration(stats: CelebrationStats): void {
  const emoji = isUnicodeSupported() ? '🎉' : '*';
  const message = `${emoji} Epic Complete! ${stats.stories} stories · ${stats.files} files · ${stats.duration}`;
  const coloredMessage = chalk.magenta.bold(message);

  console.log(coloredMessage);
}

/**
 * Displays a resume message when continuing work on a previous session.
 * Format:
 *   Resuming from:
 *     Epic: {epic}
 *     Story: {storyNum}/{totalStories}
 *     Phase: {phase}
 *
 *   State saved. All progress preserved.
 *
 * Uses green color for the reassurance line.
 * Respects NO_COLOR environment variable (chalk auto-handles this).
 * @param epic - Name of the epic being worked on
 * @param storyNum - Current story number
 * @param totalStories - Total number of stories in the epic
 * @param phase - Current phase (e.g., "implementation", "review")
 */
export function displayResumeMessage(
  epic: string,
  storyNum: number,
  totalStories: number,
  phase: string
): void {
  console.log('Resuming from:');
  console.log(`  Epic: ${epic}`);
  console.log(`  Story: ${storyNum}/${totalStories}`);
  console.log(`  Phase: ${phase}`);
  console.log('');
  console.log(chalk.green('State saved. All progress preserved.'));
}
