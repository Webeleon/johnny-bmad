# CLAUDE.md - Instructions for Claude Code

This file provides context for Claude Code when working in the johnny-bmad repository.

## Project Overview

johnny-bmad is a CLI tool that automates the BMAD (Business Model Agile Development) implementation phase by orchestrating multiple Claude Code sessions. It spawns Claude processes with different roles (SM, Story Creator, Dev, Reviewer) to implement stories from epics.

## Tech Stack

- **Runtime**: Node.js 18+ / Bun
- **Language**: TypeScript (ESM modules)
- **Build**: Bun bundler (`bun build`)
- **Dependencies**: chalk (logging), inquirer (prompts), yaml (parsing)

## Project Structure

```
src/
├── index.ts              # CLI entry point, argument parsing
├── orchestrator.ts       # Main workflow loop and state management
├── config.ts             # State persistence (.johnny-bmad-state.json)
├── types.ts              # TypeScript interfaces
├── claude/
│   ├── cli.ts            # Spawns Claude CLI processes
│   └── prompts.ts        # Prompt templates for each agent role
├── agents/
│   ├── sm.ts             # Scrum Master agent (opus)
│   ├── story-creator.ts  # Story creation agent (opus)
│   ├── dev.ts            # Development agent (sonnet)
│   └── reviewer.ts       # Review agent (opus) - captures output
├── git/
│   └── commit.ts         # Git staging and commit operations
└── utils/
    ├── logger.ts         # Colored console logging
    ├── files.ts          # BMAD file parsing (epics, stories, config)
    ├── files.test.ts     # Unit tests for file parsing
    └── user-input.ts     # Inquirer-based user prompts
```

## Key Patterns

### Claude CLI Spawning
- Uses Node's `child_process.spawn` for cross-runtime compatibility
- Interactive mode: `stdio: 'inherit'` for real-time output
- Review agent: captures stdout to detect `REVIEW_PASSED`/`REVIEW_FAILED` markers

### State Management
- State saved to `.johnny-bmad-state.json` in target project
- Tracks: current epic, story index, iteration count, completed stories
- Enables resume functionality after interruption

### File Parsing
- Epics: `_bmad-output/planning-artifacts/epic-*.md`
- Stories: `_bmad-output/implementation-artifacts/story-*.md`
- Config: `_bmad/bmm/config.yaml`
- Parses markdown checkboxes for story lists and acceptance criteria

## Development Commands

```bash
bun install          # Install dependencies
bun run dev          # Run with watch mode
bun run src/index.ts # Run directly
bun run build        # Build to dist/
bun test             # Run unit tests
npx .                # Test built package
```

## Code Style

- Use `async/await` with Promises (not callbacks)
- Return Promises from spawn wrappers
- Use `.js` extensions in imports (ESM requirement)
- Prefer `const` declarations
- Use TypeScript strict mode

## Testing

### Unit Tests
Tests use Bun's built-in test runner. Test files are co-located with source files using `.test.ts` suffix.

```bash
bun test             # Run all tests
bun test --watch     # Run tests in watch mode
```

Key test coverage:
- `files.test.ts` - Tests for `findOngoingWork()` and `getAllStoriesForEpic()` sprint-status parsing

### Integration Testing
Since this tool requires a BMAD project to run, test with:
```bash
bun run src/index.ts --help  # Test CLI parsing
bun run src/index.ts         # Test BMAD detection (will error without _bmad/)
```

For full integration testing, use in an actual BMAD project directory.

## Important Notes

1. **No Bun-specific APIs**: Use Node's `child_process` for spawning, not `Bun.spawn`, to ensure npm compatibility

2. **Model Selection**:
   - opus for planning/review tasks (SM, Story Creator, Reviewer)
   - sonnet for implementation (Dev agent)

3. **Review Detection**: The reviewer agent must output `REVIEW_PASSED` or `REVIEW_FAILED` as literal strings for the orchestrator to detect completion

4. **Git Safety**: Only commits when explicitly confirmed by user; uses `feat(STORY-ID): title` format

5. **Error Handling**: Non-zero exit from Claude CLI throws errors; orchestrator catches and logs appropriately

6. **Documentation Sync**: When updating CLI options, workflows, or usage patterns, also update:
   - `README.md` - Quick reference documentation
   - `docs/index.html` - GitHub Pages full documentation

   Keep both in sync. The docs page includes the interactive banner and full feature documentation
