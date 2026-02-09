import chalk from 'chalk';
import { runDevAgent } from './agents/dev.js';
import { runReviewAgent } from './agents/reviewer.js';
import { runSmAgent } from './agents/sm.js';
import { runStoryCreator, runStoryUpdater } from './agents/story-creator.js';
import { checkClaudeInstalled } from './claude/cli.js';
import { clearState, createInitialState, loadState, saveState } from './config.js';
import { commitStoryChanges, isGitRepo } from './git/commit.js';
import type { CliArgs, Epic, State, WorkflowMode } from './types.js';
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

    // Save state BEFORE spawning the Story Creator agent (critical for resume capability)
    // We save the pre-creation index (i) rather than post-creation (i+1) because:
    // 1. If the agent crashes, we want to retry the SAME story, not skip to the next
    // 2. The index only increments AFTER successful creation (line 142)
    // 3. This ensures resume capability - on rerun, we'll retry the failed story
    state.workflow.currentStoryIndex = i;
    await saveState(cwd, state);

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
    } catch (createError) {
      const errorMessage = createError instanceof Error ? createError.message : String(createError);
      error(`Story creator failed for ${epicStory.id}: ${errorMessage}`);
      error('Saving state and exiting. Run johnny-bmad again to resume.');
      await saveState(cwd, state);
      throw createError; // Re-throw to halt execution
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
 * Run batch story review loop
 *
 * Reviews each story created in the story creation phase, allowing the user to approve
 * or request changes. Displays progress using UI components from Epic 3 and saves state
 * after each approval for resume capability.
 *
 * **Implementation:** This function was implemented in Story 4-3 (implement-per-story-review-flow).
 * **Auto-Approve:** Story 4-5 adds auto-approve mode when args.yolo is true.
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
 * **Indexing Notes:**
 * - Internal state uses 0-based indexing (0 = first story)
 * - User display uses 1-based indexing (1 = first story)
 * - When resuming, loop starts at `currentStoryIndex` and continues to end
 * - After completion, workflow exits (no further phases in current batch implementation)
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
        // Use retry logic (3 attempts, exponential backoff) for resilience
        let _updateSuccess = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await runStoryUpdater(cwd, epicStory.id, story.filePath, userFeedback);
            _updateSuccess = true;
            break;
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            if (attempt < 3) {
              warn(`Story updater attempt ${attempt}/3 failed: ${errorMessage}`);
              const backoffMs = 2 ** attempt * 1000; // Exponential backoff: 2s, 4s
              info(`Retrying in ${backoffMs / 1000}s...`);
              await new Promise((resolve) => setTimeout(resolve, backoffMs));
            } else {
              error(`Failed to update story ${epicStory.id} after 3 attempts: ${errorMessage}`);
              error('Try: Address the changes manually or run johnny-bmad again to retry.');
              // Save error state and exit
              await saveState(cwd, state);
              return;
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
    // AC: 6 - All stories approved, transition to completion phase
    // (Completion phase UI will be implemented in Story 4-6)
    state.workflow.phase = 'completion';
    await saveState(cwd, state);

    // Story 4-5: Display auto-approve completion summary when yolo mode is active
    if (args.yolo) {
      displayStatus('ok', `All ${epicStories.length} stories created and approved (--yolo mode)`);
      info('All stories approved. Review phase complete.');
    } else {
      info('All stories approved. Review phase complete.');
    }
    info('Completion phase will be implemented in Story 4-6.');
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
      return;
    } else if (activeMode === 'dev-only') {
      warn('Dev-only workflow not yet implemented');
      warn('        Try: Run without --dev-only flag for default sequential mode');
      return;
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
