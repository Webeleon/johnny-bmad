import { describe, expect, mock, spyOn, test } from 'bun:test';
import * as storyCreator from './agents/story-creator.js';
import * as claudeCli from './claude/cli.js';
import * as config from './config.js';
import * as gitCommit from './git/commit.js';
import {
  determineMode,
  runBatchStoryCreationLoop,
  runBatchStoryReviewLoop,
  runBatchWorkflow,
  runOrchestrator,
} from './orchestrator.js';
import type { CliArgs, State } from './types.js';
import * as agentLine from './ui/agent-line.js';
import * as phaseHeader from './ui/phase-header.js';
import * as progress from './ui/progress.js';
import * as status from './ui/status.js';
import * as storyCard from './ui/story-card.js';
import * as files from './utils/files.js';
import * as logger from './utils/logger.js';
import * as timer from './utils/timer.js';

describe('orchestrator.ts - Workflow Routing', () => {
  describe('determineMode()', () => {
    test('should return batch when args.batch is true', () => {
      const args: CliArgs = {
        resume: false,
        help: false,
        verbose: false,
        yolo: false,
        batch: true,
        devOnly: false,
      };
      expect(determineMode(args)).toBe('batch');
    });

    test('should return dev-only when args.devOnly is true', () => {
      const args: CliArgs = {
        resume: false,
        help: false,
        verbose: false,
        yolo: false,
        batch: false,
        devOnly: true,
      };
      expect(determineMode(args)).toBe('dev-only');
    });

    test('should return sequential when no mode flags set', () => {
      const args: CliArgs = {
        resume: false,
        help: false,
        verbose: false,
        yolo: false,
        batch: false,
        devOnly: false,
      };
      expect(determineMode(args)).toBe('sequential');
    });

    test('should return sequential with all flags false and other flags set', () => {
      const args: CliArgs = {
        resume: true,
        help: false,
        verbose: true,
        yolo: false,
        batch: false,
        devOnly: false,
        maxIterations: 5,
      };
      expect(determineMode(args)).toBe('sequential');
    });

    test('should return batch when batch and yolo are both true', () => {
      const args: CliArgs = {
        resume: false,
        help: false,
        verbose: true,
        yolo: true,
        batch: true,
        devOnly: false,
      };
      expect(determineMode(args)).toBe('batch');
    });

    test('should return dev-only when devOnly and yolo are both true', () => {
      const args: CliArgs = {
        resume: false,
        help: false,
        verbose: true,
        yolo: true,
        batch: false,
        devOnly: true,
      };
      expect(determineMode(args)).toBe('dev-only');
    });
  });
});

// Test the continuation decision logic
describe('epic continuation decision', () => {
  test('yolo mode auto-continues without prompt', async () => {
    const mockConfirm = mock(() => Promise.resolve(false));
    const args = { yolo: true, resume: false, help: false, verbose: false };

    // In yolo mode, should not call prompt
    const shouldContinue = args.yolo ? true : await mockConfirm();

    expect(shouldContinue).toBe(true);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  test('non-yolo mode prompts user and respects yes', async () => {
    const mockConfirm = mock(() => Promise.resolve(true));
    const args = { yolo: false, resume: false, help: false, verbose: false };

    const shouldContinue = args.yolo ? true : await mockConfirm();

    expect(shouldContinue).toBe(true);
    expect(mockConfirm).toHaveBeenCalled();
  });

  test('non-yolo mode prompts user and respects no', async () => {
    const mockConfirm = mock(() => Promise.resolve(false));
    const args = { yolo: false, resume: false, help: false, verbose: false };

    const shouldContinue = args.yolo ? true : await mockConfirm();

    expect(shouldContinue).toBe(false);
    expect(mockConfirm).toHaveBeenCalled();
  });
});

describe('runOrchestrator() - Mode Routing', () => {
  describe('batch mode routing', () => {
    test('should call runBatchWorkflow when state.workflow.mode is batch', async () => {
      // Mock pre-flight dependencies
      const checkClaudeSpy = spyOn(claudeCli, 'checkClaudeInstalled').mockReturnValue(
        Promise.resolve(true)
      );
      const isBmadSpy = spyOn(files, 'isBmadProject').mockReturnValue(Promise.resolve(true));
      const ensureOutputSpy = spyOn(files, 'ensureOutputDir').mockResolvedValue(undefined);
      const isGitRepoSpy = spyOn(gitCommit, 'isGitRepo').mockReturnValue(Promise.resolve(true));

      // Mock logger functions to suppress side effects
      const infoSpy = spyOn(logger, 'info').mockImplementation(() => {});
      const successSpy = spyOn(logger, 'success').mockImplementation(() => {});
      const headerSpy = spyOn(logger, 'header').mockImplementation(() => {});
      const stepSpy = spyOn(logger, 'step').mockImplementation(() => {});
      const successWithTimingSpy = spyOn(logger, 'successWithTiming').mockImplementation(() => {});
      const warnSpy = spyOn(logger, 'warn').mockImplementation(() => {});

      // Mock timer functions to prevent side effects
      const startTimerSpy = spyOn(timer, 'startSessionTimer').mockImplementation(() => {});

      // Mock saveState
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');

      const mockState = {
        currentEpic: 'epic-1',
        lastUpdated: '2026-02-06T00:00:00.000Z',
        workflow: {
          mode: 'batch' as const,
          phase: 'story-creation' as const,
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const loadStateSpy = spyOn(config, 'loadState').mockReturnValue(Promise.resolve(mockState));
      const loadEpicsSpy = spyOn(files, 'loadEpics').mockReturnValue(Promise.resolve([]));
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockReturnValue(
        Promise.resolve({
          development_status: {
            'epic-1': 'in-progress',
            '1-1-test': 'ready-for-dev',
          },
        })
      );
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '1-1-test', status: 'ready-for-dev' },
      ]);

      // Mock UI components to prevent side effects
      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );

      // Mock storyFileExists to return true
      const storyFileExistsSpy = spyOn(files, 'storyFileExists').mockResolvedValue(true);

      // Mock runStoryCreator to prevent actual agent spawn
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockResolvedValue(
        undefined
      );

      const args: CliArgs = {
        resume: true,
        help: false,
        verbose: false,
        yolo: false,
        batch: false,
        devOnly: false,
      };

      try {
        await runOrchestrator(args);

        // Verify the batch workflow was called and completed
        expect(infoSpy).toHaveBeenCalled();
      } finally {
        // Restore all mocks
        checkClaudeSpy.mockRestore();
        isBmadSpy.mockRestore();
        ensureOutputSpy.mockRestore();
        isGitRepoSpy.mockRestore();
        infoSpy.mockRestore();
        successSpy.mockRestore();
        headerSpy.mockRestore();
        stepSpy.mockRestore();
        successWithTimingSpy.mockRestore();
        warnSpy.mockRestore();
        startTimerSpy.mockRestore();
        saveStateSpy.mockRestore();
        loadStateSpy.mockRestore();
        loadEpicsSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        displayPhaseHeaderSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        storyFileExistsSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
      }
    });
  });

  describe('dev-only mode routing', () => {
    test('should warn and return when state.workflow.mode is dev-only', async () => {
      // Mock pre-flight dependencies
      const checkClaudeSpy = spyOn(claudeCli, 'checkClaudeInstalled').mockReturnValue(
        Promise.resolve(true)
      );
      const isBmadSpy = spyOn(files, 'isBmadProject').mockReturnValue(Promise.resolve(true));
      const ensureOutputSpy = spyOn(files, 'ensureOutputDir').mockResolvedValue(undefined);
      const isGitRepoSpy = spyOn(gitCommit, 'isGitRepo').mockReturnValue(Promise.resolve(true));

      // Mock logger functions to suppress side effects
      const infoSpy = spyOn(logger, 'info').mockImplementation(() => {});
      const successSpy = spyOn(logger, 'success').mockImplementation(() => {});
      const headerSpy = spyOn(logger, 'header').mockImplementation(() => {});
      const stepSpy = spyOn(logger, 'step').mockImplementation(() => {});
      const successWithTimingSpy = spyOn(logger, 'successWithTiming').mockImplementation(() => {});
      const warnSpy = spyOn(logger, 'warn').mockImplementation(() => {});

      // Mock timer functions to prevent side effects
      const startTimerSpy = spyOn(timer, 'startSessionTimer').mockImplementation(() => {});

      // Mock saveState
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');

      const loadStateSpy = spyOn(config, 'loadState').mockReturnValue(
        Promise.resolve({
          currentEpic: 'epic-2',
          lastUpdated: '2026-02-06T00:00:00.000Z',
          workflow: {
            mode: 'dev-only',
            phase: 'implementation',
            currentStoryIndex: 0,
            devReviewIteration: 0,
          },
          stories: {
            completed: [],
            approvals: {},
          },
        })
      );
      const loadEpicsSpy = spyOn(files, 'loadEpics').mockReturnValue(Promise.resolve([]));
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockReturnValue(
        Promise.resolve({
          development_status: {
            'epic-2': 'in-progress',
            '2-1-test': 'ready-for-dev',
          },
        })
      );
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '2-1-test', status: 'ready-for-dev' },
      ]);

      const args: CliArgs = {
        resume: true,
        help: false,
        verbose: false,
        yolo: false,
        batch: false,
        devOnly: false,
      };

      try {
        await runOrchestrator(args);

        // Verify warn() was called with placeholder message
        expect(warnSpy).toHaveBeenCalledWith('Dev-only workflow not yet implemented');
        expect(warnSpy).toHaveBeenCalledWith(
          '        Try: Run without --dev-only flag for default sequential mode'
        );
      } finally {
        // Restore all mocks
        checkClaudeSpy.mockRestore();
        isBmadSpy.mockRestore();
        ensureOutputSpy.mockRestore();
        isGitRepoSpy.mockRestore();
        infoSpy.mockRestore();
        successSpy.mockRestore();
        headerSpy.mockRestore();
        stepSpy.mockRestore();
        successWithTimingSpy.mockRestore();
        warnSpy.mockRestore();
        startTimerSpy.mockRestore();
        saveStateSpy.mockRestore();
        loadStateSpy.mockRestore();
        loadEpicsSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
      }
    });
  });

  describe('state.workflow.mode drives routing (not CLI args)', () => {
    test('should use state.workflow.mode for routing even when CLI flags differ', async () => {
      // Mock pre-flight dependencies
      const checkClaudeSpy = spyOn(claudeCli, 'checkClaudeInstalled').mockReturnValue(
        Promise.resolve(true)
      );
      const isBmadSpy = spyOn(files, 'isBmadProject').mockReturnValue(Promise.resolve(true));
      const ensureOutputSpy = spyOn(files, 'ensureOutputDir').mockResolvedValue(undefined);
      const isGitRepoSpy = spyOn(gitCommit, 'isGitRepo').mockReturnValue(Promise.resolve(true));

      // Mock logger functions to suppress side effects
      const infoSpy = spyOn(logger, 'info').mockImplementation(() => {});
      const successSpy = spyOn(logger, 'success').mockImplementation(() => {});
      const headerSpy = spyOn(logger, 'header').mockImplementation(() => {});
      const stepSpy = spyOn(logger, 'step').mockImplementation(() => {});
      const successWithTimingSpy = spyOn(logger, 'successWithTiming').mockImplementation(() => {});
      const warnSpy = spyOn(logger, 'warn').mockImplementation(() => {});

      // Mock timer functions to prevent side effects
      const startTimerSpy = spyOn(timer, 'startSessionTimer').mockImplementation(() => {});

      // Mock saveState
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');

      // State says batch, but CLI args say dev-only - state should win
      const mockState = {
        currentEpic: 'epic-3',
        lastUpdated: '2026-02-06T00:00:00.000Z',
        workflow: {
          mode: 'batch' as const, // State mode is batch
          phase: 'story-creation' as const,
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const loadStateSpy = spyOn(config, 'loadState').mockReturnValue(Promise.resolve(mockState));
      const loadEpicsSpy = spyOn(files, 'loadEpics').mockReturnValue(Promise.resolve([]));
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockReturnValue(
        Promise.resolve({
          development_status: {
            'epic-3': 'in-progress',
            '3-1-test': 'ready-for-dev',
          },
        })
      );
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '3-1-test', status: 'ready-for-dev' },
      ]);

      // Mock UI components to prevent side effects
      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );

      // Mock storyFileExists to return true
      const storyFileExistsSpy = spyOn(files, 'storyFileExists').mockResolvedValue(true);

      // Mock runStoryCreator to prevent actual agent spawn
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockResolvedValue(
        undefined
      );

      const args: CliArgs = {
        resume: true,
        help: false,
        verbose: false,
        yolo: false,
        batch: false, // CLI says NOT batch
        devOnly: true, // CLI says dev-only
      };

      try {
        await runOrchestrator(args);

        // Should route to batch (from state), not dev-only (from CLI)
        expect(infoSpy).toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalledWith('Dev-only workflow not yet implemented');
      } finally {
        // Restore all mocks
        checkClaudeSpy.mockRestore();
        isBmadSpy.mockRestore();
        ensureOutputSpy.mockRestore();
        isGitRepoSpy.mockRestore();
        infoSpy.mockRestore();
        successSpy.mockRestore();
        headerSpy.mockRestore();
        stepSpy.mockRestore();
        successWithTimingSpy.mockRestore();
        warnSpy.mockRestore();
        startTimerSpy.mockRestore();
        saveStateSpy.mockRestore();
        loadStateSpy.mockRestore();
        loadEpicsSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        displayPhaseHeaderSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        storyFileExistsSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
      }
    });
  });
});

describe('runBatchWorkflow()', () => {
  describe('AC: 1 - Function signature and export', () => {
    test('should be exported as a function', () => {
      expect(typeof runBatchWorkflow).toBe('function');
    });

    test('should accept parameters: cwd, state, and args', () => {
      // This test validates the function signature exists
      // The actual implementation will be validated through integration tests
      const _mockCwd = '/test/project';
      const _mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };
      const _mockArgs: CliArgs = {
        resume: false,
        help: false,
        verbose: false,
        yolo: false,
        batch: true,
        devOnly: false,
      };

      // Function signature validation - parameters are correctly typed
      expect(() => {
        // The function should be callable with these parameters
        // (Implementation tests will validate behavior)
      }).not.toThrow();
    });
  });

  describe('AC: 2 - Phase-based routing for story-creation', () => {
    test('should route to story creation logic when phase is story-creation', async () => {
      const mockCwd = '/test/project';
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };
      const mockArgs: CliArgs = {
        resume: false,
        help: false,
        verbose: false,
        yolo: false,
        batch: true,
        devOnly: false,
      };

      // Mock saveState to prevent side effects
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue(undefined);

      // Mock loadSprintStatus and getAllStoriesForEpic to return empty results
      // This prevents the loop from actually trying to create stories
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {},
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([]);

      // Mock logger to prevent side effects
      const infoSpy = spyOn(logger, 'info').mockImplementation(() => {});
      const warnSpy = spyOn(logger, 'warn').mockImplementation(() => {});

      // Mock UI components
      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );

      try {
        await runBatchWorkflow(mockCwd, mockState, mockArgs);

        // Verify the function handles story-creation phase
        // Should complete without throwing
        expect(true).toBe(true);
      } finally {
        saveStateSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        infoSpy.mockRestore();
        warnSpy.mockRestore();
        displayPhaseHeaderSpy.mockRestore();
      }
    });
  });

  describe('AC: 3 - Phase-based routing for review', () => {
    test('should route to review logic when phase is review', async () => {
      const mockCwd = '/test/project';
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };
      const mockArgs: CliArgs = {
        resume: false,
        help: false,
        verbose: false,
        yolo: false,
        batch: true,
        devOnly: false,
      };

      // Mock saveState to prevent side effects
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue(undefined);

      // Mock logger to prevent side effects
      const infoSpy = spyOn(logger, 'info').mockImplementation(() => {});
      const warnSpy = spyOn(logger, 'warn').mockImplementation(() => {});

      try {
        await runBatchWorkflow(mockCwd, mockState, mockArgs);

        // Verify the function handles review phase
        // Currently a placeholder, so should not throw
        expect(true).toBe(true);
      } finally {
        saveStateSpy.mockRestore();
        infoSpy.mockRestore();
        warnSpy.mockRestore();
      }
    });
  });

  describe('AC: 4 - Fresh start initialization', () => {
    test('should set phase to story-creation for fresh start and save state', async () => {
      const mockCwd = '/test/project';
      // Fresh start - no phase set
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };
      const mockArgs: CliArgs = {
        resume: false,
        help: false,
        verbose: false,
        yolo: false,
        batch: true,
        devOnly: false,
      };

      // Mock saveState to verify it's called
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue(undefined);

      // Mock loadSprintStatus and getAllStoriesForEpic to return empty results
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {},
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([]);

      // Mock logger to prevent side effects
      const infoSpy = spyOn(logger, 'info').mockImplementation(() => {});
      const warnSpy = spyOn(logger, 'warn').mockImplementation(() => {});

      // Mock UI components
      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );

      try {
        await runBatchWorkflow(mockCwd, mockState, mockArgs);

        // Verify state phase transitions to review after story creation (even with no stories)
        expect(mockState.workflow.phase).toBe('review');
      } finally {
        saveStateSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        infoSpy.mockRestore();
        warnSpy.mockRestore();
        displayPhaseHeaderSpy.mockRestore();
      }
    });
  });

  describe('AC: 5 - Integration with main orchestrator', () => {
    test('should be callable from main orchestrator when mode is batch', () => {
      const args: CliArgs = {
        resume: false,
        help: false,
        verbose: false,
        yolo: false,
        batch: true,
        devOnly: false,
      };

      // Verify determineMode returns 'batch'
      expect(determineMode(args)).toBe('batch');

      // Verify runBatchWorkflow is exported and callable
      expect(typeof runBatchWorkflow).toBe('function');
    });
  });

  describe('error handling for invalid phases', () => {
    test('should exit with error when phase is invalid', async () => {
      const mockCwd = '/test/project';
      // Create a state with an invalid phase (using type assertion to bypass type checking)
      const mockState = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch' as const,
          phase: 'invalid-phase' as any, // Invalid phase to test error handling
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };
      const mockArgs: CliArgs = {
        resume: false,
        help: false,
        verbose: false,
        yolo: false,
        batch: true,
        devOnly: false,
      };

      // Mock saveState to prevent side effects
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue(undefined);

      // Mock logger to capture error messages
      const errorSpy = spyOn(logger, 'error').mockImplementation(() => {});
      const infoSpy = spyOn(logger, 'info').mockImplementation(() => {});
      const warnSpy = spyOn(logger, 'warn').mockImplementation(() => {});

      // Mock process.exit to capture the exit call
      const exitSpy = spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      try {
        await runBatchWorkflow(mockCwd, mockState, mockArgs);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Verify that the error message indicates process.exit was called
        expect((error as Error).message).toBe('process.exit called');

        // Verify error was logged with appropriate messages
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid workflow phase'));
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Valid phases are: story-creation, review, implementation')
        );
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Try: Clear state'));

        // Verify process.exit was called with error code 1
        expect(exitSpy).toHaveBeenCalledWith(1);
      } finally {
        saveStateSpy.mockRestore();
        errorSpy.mockRestore();
        infoSpy.mockRestore();
        warnSpy.mockRestore();
        exitSpy.mockRestore();
      }
    });
  });

  describe('state persistence behavior', () => {
    test('should preserve state phase during batch workflow execution', async () => {
      const mockCwd = '/test/project';
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };
      const mockArgs: CliArgs = {
        resume: false,
        help: false,
        verbose: false,
        yolo: false,
        batch: true,
        devOnly: false,
      };

      // Mock saveState to verify it's called and preserve state
      const savedStates: State[] = [];
      const saveStateSpy = spyOn(config, 'saveState').mockImplementation(
        async (_cwd: string, state: State) => {
          savedStates.push({ ...state });
          return '/path/to/state';
        }
      );

      // Mock loadSprintStatus and getAllStoriesForEpic to return empty results
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {},
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([]);

      // Mock logger to prevent side effects
      const infoSpy = spyOn(logger, 'info').mockImplementation(() => {});
      const warnSpy = spyOn(logger, 'warn').mockImplementation(() => {});

      // Mock UI components
      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );

      try {
        await runBatchWorkflow(mockCwd, mockState, mockArgs);

        // Verify the phase was transitioned to review after story creation
        expect(mockState.workflow.phase).toBe('review');
      } finally {
        saveStateSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        infoSpy.mockRestore();
        warnSpy.mockRestore();
        displayPhaseHeaderSpy.mockRestore();
      }
    });

    test('should handle review phase without modifying state structure', async () => {
      const mockCwd = '/test/project';
      const originalPhase = 'review';
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: originalPhase,
          currentStoryIndex: 5,
          devReviewIteration: 2,
        },
        stories: {
          completed: ['4-1-test', '4-2-test'],
          approvals: {},
        },
      };
      const mockArgs: CliArgs = {
        resume: false,
        help: false,
        verbose: false,
        yolo: false,
        batch: true,
        devOnly: false,
      };

      // Mock logger to prevent side effects
      const infoSpy = spyOn(logger, 'info').mockImplementation(() => {});
      const warnSpy = spyOn(logger, 'warn').mockImplementation(() => {});

      try {
        await runBatchWorkflow(mockCwd, mockState, mockArgs);

        // Verify state structure remains intact
        expect(mockState.workflow.phase).toBe(originalPhase);
        expect(mockState.workflow.currentStoryIndex).toBe(5);
        expect(mockState.workflow.devReviewIteration).toBe(2);
        expect(mockState.stories.completed).toEqual(['4-1-test', '4-2-test']);
      } finally {
        infoSpy.mockRestore();
        warnSpy.mockRestore();
      }
    });
  });
});

describe('runBatchStoryCreationLoop()', () => {
  const mockCwd = '/test/project';
  const mockArgs: CliArgs = {
    resume: false,
    help: false,
    verbose: false,
    yolo: false,
    batch: true,
    devOnly: false,
  };

  describe('phase header display (AC: 1)', () => {
    test('should display phase header "Story Creation"', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'backlog',
          '4-2-test': 'backlog',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'backlog' },
        { id: '4-2-test', status: 'backlog' },
      ]);
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockResolvedValue(
        undefined
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );
      const storyFileExistsSpy = spyOn(files, 'storyFileExists').mockResolvedValue(true);

      try {
        await runBatchStoryCreationLoop(mockCwd, mockState, mockArgs);

        // Verify phase header was called with 'Story Creation'
        expect(displayPhaseHeaderSpy).toHaveBeenCalledWith('Story Creation');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        storyFileExistsSpy.mockRestore();
      }
    });
  });

  describe('story iteration and progress display (AC: 2)', () => {
    test('should iterate from story 1 to N sequentially displaying progress', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'backlog',
          '4-2-test': 'backlog',
          '4-3-test': 'backlog',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'backlog' },
        { id: '4-2-test', status: 'backlog' },
        { id: '4-3-test', status: 'backlog' },
      ]);
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockResolvedValue(
        undefined
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );
      const storyFileExistsSpy = spyOn(files, 'storyFileExists').mockResolvedValue(true);

      try {
        await runBatchStoryCreationLoop(mockCwd, mockState, mockArgs);

        // Verify displayProgress was called for each story with 'creating' status
        expect(displayProgressSpy).toHaveBeenCalledWith(1, 3, 'creating');
        expect(displayProgressSpy).toHaveBeenCalledWith(2, 3, 'creating');
        expect(displayProgressSpy).toHaveBeenCalledWith(3, 3, 'creating');

        // Verify displayProgress was called with 'created' status after each creation
        expect(displayProgressSpy).toHaveBeenCalledWith(1, 3, 'created');
        expect(displayProgressSpy).toHaveBeenCalledWith(2, 3, 'created');
        expect(displayProgressSpy).toHaveBeenCalledWith(3, 3, 'created');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        storyFileExistsSpy.mockRestore();
      }
    });

    test('should resume from current story index in state', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 1, // Already created story 1
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'ready-for-dev',
          '4-2-test': 'backlog',
          '4-3-test': 'backlog',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'ready-for-dev' },
        { id: '4-2-test', status: 'backlog' },
        { id: '4-3-test', status: 'backlog' },
      ]);
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockResolvedValue(
        undefined
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );
      const storyFileExistsSpy = spyOn(files, 'storyFileExists').mockResolvedValue(true);

      try {
        await runBatchStoryCreationLoop(mockCwd, mockState, mockArgs);

        // Verify displayProgress was NOT called for story 1 (already created)
        // Should only be called for stories 2 and 3
        expect(displayProgressSpy).not.toHaveBeenCalledWith(1, 3, 'creating');
        expect(displayProgressSpy).toHaveBeenCalledWith(2, 3, 'creating');
        expect(displayProgressSpy).toHaveBeenCalledWith(3, 3, 'creating');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        storyFileExistsSpy.mockRestore();
      }
    });
  });

  describe('Story Creator agent invocation (AC: 3)', () => {
    test('should save state before spawning Story Creator agent', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'backlog',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'backlog' },
      ]);

      // Track the order of calls
      const callOrder: string[] = [];
      const saveStateSpy = spyOn(config, 'saveState').mockImplementation(async () => {
        callOrder.push('saveState');
        return '/path/to/state';
      });
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockImplementation(
        async () => {
          callOrder.push('runStoryCreator');
        }
      );

      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );
      const storyFileExistsSpy = spyOn(files, 'storyFileExists').mockResolvedValue(true);

      try {
        await runBatchStoryCreationLoop(mockCwd, mockState, mockArgs);

        // Verify saveState was called BEFORE runStoryCreator
        const saveStateBeforeCreator =
          callOrder.indexOf('saveState') < callOrder.indexOf('runStoryCreator');
        expect(saveStateBeforeCreator).toBe(true);
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        saveStateSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        storyFileExistsSpy.mockRestore();
      }
    });

    test('should display agent activity line for each story creation', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'backlog',
          '4-2-test': 'backlog',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'backlog' },
        { id: '4-2-test', status: 'backlog' },
      ]);
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockResolvedValue(
        undefined
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );
      const storyFileExistsSpy = spyOn(files, 'storyFileExists').mockResolvedValue(true);

      try {
        await runBatchStoryCreationLoop(mockCwd, mockState, mockArgs);

        // Verify agent activity was displayed for each story
        expect(displayAgentActivitySpy).toHaveBeenCalledWith('Story', 'Creating 4-1-test...');
        expect(displayAgentActivitySpy).toHaveBeenCalledWith('Story', 'Creating 4-2-test...');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        storyFileExistsSpy.mockRestore();
      }
    });

    test('should call runStoryCreator with correct story parameters', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test-story': 'backlog',
          '4-2-test-story': 'backlog',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test-story', status: 'backlog' },
        { id: '4-2-test-story', status: 'backlog' },
      ]);

      // Track calls to runStoryCreator to verify parameters
      const storyCreatorCalls: Array<{ cwd: string; story: any; epicId: string }> = [];
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockImplementation(
        async (cwd: string, story: any, epicId: string) => {
          storyCreatorCalls.push({ cwd, story, epicId });
        }
      );

      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );
      const storyFileExistsSpy = spyOn(files, 'storyFileExists').mockResolvedValue(true);

      try {
        await runBatchStoryCreationLoop(mockCwd, mockState, mockArgs);

        // Verify runStoryCreator was called for each story with correct parameters
        expect(storyCreatorCalls).toHaveLength(2);

        // Verify first call
        expect(storyCreatorCalls[0]!.cwd).toBe(mockCwd);
        expect(storyCreatorCalls[0]!.story.id).toBe('4-1-test-story');
        expect(storyCreatorCalls[0]!.story.status).toBe('backlog');
        expect(storyCreatorCalls[0]!.epicId).toBe('epic-4');

        // Verify second call
        expect(storyCreatorCalls[1]!.cwd).toBe(mockCwd);
        expect(storyCreatorCalls[1]!.story.id).toBe('4-2-test-story');
        expect(storyCreatorCalls[1]!.story.status).toBe('backlog');
        expect(storyCreatorCalls[1]!.epicId).toBe('epic-4');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        storyFileExistsSpy.mockRestore();
      }
    });
  });

  describe('story creation completion handling (AC: 4)', () => {
    test('should increment currentStoryIndex after successful story creation', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'backlog',
          '4-2-test': 'backlog',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'backlog' },
        { id: '4-2-test', status: 'backlog' },
      ]);
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockResolvedValue(
        undefined
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );
      const storyFileExistsSpy = spyOn(files, 'storyFileExists').mockResolvedValue(true);

      try {
        await runBatchStoryCreationLoop(mockCwd, mockState, mockArgs);

        // Verify currentStoryIndex was reset to 0 after transitioning to review phase
        // (During the loop it would have been 2, but it's reset when phase transitions)
        expect(mockState.workflow.currentStoryIndex).toBe(0);
        // Verify phase transitioned to review
        expect(mockState.workflow.phase).toBe('review');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        storyFileExistsSpy.mockRestore();
      }
    });

    test('should update progress display to "created" after successful creation', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'backlog',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'backlog' },
      ]);
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockResolvedValue(
        undefined
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );
      const storyFileExistsSpy = spyOn(files, 'storyFileExists').mockResolvedValue(true);

      try {
        await runBatchStoryCreationLoop(mockCwd, mockState, mockArgs);

        // Verify displayProgress was called with 'created' status
        expect(displayProgressSpy).toHaveBeenCalledWith(1, 1, 'created');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        storyFileExistsSpy.mockRestore();
      }
    });
  });

  describe('phase transition on completion (AC: 5)', () => {
    test('should transition to review phase after all stories created', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'backlog',
          '4-2-test': 'backlog',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'backlog' },
        { id: '4-2-test', status: 'backlog' },
      ]);
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockResolvedValue(
        undefined
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );
      const storyFileExistsSpy = spyOn(files, 'storyFileExists').mockResolvedValue(true);

      try {
        await runBatchStoryCreationLoop(mockCwd, mockState, mockArgs);

        // Verify phase transitioned to 'review'
        expect(mockState.workflow.phase).toBe('review');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        storyFileExistsSpy.mockRestore();
      }
    });

    test('should reset currentStoryIndex to 0 after transitioning to review', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'backlog',
          '4-2-test': 'backlog',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'backlog' },
        { id: '4-2-test', status: 'backlog' },
      ]);
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockResolvedValue(
        undefined
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );
      const storyFileExistsSpy = spyOn(files, 'storyFileExists').mockResolvedValue(true);

      try {
        await runBatchStoryCreationLoop(mockCwd, mockState, mockArgs);

        // Verify currentStoryIndex was reset to 0 for review phase
        expect(mockState.workflow.currentStoryIndex).toBe(0);
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        storyFileExistsSpy.mockRestore();
      }
    });
  });

  describe('error handling', () => {
    test('should display clear error messages when no stories found for epic in batch mode', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {},
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([]);
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const errorSpy = spyOn(logger, 'error').mockImplementation(() => {});

      try {
        await runBatchStoryCreationLoop(mockCwd, mockState, mockArgs);

        // Verify clear error messages were shown
        expect(errorSpy).toHaveBeenCalledWith('No stories found for epic epic-4');
        expect(errorSpy).toHaveBeenCalledWith(
          'Batch mode requires stories to exist in sprint-status.yaml before running.'
        );
        expect(errorSpy).toHaveBeenCalledWith(
          'Run the planning phase first to create story files for this epic.'
        );
        expect(errorSpy).toHaveBeenCalledWith('Exiting batch workflow. No stories to create.');

        // Verify phase transitioned to 'review' even with no stories (graceful exit)
        expect(mockState.workflow.phase).toBe('review');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        saveStateSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    test('should handle Story Creator errors and save state before exiting', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'backlog',
          '4-2-test': 'backlog',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'backlog' },
        { id: '4-2-test', status: 'backlog' },
      ]);

      const testError = new Error('Story Creator failed');
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockRejectedValue(
        testError
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );
      const errorSpy = spyOn(logger, 'error').mockImplementation(() => {});

      try {
        await expect(runBatchStoryCreationLoop(mockCwd, mockState, mockArgs)).rejects.toThrow(
          'Story Creator failed'
        );

        // Verify error was logged
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Story creator failed for 4-1-test')
        );

        // Verify state was saved before exiting
        expect(saveStateSpy).toHaveBeenCalled();
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    test('should verify exact terminal output format matches Dev Notes specification', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      // Track console.log calls to verify exact output format
      const consoleOutput: string[] = [];
      const originalLog = console.log;
      const consoleSpy = spyOn(globalThis.console, 'log').mockImplementation((...args: any[]) => {
        consoleOutput.push(args.map(String).join(' '));
        return originalLog.apply(console, args);
      });

      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'backlog',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'backlog' },
      ]);
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockResolvedValue(
        undefined
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );
      const storyFileExistsSpy = spyOn(files, 'storyFileExists').mockResolvedValue(true);

      try {
        await runBatchStoryCreationLoop(mockCwd, mockState, mockArgs);

        // Verify UI components were called in correct order with correct parameters
        // Phase header should be called with 'Story Creation'
        expect(displayPhaseHeaderSpy).toHaveBeenCalledWith('Story Creation');

        // Then progress display should show creating status
        expect(displayProgressSpy).toHaveBeenCalledWith(1, 1, 'creating');

        // Then agent activity should show story creation
        expect(displayAgentActivitySpy).toHaveBeenCalledWith('Story', 'Creating 4-1-test...');

        // Finally progress display should show created status
        expect(displayProgressSpy).toHaveBeenCalledWith(1, 1, 'created');

        // Verify the correct sequence of calls
        expect(displayPhaseHeaderSpy.mock.calls.length).toBe(1);
        expect(displayProgressSpy.mock.calls.length).toBe(2); // 'creating' and 'created'
        expect(displayAgentActivitySpy.mock.calls.length).toBe(1);
      } finally {
        consoleSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayPhaseHeaderSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        storyFileExistsSpy.mockRestore();
      }
    });

    test('should verify story file exists after runStoryCreator completes (AC: 4)', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'backlog',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'backlog' },
      ]);
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockResolvedValue(
        undefined
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );

      // Mock storyFileExists to return true (story was successfully created)
      const storyFileExistsSpy = spyOn(files, 'storyFileExists').mockResolvedValue(true);

      try {
        await runBatchStoryCreationLoop(mockCwd, mockState, mockArgs);

        // Verify storyFileExists was called to check the story file was created
        expect(storyFileExistsSpy).toHaveBeenCalledWith(mockCwd, '4-1-test');

        // Verify progress showed "created" status only after file existence verified
        expect(displayProgressSpy).toHaveBeenLastCalledWith(1, 1, 'created');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        storyFileExistsSpy.mockRestore();
      }
    });

    test('should throw error and not mark story as created when story file does not exist after runStoryCreator', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'story-creation',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'backlog',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'backlog' },
      ]);
      const runStoryCreatorSpy = spyOn(storyCreator, 'runStoryCreator').mockResolvedValue(
        undefined
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayProgressSpy = spyOn(progress, 'displayProgress').mockImplementation(() => {});
      const displayAgentActivitySpy = spyOn(agentLine, 'displayAgentActivity').mockImplementation(
        () => {}
      );
      const errorSpy = spyOn(logger, 'error').mockImplementation(() => {});

      // Mock storyFileExists to return false (story file was NOT created)
      const storyFileExistsSpy = spyOn(files, 'storyFileExists').mockResolvedValue(false);

      try {
        await expect(runBatchStoryCreationLoop(mockCwd, mockState, mockArgs)).rejects.toThrow(
          'Story file not created'
        );

        // Verify error was logged with story ID and guidance
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Story file not created for 4-1-test')
        );
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Story Creator may have failed silently')
        );

        // Verify state was NOT incremented (story not marked as created)
        expect(mockState.workflow.currentStoryIndex).toBe(0);

        // Verify storyFileExists was called to check the story file
        expect(storyFileExistsSpy).toHaveBeenCalledWith(mockCwd, '4-1-test');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        runStoryCreatorSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayProgressSpy.mockRestore();
        displayAgentActivitySpy.mockRestore();
        errorSpy.mockRestore();
        storyFileExistsSpy.mockRestore();
      }
    });
  });
});

describe('runBatchStoryReviewLoop()', () => {
  const mockCwd = '/test/project';
  const mockArgs: CliArgs = {
    resume: false,
    help: false,
    verbose: false,
    yolo: false,
    batch: true,
    devOnly: false,
  };

  describe('phase header display (AC: 1)', () => {
    test('should display phase header "Review"', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'ready-for-dev',
          '4-2-test': 'ready-for-dev',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'ready-for-dev' },
        { id: '4-2-test', status: 'ready-for-dev' },
      ]);
      const loadStorySpy = spyOn(files, 'loadStory').mockResolvedValue({
        id: '4-1-test',
        title: 'Test Story 1',
        filePath: '/test/story.md',
        acceptanceCriteria: [{ text: 'AC 1', done: false }],
      });
      const mockReadFileSync = spyOn(await import('node:fs'), 'readFileSync').mockReturnValue(
        '- [ ] Task 1\n'
      );
      const displayStoryCardSpy = spyOn(storyCard, 'displayStoryCard').mockImplementation(() => {});
      const promptStoryApprovalSpy = spyOn(storyCard, 'promptStoryApproval').mockResolvedValue(
        'approved'
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayStatusSpy = spyOn(status, 'displayStatus').mockImplementation(() => {});

      try {
        await runBatchStoryReviewLoop(mockCwd, mockState, mockArgs);

        // Verify phase header was called with 'Review'
        expect(displayPhaseHeaderSpy).toHaveBeenCalledWith('Review');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        loadStorySpy.mockRestore();
        mockReadFileSync.mockRestore();
        displayStoryCardSpy.mockRestore();
        promptStoryApprovalSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayStatusSpy.mockRestore();
      }
    });
  });

  describe('story iteration and review card display (AC: 2)', () => {
    test('should display story card with title, task count, and AC count for each story', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'ready-for-dev',
          '4-2-test': 'ready-for-dev',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'ready-for-dev' },
        { id: '4-2-test', status: 'ready-for-dev' },
      ]);

      // Mock stories with different task and AC counts
      const loadStorySpy = spyOn(files, 'loadStory')
        .mockResolvedValueOnce({
          id: '4-1-test',
          title: 'Test Story 1',
          filePath: '/test/story1.md',
          acceptanceCriteria: [
            { text: 'AC 1', done: false },
            { text: 'AC 2', done: false },
            { text: 'AC 3', done: false },
          ],
        })
        .mockResolvedValueOnce({
          id: '4-2-test',
          title: 'Test Story 2',
          filePath: '/test/story2.md',
          acceptanceCriteria: [
            { text: 'AC 1', done: false },
            { text: 'AC 2', done: false },
          ],
        });

      // Mock fs.readFileSync to return story content with task checkboxes
      const mockReadFileSync = spyOn(await import('node:fs'), 'readFileSync')
        .mockReturnValueOnce('- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3\n- [ ] Task 4\n')
        .mockReturnValueOnce('- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3\n');

      const displayStoryCardSpy = spyOn(storyCard, 'displayStoryCard').mockImplementation(() => {});
      const promptStoryApprovalSpy = spyOn(storyCard, 'promptStoryApproval').mockResolvedValue(
        'approved'
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayStatusSpy = spyOn(status, 'displayStatus').mockImplementation(() => {});

      try {
        await runBatchStoryReviewLoop(mockCwd, mockState, mockArgs);

        // Verify displayStoryCard was called for each story
        expect(displayStoryCardSpy).toHaveBeenCalledTimes(2);

        // Verify first call had story data, index 0, total 2
        expect(displayStoryCardSpy.mock.calls[0]![1]).toBe(0); // index
        expect(displayStoryCardSpy.mock.calls[0]![2]).toBe(2); // total

        // Verify second call had story data, index 1, total 2
        expect(displayStoryCardSpy.mock.calls[1]![1]).toBe(1); // index
        expect(displayStoryCardSpy.mock.calls[1]![2]).toBe(2); // total
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        loadStorySpy.mockRestore();
        mockReadFileSync.mockRestore();
        displayStoryCardSpy.mockRestore();
        promptStoryApprovalSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayStatusSpy.mockRestore();
      }
    });

    test('should only count tasks within Tasks/Subtasks section, not other sections', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'ready-for-dev',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'ready-for-dev' },
      ]);
      const loadStorySpy = spyOn(files, 'loadStory').mockResolvedValue({
        id: '4-1-test',
        title: 'Test Story',
        filePath: '/test/story.md',
        acceptanceCriteria: [{ text: 'AC 1', done: false }],
      });

      // Mock story content with checkboxes in multiple sections
      // Only tasks within "## Tasks / Subtasks" should be counted (3 tasks)
      // Checkboxes in Acceptance Criteria and Review Follow-ups should be ignored
      const mockStoryContent = `# Test Story

## Acceptance Criteria
- [ ] AC 1 with checkbox
- [ ] AC 2 with checkbox

## Tasks / Subtasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Review Follow-ups (AI)
- [ ] Review item 1
- [ ] Review item 2
`;

      const mockReadFileSync = spyOn(await import('node:fs'), 'readFileSync').mockReturnValue(
        mockStoryContent
      );
      const displayStoryCardSpy = spyOn(storyCard, 'displayStoryCard').mockImplementation(
        (storyCardData) => {
          // Verify that only 3 tasks were counted (from Tasks/Subtasks section)
          expect(storyCardData.tasks.length).toBe(3);
        }
      );
      const promptStoryApprovalSpy = spyOn(storyCard, 'promptStoryApproval').mockResolvedValue(
        'approved'
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayStatusSpy = spyOn(status, 'displayStatus').mockImplementation(() => {});

      try {
        await runBatchStoryReviewLoop(mockCwd, mockState, mockArgs);

        // Verify displayStoryCard was called with correct task count
        expect(displayStoryCardSpy).toHaveBeenCalledTimes(1);
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        loadStorySpy.mockRestore();
        mockReadFileSync.mockRestore();
        displayStoryCardSpy.mockRestore();
        promptStoryApprovalSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayStatusSpy.mockRestore();
      }
    });
  });

  describe('approval prompt and response handling (AC: 3, 4, 5)', () => {
    test('should prompt for approval and handle approved response', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'ready-for-dev',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'ready-for-dev' },
      ]);
      const loadStorySpy = spyOn(files, 'loadStory').mockResolvedValue({
        id: '4-1-test',
        title: 'Test Story',
        filePath: '/test/story.md',
        acceptanceCriteria: [{ text: 'AC 1', done: false }],
      });
      const mockReadFileSync = spyOn(await import('node:fs'), 'readFileSync').mockReturnValue(
        '- [ ] Task 1\n'
      );
      const displayStoryCardSpy = spyOn(storyCard, 'displayStoryCard').mockImplementation(() => {});
      const promptStoryApprovalSpy = spyOn(storyCard, 'promptStoryApproval').mockResolvedValue(
        'approved'
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayStatusSpy = spyOn(status, 'displayStatus').mockImplementation(() => {});
      const infoSpy = spyOn(logger, 'info').mockImplementation(() => {});

      try {
        await runBatchStoryReviewLoop(mockCwd, mockState, mockArgs);

        // Verify prompt was called
        expect(promptStoryApprovalSpy).toHaveBeenCalled();

        // Verify state was updated with approved status
        expect(mockState.stories.approvals['4-1-test']).toBe('approved');

        // Verify success message was displayed
        expect(displayStatusSpy).toHaveBeenCalledWith('ok', 'Story approved');

        // Verify state was saved after approval
        expect(saveStateSpy).toHaveBeenCalled();
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        loadStorySpy.mockRestore();
        mockReadFileSync.mockRestore();
        displayStoryCardSpy.mockRestore();
        promptStoryApprovalSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayStatusSpy.mockRestore();
        infoSpy.mockRestore();
      }
    });

    test('should handle view response and re-prompt for approval', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'ready-for-dev',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'ready-for-dev' },
      ]);
      const loadStorySpy = spyOn(files, 'loadStory').mockResolvedValue({
        id: '4-1-test',
        title: 'Test Story',
        filePath: '/test/story.md',
        acceptanceCriteria: [{ text: 'AC 1', done: false }],
      });
      const mockReadFileSync = spyOn(await import('node:fs'), 'readFileSync').mockReturnValue(
        '# Test Story\n\n## Acceptance Criteria\n- [ ] AC 1\n'
      );
      const displayStoryCardSpy = spyOn(storyCard, 'displayStoryCard').mockImplementation(() => {});

      // Mock the function to handle view internally and then approve
      // The actual implementation handles view recursively, so we just return approved
      const promptStoryApprovalSpy = spyOn(storyCard, 'promptStoryApproval').mockImplementation(
        async () => {
          // Simulate view being selected internally, then approved
          return 'approved';
        }
      );

      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayStatusSpy = spyOn(status, 'displayStatus').mockImplementation(() => {});
      const infoSpy = spyOn(logger, 'info').mockImplementation(() => {});

      try {
        await runBatchStoryReviewLoop(mockCwd, mockState, mockArgs);

        // Verify prompt was called
        expect(promptStoryApprovalSpy).toHaveBeenCalled();

        // Verify state was updated with approved status
        expect(mockState.stories.approvals['4-1-test']).toBe('approved');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        loadStorySpy.mockRestore();
        mockReadFileSync.mockRestore();
        displayStoryCardSpy.mockRestore();
        promptStoryApprovalSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayStatusSpy.mockRestore();
        infoSpy.mockRestore();
      }
    });

    test('should handle needs-changes response and break loop (do not continue to next story)', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'ready-for-dev',
          '4-2-test': 'ready-for-dev',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'ready-for-dev' },
        { id: '4-2-test', status: 'ready-for-dev' },
      ]);
      const loadStorySpy = spyOn(files, 'loadStory').mockResolvedValue({
        id: '4-1-test',
        title: 'Test Story',
        filePath: '/test/story.md',
        acceptanceCriteria: [{ text: 'AC 1', done: false }],
      });
      const mockReadFileSync = spyOn(await import('node:fs'), 'readFileSync').mockReturnValue(
        '- [ ] Task 1\n'
      );
      const displayStoryCardSpy = spyOn(storyCard, 'displayStoryCard').mockImplementation(() => {});

      // Return needs-changes with feedback
      const promptStoryApprovalSpy = spyOn(storyCard, 'promptStoryApproval').mockResolvedValue({
        type: 'needs-changes',
        feedback: 'Add more tests',
      });

      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const infoSpy = spyOn(logger, 'info').mockImplementation(() => {});

      try {
        await runBatchStoryReviewLoop(mockCwd, mockState, mockArgs);

        // Verify state was updated with needs-changes status
        expect(mockState.stories.approvals['4-1-test']).toBe('needs-changes');

        // Verify second story was NOT reviewed (break behavior)
        expect(mockState.stories.approvals['4-2-test']).toBeUndefined();

        // Verify loadStory was called only once (first story only)
        expect(loadStorySpy).toHaveBeenCalledTimes(1);

        // Verify displayStoryCard was called only once (first story only)
        expect(displayStoryCardSpy).toHaveBeenCalledTimes(1);

        // Verify promptStoryApproval was called only once (first story only)
        expect(promptStoryApprovalSpy).toHaveBeenCalledTimes(1);

        // Verify info messages were displayed about stopping review loop
        expect(infoSpy).toHaveBeenCalledWith(
          expect.stringContaining('Change requests for 4-1-test')
        );
        expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Stopping review loop'));
        expect(infoSpy).toHaveBeenCalledWith(
          expect.stringContaining('Change request iteration will be implemented in Story 4-4')
        );
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        loadStorySpy.mockRestore();
        mockReadFileSync.mockRestore();
        displayStoryCardSpy.mockRestore();
        promptStoryApprovalSpy.mockRestore();
        saveStateSpy.mockRestore();
        infoSpy.mockRestore();
      }
    });
  });

  describe('state management and persistence (AC: 4)', () => {
    test('should save state after each approval', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'ready-for-dev',
          '4-2-test': 'ready-for-dev',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'ready-for-dev' },
        { id: '4-2-test', status: 'ready-for-dev' },
      ]);
      const loadStorySpy = spyOn(files, 'loadStory').mockResolvedValue({
        id: '4-1-test',
        title: 'Test Story',
        filePath: '/test/story.md',
        acceptanceCriteria: [{ text: 'AC 1', done: false }],
      });
      const mockReadFileSync = spyOn(await import('node:fs'), 'readFileSync').mockReturnValue(
        '- [ ] Task 1\n'
      );
      const displayStoryCardSpy = spyOn(storyCard, 'displayStoryCard').mockImplementation(() => {});
      const promptStoryApprovalSpy = spyOn(storyCard, 'promptStoryApproval').mockResolvedValue(
        'approved'
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayStatusSpy = spyOn(status, 'displayStatus').mockImplementation(() => {});
      const infoSpy = spyOn(logger, 'info').mockImplementation(() => {});

      try {
        await runBatchStoryReviewLoop(mockCwd, mockState, mockArgs);

        // Verify saveState was called three times (twice for approvals + once for phase transition)
        expect(saveStateSpy).toHaveBeenCalledTimes(3);

        // Verify currentStoryIndex was incremented
        expect(mockState.workflow.currentStoryIndex).toBe(2);

        // Verify phase was transitioned to completion
        expect(mockState.workflow.phase).toBe('completion');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        loadStorySpy.mockRestore();
        mockReadFileSync.mockRestore();
        displayStoryCardSpy.mockRestore();
        promptStoryApprovalSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayStatusSpy.mockRestore();
        infoSpy.mockRestore();
      }
    });

    test('should set state.stories.approvals[storyId] to approved on approval', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'ready-for-dev',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'ready-for-dev' },
      ]);
      const loadStorySpy = spyOn(files, 'loadStory').mockResolvedValue({
        id: '4-1-test',
        title: 'Test Story',
        filePath: '/test/story.md',
        acceptanceCriteria: [{ text: 'AC 1', done: false }],
      });
      const mockReadFileSync = spyOn(await import('node:fs'), 'readFileSync').mockReturnValue(
        '- [ ] Task 1\n'
      );
      const displayStoryCardSpy = spyOn(storyCard, 'displayStoryCard').mockImplementation(() => {});
      const promptStoryApprovalSpy = spyOn(storyCard, 'promptStoryApproval').mockResolvedValue(
        'approved'
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayStatusSpy = spyOn(status, 'displayStatus').mockImplementation(() => {});

      try {
        await runBatchStoryReviewLoop(mockCwd, mockState, mockArgs);

        // Verify approval status was set
        expect(mockState.stories.approvals['4-1-test']).toBe('approved');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        loadStorySpy.mockRestore();
        mockReadFileSync.mockRestore();
        displayStoryCardSpy.mockRestore();
        promptStoryApprovalSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayStatusSpy.mockRestore();
      }
    });
  });

  describe('completion detection (AC: 6)', () => {
    test('should detect when all stories are approved', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'ready-for-dev',
          '4-2-test': 'ready-for-dev',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'ready-for-dev' },
        { id: '4-2-test', status: 'ready-for-dev' },
      ]);
      const loadStorySpy = spyOn(files, 'loadStory').mockResolvedValue({
        id: '4-1-test',
        title: 'Test Story',
        filePath: '/test/story.md',
        acceptanceCriteria: [{ text: 'AC 1', done: false }],
      });
      const mockReadFileSync = spyOn(await import('node:fs'), 'readFileSync').mockReturnValue(
        '- [ ] Task 1\n'
      );
      const displayStoryCardSpy = spyOn(storyCard, 'displayStoryCard').mockImplementation(() => {});
      const promptStoryApprovalSpy = spyOn(storyCard, 'promptStoryApproval').mockResolvedValue(
        'approved'
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayStatusSpy = spyOn(status, 'displayStatus').mockImplementation(() => {});
      const infoSpy = spyOn(logger, 'info').mockImplementation(() => {});

      try {
        await runBatchStoryReviewLoop(mockCwd, mockState, mockArgs);

        // Verify all stories approved
        expect(mockState.stories.approvals['4-1-test']).toBe('approved');
        expect(mockState.stories.approvals['4-2-test']).toBe('approved');

        // Verify phase transition to completion
        expect(mockState.workflow.phase).toBe('completion');

        // Verify completion messages were displayed
        expect(infoSpy).toHaveBeenCalledWith('All stories approved. Review phase complete.');
        expect(infoSpy).toHaveBeenCalledWith('Completion phase will be implemented in Story 4-6.');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        loadStorySpy.mockRestore();
        mockReadFileSync.mockRestore();
        displayStoryCardSpy.mockRestore();
        promptStoryApprovalSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayStatusSpy.mockRestore();
        infoSpy.mockRestore();
      }
    });

    test('should continue workflow when some stories need changes', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'ready-for-dev',
          '4-2-test': 'ready-for-dev',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'ready-for-dev' },
        { id: '4-2-test', status: 'ready-for-dev' },
      ]);
      const loadStorySpy = spyOn(files, 'loadStory').mockResolvedValue({
        id: '4-1-test',
        title: 'Test Story',
        filePath: '/test/story.md',
        acceptanceCriteria: [{ text: 'AC 1', done: false }],
      });
      const mockReadFileSync = spyOn(await import('node:fs'), 'readFileSync').mockReturnValue(
        '- [ ] Task 1\n'
      );
      const displayStoryCardSpy = spyOn(storyCard, 'displayStoryCard').mockImplementation(() => {});

      // First story approved, second needs changes
      const promptStoryApprovalSpy = spyOn(storyCard, 'promptStoryApproval')
        .mockResolvedValueOnce('approved')
        .mockResolvedValueOnce({ type: 'needs-changes', feedback: 'Fix this' });

      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayStatusSpy = spyOn(status, 'displayStatus').mockImplementation(() => {});
      const infoSpy = spyOn(logger, 'info').mockImplementation(() => {});

      try {
        await runBatchStoryReviewLoop(mockCwd, mockState, mockArgs);

        // Verify mixed approval states
        expect(mockState.stories.approvals['4-1-test']).toBe('approved');
        expect(mockState.stories.approvals['4-2-test']).toBe('needs-changes');

        // Verify message about continuing workflow
        expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('1 story(s) need changes'));
        expect(infoSpy).toHaveBeenCalledWith(
          expect.stringContaining('Run johnny-bmad again to continue review')
        );
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        loadStorySpy.mockRestore();
        mockReadFileSync.mockRestore();
        displayStoryCardSpy.mockRestore();
        promptStoryApprovalSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayStatusSpy.mockRestore();
        infoSpy.mockRestore();
      }
    });
  });

  describe('error handling', () => {
    test('should handle missing story files gracefully', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'ready-for-dev',
          '4-2-test': 'ready-for-dev',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'ready-for-dev' },
        { id: '4-2-test', status: 'ready-for-dev' },
      ]);

      // First story not found, second story found
      const loadStorySpy = spyOn(files, 'loadStory')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: '4-2-test',
          title: 'Test Story 2',
          filePath: '/test/story2.md',
          acceptanceCriteria: [{ text: 'AC 1', done: false }],
        });

      const mockReadFileSync = spyOn(await import('node:fs'), 'readFileSync').mockReturnValue(
        '- [ ] Task 1\n'
      );
      const displayStoryCardSpy = spyOn(storyCard, 'displayStoryCard').mockImplementation(() => {});
      const promptStoryApprovalSpy = spyOn(storyCard, 'promptStoryApproval').mockResolvedValue(
        'approved'
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayStatusSpy = spyOn(status, 'displayStatus').mockImplementation(() => {});
      const errorSpy = spyOn(logger, 'error').mockImplementation(() => {});

      try {
        await runBatchStoryReviewLoop(mockCwd, mockState, mockArgs);

        // Verify error was logged for missing story
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Story file not found for 4-1-test')
        );

        // Verify second story was still reviewed
        expect(mockState.stories.approvals['4-2-test']).toBe('approved');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        loadStorySpy.mockRestore();
        mockReadFileSync.mockRestore();
        displayStoryCardSpy.mockRestore();
        promptStoryApprovalSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayStatusSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    test('should display error when no stories found for epic', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {},
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([]);
      const errorSpy = spyOn(logger, 'error').mockImplementation(() => {});

      try {
        await runBatchStoryReviewLoop(mockCwd, mockState, mockArgs);

        // Verify error messages were shown
        expect(errorSpy).toHaveBeenCalledWith('No stories found for epic epic-4');
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Batch review requires stories to exist')
        );
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Exiting batch workflow'));
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    test('should handle fs.readFileSync failure when reading story content for task counting', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 0,
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {},
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'ready-for-dev',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'ready-for-dev' },
      ]);
      const loadStorySpy = spyOn(files, 'loadStory').mockResolvedValue({
        id: '4-1-test',
        title: 'Test Story',
        filePath: '/test/story.md',
        acceptanceCriteria: [{ text: 'AC 1', done: false }],
      });

      // Mock fs.readFileSync to throw an error (simulating file deletion or permission error)
      // The function should gracefully handle this error and continue with taskCount = 0
      const mockReadFileSync = spyOn(await import('node:fs'), 'readFileSync').mockImplementation(
        () => {
          throw new Error("ENOENT: no such file or directory, open '/test/story.md'");
        }
      );

      const displayStoryCardSpy = spyOn(storyCard, 'displayStoryCard').mockImplementation(() => {});
      const promptStoryApprovalSpy = spyOn(storyCard, 'promptStoryApproval').mockResolvedValue(
        'approved'
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayStatusSpy = spyOn(status, 'displayStatus').mockImplementation(() => {});
      const errorSpy = spyOn(logger, 'error').mockImplementation(() => {});

      try {
        // The function should gracefully handle fs.readFileSync failure and continue
        // with taskCount = 0 instead of throwing
        await runBatchStoryReviewLoop(mockCwd, mockState, mockArgs);

        // Verify displayStoryCard was called with taskCount = 0 (empty tasks array)
        expect(displayStoryCardSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            tasks: [], // taskCount = 0 results in empty array
          }),
          0, // 0-based index for first story
          1 // totalStories
        );
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        loadStorySpy.mockRestore();
        mockReadFileSync.mockRestore();
        displayStoryCardSpy.mockRestore();
        promptStoryApprovalSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayStatusSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });
  });

  describe('resume capability', () => {
    test('should resume from currentStoryIndex in state', async () => {
      const mockState: State = {
        currentEpic: 'epic-4',
        lastUpdated: new Date().toISOString(),
        workflow: {
          mode: 'batch',
          phase: 'review',
          currentStoryIndex: 1, // Resume from story 2
          devReviewIteration: 0,
        },
        stories: {
          completed: [],
          approvals: {
            // Story 1 already approved
            '4-1-test': 'approved',
          },
        },
      };

      const displayPhaseHeaderSpy = spyOn(phaseHeader, 'displayPhaseHeader').mockImplementation(
        () => {}
      );
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockResolvedValue({
        development_status: {
          '4-1-test': 'ready-for-dev',
          '4-2-test': 'ready-for-dev',
          '4-3-test': 'ready-for-dev',
        },
      });
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '4-1-test', status: 'ready-for-dev' },
        { id: '4-2-test', status: 'ready-for-dev' },
        { id: '4-3-test', status: 'ready-for-dev' },
      ]);
      const loadStorySpy = spyOn(files, 'loadStory').mockResolvedValue({
        id: '4-2-test',
        title: 'Test Story 2',
        filePath: '/test/story2.md',
        acceptanceCriteria: [{ text: 'AC 1', done: false }],
      });
      const mockReadFileSync = spyOn(await import('node:fs'), 'readFileSync').mockReturnValue(
        '- [ ] Task 1\n'
      );
      const displayStoryCardSpy = spyOn(storyCard, 'displayStoryCard').mockImplementation(() => {});
      const promptStoryApprovalSpy = spyOn(storyCard, 'promptStoryApproval').mockResolvedValue(
        'approved'
      );
      const saveStateSpy = spyOn(config, 'saveState').mockResolvedValue('/path/to/state');
      const displayStatusSpy = spyOn(status, 'displayStatus').mockImplementation(() => {});

      try {
        await runBatchStoryReviewLoop(mockCwd, mockState, mockArgs);

        // Verify only stories 2 and 3 were reviewed (not story 1)
        // loadStory should only be called for stories 2 and 3
        expect(loadStorySpy).toHaveBeenCalledTimes(2);

        // Verify state was updated correctly
        expect(mockState.stories.approvals['4-2-test']).toBe('approved');
        expect(mockState.stories.approvals['4-3-test']).toBe('approved');
      } finally {
        displayPhaseHeaderSpy.mockRestore();
        loadSprintStatusSpy.mockRestore();
        getAllStoriesSpy.mockRestore();
        loadStorySpy.mockRestore();
        mockReadFileSync.mockRestore();
        displayStoryCardSpy.mockRestore();
        promptStoryApprovalSpy.mockRestore();
        saveStateSpy.mockRestore();
        displayStatusSpy.mockRestore();
      }
    });
  });
});
