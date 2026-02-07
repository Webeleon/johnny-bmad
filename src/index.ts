#!/usr/bin/env node
import { runOrchestrator } from './orchestrator.js';
import { MigrationDeclinedError, NonInteractiveError, StatePermissionError, MigrationSaveError, CorruptStateError } from './config.js';
import type { CliArgs } from './types.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

let unhandledRejectionHandlerInstalled = false;

function installUnhandledRejectionHandler(): void {
  if (unhandledRejectionHandlerInstalled) return;
  unhandledRejectionHandlerInstalled = true;

  // Global handler for unhandled promise rejections (CLI only)
  process.on('unhandledRejection', (reason, _promise) => {
    const now = new Date().toLocaleString();
    const uptimeSec = Math.floor(process.uptime());
    const mins = Math.floor(uptimeSec / 60);
    const secs = uptimeSec % 60;
    const uptime = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    console.error(`\n[johnny-bmad] Unhandled rejection at ${now} (uptime: ${uptime}):`);
    console.error(reason);
    console.error('\nThis is often caused by Claude CLI encountering an API error.');
    console.error('Run johnny-bmad again to resume from saved state.\n');
    process.exit(1);
  });
}

function isExecutedDirectly(): boolean {
  // Bun supports import.meta.main. Node does not.
  const bunImportMeta = import.meta as unknown as { main?: boolean };
  if (bunImportMeta.main === true) return true;

  // Node ESM fallback: compare argv[1] (entry script) with this module's path.
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    const thisFile = fileURLToPath(import.meta.url);
    return resolve(argv1) === resolve(thisFile);
  } catch {
    return false;
  }
}

/**
 * Parse command line arguments
 * @internal Exported for testing only
 */
export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    resume: false,
    help: false,
    verbose: false,
    yolo: false,
    reconfigure: false,
    refreshModels: false,
    batch: false,
    devOnly: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--resume':
      case '-r':
        args.resume = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--verbose':
      case '-v':
        args.verbose = true;
        break;
      case '--max-iterations':
      case '-m': {
        const nextArg = argv[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          const value = parseInt(nextArg, 10);
          if (!isNaN(value) && value > 0) {
            args.maxIterations = value;
            i++; // Skip the value argument
          }
        }
        break;
      }
      case '--yolo':
      case '-y':
        args.yolo = true;
        break;
      case '--batch':
      case '-b':
        args.batch = true;
        break;
      case '--dev-only':
      case '-d':
        args.devOnly = true;
        break;
      case '--reconfigure':
        args.reconfigure = true;
        break;
      case '--refresh-models':
        args.refreshModels = true;
        break;
      case '--sm-model':
      case '-s': {
        const nextArg = argv[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          args.smModel = nextArg;
          i++;
        }
        break;
      }
      case '--story-model':
      case '-t': {
        const nextArg = argv[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          args.storyModel = nextArg;
          i++;
        }
        break;
      }
      case '--dev-model': {
        const nextArg = argv[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          args.devModel = nextArg;
          i++;
        }
        break;
      }
      case '--review-model':
      case '-R': {
        const nextArg = argv[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          args.reviewModel = nextArg;
          i++;
        }
        break;
      }
    }
  }

  return args;
}

/**
 * Validate flag combinations for mutual exclusivity
 * @internal Exported for testing only
 */
export function validateFlags(args: CliArgs): void {
  if (args.batch && args.devOnly) {
    console.error('[ERROR] Cannot use --batch and --dev-only together');
    console.error('        Try: Use --batch to create stories, then --dev-only to implement');
    process.exit(1);
  }
}

/**
 * Display help text with usage information
 * @internal Exported for testing only
 */
export function showHelp(): void {
  console.log(`
johnny-bmad - BMAD Implementation Phase Automation

Usage: npx johnny-bmad [options]

  Options:
  --resume, -r              Auto-resume from saved state without prompting
  --verbose, -v             Enable verbose/debug output
  --max-iterations, -m N    Max dev-review cycles per story (default: 10)
  --yolo, -y                Auto-complete stories when max iterations reached
  --batch, -b               Create all stories first, review each one, then exit (no implementation) [EXPERIMENTAL]
  --dev-only, -d            Skip story creation, implement existing stories only [EXPERIMENTAL]
  --reconfigure             Reconfigure model selection (run onboarding again)
  --refresh-models          Force refresh of model cache from all providers
  --sm-model, -s MODEL      Override SM agent model (e.g., claude:opus)
  --story-model, -t MODEL   Override Story Creator model (e.g., claude:opus)
  --dev-model MODEL         Override Dev agent model (e.g., claude:sonnet)
  --review-model, -R MODEL  Override Reviewer model (e.g., claude:opus)
  --help, -h                Show this help message

Description:
  Automates the BMAD implementation phase by orchestrating Claude Code
  sessions to implement stories in your epics.

Workflow:
  1. SM Agent checks sprint status
  2. User selects an epic to implement
  3. For each story in the epic:
     a. Create story file (if needed)
     b. Dev agent implements the story
     c. Review agent verifies completion
     d. Repeat dev-review until done (max 10 iterations)
     e. Commit changes
  4. Complete!

Status:
  - --batch and --dev-only are currently experimental stubs. They will print a warning and exit.

Requirements:
  - Must be run from a BMAD project directory (_bmad/ folder present)
  - Claude Code CLI must be installed (claude command available)
  - Git repository (optional, for commits)

  Model Configuration:
   On first run, you'll be guided through:
   - CLI tool detection (Claude, Codex, Kimi)
   - API provider configuration (OpenAI, GLM, Kimi)
   - Custom provider addition (optional)
   - Model selection for each agent (SM, Story Creator, Dev, Reviewer)

   Run johnny-bmad without --resume to start onboarding if config doesn't exist.
   Use --reconfigure to change models at any time.

   Models can be specified as:
   - Short name: opus, sonnet, haiku, gpt-4, glm-4
   - Full ID: claude:opus, openai:gpt-4, glm:glm-4

 Examples:
  npx johnny-bmad              # Start sequential workflow (default)
  npx johnny-bmad --resume     # Auto-resume from last session
  npx johnny-bmad -v           # Verbose output for debugging
  npx johnny-bmad -m 5         # Limit to 5 dev-review cycles per story
  npx johnny-bmad --batch      # [EXPERIMENTAL] Stub: prints warning then exits
  npx johnny-bmad --dev-only   # [EXPERIMENTAL] Stub: prints warning then exits
  npx johnny-bmad --batch --yolo   # [EXPERIMENTAL] Stub: prints warning then exits
  npx johnny-bmad --reconfigure    # Reconfigure model selection
  npx johnny-bmad --dev-model openai:gpt-4  # Override Dev agent model
  npx johnny-bmad -s opus --dev-model sonnet -R haiku  # Override multiple models

Documentation: https://github.com/webeleon/johnny-bmad
`);
}

/**
 * Formats an error with recovery guidance per Rule 5
 * @internal Exported for testing only
 */
export function formatErrorWithRecovery(err: unknown): { message: string; recovery: string } {
  // Handle errors with built-in recovery guidance
  if (err instanceof StatePermissionError || err instanceof MigrationSaveError) {
    return { message: `[ERROR] ${err.message}`, recovery: `        ${err.recovery}` };
  }

  // Handle filesystem errors with specific recovery guidance (Rule 5)
  // Type guard: NodeJS.ErrnoException has string code property
  // Use documented cast to Record<string, unknown> to check code property safely
  if (err instanceof Error && 'code' in err && typeof (err as Record<string, unknown>).code === 'string') {
    const fsError = err as NodeJS.ErrnoException;

    if (fsError.code === 'ENOSPC') {
      return {
        message: '[ERROR] Operation failed: disk is full',
        recovery: '        Try: Free up disk space and run johnny-bmad again'
      };
    } else if (fsError.code === 'EACCES') {
      return {
        message: '[ERROR] Operation failed: permission denied',
        recovery: '        Try: Check file permissions or run with appropriate access rights'
      };
    } else {
      // Other filesystem errors with generic recovery
      return {
        message: `[ERROR] Fatal error: ${fsError.message}`,
        recovery: '        Try: Run johnny-bmad again to resume from saved state'
      };
    }
  }

  // Generic fatal error handling
  return {
    message: `[ERROR] Fatal error: ${err instanceof Error ? err.message : String(err)}`,
    recovery: '        Try: Run johnny-bmad again to resume from saved state'
  };
}

/**
 * Main entry point - orchestrates CLI argument parsing and workflow execution
 * @internal Exported for testing only
 */
export async function main(): Promise<void> {
  installUnhandledRejectionHandler();
  const args = parseArgs(process.argv.slice(2));

  // Validate flag combinations before any other processing
  validateFlags(args);

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  try {
    await runOrchestrator(args);
  } catch (err) {
    /**
     * Error Handling Routing Contract:
     *
     * Two-tier error handling approach:
     * 1. Migration/User-Interaction Errors (MigrationDeclinedError, NonInteractiveError):
     *    - Handled directly in this catch block
     *    - Already displayed their own user-friendly messages
     *    - Just exit with code 1
     *
     * 2. All Other Errors (filesystem, state, unexpected):
     *    - Routed to formatErrorWithRecovery() for consistent formatting
     *    - Includes ENOSPC, EACCES filesystem errors with specific recovery guidance
     *    - Includes StatePermissionError, MigrationSaveError with built-in recovery
     *    - Generic errors get standard recovery message
     *
     * This separation ensures migration UX remains clean while other errors
     * get actionable recovery guidance following Rule 5 (Try: pattern).
     */
    if (err instanceof MigrationDeclinedError || err instanceof NonInteractiveError || err instanceof CorruptStateError) {
      // Error messages already displayed by promptMigration() or promptCorruptRecovery()
      process.exit(1);
      return; // Defensive: prevent fall-through if process.exit is mocked or behavior changes
    }

    // Format all other errors with recovery guidance
    const { message, recovery } = formatErrorWithRecovery(err);
    console.error(message);
    console.error(recovery);
    process.exit(1);
  }
}

if (isExecutedDirectly()) {
  // Intentionally not awaited: CLI exit behavior is controlled via process.exit()
  void main();
}
