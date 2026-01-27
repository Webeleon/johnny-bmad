import chalk from 'chalk';
import type { CliArgs, Epic, State } from './types.js';
import { loadState, saveState, createInitialState, clearState } from './config.js';
import { isBmadProject, ensureOutputDir, loadEpics, loadStory, storyFileExists, loadSprintStatus, findOngoingWork, getAllStoriesForEpic } from './utils/files.js';
import { selectEpic, confirmResume, handleMaxIterations, confirmAction } from './utils/user-input.js';
import { checkClaudeInstalled } from './claude/cli.js';
import { runSmAgent } from './agents/sm.js';
import { runStoryCreator } from './agents/story-creator.js';
import { runDevAgent } from './agents/dev.js';
import { runReviewAgent } from './agents/reviewer.js';
import { commitStoryChanges, isGitRepo } from './git/commit.js';
import { info, error, success, warn, header, step, setVerbose, successWithTiming } from './utils/logger.js';
import { startSessionTimer, getSessionElapsed } from './utils/timer.js';

const MAX_DEV_REVIEW_ITERATIONS = 10;

export async function runOrchestrator(args: CliArgs): Promise<void> {
  const cwd = process.cwd();

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

  // Check for ongoing work FIRST (before loading epics or running SM Agent)
  info('Checking for ongoing work...');

  let state = await loadState(cwd);
  let selectedEpicId: string | null = null;
  let autoStarted = false;
  let ongoingStories: Array<{ id: string; status: string }> = [];

  // Priority 1: Resume from johnny-bmad state (in-progress session)
  if (state) {
    selectedEpicId = state.currentEpic;
    success(`Resuming ongoing session: ${state.currentEpic}`);
    info(`Story index: ${state.currentStoryIndex}, Completed: ${state.completedStories.length}`);
    autoStarted = true;
  }

  // Priority 2: Check sprint-status.yaml for ongoing work
  if (!selectedEpicId) {
    const sprintStatus = await loadSprintStatus(cwd);
    const ongoingWork = findOngoingWork(sprintStatus);

    if (ongoingWork) {
      selectedEpicId = ongoingWork.epicId;
      ongoingStories = ongoingWork.stories;
      state = createInitialState(selectedEpicId);

      success(`Found ongoing work in epic: ${selectedEpicId}`);
      if (ongoingStories.length > 0) {
        info(`Actionable stories: ${ongoingStories.map(s => `${s.id} (${s.status})`).join(', ')}`);
      }
      autoStarted = true;
    }
  }

  // Priority 3: Fresh start - run SM Agent and select epic
  if (!selectedEpicId) {
    step(1, 4, 'Running SM Agent to check sprint status');
    await runSmAgent(cwd);

    step(2, 4, 'Loading epics and selecting one to implement');
    const epics = await loadEpics(cwd);

    if (epics.length === 0) {
      error('No epics found in _bmad-output/planning-artifacts/');
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
  }

  // Now load epic details (needed for story processing)
  const epics = await loadEpics(cwd);
  let selectedEpic: Epic | null = epics.find(e => e.id === selectedEpicId) || null;

  if (!selectedEpic) {
    // Epic not found in files, but we have sprint-status info
    // Build minimal epic from sprint-status data
    if (ongoingStories.length > 0) {
      warn(`Epic file not found, using sprint-status data for ${selectedEpicId}`);
      // Create synthetic Epic from sprint-status stories
      selectedEpic = {
        id: selectedEpicId!,
        title: `Epic ${selectedEpicId}`,
        stories: ongoingStories.map(s => ({ id: s.id, title: s.id, status: s.status })),
        filePath: ''
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
      selectedEpic.stories = allStories.map(s => ({
        id: s.id,
        title: s.id,
        status: s.status
      }));
    }
  }

  info(`Selected epic: ${selectedEpic.id} - ${selectedEpic.title}`);
  info(`Stories to implement: ${selectedEpic.stories.length}`);

  // Step 3: Story Loop
  step(3, 4, 'Processing stories in epic');

  const stories = selectedEpic.stories;
  const startIndex = state?.currentStoryIndex || 0;

  for (let i = startIndex; i < stories.length; i++) {
    const epicStory = stories[i];
    state!.currentStoryIndex = i;
    state!.devReviewIteration = 0;
    await saveState(cwd, state!);

    header(`Story ${i + 1}/${stories.length}: ${epicStory.id}`);
    info(`Title: ${epicStory.title}`);

    // Check if story already completed
    if (state!.completedStories.includes(epicStory.id)) {
      info('Story already completed, skipping');
      continue;
    }

    // Create story file if needed
    const storyExists = await storyFileExists(cwd, epicStory.id);
    if (!storyExists) {
      info('Story file does not exist, creating...');
      await runStoryCreator(cwd, epicStory, selectedEpic.id);
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

    while (!storyComplete && iteration < MAX_DEV_REVIEW_ITERATIONS) {
      iteration++;
      state!.devReviewIteration = iteration;
      await saveState(cwd, state!);

      info(`Dev-Review iteration ${iteration}/${MAX_DEV_REVIEW_ITERATIONS}`);

      // Run Dev Agent
      await runDevAgent(cwd, story.id, story.filePath);

      // Run Review Agent
      const reviewResult = await runReviewAgent(cwd, story.id, story.filePath);

      if (reviewResult.passed) {
        storyComplete = true;
        successWithTiming(`Story ${story.id} completed!`);
      } else {
        warn('Review found issues, running another dev cycle...');
      }
    }

    // Handle max iterations exceeded
    if (!storyComplete) {
      const action = await handleMaxIterations(story.id, MAX_DEV_REVIEW_ITERATIONS);

      switch (action) {
        case 'continue':
          // Reset and continue (will be picked up on next run)
          state!.devReviewIteration = 0;
          await saveState(cwd, state!);
          i--; // Retry this story
          continue;

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
      const shouldCommit = await confirmAction(`Commit changes for ${story.id}?`);
      if (shouldCommit) {
        await commitStoryChanges(cwd, story.id, epicStory.title);
      }
    }

    // Mark story as completed
    state!.completedStories.push(epicStory.id);
    await saveState(cwd, state!);
  }

  // Step 4: Complete
  step(4, 4, 'Epic implementation complete');

  header('Epic Complete');
  successWithTiming(`Epic ${selectedEpic.id} finished!`);
  success(`Completed ${state!.completedStories.length} stories (total: ${getSessionElapsed()})`);

  // Clear state for this epic
  await clearState(cwd);

  console.log();
  console.log(chalk.green.bold(`Epic "${selectedEpic.id}" has been implemented.`));
  console.log(chalk.yellow('Run johnny-bmad again to start a new epic.'));
  console.log();

  // Explicit stop - do not auto-continue to next epic
  process.exit(0);
}
