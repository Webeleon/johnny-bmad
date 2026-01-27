#!/usr/bin/env node
import { runOrchestrator } from './orchestrator.js';
import type { CliArgs } from './types.js';

// Global handler for unhandled promise rejections
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

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    resume: false,
    help: false,
    verbose: false,
    yolo: false
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
    }
  }

  return args;
}

function showHelp(): void {
  console.log(`
johnny-bmad - BMAD Implementation Phase Automation

Usage: npx johnny-bmad [options]

Options:
  --resume, -r              Auto-resume from saved state without prompting
  --verbose, -v             Enable verbose/debug output
  --max-iterations, -m N    Max dev-review cycles per story (default: 10)
  --yolo, -y                Auto-complete stories when max iterations reached
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

Requirements:
  - Must be run from a BMAD project directory (_bmad/ folder present)
  - Claude Code CLI must be installed (claude command available)
  - Git repository (optional, for commits)

Examples:
  npx johnny-bmad              # Start fresh or prompt to resume
  npx johnny-bmad --resume     # Auto-resume from last session
  npx johnny-bmad -v           # Verbose output for debugging
  npx johnny-bmad -m 5         # Limit to 5 dev-review cycles per story
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  try {
    await runOrchestrator(args);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
