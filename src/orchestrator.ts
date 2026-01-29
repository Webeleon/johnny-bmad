import chalk from 'chalk';
import type { CliArgs, Epic, State } from './types.js';
import { loadState, saveState, createInitialState, clearState } from './config.js';
import { isBmadProject, ensureOutputDir, loadEpics, loadStory, storyFileExists, loadSprintStatus, findOngoingWork, getAllStoriesForEpic, getEpicsFromSprintStatus, updateSprintStatus, markEpicComplete } from './utils/files.js';
import { selectEpic, confirmResume, handleMaxIterations, confirmAction, confirmContinueNextEpic } from './utils/user-input.js';
import { checkClaudeInstalled } from './claude/cli.js';
import { runSmAgent } from './agents/sm.js';
import { runStoryCreator } from './agents/story-creator.js';
import { runDevAgent } from './agents/dev.js';
import { runReviewAgent } from './agents/reviewer.js';
import { commitStoryChanges, isGitRepo } from './git/commit.js';
import { info, error, success, warn, header, step, setVerbose, successWithTiming } from './utils/logger.js';
import { startSessionTimer, getSessionElapsed } from './utils/timer.js';


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

  // Main epic loop - continues until no more work available
  let continueProcessing = true;

  while (continueProcessing) {
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
    }

    // Now load epic details (needed for story processing)
    const epics = await loadEpics(cwd);
    let selectedEpic: Epic | null = epics.find(e => e.id === selectedEpicId) || null;

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
          stories: storiesToUse.map(s => ({ id: s.id, title: s.id, status: s.status })),
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

      // Check if story already completed (from johnny-bmad state or sprint-status)
      if (state!.completedStories.includes(epicStory.id) || epicStory.status === 'done') {
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
          const errorMessage = createError instanceof Error ? createError.message : String(createError);
          error(`Story creator failed: ${errorMessage}`);
          warn('Retrying story creation...');

          await new Promise(resolve => setTimeout(resolve, 2000));

          try {
            await runStoryCreator(cwd, epicStory, selectedEpic.id);
          } catch (retryError) {
            const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
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
        state!.devReviewIteration = iteration;
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
          await new Promise(resolve => setTimeout(resolve, 2000));

          try {
            await runDevAgent(cwd, story.id, story.filePath);
          } catch (retryError) {
            const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
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
          const errorMessage = reviewError instanceof Error ? reviewError.message : String(reviewError);
          error(`Review agent failed: ${errorMessage}`);
          warn('Claude CLI may have encountered an API error. Retrying...');

          // Wait a moment before retry
          await new Promise(resolve => setTimeout(resolve, 2000));

          try {
            reviewResult = await runReviewAgent(cwd, story.id, story.filePath);
          } catch (retryError) {
            const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
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
            state!.devReviewIteration = 0;
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
      state!.completedStories.push(epicStory.id);
      await saveState(cwd, state!);

      // Update sprint-status.yaml to mark story as done
      if (storyComplete) {
        await updateSprintStatus(cwd, epicStory.id, 'done');
      }
    }

    // Step 4: Complete
    step(4, 4, 'Epic implementation complete');

    // Mark epic and all stories as done in sprint-status.yaml
    const allStoryIds = selectedEpic.stories.map(s => s.id);
    await markEpicComplete(cwd, selectedEpic.id, allStoryIds);

    header('Epic Complete');
    successWithTiming(`Epic ${selectedEpic.id} finished!`);
    success(`Completed ${state!.completedStories.length} stories (total: ${getSessionElapsed()})`);

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
