import chalk from 'chalk';
import { runDevAgent } from './agents/dev.js';
import { runReviewAgent } from './agents/reviewer.js';
import { runSmAgent } from './agents/sm.js';
import { runStoryCreator, runStoryUpdater } from './agents/story-creator.js';
import { checkClaudeInstalled } from './claude/cli.js';
import { clearState, createInitialState, loadState, saveState } from './config.js';
import { commitStoryChanges, isGitRepo } from './git/commit.js';
import type { CliArgs, Epic, SprintStatus, State, WorkflowMode } from './types.js';
import { displayAgentActivity } from './ui/agent-line.js';
import { displayPhaseHeader } from './ui/phase-header.js';
import { displayProgress } from './ui/progress.js';
import { displayStatus } from './ui/status.js';
import { displayStoryCard, promptStoryApproval } from './ui/story-card.js';
import {
  ensureOutputDir,
  findOngoingWork,
  getAllStoriesForEpic,
  getEpicsFromSprintStatus,
  getStoryFilePath,
  isBmadProject,
  loadEpics,
  loadSprintStatus,
  loadStory,
  markEpicComplete,
  storyFileExists,
  updateSprintStatus,
} from './utils/files.js';
import {
  error,
  header,
  info,
  setVerbose,
  step,
  success,
  successWithTiming,
  warn,
} from './utils/logger.js';
import { getSessionElapsed, startSessionTimer } from './utils/timer.js';
import {
  confirmAction,
  confirmContinueNextEpic,
  handleMaxIterations,
  selectEpic,
} from './utils/user-input.js';

/**
 * Retry configuration for agent spawning (Story 4-7)
 *
 * These constants control the retry behavior for Story Creator and Story Updater
 * agents when they encounter transient failures (network errors, API rate limits, etc.)
 *
 * @TODO TECHNICAL DEBT (Story 4-7, Story 4-4): The retry logic is duplicated between
 * runBatchStoryCreationLoop() (lines 147-247) and runBatchStoryReviewLoop() (lines 661-729).
 * This violates DRY principle and ARCH-6 which calls for a reusable retryableOperation() function.
 *
 * **DEFERRED TO EPIC 5**: Refactoring to a shared utility is deferred to Epic 5 (Dev-Only Execution)
 * where Dev and Reviewer agents will also need retry logic. At that point, a comprehensive
 * retry utility can be implemented once and reused across all agent types.
 *
 * **RELATED STORIES**: 4-4 (initial Story Updater retry), 4-7 (comprehensive retry with rate limiting)
 */
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000] as const; // Exponential backoff in milliseconds
const RATE_LIMIT_COOLDOWN = 60000; // 60 seconds for rate limit cooldown

/**
 * Determine workflow mode based on CLI arguments
 *
 * @param args - Parsed CLI arguments
 * @returns Workflow mode (batch, dev-only, or sequential)
 */
export function determineMode(args: CliArgs): WorkflowMode {
  // Note: Mutual exclusion of batch and devOnly is validated upstream in validateFlags()
  // at src/index.ts:84-90 before runOrchestrator() is called
  if (args.batch) return 'batch';
  if (args.devOnly) return 'dev-only';
  return 'sequential';
}

/**
 * Run batch story creation loop
 *
 * Creates all story files for the epic before proceeding to review phase.
 * Displays progress using UI components from Epic 3 and saves state before
 * each Story Creator agent spawn for resume capability.
 *
 * **Resume Behavior:** On resume, starts from `state.workflow.currentStoryIndex`
 * (0-based internally, displayed as 1-based to user). State is saved BEFORE each
 * Story Creator spawn with the pre-creation index, enabling safe resume after
 * failures.
 *
 * **Indexing Notes:**
 * - Internal state uses 0-based indexing (0 = first story)
 * - User display uses 1-based indexing (1 = first story)
 * - When resuming, loop starts at `currentStoryIndex` and continues to end
 * - After completion, `currentStoryIndex` is reset to 0 for review phase
 *
 * @param cwd - Current working directory
 * @param state - Current workflow state (will be mutated and saved)
 * @param args - Parsed CLI arguments (currently unused but kept for future extensibility,
 *               e.g., Story 4-7 retry logic may need yolo mode or other flags)
 *
 * @internal
 */
export async function runBatchStoryCreationLoop(
  cwd: string,
  state: State,
  _args: CliArgs
): Promise<void> {
  // Note: args parameter is currently unused but kept for future extensibility
  // (e.g., Story 4-7 retry logic may need to access yolo mode or other flags)
  // AC: 1 - Display phase header
  displayPhaseHeader('Story Creation');

  // Get all stories for the current epic from sprint-status.yaml
  // This determines the total story count for the loop
  const sprintStatus = await loadSprintStatus(cwd);
  const epicStories = getAllStoriesForEpic(sprintStatus, state.currentEpic);

  if (epicStories.length === 0) {
    error(`No stories found for epic ${state.currentEpic}`);
    error('Batch mode requires stories to exist in sprint-status.yaml before running.');
    error('Run the planning phase first to create story files for this epic.');
    error('Exiting batch workflow. No stories to create.');
    // Transition to review phase even if no stories found
    // (This allows the workflow to complete gracefully)
    state.workflow.phase = 'review';
    await saveState(cwd, state);
    return;
  }

  // Get the starting index from state (resumes from 0 for fresh start)
  const startIndex = state.workflow.currentStoryIndex;

  // AC: 2 - Iterate from story 1 to N sequentially
  // Note: Loop uses 1-based indexing for display, but state uses 0-based
  for (let i = startIndex; i < epicStories.length; i++) {
    const currentStoryNum = i + 1; // 1-based for display
    const totalStories = epicStories.length;
    const epicStory = epicStories[i];

    // AC: 2 - Display progress with "creating..." status
    displayProgress(currentStoryNum, totalStories, 'creating');

    // AC: 3 - Display agent activity and save state BEFORE spawning
    displayAgentActivity('Story', `Creating ${epicStory.id}...`);

    // AC: 4 - Save state BEFORE spawning the Story Creator agent (critical for resume capability)
    //
    // **AC 4 REQUIREMENT**: "BEFORE any Story Creator spawn"
    //
    // **IMPLEMENTATION NOTE**: State is saved once before the retry loop begins (not before each retry attempt).
    // This implementation satisfies AC 4 because:
    // 1. State is preserved before the first spawn attempt
    // 2. On resume, the retry loop will re-execute from the same story index
    // 3. The pre-creation index (i) ensures retrying the same story, not skipping
    //
    // **RATIONALE FOR SINGLE SAVE**: Saving before each retry would be redundant since:
    // - The story index hasn't changed (we're retrying the same story)
    // - No progress has been made to preserve
    // - The initial save already enables resume capability
    state.workflow.currentStoryIndex = i;
    await saveState(cwd, state);

    // Story 4-7: Retry logic for Story Creator agent spawn
    // Implements exponential backoff: 2s, 4s, 8s delays
    // Max 3 retries before giving up
    // Each retry attempt reuses the same saved state (current story index preserved)
    let createSuccess = false;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // AC: 3 - Spawn Story Creator agent with appropriate prompt
        // The runStoryCreator function handles the actual agent spawning
        await runStoryCreator(cwd, epicStory, state.currentEpic);

        // AC: 4 - Verify story file exists before marking as created
        // This ensures the Story Creator actually created the file and didn't fail silently
        const storyExists = await storyFileExists(cwd, epicStory.id);
        if (!storyExists) {
          error(`Story file not created for ${epicStory.id}`);
          error('Story Creator may have failed silently or exited without creating the file.');
          error('Check Story Creator agent logs for errors.');
          error('Saving state and exiting. Run johnny-bmad again to resume.');
          await saveState(cwd, state);
          throw new Error(`Story file not created for ${epicStory.id}`);
        }

        // AC: 4 - Update progress display with "created" status after successful creation
        displayProgress(currentStoryNum, totalStories, 'created');

        // AC: 4 - Increment currentStoryIndex after successful story creation
        state.workflow.currentStoryIndex = i + 1;
        createSuccess = true;
        break; // Success - exit retry loop
      } catch (createError) {
        const errorMessage =
          createError instanceof Error ? createError.message : String(createError);

        // Story 4-7: Check if error is retryable (network errors, API failures, rate limits)
        // Retryable errors: ECONNREFUSED, ETIMEDOUT, ENOTFOUND, EAI_AGAIN, rate limit errors
        // Non-retryable errors: Invalid file paths, permission denied (EACCES)
        //
        // Design decision: Permission errors (EACCES, "permission denied") are treated as non-retryable
        // because they typically indicate fundamental filesystem or configuration issues that won't
        // resolve with retry. Transient permission issues (e.g., network-based auth) are rare for this
        // CLI tool's use case, so we fail fast to surface configuration problems to the user.
        const isRetryable =
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('ENOTFOUND') ||
          errorMessage.includes('EAI_AGAIN') ||
          errorMessage.toLowerCase().includes('rate limit') ||
          errorMessage.includes('Claude exited with code') ||
          errorMessage.includes('ENOENT');

        // Non-retryable errors: EACCES (permission denied), Invalid path/file errors
        // Design decision: "Invalid" is only treated as non-retryable when it indicates
        // a fundamental problem with the story path or file structure. This includes patterns
        // like "Invalid story path", "Invalid file", but NOT transient errors like
        // "Invalid response from server" (which may be retryable with backoff).
        const isNonRetryable =
          errorMessage.includes('EACCES') ||
          errorMessage.includes('permission denied') ||
          (errorMessage.includes('Invalid') &&
            (errorMessage.includes('path') ||
              errorMessage.includes('file') ||
              errorMessage.includes('story')));

        if (!isRetryable || isNonRetryable) {
          // Non-retryable error - fail immediately
          error(`Story Creator failed for ${epicStory.id}: ${errorMessage}`);
          error('This error is not retryable. Please check your configuration and try again.');
          error(
            'Try: Check file permissions, verify paths are valid, or run johnny-bmad with --verbose for more details'
          );
          await saveState(cwd, state);
          throw createError;
        }

        // Retryable error - apply retry logic
        if (attempt < MAX_RETRIES) {
          // Story 4-7 AC: 3 - Detect rate limit and apply 60s cooldown (case-insensitive)
          // Note: The '429' check is technically case-insensitive (numbers have no case), while the
          // 'rate limit' check uses toLowerCase() for case-insensitive matching. Both patterns are
          // checked to ensure we catch both numeric HTTP status codes and textual error messages.
          const isRateLimit =
            errorMessage.toLowerCase().includes('rate limit') || errorMessage.includes('429');

          if (isRateLimit) {
            // AC: 3 - Rate limit detected: display warning and wait 60s
            warn(`Rate limited. Waiting 60s...`);
            await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_COOLDOWN));
            warn('Retrying after cooldown...');
          } else {
            // AC: 2 - Normal retry with exponential backoff
            const backoffMs = RETRY_DELAYS[attempt - 1]; // 2s, 4s, 8s
            warn(
              `Story Creator failed. Retrying in ${backoffMs / 1000}s... (attempt ${attempt}/${MAX_RETRIES})`
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        } else {
          // AC: 5 - Max retries exceeded - display error block with state info
          error(`Story Creator failed after ${MAX_RETRIES} attempts`);
          error(`State saved at Story ${currentStoryNum}/${totalStories}`);
          error(
            `Try: Check network connection, verify API access, then restart johnny-bmad to retry`
          );
          // Note: Error guidance differs from Story Updater (line 742) which includes "address changes manually"
          // because the Updater runs in a change request loop where manual edits are a valid recovery option.
          await saveState(cwd, state);
          process.exit(1); // Exit with code 1 per AC 5
        }
      }
    }

    // If all retries failed, exit the workflow
    if (!createSuccess) {
      throw new Error(`Failed to create story ${epicStory.id} after ${MAX_RETRIES} attempts`);
    }

    // Save state after each successful story creation
    await saveState(cwd, state);
  }

  // AC: 5 - All stories created, transition to review phase
  state.workflow.phase = 'review';
  state.workflow.currentStoryIndex = 0; // Reset for review phase
  await saveState(cwd, state);
}

/**
 * Check if batch story creation is already complete
 *
 * Determines if all stories in the batch have been approved by checking
 * if all stories have the 'approved' status in the approvals record.
 *
 * Uses single-pass iteration for efficiency with large epic story counts.
 *
 * @param approvals - Record of story ID to approval status
 * @returns true if all stories are approved and there is at least one approval
 *
 * @example
 * ```typescript
 * // All stories approved - returns true
 * const approvals = {
 *   'story-1': 'approved',
 *   'story-2': 'approved',
 *   'story-3': 'approved',
 * };
 * const isComplete = checkBatchAlreadyComplete(approvals);
 * // Returns: true
 * ```
 *
 * @example
 * ```typescript
 * // Mixed approval statuses - returns false
 * const approvals = {
 *   'story-1': 'approved',
 *   'story-2': 'needs-changes',
 *   'story-3': 'approved',
 * };
 * const isComplete = checkBatchAlreadyComplete(approvals);
 * // Returns: false
 * ```
 *
 * @example
 * ```typescript
 * // Empty approvals record - returns false
 * const approvals = {};
 * const isComplete = checkBatchAlreadyComplete(approvals);
 * // Returns: false (no stories to check)
 * ```
 *
 * @example
 * ```typescript
 * // All pending - returns false
 * const approvals = {
 *   'story-1': 'pending',
 *   'story-2': 'pending',
 * };
 * const isComplete = checkBatchAlreadyComplete(approvals);
 * // Returns: false
 * ```
 *
 * @example
 * ```typescript
 * // Null/undefined approvals - returns false (handles runtime errors)
 * const isComplete = checkBatchAlreadyComplete(null as unknown as Record<string, 'approved'>);
 * // Returns: false (safe fallback for null input)
 * ```
 */
export function checkBatchAlreadyComplete(
  approvals: Record<string, 'approved' | 'needs-changes' | 'pending'>
): boolean {
  // Single-pass iteration: check both approval status and count in one loop
  // This is more efficient than calling Object.values().every() and Object.keys().length separately
  let hasApprovals = false;
  for (const storyId in approvals) {
    hasApprovals = true;
    if (approvals[storyId] !== 'approved') {
      return false; // Early exit on first non-approved status
    }
  }
  return hasApprovals; // true only if we found at least one approval AND all were approved
}

/**
 * Display batch completion summary
 *
 * Shows a formatted summary after all stories are approved, including:
 * - Completion header with visual separator
 * - Total count of approved stories
 * - List of all stories with titles and checkmarks
 * - Next steps guidance (--dev-only mode)
 *
 * This is used by the batch workflow to provide clear feedback when story
 * creation and review are complete.
 *
 * @param cwd - Current working directory
 * @param epicStories - Array of epic story metadata
 * @param approvals - Record of story ID to approval status
 *
 * @example
 * ```typescript
 * // Normal completion with 2 stories
 * const epicStories = [
 *   { id: 'story-1' },
 *   { id: 'story-2' },
 * ];
 * const approvals = {
 *   'story-1': 'approved',
 *   'story-2': 'approved',
 * };
 * await displayBatchCompletionSummary('/project', epicStories, approvals);
 * // Output:
 * // ━━━ Batch Complete ━━━
 * // [OK] All 2 stories created and approved
 * // Ready for implementation:
 * //   1. story-1: (title from file) ✓
 * //   2. story-2: (title from file) ✓
 * // Next: johnny-bmad --dev-only
 * ```
 *
 * @example
 * ```typescript
 * // Null/undefined epicStories - handles runtime error gracefully
 * await displayBatchCompletionSummary('/project', null as unknown as Array<{ id: string }>, {});
 * // Output: (warning) Invalid stories array provided
 * ```
 *
 * @example
 * ```typescript
 * // Empty stories array - displays warning and returns early
 * const epicStories: Array<{ id: string }> = [];
 * const approvals = {};
 * await displayBatchCompletionSummary('/project', epicStories, approvals);
 * // Output: (warning) No stories to display in completion summary
 * ```
 *
 * @example
 * ```typescript
 * // Story file cannot be loaded - uses ID as fallback
 * const epicStories = [
 *   { id: 'story-1' },
 *   { id: 'missing-story' }, // File doesn't exist
 * ];
 * const approvals = {
 *   'story-1': 'approved',
 *   'missing-story': 'approved',
 * };
 * await displayBatchCompletionSummary('/project', epicStories, approvals);
 * // Output: displays story-1 with title, missing-story with "(unable to load title)"
 * ```
 *
 * @example
 * ```typescript
 * // Corrupted story file - handles error gracefully
 * const epicStories = [{ id: 'corrupted-story' }];
 * const approvals = { 'corrupted-story': 'approved' };
 * await displayBatchCompletionSummary('/project', epicStories, approvals);
 * // Output: (warning) Could not load story file for corrupted-story: [error details]
 * //         1. corrupted-story: (unable to load title) ✓
 * ```
 */
export async function displayBatchCompletionSummary(
  cwd: string,
  epicStories: Array<{ id: string }>,
  approvals: Record<string, 'approved' | 'needs-changes' | 'pending'>
): Promise<void> {
  try {
    // Validate input - check for null/undefined approvals
    if (!approvals || typeof approvals !== 'object') {
      error('Invalid approvals record provided to completion summary');
      return;
    }

    // Validate input - check for null/undefined or non-array epicStories
    if (!epicStories || !Array.isArray(epicStories)) {
      warn('Invalid stories array provided to completion summary');
      return;
    }

    // Validate input - check for empty epicStories array
    if (epicStories.length === 0) {
      warn('No stories to display in completion summary');
      return;
    }

    // Display completion header
    // Note: Using chalk.bold.cyan() for visual appeal (intentional deviation from AC:1 plain text)
    console.log();
    console.log(chalk.bold.cyan('━━━ Batch Complete ━━━'));
    displayStatus('ok', `All ${epicStories.length} stories created and approved`);
    console.log();

    // Display story list
    console.log(chalk.bold('Ready for implementation:'));

    // Track if any errors occurred during story loading
    let hadLoadErrors = false;

    // Load each story to get its title
    for (let i = 0; i < epicStories.length; i++) {
      const epicStory = epicStories[i];
      try {
        const story = await loadStory(cwd, epicStory.id);
        const title = story?.title || epicStory.id;
        console.log(`  ${i + 1}. ${epicStory.id}: ${title} ✓`);
      } catch (error) {
        // If story file cannot be loaded, still display entry with ID only
        hadLoadErrors = true;
        const errorMessage = error instanceof Error ? error.message : String(error);
        warn(`Could not load story file for ${epicStory.id}: ${errorMessage}`);
        console.log(`  ${i + 1}. ${epicStory.id}: (unable to load title) ✓`);
      }
    }

    console.log();

    // Display next steps message
    const nextStepsMessage = chalk.bold('Next: johnny-bmad --dev-only');
    console.log(nextStepsMessage);
    console.log();

    // If we had load errors, display a warning after the summary
    if (hadLoadErrors) {
      warn('Some story files could not be loaded. Titles may be missing above.');
    }
  } catch (error) {
    // Handle unexpected errors from console operations or other issues
    const errorMessage = error instanceof Error ? error.message : String(error);
    error(`Error displaying completion summary: ${errorMessage}`);
    // Re-throw to allow caller to handle the error appropriately
    // This prevents confusing users with both error and success messages
    throw error;
  }
}

/**
 * Run batch story review loop
 *
 * Reviews each story created in the story creation phase, allowing the user to approve
 * or request changes. Displays progress using UI components from Epic 3 and saves state
 * after each approval for resume capability.
 *
 * **Implementation:** This function was implemented in Story 4-3 (implement-per-story-review-flow).
 * **Auto-Approve:** Story 4-5 adds auto-approve mode when args.yolo is true.
 * **Completion:** Story 4-6 adds batch completion summary and clean exit.
 *
 * **Phase Header Behavior:** The "Review" phase header is displayed ONLY when starting from
 * the first story (currentStoryIndex === 0). On fresh starts, this is intuitive. On resume
 * (e.g., after interruption), the header is NOT displayed again - we continue directly
 * with the review loop from the current story index.
 *
 * **Resume Behavior:** On resume, starts from `state.workflow.currentStoryIndex`
 * (0-based internally, displayed as 1-based to user). State is saved AFTER each
 * approval with the post-approval index, enabling safe resume after interruptions.
 *
 * **Auto-Approve Mode (Story 4-5):** When args.yolo is true, stories are automatically
 * approved without prompting the user. The approval prompt is skipped, and the story
 * is marked as 'approved' directly with a clear message indicating auto-approval.
 *
 * **Completion Summary (Story 4-6):** When all stories are approved, displays a formatted
 * summary with story list and next steps guidance. The workflow exits cleanly without
 * proceeding to implementation (that's what --dev-only mode is for).
 *
 * **Indexing Notes:**
 * - Internal state uses 0-based indexing (0 = first story)
 * - User display uses 1-based indexing (1 = first story)
 * - When resuming, loop starts at `currentStoryIndex` and continues to end
 * - After completion, workflow exits with code 0 (no further phases in batch mode)
 *
 * @param cwd - Current working directory
 * @param state - Current workflow state (will be mutated and saved)
 * @param args - Parsed CLI arguments (yolo flag enables auto-approve mode)
 *
 * @internal
 */
export async function runBatchStoryReviewLoop(
  cwd: string,
  state: State,
  args: CliArgs
): Promise<void> {
  // AC: 1 - Display phase header (first story only - displayed once at start)
  // Only display header if we're starting from the first story (currentStoryIndex === 0)
  // This ensures the header is shown only on the initial run, not on resume
  const isFirstStory = state.workflow.currentStoryIndex === 0;
  if (isFirstStory) {
    displayPhaseHeader('Review');
  }

  // Get all stories for the current epic from sprint-status.yaml
  // This determines the total story count for the loop
  const sprintStatus = await loadSprintStatus(cwd);
  const epicStories = getAllStoriesForEpic(sprintStatus, state.currentEpic);

  if (epicStories.length === 0) {
    error(`No stories found for epic ${state.currentEpic}`);
    error('Batch review requires stories to exist in sprint-status.yaml before running.');
    error('Exiting batch workflow. No stories to review.');
    // No phase transition - workflow will exit naturally
    return;
  }

  // Story 4-6: Check if batch is already complete (resume-after-completion scenario)
  // If all stories are already approved, display completion summary and exit
  if (checkBatchAlreadyComplete(state.stories.approvals)) {
    // Display "already" message to indicate resume scenario, then show completion summary
    // AC:5 message: "All stories already created and approved. Run --dev-only to implement."
    displayStatus('info', 'All stories already created and approved. Run --dev-only to implement.');
    await displayBatchCompletionSummary(cwd, epicStories, state.stories.approvals);
    return;
  }

  // Get the starting index from state (resumes from 0 for fresh start)
  const startIndex = state.workflow.currentStoryIndex;

  // AC: 2 - Iterate from story 1 to N sequentially
  // Note: Loop variable 'i' uses 0-based indexing (0 = first story)
  // User display uses 1-based indexing (1 = first story), so we pass 'i' to UI functions
  // which expect 0-based index internally and handle the conversion for display
  for (let i = startIndex; i < epicStories.length; i++) {
    const _currentStoryNum = i + 1; // 1-based for display/logging only
    const totalStories = epicStories.length;
    const epicStory = epicStories[i];

    // Load the story file to extract metadata
    const story = await loadStory(cwd, epicStory.id);
    if (!story) {
      error(`Story file not found for ${epicStory.id}`);
      error('Skipping to next story. Check story file exists in implementation artifacts.');
      // Save state before skipping to next story
      state.workflow.currentStoryIndex = i + 1;
      await saveState(cwd, state);
      continue;
    }

    // Extract story metadata for display
    // Count tasks from the story file (checkboxes with "- [ ]" prefix)
    // Only count checkboxes within "## Tasks / Subtasks" section to avoid counting
    // acceptance criteria or other sections that also use checkboxes
    let taskCount = 0;
    try {
      const storyContent = await import('node:fs').then((fs) =>
        fs.readFileSync(story.filePath, 'utf-8')
      );
      // Find the Tasks/Subtasks section and extract only that portion
      const tasksSectionMatch = storyContent.match(/##\s+Tasks\s*\/\s*Subtasks([\s\S]*?)(?=##|$)/i);
      if (tasksSectionMatch) {
        const tasksSection = tasksSectionMatch[1];
        const taskMatches = tasksSection.match(/^[\s]*-\s+\[[\s]\]/gm) || [];
        taskCount = taskMatches.length;
      }
      // If no Tasks/Subtasks section found, taskCount remains 0
      // (Don't count checkboxes from other sections like Review Follow-ups)
    } catch {
      // If file read fails, taskCount remains 0
    }

    // Count acceptance criteria from story object
    const _acCount = story.acceptanceCriteria.length;

    // Prepare story card data for UI display
    const storyCardData = {
      title: story.title,
      epicId: state.currentEpic,
      storyId: epicStory.id,
      acceptanceCriteria: story.acceptanceCriteria.map((ac) => ac.text),
      tasks: Array(taskCount).fill(''), // Placeholder array for count
    };

    // AC: 2 - Display story card with title, task count, and AC count
    // Note: displayStoryCard expects 0-based index, so we pass 'i' not 'currentStoryNum'
    displayStoryCard(storyCardData, i, totalStories);

    // Story 4-5: Auto-approve mode - skip approval prompt when yolo is true
    let approvalResult: 'approved' | { type: 'needs-changes'; feedback: string };
    if (args.yolo) {
      // Auto-approve: set approval directly without prompting
      approvalResult = 'approved';
      state.stories.approvals[epicStory.id] = 'approved';
      displayStatus('ok', 'Story auto-approved (--yolo)');
      // Save state after auto-approval for resume capability
      state.workflow.currentStoryIndex = i + 1;
      await saveState(cwd, state);
      // Skip the rest of the loop iteration (revision loop and manual approval handling)
      continue;
    }

    // AC: 3 - Prompt for approval with [Y] Approve, [N] Request changes, [V] View full story
    // Note: promptStoryApproval expects 0-based index, so we pass 'i' not 'currentStoryNum'
    approvalResult = await promptStoryApproval(storyCardData, i, totalStories, story.filePath);

    // Story 4-4: Revision iteration loop - continues until user approves
    let _isRevised = false; // Track if this story has been revised

    while (approvalResult !== 'approved') {
      // Handle 'needs-changes' response (Story 4-4: Change Request Iteration)
      if (typeof approvalResult === 'object' && approvalResult.type === 'needs-changes') {
        const userFeedback = approvalResult.feedback;

        // AC: 1, 2 - Capture feedback and set status
        info(`Change requests for ${epicStory.id}: ${userFeedback}`);
        state.stories.approvals[epicStory.id] = 'needs-changes';

        // Save state before Story Creator re-invocation (critical for resume capability)
        await saveState(cwd, state);

        // AC: 3 - Re-invoke Story Creator agent with feedback
        // Story 4-7: Enhanced retry logic with exponential backoff and rate limit detection
        let _updateSuccess = false;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            await runStoryUpdater(cwd, epicStory.id, story.filePath, userFeedback);
            _updateSuccess = true;
            break;
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);

            // Story 4-7: Check if error is retryable
            // Design decision: Permission errors (EACCES, "permission denied") are treated as non-retryable
            // because they typically indicate fundamental filesystem or configuration issues. See comment in
            // runBatchStoryCreationLoop for detailed rationale.
            const isRetryable =
              errorMessage.includes('ECONNREFUSED') ||
              errorMessage.includes('ETIMEDOUT') ||
              errorMessage.includes('ENOTFOUND') ||
              errorMessage.includes('EAI_AGAIN') ||
              errorMessage.toLowerCase().includes('rate limit') ||
              errorMessage.includes('Claude exited with code') ||
              errorMessage.includes('ENOENT');

            // Non-retryable errors: EACCES (permission denied), Invalid path/file errors
            // Design decision: "Invalid" is only treated as non-retryable when it indicates
            // a fundamental problem with the story path or file structure. See detailed rationale
            // in runBatchStoryCreationLoop.
            const isNonRetryable =
              errorMessage.includes('EACCES') ||
              errorMessage.includes('permission denied') ||
              (errorMessage.includes('Invalid') &&
                (errorMessage.includes('path') ||
                  errorMessage.includes('file') ||
                  errorMessage.includes('story')));

            if (!isRetryable || isNonRetryable) {
              // Non-retryable error - fail immediately and exit with code 1 (per AC 5)
              error(`Story Updater failed for ${epicStory.id}: ${errorMessage}`);
              error('This error is not retryable. Please check your configuration.');
              error(
                'Try: Check file permissions, verify story file exists, or run johnny-bmad with --verbose for more details'
              );
              await saveState(cwd, state);
              process.exit(1);
            }

            // Retryable error - apply retry logic
            if (attempt < MAX_RETRIES) {
              // Story 4-7 AC: 3 - Detect rate limit and apply 60s cooldown (case-insensitive)
              // Note: The '429' check is technically case-insensitive (numbers have no case), while the
              // 'rate limit' check uses toLowerCase() for case-insensitive matching. Both patterns are
              // checked to ensure we catch both numeric HTTP status codes and textual error messages.
              const isRateLimit =
                errorMessage.toLowerCase().includes('rate limit') || errorMessage.includes('429');

              if (isRateLimit) {
                // AC: 3 - Rate limit detected: display warning and wait 60s
                warn(`Rate limited. Waiting 60s...`);
                await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_COOLDOWN));
                warn('Retrying after cooldown...');
              } else {
                // AC: 2 - Normal retry with exponential backoff
                const backoffMs = RETRY_DELAYS[attempt - 1]; // 2s, 4s, 8s
                warn(
                  `Story Updater failed. Retrying in ${backoffMs / 1000}s... (attempt ${attempt}/${MAX_RETRIES})`
                );
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
              }
            } else {
              // AC: 5 - Max retries exceeded - display error block with state info
              error(`Story Updater failed after ${MAX_RETRIES} attempts`);
              error(`State saved at Story ${i + 1}/${epicStories.length}`);
              error(
                `Try: Check network connection, verify API access, or address changes manually then restart johnny-bmad`
              );
              // Note: Error guidance includes "address changes manually" (unlike Story Creator at line 257)
              // because the Updater runs in a change request loop where manual edits are a valid recovery option.
              // Save error state and exit with code 1 per AC 5
              await saveState(cwd, state);
              process.exit(1);
            }
          }
        }

        // Mark as revised for next display
        _isRevised = true;

        // Reload story to get updated content
        const updatedStory = await loadStory(cwd, epicStory.id);
        if (!updatedStory) {
          error(`Failed to reload story ${epicStory.id} after update`);
          // Continue with original story data
        } else {
          // Update story card data with revised content
          storyCardData.title = updatedStory.title;
          storyCardData.acceptanceCriteria = updatedStory.acceptanceCriteria.map((ac) => ac.text);

          // Recount tasks from updated story
          let updatedTaskCount = 0;
          try {
            const updatedStoryContent = await import('node:fs').then((fs) =>
              fs.readFileSync(updatedStory.filePath, 'utf-8')
            );
            const tasksSectionMatch = updatedStoryContent.match(
              /##\s+Tasks\s*\/\s*Subtasks([\s\S]*?)(?=##|$)/i
            );
            if (tasksSectionMatch) {
              const tasksSection = tasksSectionMatch[1];
              const taskMatches = tasksSection.match(/^[\s]*-\s+\[[\s]\]/gm) || [];
              updatedTaskCount = taskMatches.length;
            }
          } catch {
            // If file read fails, keep previous task count
          }
          storyCardData.tasks = Array(updatedTaskCount).fill('');
        }

        // AC: 4 - Re-display story card with (revised) indicator
        displayStoryCard(storyCardData, i, totalStories, true);

        // AC: 4 - Re-run approval prompt after story update
        approvalResult = await promptStoryApproval(storyCardData, i, totalStories, story.filePath);

        // AC: 5 - Continue iteration until user approves (no cycle limit)
        // Loop continues while approvalResult !== 'approved'
        continue;
      }

      // If we get here, something unexpected happened - break to avoid infinite loop
      error(`Unexpected approval result: ${approvalResult}`);
      break;
    }

    // Handle approved result (after potential revisions)
    if (approvalResult === 'approved') {
      // AC: 4 - Set state.stories.approvals[storyId] to 'approved'
      state.stories.approvals[epicStory.id] = 'approved';

      // AC: 4 - Display [OK] Story approved message
      displayStatus('ok', 'Story approved');

      // Save state after each approval (critical for resume capability)
      state.workflow.currentStoryIndex = i + 1;
      await saveState(cwd, state);
    }
  }

  // AC: 6 - Check if all stories have 'approved' status
  const allApproved = epicStories.every(
    (epicStory) => state.stories.approvals[epicStory.id] === 'approved'
  );

  if (allApproved) {
    // Story 4-6: Display completion summary and exit cleanly
    // AC:4: Do NOT transition phase - keep it as 'review' to indicate completion
    // The state.workflow.phase='review' is preserved for --dev-only mode to read from the saved state file
    // The orchestrator will handle clean exit after this function returns
    // Save final state before displaying completion summary
    await saveState(cwd, state);

    // Display the completion summary with story list
    await displayBatchCompletionSummary(cwd, epicStories, state.stories.approvals);

    // Return cleanly - the orchestrator will handle the exit
    // Do NOT proceed to implementation (that's what --dev-only mode is for)
    return;
  }

  // Some stories need changes - workflow will exit
  const needsChangesCount = epicStories.filter(
    (epicStory) => state.stories.approvals[epicStory.id] === 'needs-changes'
  ).length;

  if (needsChangesCount > 0) {
    info(`${needsChangesCount} story(s) need changes. Run johnny-bmad again to continue review.`);
  }
}

/**
 * Run batch workflow for story creation and implementation
 *
 * This function handles the batch workflow mode, which creates all story files upfront
 * before implementing them. It routes to different phases based on the current workflow phase.
 *
 * @param cwd - Current working directory
 * @param state - Current workflow state
 * @param args - Parsed CLI arguments
 * @returns Promise that resolves when the batch workflow completes
 *
 * @internal
 */
export async function runBatchWorkflow(cwd: string, state: State, args: CliArgs): Promise<void> {
  // AC: 4 - Initialize fresh start (phase defaults to story-creation)
  // The state is already initialized with the correct phase before this function is called
  // This is handled in runOrchestrator() when creating initial state

  // AC: 2, 3 - Phase-based routing
  switch (state.workflow.phase) {
    case 'story-creation':
      await runBatchStoryCreationLoop(cwd, state, args);
      break;

    case 'review':
      await runBatchStoryReviewLoop(cwd, state, args);
      break;

    case 'implementation':
      // Implementation phase exists for completeness and future extensibility.
      // While batch mode currently focuses on story creation and review, the
      // implementation phase may be used in future for scenarios such as:
      // - Automated implementation with dev-only mode
      // - Hybrid workflows combining batch creation with sequential implementation
      // - Resume capability after manual intervention during implementation
      info('Batch implementation phase - not yet implemented');
      break;

    default: {
      // This should never happen if the State type is properly enforced
      // However, if we reach here due to corrupted state or type mismatch,
      // we need to fail fast rather than silently continuing
      const unknownPhase = state.workflow.phase as string;
      error(`Invalid workflow phase: "${unknownPhase}"`);
      error('Valid phases are: story-creation, review, implementation');
      error('This may indicate corrupted state or a version mismatch.');
      error('Try: Clear state with --resume=false or delete .johnny-bmad-state.json');
      process.exit(1);
    }
  }
}

/**
 * Known story development status values from sprint-status.yaml
 *
 * This is a union type of allowed status strings for a story's development lifecycle.
 * Note: This is distinct from the StoryStatus interface in types.ts which represents
 * a story object with id, title, and status fields.
 *
 * **When to use:**
 * - Use `StoryDevStatus` for sprint-status.yaml values (string literals like 'ready-for-dev')
 * - Use `StoryStatus` interface for full story objects with metadata (id, title, status)
 *
 * @example
 * ```typescript
 * // StoryDevStatus - use for sprint-status.yaml values
 * const devStatus: StoryDevStatus = sprintStatus.development_status['5-1-shell'];
 *
 * // StoryStatus - use for loaded story objects
 * const story: StoryStatus = await loadStory(cwd, '5-1-shell');
 * ```
 *
 * @since 1.0.0
 */
/**
 * Story development status values for sprint-status.yaml
 *
 * **Status Semantics:**
 * - `'ready-for-dev'` - Story is fully specified, approved, and ready for implementation
 * - `'ready'` - Legacy alias for 'ready-for-dev' (treated identically by findOngoingWork)
 * - `'backlog'` - Story is defined but not yet prioritized for development
 * - `'in-progress'` - Story is currently being implemented
 * - `'review'` - Implementation complete, awaiting code review
 * - `'done'` - Story fully complete (review passed, merged)
 * - `'pending'` - Story awaiting dependencies or prerequisites
 *
 * **Note on 'ready' vs 'ready-for-dev':**
 * Both statuses indicate the story is ready for implementation. 'ready-for-dev' is the
 * canonical status used by the dev-story workflow. 'ready' is a legacy alias maintained
 * for backward compatibility with older sprint-status.yaml files. findOngoingWork()
 * treats both identically when searching for actionable stories.
 *
 * @example
 * ```typescript
 * // Canonical status for new stories
 * const status: StoryDevStatus = 'ready-for-dev';
 *
 * // Legacy alias (still valid, treated same as ready-for-dev)
 * const legacyStatus: StoryDevStatus = 'ready';
 * ```
 *
 * @since 1.0.0
 */
export type StoryDevStatus =
  | 'ready-for-dev'
  | 'backlog'
  | 'in-progress'
  | 'review'
  | 'done'
  | 'ready'
  | 'pending';

/**
 * Story information for implementation (Story 5-2)
 *
 * Represents a story ready for implementation with all necessary metadata.
 * Used by loadStoriesForImplementation() to filter and prepare stories.
 *
 * @since 1.0.0
 */
export interface StoryForImplementation {
  id: string;
  title: string;
  status: StoryDevStatus;
  approvalStatus: 'approved' | 'needs-changes' | 'pending' | 'manual';
}

/**
 * Load stories for implementation from sprint-status (Story 5-2)
 *
 * Filters stories to only those ready for implementation (excludes 'done' stories).
 * Loads story titles from story files and determines approval status from state.
 *
 * **Story Detection (AC 1, 2, 3):**
 * - Uses getAllStoriesForEpic() from utils/files.ts
 * - Loads stories from _bmad-output/implementation-artifacts/
 * - Detects batch-created stories and reads approval status from state
 * - Detects manually created stories (assumed approved)
 *
 * **Filtering Logic:**
 * - Include: ready-for-dev, backlog, in-progress, review
 * - Exclude: done (already implemented)
 *
 * @param cwd - Current working directory
 * @param sprintStatus - Sprint status from sprint-status.yaml
 * @param epicId - Current epic ID (e.g., 'epic-5')
 * @param approvals - Approval statuses from state.stories.approvals
 * @returns Array of stories ready for implementation
 *
 * @example
 * ```typescript
 * // Single story scenario
 * const sprintStatus = await loadSprintStatus(cwd);
 * const stories = await loadStoriesForImplementation(
 *   cwd,
 *   sprintStatus,
 *   'epic-5',
 *   state.stories.approvals
 * );
 * // Returns stories with status !== 'done'
 * ```
 *
 * @example
 * ```typescript
 * // Multi-story scenario with mixed approval statuses
 * const approvals = {
 *   '5-1-shell': 'approved',
 *   '5-2-detection': 'pending',
 *   '5-3-retry': 'needs-changes',
 * };
 * const stories = await loadStoriesForImplementation(cwd, sprintStatus, 'epic-5', approvals);
 * // Returns: [
 * //   { id: '5-1-shell', title: 'Shell implementation', status: 'ready-for-dev', approvalStatus: 'approved' },
 * //   { id: '5-2-detection', title: 'Story detection', status: 'backlog', approvalStatus: 'pending' },
 * //   { id: '5-3-retry', title: 'Dev agent retry', status: 'backlog', approvalStatus: 'needs-changes' },
 * //   { id: '5-4-manual', title: 'Manual story', status: 'ready-for-dev', approvalStatus: 'manual' },
 * // ]
 * ```
 *
 * @since 1.0.0
 */
export async function loadStoriesForImplementation(
  cwd: string,
  sprintStatus: SprintStatus | null,
  epicId: string,
  approvals: Record<string, 'approved' | 'needs-changes' | 'pending'>
): Promise<StoryForImplementation[]> {
  // AC 1 - Use getAllStoriesForEpic() from utils/files.ts
  const epicStories = getAllStoriesForEpic(sprintStatus, epicId);

  // Warn if epicId not found (helps catch configuration errors early)
  if (epicStories.length === 0 && sprintStatus?.development_status) {
    // Check if the epic exists at all
    const hasEpicKey = Object.keys(sprintStatus.development_status).some(
      (key) => key === epicId || key === epicId.replace('epic-', '')
    );
    if (!hasEpicKey) {
      warn(`Epic "${epicId}" not found in sprint-status.yaml`);
    }
  }

  // AC 1 - Filter to only stories with status not 'done'
  // Include: ready-for-dev, backlog, in-progress, review
  // Exclude: done
  const actionableStories = epicStories.filter((story) => story.status !== 'done');

  // Load each story to get title and determine approval status
  const storiesForImplementation: StoryForImplementation[] = [];

  for (const epicStory of actionableStories) {
    // AC 1.3 - Load each story file using loadStory() to get title and metadata
    const story = await loadStory(cwd, epicStory.id);

    // Log warning if story file fails to load (fallback to ID as title)
    if (!story) {
      warn(`Could not load story file for ${epicStory.id}, using ID as title`);
    }

    // AC 2 - Check approval status from state (batch-created stories)
    // AC 3 - Manual stories assumed approved (no approval status required)
    // Note: Stories with no approval record in state are treated as 'manual' (assumed approved).
    // This handles both manually-created stories and edge cases where batch-created stories
    // have corrupted/missing approval status in state.
    let approvalStatus: StoryForImplementation['approvalStatus'];
    const validApprovalStatuses = ['approved', 'needs-changes', 'pending'] as const;
    type ValidApprovalStatus = (typeof validApprovalStatuses)[number];

    if (approvals[epicStory.id]) {
      const rawStatus = approvals[epicStory.id];
      // Runtime validation for approval status (defensive against corrupted state)
      if (validApprovalStatuses.includes(rawStatus as ValidApprovalStatus)) {
        approvalStatus = rawStatus as ValidApprovalStatus;
      } else {
        // Invalid approval status - treat as manual with warning
        warn(
          `Invalid approval status "${String(rawStatus)}" for story ${epicStory.id}, treating as manual`
        );
        approvalStatus = 'manual';
      }
    } else {
      // Manual story - assume approved
      approvalStatus = 'manual';
    }

    storiesForImplementation.push({
      id: epicStory.id,
      // AC 1.3 - Use title from story file, fallback to ID
      title: story?.title || epicStory.id,
      status: epicStory.status as StoryDevStatus,
      approvalStatus,
    });
  }

  return storiesForImplementation;
}

/**
 * Get approval status badge for display
 *
 * Returns a formatted badge string based on approval status with consistent color coding:
 * - approved: green
 * - needs-changes: red (attention required)
 * - pending: yellow (awaiting action)
 * - manual: blue (no approval workflow)
 *
 * @param status - Approval status
 * @returns Formatted badge string with ANSI colors
 *
 * @example
 * ```typescript
 * getApprovalBadge('approved');  // '\x1b[32m[approved]\x1b[0m'
 * getApprovalBadge('pending');   // '\x1b[33m[pending]\x1b[0m'
 * ```
 *
 * @since 1.0.0
 */
export function getApprovalBadge(status: StoryForImplementation['approvalStatus']): string {
  switch (status) {
    case 'approved':
      return chalk.green('[approved]');
    case 'needs-changes':
      return chalk.red('[needs-changes]'); // Red for attention
    case 'pending':
      return chalk.yellow('[pending]'); // Yellow for awaiting
    case 'manual':
      return chalk.blue('[manual]');
    default:
      // Fallback for unexpected values (useful for debugging invalid status)
      return chalk.gray('[unknown]');
  }
}

/**
 * Run Dev agent with retry logic (Story 5-3)
 *
 * Executes the Dev agent with automatic retry on transient failures.
 * Implements exponential backoff (2s, 4s, 8s) and rate limit handling.
 *
 * **Retry Configuration:**
 * - MAX_RETRIES = 3
 * - RETRY_DELAYS = [2000, 4000, 8000] (exponential backoff)
 * - RATE_LIMIT_COOLDOWN = 60000 (60 seconds)
 *
 * **Error Classification:**
 * - **Retryable:** ECONNREFUSED, ETIMEDOUT, ENOTFOUND, EAI_AGAIN, rate limit, Claude exit codes, ENOENT
 * - **Non-retryable:** EACCES, permission denied, Invalid path/file errors
 *
 * **State Persistence:**
 * - State is saved BEFORE spawn by the caller (runDevOnlyImplementationLoop)
 * - State is saved BEFORE throwing on non-retryable errors (ensures resume capability)
 * - State is saved BEFORE process.exit on max retries (ensures resume capability)
 *
 * **Double State-Save Behavior (Non-Retryable Errors):**
 * When a non-retryable error occurs, state is saved twice:
 * 1. In runDevAgentWithRetry (line ~1227) - saves state before throwing
 * 2. In runDevOnlyImplementationLoop (line ~1308-1309) - caller saves state before calling
 *
 * This is INTENTIONAL and provides redundancy:
 * - The caller's save ensures state is persisted before ANY risky operation
 * - The function's save ensures state is persisted even if the caller doesn't handle errors
 * - Both saves use the same index (i), so no data inconsistency - just redundant write
 *
 * Future refactoring could consolidate by having runDevAgentWithRetry NOT save state
 * and letting the caller handle it, but current approach is defensive and safe.
 *
 * **Design Decision - Error Handling Strategy:**
 * Non-retryable errors (e.g., EACCES, Invalid path) throw the original error, allowing
 * callers to handle configuration issues differently (e.g., log specific guidance,
 * attempt alternative paths, or continue with remaining stories). Max retries exceeded
 * uses process.exit(1) because transient failures after full retry indicate system-level
 * issues requiring user intervention before continuing. Both paths save state first to
 * enable resume capability.
 *
 * @param cwd - Current working directory
 * @param storyId - Story ID (e.g., '5-3-implement-dev-agent-execution-with-retry')
 * @param storyFilePath - Full path to the story file
 * @param currentStoryNum - 1-based story number for display (e.g., 3 for "Story 3/8")
 * @param totalStories - Total number of stories in the epic
 * @param state - Current workflow state (saved before throw/exit on errors)
 *
 * @throws Re-throws the original error for non-retryable errors AFTER saving state.
 *         Callers should handle the error appropriately (e.g., exit or continue).
 *
 * @exits Calls process.exit(1) when max retries are exceeded - saves state before exit
 *        to enable resume from the current story index
 *
 * @example
 * ```typescript
 * // Successful execution
 * await runDevAgentWithRetry('/project', '5-1-shell', '/path/to/story.md', 1, 8, state);
 * // Output: [Dev] Implementing 5-1-shell...
 * ```
 *
 * @example
 * ```typescript
 * // Retry on network error
 * // Output: [WARN] Dev agent failed. Retrying in 2s... (attempt 1/3)
 * ```
 *
 * @since 1.0.0
 */
export async function runDevAgentWithRetry(
  cwd: string,
  storyId: string,
  storyFilePath: string,
  currentStoryNum: number,
  totalStories: number,
  state: State
): Promise<void> {
  // AC 1.3 - Display agent activity
  displayAgentActivity('Dev', `Implementing ${storyId}...`);

  // Retry loop with exponential backoff
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // AC 1.5 - Spawn Dev agent via existing runDevAgent() function
      await runDevAgent(cwd, storyId, storyFilePath);

      // Success - return to caller
      return;
    } catch (devError) {
      const errorMessage = devError instanceof Error ? devError.message : String(devError);

      // AC 1.7 - Detect retryable errors
      const isRetryable =
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('EAI_AGAIN') ||
        errorMessage.toLowerCase().includes('rate limit') ||
        errorMessage.includes('429') ||
        errorMessage.includes('Claude exited with code') ||
        errorMessage.includes('ENOENT');

      // AC 1.8 - Detect non-retryable errors
      const isNonRetryable =
        errorMessage.includes('EACCES') ||
        errorMessage.includes('permission denied') ||
        (errorMessage.includes('Invalid') &&
          (errorMessage.includes('path') ||
            errorMessage.includes('file') ||
            errorMessage.includes('story')));

      if (!isRetryable || isNonRetryable) {
        // Non-retryable error - fail immediately
        // Save state before throwing to ensure resume capability (consistency with max retries case)
        await saveState(cwd, state);
        error(`Dev agent failed for ${storyId}: ${errorMessage}`);
        error('This error is not retryable. Please check your configuration.');
        error(
          'Try: Check file permissions, verify paths are valid, or run johnny-bmad with --verbose for more details'
        );
        throw devError;
      }

      // Retryable error - apply retry logic
      if (attempt < MAX_RETRIES) {
        // AC 1.9 - Detect rate limit and apply 60s cooldown
        const isRateLimit =
          errorMessage.toLowerCase().includes('rate limit') || errorMessage.includes('429');

        if (isRateLimit) {
          // AC 4 - Rate limit detected: display warning and wait 60s
          warn('Rate limited. Waiting 60s...');
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_COOLDOWN));
        } else {
          // AC 1.10 - Normal retry with exponential backoff
          const backoffMs = RETRY_DELAYS[attempt - 1]; // 2s, 4s, 8s
          warn(
            `Dev agent failed. Retrying in ${backoffMs / 1000}s... (attempt ${attempt}/${MAX_RETRIES})`
          );
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      } else {
        // AC 1.11 - Max retries exceeded - display error block with state info
        error(`Dev agent failed after ${MAX_RETRIES} attempts`);
        error(`State saved at Story ${currentStoryNum}/${totalStories}`);
        error(
          'Try: Check network connection, verify API access, then restart johnny-bmad to retry'
        );
        // Save state before exit to ensure resume capability (matches Story Creator pattern)
        await saveState(cwd, state);
        process.exit(1);
      }
    }
  }
}

/**
 * Run dev-only implementation loop (Story 5-3)
 *
 * Iterates through stories and executes the Dev agent for each one.
 * Handles state persistence for resume capability and displays progress.
 *
 * **Implementation Loop:**
 * 1. Start from state.workflow.currentStoryIndex (enables resume)
 * 2. For each story:
 *    - Display progress
 *    - Save state BEFORE spawning Dev agent
 *    - Call runDevAgentWithRetry() with error handling
 *    - Update state.workflow.currentStoryIndex after success
 *    - Save state after completion
 *
 * @param cwd - Current working directory
 * @param state - Current workflow state (will be mutated and saved)
 * @param args - Parsed CLI arguments (currently unused but kept for future extensibility;
 *               potential future uses include: yolo mode for auto-approval, verbose logging,
 *               custom retry configuration, or story filtering by ID/pattern)
 * @param stories - Array of stories to implement
 *
 * @internal
 */
export async function runDevOnlyImplementationLoop(
  cwd: string,
  state: State,
  _args: CliArgs,
  stories: StoryForImplementation[]
): Promise<void> {
  // Get the starting index from state (resumes from stored index for fresh start)
  const startIndex = state.workflow.currentStoryIndex;

  // AC 2.3 - Iterate through stories using state.workflow.currentStoryIndex
  for (let i = startIndex; i < stories.length; i++) {
    const story = stories[i];
    const currentStoryNum = i + 1; // 1-based for display
    const totalStories = stories.length;

    // AC 2.7 - Display progress using displayProgress()
    displayProgress(currentStoryNum, totalStories, 'implementing');

    // AC 2.4 - Save state BEFORE spawning Dev agent (critical for resume capability)
    state.workflow.currentStoryIndex = i;
    await saveState(cwd, state);

    // AC 2.4 - Call runDevAgentWithRetry() with proper parameters
    await runDevAgentWithRetry(
      cwd,
      story.id,
      getStoryFilePath(cwd, story.id),
      currentStoryNum,
      totalStories,
      state
    );

    // AC 2.5 - Update state.workflow.currentStoryIndex after successful Dev agent run
    state.workflow.currentStoryIndex = i + 1;

    // AC 2.6 - Save state after each story completion
    await saveState(cwd, state);

    // AC 2.8 - Placeholder for Reviewer agent (Story 5-4)
    // TODO: Story 5-4 will add Reviewer agent execution here
  }
}

/**
 * Display pre-implementation summary (Story 5-2)
 *
 * Shows a formatted summary of stories to be implemented before starting
 * the implementation loop. Includes story count, epic ID, and numbered list.
 *
 * **Display Format (AC 4):**
 * ```
 * ━━━ Dev-Only Mode: Implementation ━━━
 * Found 8 stories for epic: user-authentication
 *
 * Stories to implement:
 *   1. STORY-001: Implement login form
 *   2. STORY-002: Add session management
 *   ...
 *
 * Starting implementation...
 * ```
 *
 * @param epicId - Current epic ID (e.g., 'epic-5')
 * @param stories - Array of stories to implement
 *
 * @example
 * ```typescript
 * displayPreImplementationSummary('epic-5', [
 *   { id: '5-1-shell', title: 'Implement runDevOnlyWorkflow shell', status: 'ready-for-dev', approvalStatus: 'approved' },
 *   { id: '5-2-detection', title: 'Story detection', status: 'backlog', approvalStatus: 'manual' },
 * ]);
 * ```
 *
 * @since 1.0.0
 */
export function displayPreImplementationSummary(
  epicId: string,
  stories: StoryForImplementation[]
): void {
  // Input validation guard - prevent misleading output for empty array
  if (stories.length === 0) {
    warn('displayPreImplementationSummary called with empty stories array');
    return;
  }

  // AC 4.2 - Display phase header using displayPhaseHeader
  displayPhaseHeader('Implementation');

  // AC 4.3 - Display story count: "Found N stories for epic: {epicId}"
  console.log();
  console.log(chalk.bold(`Found ${stories.length} stories for epic: ${epicId}`));
  console.log();

  // AC 4.4 - Display numbered list of stories with titles and approval status badges
  console.log(chalk.bold('Stories to implement:'));
  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    // Display approval status badge
    const badge = getApprovalBadge(story.approvalStatus);
    console.log(`  ${i + 1}. ${story.id}: ${story.title} ${badge}`);
  }

  console.log();

  // AC 4.5 - Display "Starting implementation..." message
  console.log(chalk.cyan('Starting implementation...'));
  console.log();
}

/**
 * Run dev-only workflow for implementing pre-created stories
 *
 * This function handles the dev-only workflow mode, which skips story creation
 * and review phases and proceeds directly to implementation. It requires stories
 * to already exist (created via batch mode).
 *
 * **Phase Behavior:** Dev-only mode only uses the 'implementation' phase,
 * as story creation and review are handled by the batch workflow.
 *
 * **Story Detection:** Loads stories from sprint-status.yaml for the current epic.
 * If no stories are found, displays an error and exits with guidance to run
 * batch mode first.
 *
 * @param cwd - Current working directory
 * @param state - Current workflow state (will be mutated and saved)
 * @param args - Parsed CLI arguments (unused but kept for consistency with other workflows)
 * @returns Promise that resolves when the dev-only workflow completes
 *
 * @throws This function calls process.exit() and never returns normally:
 *   - process.exit(1) when no stories found for epic (error condition)
 *   - process.exit(0) when user declines confirmation prompt (user cancelled)
 *
 * @internal
 */
export async function runDevOnlyWorkflow(cwd: string, state: State, args: CliArgs): Promise<void> {
  // AC 2 - Set phase to 'implementation' at function start
  state.workflow.phase = 'implementation';

  // AC 2 - Save state before proceeding with any workflow logic
  await saveState(cwd, state);

  // AC 1, 2, 3 - Load stories for implementation using helper function
  const sprintStatus = await loadSprintStatus(cwd);
  const storiesForImplementation = await loadStoriesForImplementation(
    cwd,
    sprintStatus,
    state.currentEpic,
    state.stories.approvals
  );

  // AC 1 - Check if stories array is empty
  if (storiesForImplementation.length === 0) {
    // AC 1 - Display error with recovery guidance
    displayStatus('error', 'No stories found for epic');
    error('Dev-only mode requires pre-created stories that are not yet complete');
    error('Try: Run johnny-bmad --batch first to create stories');
    // AC 1 - Exit with error code 1
    process.exit(1);
  }

  // AC 4 - Display pre-implementation summary
  displayPreImplementationSummary(state.currentEpic, storiesForImplementation);

  // AC 5, 6 - Confirmation prompt logic
  if (!args.yolo) {
    // AC 5 - Prompt for confirmation when yolo is false
    const shouldProceed = await confirmAction('Proceed with implementation? [Y/n]', true);

    if (!shouldProceed) {
      // AC 5 - On 'n', exit with code 0 (user cancelled)
      info('Implementation cancelled by user');
      process.exit(0);
    }
  }
  // AC 6 - If yolo is true, skip prompt and proceed immediately (no code needed)

  // Story 5-3: Call runDevOnlyImplementationLoop() with loaded stories
  await runDevOnlyImplementationLoop(cwd, state, args, storiesForImplementation);

  // Story 5-6: Dev-only completion with celebration (placeholder)
  // TODO: Story 5-6 will add completion celebration here
  info(`Implementation complete for ${storiesForImplementation.length} stories`);
  return;
}

export async function runOrchestrator(args: CliArgs): Promise<void> {
  const cwd = process.cwd();
  const maxIterations = args.maxIterations ?? 10;

  // Start session timer
  startSessionTimer();

  if (args.verbose) {
    setVerbose(true);
  }

  header('Johnny BMAD - Implementation Automation');

  // Pre-flight checks
  info('Running pre-flight checks...');

  // Check Claude CLI is installed
  const claudeInstalled = await checkClaudeInstalled();
  if (!claudeInstalled) {
    error('Claude CLI is not installed or not in PATH');
    error('Install it from: https://github.com/anthropics/claude-code');
    process.exit(1);
  }

  // Check we're in a BMAD project
  const isBmad = await isBmadProject(cwd);
  if (!isBmad) {
    error('Not a BMAD project directory.');
    error('Expected to find _bmad/ with bmm configuration.');
    error('Run this command from the root of your BMAD project.');
    process.exit(1);
  }

  // Ensure output directory exists
  await ensureOutputDir(cwd);

  // Check if git repo
  const hasGit = await isGitRepo(cwd);
  if (!hasGit) {
    warn('Not a git repository - commits will be skipped');
  }

  successWithTiming('Pre-flight checks passed');

  // Determine workflow mode from CLI flags
  // This value is used when creating fresh state (Priority 2 and 3 below)
  // Resume path (Priority 1) uses state.workflow.mode from loaded state instead
  // Called here (rather than inside Priority 2/3 blocks) to avoid duplication and keep logic simple
  const mode = determineMode(args);

  // Main epic loop - continues until no more work available
  let continueProcessing = true;

  while (continueProcessing) {
    // Check for ongoing work FIRST (before loading epics or running SM Agent)
    info('Checking for ongoing work...');

    let state = await loadState(cwd);
    let selectedEpicId: string | null = null;
    let _autoStarted = false;
    let ongoingStories: Array<{ id: string; status: string }> = [];

    // Priority 1: Resume from johnny-bmad state (in-progress session)
    if (state) {
      selectedEpicId = state.currentEpic;
      info(`Resuming in ${state.workflow.mode} mode...`);
      success(`Resuming ongoing session: ${state.currentEpic}`);
      info(
        `Story index: ${state.workflow.currentStoryIndex}, Completed: ${state.stories.completed.length}`
      );
      _autoStarted = true;
    }

    // Priority 2: Check sprint-status.yaml for ongoing work
    if (!selectedEpicId) {
      const sprintStatus = await loadSprintStatus(cwd);
      const ongoingWork = findOngoingWork(sprintStatus);

      if (ongoingWork) {
        selectedEpicId = ongoingWork.epicId;
        ongoingStories = ongoingWork.stories;
        state = createInitialState(selectedEpicId);
        state.workflow.mode = mode;
        // NOTE: state.stories.approvals will be populated in future stories (batch/dev-only workflow modes)
        // Currently in sequential mode, approvals are not tracked

        success(`Found ongoing work in epic: ${selectedEpicId}`);
        if (ongoingStories.length > 0) {
          info(
            `Actionable stories: ${ongoingStories.map((s) => `${s.id} (${s.status})`).join(', ')}`
          );
        }
        _autoStarted = true;
      }
    }

    // Priority 3: Fresh start - run SM Agent and select epic
    if (!selectedEpicId) {
      step(1, 4, 'Running SM Agent to check sprint status');
      try {
        await runSmAgent(cwd);
      } catch (smError) {
        const errorMessage = smError instanceof Error ? smError.message : String(smError);
        error(`SM agent failed: ${errorMessage}`);
        warn('Continuing without sprint status check...');
      }

      step(2, 4, 'Loading epics and selecting one to implement');
      let epics = await loadEpics(cwd);

      if (epics.length === 0) {
        // Fallback: load epics from sprint-status.yaml
        const sprintStatus = await loadSprintStatus(cwd);
        epics = getEpicsFromSprintStatus(sprintStatus);

        if (epics.length > 0) {
          warn('No epic files found, using sprint-status.yaml data');
        }
      }

      if (epics.length === 0) {
        error('No epics found in files or sprint-status.yaml');
        error('Run the planning phase first to create epics.');
        process.exit(1);
      }

      const selectedEpicFromPrompt = await selectEpic(epics);
      if (!selectedEpicFromPrompt) {
        error('No epic selected');
        process.exit(1);
      }
      selectedEpicId = selectedEpicFromPrompt.id;
      state = createInitialState(selectedEpicId);
      state.workflow.mode = mode;
      // NOTE: state.stories.approvals will be populated in future stories (batch/dev-only workflow modes)
      // Currently in sequential mode, approvals are not tracked
    }

    // Now load epic details (needed for story processing)
    const epics = await loadEpics(cwd);
    let selectedEpic: Epic | null = epics.find((e) => e.id === selectedEpicId) || null;

    if (!selectedEpic) {
      // Epic not found in files, but we have sprint-status info
      // Build minimal epic from sprint-status data
      // First try ongoingStories (actionable), then fall back to ALL stories for this epic
      const sprintStatus = await loadSprintStatus(cwd);
      const allStoriesForEpic = getAllStoriesForEpic(sprintStatus, selectedEpicId!);
      const storiesToUse = ongoingStories.length > 0 ? ongoingStories : allStoriesForEpic;

      if (storiesToUse.length > 0) {
        warn(`Epic file not found, using sprint-status data for ${selectedEpicId}`);
        // Create synthetic Epic from sprint-status stories
        selectedEpic = {
          id: selectedEpicId!,
          title: `Epic ${selectedEpicId}`,
          stories: storiesToUse.map((s) => ({ id: s.id, title: s.id, status: s.status })),
          filePath: '',
        };
      } else {
        error(`Epic ${selectedEpicId} not found and no story data available`);
        process.exit(1);
      }
    }

    // If epic found but has no stories (regex mismatch), try getting from sprint-status
    if (selectedEpic && selectedEpic.stories.length === 0) {
      const sprintStatus = await loadSprintStatus(cwd);
      const allStories = getAllStoriesForEpic(sprintStatus, selectedEpicId!);
      if (allStories.length > 0) {
        warn(`Epic file has no parseable stories, using sprint-status data`);
        selectedEpic.stories = allStories.map((s) => ({
          id: s.id,
          title: s.id,
          status: s.status,
        }));
      }
    }

    info(`Selected epic: ${selectedEpic.id} - ${selectedEpic.title}`);
    info(`Stories to implement: ${selectedEpic.stories.length}`);

    // Route to appropriate workflow based on mode (use state mode for resume, CLI mode for fresh start)
    const activeMode = state?.workflow.mode;

    if (activeMode === 'batch') {
      // AC: 5 - Call runBatchWorkflow instead of showing warning
      await runBatchWorkflow(cwd, state!, args);

      // Story 4-6: Exit cleanly after batch workflow completes
      // The batch workflow has completed its job (story creation + review)
      // and should not proceed to implementation (that's what --dev-only mode is for)
      //
      // State is saved with phase='review' and all approvals recorded
      // before runBatchWorkflow returns. The process.exit(0) here
      // prevents fall-through to sequential implementation.
      //
      // AC:4 Compliance: state.workflow.phase remains 'review' (completed)
      // and state is saved for future --dev-only run.
      process.exit(0);
    } else if (activeMode === 'dev-only') {
      // AC: 3 - Call runDevOnlyWorkflow instead of showing warning
      await runDevOnlyWorkflow(cwd, state!, args);
      process.exit(0);
    }

    // Sequential mode (default) - existing story loop code continues below
    // Step 3: Story Loop
    step(3, 4, 'Processing stories in epic');

    const stories = selectedEpic.stories;
    const startIndex = state?.workflow.currentStoryIndex || 0;

    for (let i = startIndex; i < stories.length; i++) {
      const epicStory = stories[i];
      state!.workflow.currentStoryIndex = i;
      state!.workflow.devReviewIteration = 0;
      await saveState(cwd, state!);

      header(`Story ${i + 1}/${stories.length}: ${epicStory.id}`);
      info(`Title: ${epicStory.title}`);

      // Check if story already completed (from johnny-bmad state or sprint-status)
      if (state?.stories.completed.includes(epicStory.id) || epicStory.status === 'done') {
        info('Story already completed, skipping');
        continue;
      }

      // Create story file if needed
      const storyExists = await storyFileExists(cwd, epicStory.id);
      if (!storyExists) {
        info('Story file does not exist, creating...');
        try {
          await runStoryCreator(cwd, epicStory, selectedEpic.id);
        } catch (createError) {
          const errorMessage =
            createError instanceof Error ? createError.message : String(createError);
          error(`Story creator failed: ${errorMessage}`);
          warn('Retrying story creation...');

          await new Promise((resolve) => setTimeout(resolve, 2000));

          try {
            await runStoryCreator(cwd, epicStory, selectedEpic.id);
          } catch (retryError) {
            const retryMessage =
              retryError instanceof Error ? retryError.message : String(retryError);
            error(`Story creator failed on retry: ${retryMessage}`);
            error('Saving state and exiting. Run johnny-bmad again to resume.');
            await saveState(cwd, state!);
            process.exit(1);
          }
        }
      }

      // Get story details
      const story = await loadStory(cwd, epicStory.id);
      if (!story) {
        error(`Failed to load story file for ${epicStory.id}`);
        continue;
      }

      // Dev-Review Loop
      let storyComplete = false;
      let iteration = 0;

      while (!storyComplete && iteration < maxIterations) {
        iteration++;
        state!.workflow.devReviewIteration = iteration;
        await saveState(cwd, state!);

        info(`Dev-Review iteration ${iteration}/${maxIterations}`);

        // Run Dev Agent with error handling
        try {
          await runDevAgent(cwd, story.id, story.filePath);
        } catch (devError) {
          const errorMessage = devError instanceof Error ? devError.message : String(devError);
          error(`Dev agent failed: ${errorMessage}`);
          warn('Claude CLI may have encountered an API error. Retrying...');

          // Wait a moment before retry
          await new Promise((resolve) => setTimeout(resolve, 2000));

          try {
            await runDevAgent(cwd, story.id, story.filePath);
          } catch (retryError) {
            const retryMessage =
              retryError instanceof Error ? retryError.message : String(retryError);
            error(`Dev agent failed on retry: ${retryMessage}`);
            error('Saving state and exiting. Run johnny-bmad again to resume.');
            await saveState(cwd, state!);
            process.exit(1);
          }
        }

        // Run Review Agent with error handling
        let reviewResult;
        try {
          reviewResult = await runReviewAgent(cwd, story.id, story.filePath);
        } catch (reviewError) {
          const errorMessage =
            reviewError instanceof Error ? reviewError.message : String(reviewError);
          error(`Review agent failed: ${errorMessage}`);
          warn('Claude CLI may have encountered an API error. Retrying...');

          // Wait a moment before retry
          await new Promise((resolve) => setTimeout(resolve, 2000));

          try {
            reviewResult = await runReviewAgent(cwd, story.id, story.filePath);
          } catch (retryError) {
            const retryMessage =
              retryError instanceof Error ? retryError.message : String(retryError);
            error(`Review agent failed on retry: ${retryMessage}`);
            error('Saving state and exiting. Run johnny-bmad again to resume.');
            await saveState(cwd, state!);
            process.exit(1);
          }
        }

        if (reviewResult.passed) {
          storyComplete = true;
          successWithTiming(`Story ${story.id} completed!`);
        } else {
          warn('Review found issues, running another dev cycle...');
        }
      }

      // Handle max iterations exceeded
      if (!storyComplete) {
        let action: 'continue' | 'complete' | 'skip' | 'abort';

        if (args.yolo) {
          warn(`Yolo mode: auto-completing ${story.id} after ${maxIterations} iterations`);
          action = 'complete';
        } else {
          action = await handleMaxIterations(story.id, maxIterations);
        }

        switch (action) {
          case 'continue':
            // Reset and continue (will be picked up on next run)
            state!.workflow.devReviewIteration = 0;
            await saveState(cwd, state!);
            i--; // Retry this story
            continue;

          case 'complete':
            // Run final dev pass to address last review feedback
            info('Running final dev pass before marking complete...');
            try {
              await runDevAgent(cwd, story.id, story.filePath);
            } catch (devError) {
              const errorMessage = devError instanceof Error ? devError.message : String(devError);
              warn(`Final dev pass failed: ${errorMessage}, marking complete anyway`);
            }
            successWithTiming(`Marking story ${story.id} as complete (user override)`);
            storyComplete = true;
            break;

          case 'skip':
            warn(`Skipping story ${story.id} (marked as blocked)`);
            break;

          case 'abort':
            error('Aborting at user request');
            await saveState(cwd, state!);
            process.exit(1);
        }
      }

      // Commit changes if story completed and we have git
      if (storyComplete && hasGit) {
        let shouldCommit: boolean;
        if (args.yolo) {
          info('Yolo mode: auto-committing changes');
          shouldCommit = true;
        } else {
          shouldCommit = await confirmAction(`Commit changes for ${story.id}?`);
        }
        if (shouldCommit) {
          await commitStoryChanges(cwd, story.id, epicStory.title);
        }
      }

      // Mark story as completed
      state!.stories.completed.push(epicStory.id);
      await saveState(cwd, state!);

      // Update sprint-status.yaml to mark story as done
      if (storyComplete) {
        await updateSprintStatus(cwd, epicStory.id, 'done');
      }
    }

    // Step 4: Complete
    step(4, 4, 'Epic implementation complete');

    // Mark epic and all stories as done in sprint-status.yaml
    const allStoryIds = selectedEpic.stories.map((s) => s.id);
    await markEpicComplete(cwd, selectedEpic.id, allStoryIds);

    header('Epic Complete');
    successWithTiming(`Epic ${selectedEpic.id} finished!`);
    success(`Completed ${state?.stories.completed.length} stories (total: ${getSessionElapsed()})`);

    // Clear state for this epic
    await clearState(cwd);

    console.log();
    console.log(chalk.green.bold(`Epic "${selectedEpic.id}" has been implemented.`));

    // Check if there's more work available
    const nextSprintStatus = await loadSprintStatus(cwd);
    const nextWork = findOngoingWork(nextSprintStatus);

    if (nextWork) {
      let shouldContinue: boolean;
      if (args.yolo) {
        info('Yolo mode: auto-continuing to next epic');
        shouldContinue = true;
      } else {
        shouldContinue = await confirmContinueNextEpic(nextWork.epicId);
      }

      if (shouldContinue) {
        console.log(chalk.cyan(`\nContinuing with epic ${nextWork.epicId}...\n`));
        // Loop continues to next epic
      } else {
        console.log(chalk.yellow('Stopping at user request. Run johnny-bmad again to continue.'));
        continueProcessing = false;
      }
    } else {
      console.log(chalk.yellow('No more epics with pending work. All done!'));
      console.log();
      continueProcessing = false;
    }
  } // end while loop
}
