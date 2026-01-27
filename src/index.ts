#!/usr/bin/env node
import { runOrchestrator } from './orchestrator.js';
import type { CliArgs } from './types.js';

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    resume: false,
    help: false,
    verbose: false
  };

  for (const arg of argv) {
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
    }
  }

  return args;
}

function showHelp(): void {
  console.log(`
johnny-bmad - BMAD Implementation Phase Automation

Usage: npx johnny-bmad [options]

Options:
  --resume, -r    Auto-resume from saved state without prompting
  --verbose, -v   Enable verbose/debug output
  --help, -h      Show this help message

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
  npx johnny-bmad           # Start fresh or prompt to resume
  npx johnny-bmad --resume  # Auto-resume from last session
  npx johnny-bmad -v        # Verbose output for debugging
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
