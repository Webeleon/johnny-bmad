import chalk from 'chalk';
import inquirer from 'inquirer';
import { isUnicodeSupported } from './unicode-support.js';

/**
 * Data structure for story review card display.
 * Contains all information needed to render a story summary for batch review.
 */
export interface StoryCardData {
  /** Story title for display */
  title: string;
  /** Epic identifier (e.g., "epic-1") */
  epicId: string;
  /** Story identifier (e.g., "1-1") */
  storyId: string;
  /** List of acceptance criteria for the story */
  acceptanceCriteria: string[];
  /** List of tasks/subtasks for the story */
  tasks: string[];
}

/**
 * Result type when user requests changes to a story.
 * Contains the feedback text provided by the user.
 */
export type NeedsChangesResult = { type: 'needs-changes'; feedback: string };

/**
 * Union type for approval prompt result.
 * - 'approved': User approved the story
 * - NeedsChangesResult: User requested changes with feedback
 */
export type ApprovalResult = 'approved' | NeedsChangesResult;

const UNICODE_SEPARATOR = '━';
const ASCII_SEPARATOR = '=';

/**
 * Displays a story review card with header, title, and counts.
 * Uses cyan color for header (consistent with phase-header.ts pattern).
 * Falls back to ASCII separators if Unicode is not supported.
 * Respects NO_COLOR environment variable (chalk auto-handles this).
 * @param story - Story data to display
 * @param index - Zero-based index of the story in the list
 * @param total - Total number of stories
 * @param isRevised - Optional flag to show revised status in header
 */
export function displayStoryCard(
  story: StoryCardData,
  index: number,
  total: number,
  isRevised?: boolean
): void {
  const sep = isUnicodeSupported() ? UNICODE_SEPARATOR : ASCII_SEPARATOR;
  const storyNumber = index + 1;
  const revisedText = isRevised ? ' (revised)' : '';

  // Header: ━━━ Review Story 4/8 ━━━
  console.log(
    chalk.cyan(
      `${sep.repeat(3)} Review Story ${storyNumber}/${total}${revisedText} ${sep.repeat(3)}`.trimEnd()
    )
  );

  // Title: Title: Implement login form with validation
  console.log(`Title: ${story.title}`);

  // Counts: Tasks: 4 subtasks | Acceptance Criteria: 5 items
  console.log(
    `Tasks: ${story.tasks.length} subtasks | Acceptance Criteria: ${story.acceptanceCriteria.length} items`
  );
}

/**
 * Prompts user for story approval with interactive menu.
 * Shows: [Y] Approve  [N] Request changes  [V] View full story
 * Returns 'approved' or { type: 'needs-changes', feedback: string }
 * @param story - Story data being reviewed
 * @param index - Zero-based index of the story
 * @param total - Total number of stories
 * @param storyPath - Optional path to story file for viewing full content
 * @returns Promise resolving to approval result
 */
export async function promptStoryApproval(
  story: StoryCardData,
  index: number,
  total: number,
  storyPath?: string
): Promise<ApprovalResult> {
  const { action } = await inquirer.prompt([
    {
      type: 'expand',
      name: 'action',
      message: 'Your choice',
      choices: [
        { key: 'y', name: 'Approve', value: 'approved' },
        { key: 'n', name: 'Request changes', value: 'needs-changes' },
        { key: 'v', name: 'View full story', value: 'view' },
      ],
    },
  ]);

  if (action === 'approved') {
    return 'approved';
  }

  if (action === 'needs-changes') {
    const { feedback } = await inquirer.prompt([
      {
        type: 'input',
        name: 'feedback',
        message: 'What changes are needed?',
      },
    ]);
    return { type: 'needs-changes', feedback };
  }

  // action === 'view' - Display full story and re-prompt
  console.log(); // Blank line before story content

  const sep = isUnicodeSupported() ? UNICODE_SEPARATOR : ASCII_SEPARATOR;
  console.log(chalk.cyan(`${sep.repeat(3)} Full Story Content ${sep.repeat(3)}`));

  // Try to read and display the actual story file if path is provided
  if (storyPath) {
    try {
      const fs = await import('node:fs');
      const storyContent = fs.readFileSync(storyPath, 'utf-8');
      console.log(storyContent);
    } catch {
      // Fallback to displaying story object summary
      console.log(`Title: ${story.title}`);
      console.log(`Epic: ${story.epicId} | Story: ${story.storyId}`);
      console.log(`Tasks: ${story.tasks.length}`);
      console.log(`Acceptance Criteria: ${story.acceptanceCriteria.length}`);
    }
  } else {
    // No path provided - display summary
    console.log(`Title: ${story.title}`);
    console.log(`Epic: ${story.epicId} | Story: ${story.storyId}`);
    console.log(`Tasks: ${story.tasks.length}`);
    console.log(`Acceptance Criteria: ${story.acceptanceCriteria.length}`);
  }

  console.log(); // Blank line after story content

  // Re-prompt for approval
  return promptStoryApproval(story, index, total, storyPath);
}
