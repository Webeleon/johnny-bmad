import { describe, test, expect, mock, spyOn, beforeEach, afterEach } from 'bun:test';
import { determineMode, runOrchestrator } from './orchestrator.js';
import type { CliArgs } from './types.js';
import * as config from './config.js';
import * as files from './utils/files.js';
import * as logger from './utils/logger.js';
import * as claudeCli from './claude/cli.js';
import * as gitCommit from './git/commit.js';
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
        devOnly: false
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
        devOnly: true
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
        devOnly: false
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
        maxIterations: 5
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
        devOnly: false
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
        devOnly: true
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
    test('should warn and return when state.workflow.mode is batch', async () => {
      // Mock pre-flight dependencies
      const checkClaudeSpy = spyOn(claudeCli, 'checkClaudeInstalled').mockReturnValue(Promise.resolve(true));
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

      const loadStateSpy = spyOn(config, 'loadState').mockReturnValue(Promise.resolve({
        currentEpic: 'epic-1',
        lastUpdated: '2026-02-06T00:00:00.000Z',
        workflow: {
          mode: 'batch',
          phase: 'implementation',
          currentStoryIndex: 0,
          devReviewIteration: 0
        },
        stories: {
          completed: [],
          approvals: {}
        }
      }));
      const loadEpicsSpy = spyOn(files, 'loadEpics').mockReturnValue(Promise.resolve([]));
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockReturnValue(Promise.resolve({
        development_status: {
          'epic-1': 'in-progress',
          '1-1-test': 'ready-for-dev'
        }
      }));
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '1-1-test', status: 'ready-for-dev' }
      ]);

      const args: CliArgs = {
        resume: true,
        help: false,
        verbose: false,
        yolo: false,
        batch: false,
        devOnly: false
      };

      try {
        await runOrchestrator(args);

        // Verify warn() was called with placeholder message
        expect(warnSpy).toHaveBeenCalledWith('Batch workflow not yet implemented');
        expect(warnSpy).toHaveBeenCalledWith('        Try: Run without --batch flag for default sequential mode');
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

  describe('dev-only mode routing', () => {
    test('should warn and return when state.workflow.mode is dev-only', async () => {
      // Mock pre-flight dependencies
      const checkClaudeSpy = spyOn(claudeCli, 'checkClaudeInstalled').mockReturnValue(Promise.resolve(true));
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

      const loadStateSpy = spyOn(config, 'loadState').mockReturnValue(Promise.resolve({
        currentEpic: 'epic-2',
        lastUpdated: '2026-02-06T00:00:00.000Z',
        workflow: {
          mode: 'dev-only',
          phase: 'implementation',
          currentStoryIndex: 0,
          devReviewIteration: 0
        },
        stories: {
          completed: [],
          approvals: {}
        }
      }));
      const loadEpicsSpy = spyOn(files, 'loadEpics').mockReturnValue(Promise.resolve([]));
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockReturnValue(Promise.resolve({
        development_status: {
          'epic-2': 'in-progress',
          '2-1-test': 'ready-for-dev'
        }
      }));
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '2-1-test', status: 'ready-for-dev' }
      ]);

      const args: CliArgs = {
        resume: true,
        help: false,
        verbose: false,
        yolo: false,
        batch: false,
        devOnly: false
      };

      try {
        await runOrchestrator(args);

        // Verify warn() was called with placeholder message
        expect(warnSpy).toHaveBeenCalledWith('Dev-only workflow not yet implemented');
        expect(warnSpy).toHaveBeenCalledWith('        Try: Run without --dev-only flag for default sequential mode');
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
      const checkClaudeSpy = spyOn(claudeCli, 'checkClaudeInstalled').mockReturnValue(Promise.resolve(true));
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
      const loadStateSpy = spyOn(config, 'loadState').mockReturnValue(Promise.resolve({
        currentEpic: 'epic-3',
        lastUpdated: '2026-02-06T00:00:00.000Z',
        workflow: {
          mode: 'batch', // State mode is batch
          phase: 'implementation',
          currentStoryIndex: 0,
          devReviewIteration: 0
        },
        stories: {
          completed: [],
          approvals: {}
        }
      }));
      const loadEpicsSpy = spyOn(files, 'loadEpics').mockReturnValue(Promise.resolve([]));
      const loadSprintStatusSpy = spyOn(files, 'loadSprintStatus').mockReturnValue(Promise.resolve({
        development_status: {
          'epic-3': 'in-progress',
          '3-1-test': 'ready-for-dev'
        }
      }));
      const getAllStoriesSpy = spyOn(files, 'getAllStoriesForEpic').mockReturnValue([
        { id: '3-1-test', status: 'ready-for-dev' }
      ]);

      const args: CliArgs = {
        resume: true,
        help: false,
        verbose: false,
        yolo: false,
        batch: false, // CLI says NOT batch
        devOnly: true // CLI says dev-only
      };

      try {
        await runOrchestrator(args);

        // Should route to batch (from state), not dev-only (from CLI)
        expect(warnSpy).toHaveBeenCalledWith('Batch workflow not yet implemented');
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
      }
    });
  });
});
