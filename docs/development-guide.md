# Johnny BMAD - Development Guide

## Prerequisites

- **Bun**: Latest version (primary runtime)
- **Node.js**: 18+ (for npm compatibility)
- **Git**: For version control and commits
- **Claude Code CLI**: For testing agent functionality

## Getting Started

### Clone and Install

```bash
git clone https://github.com/webeleon/johnny-bmad.git
cd johnny-bmad
bun install
```

### Development Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Run with watch mode |
| `bun run build` | Build to `dist/` |
| `bun test` | Run unit tests |
| `bun test --watch` | Run tests in watch mode |
| `npx .` | Test built CLI locally |

### Running the CLI

```bash
# Direct execution (development)
bun run src/index.ts

# After building
npx .

# With options
bun run src/index.ts --help
bun run src/index.ts --verbose
bun run src/index.ts --yolo -m 5
```

## Code Style Guidelines

### TypeScript

- **Strict Mode**: Enabled in `tsconfig.json`
- **Target**: ES2022
- **Modules**: ESNext (ESM)
- **File Extensions**: Always use `.js` in imports (ESM requirement)

```typescript
// Correct
import { runOrchestrator } from './orchestrator.js';

// Incorrect
import { runOrchestrator } from './orchestrator';
```

### Async/Await

- Use `async/await` with Promises (not callbacks)
- Return Promises from spawn wrappers

```typescript
// Good
async function runAgent(cwd: string): Promise<void> {
  await spawnClaude({ ... });
}

// Avoid
function runAgent(cwd: string, callback: () => void) { ... }
```

### Variable Declarations

- Prefer `const` over `let`
- Use `let` only when reassignment is necessary

### Error Handling

- Wrap agent calls in try/catch with retry logic
- Save state before exiting on fatal errors
- Use descriptive error messages

## Testing

### Test Framework

Tests use **Bun's built-in test runner** with co-located test files.

```bash
# Run all tests
bun test

# Run specific test file
bun test src/utils/files.test.ts

# Watch mode
bun test --watch
```

### Test File Naming

- Co-located with source: `files.ts` → `files.test.ts`
- Same directory as implementation

### Test Structure

```typescript
import { describe, test, expect } from 'bun:test';
import { functionToTest } from './module.js';

describe('functionToTest', () => {
  test('should handle normal case', () => {
    expect(functionToTest(input)).toBe(expected);
  });

  test('should handle edge case', () => {
    expect(functionToTest(null)).toBeNull();
  });
});
```

### Key Test Coverage

| File | Functions Tested |
|------|------------------|
| `files.test.ts` | `findOngoingWork()`, `getAllStoriesForEpic()` |
| `orchestrator.test.ts` | Epic continuation decision logic |

## Building

### Build Process

```bash
bun run build
```

This runs: `bun build src/index.ts --outdir dist --target node`

### Output

- Single bundled file: `dist/index.js`
- Shebang: `#!/usr/bin/env node`
- Target: Node.js (for npm compatibility)

### Publishing

```bash
bun run publish:npm
```

This runs:
1. `bun run build`
2. `npm publish --access public`
3. `git tag v{version}`
4. `git push origin v{version}`

## Important Development Notes

### Cross-Runtime Compatibility

**Do NOT use Bun-specific APIs** for core functionality:

```typescript
// WRONG - Bun-specific
const proc = Bun.spawn(['claude', ...args]);

// CORRECT - Node.js compatible
import { spawn } from 'child_process';
const proc = spawn('claude', args);
```

This ensures the npm package works with Node.js users.

### Model Selection

- **opus**: Planning and review tasks (SM, Story Creator, Reviewer)
- **sonnet**: Implementation tasks (Dev agent)

### Review Detection

The reviewer agent must detect story completion. Two methods:

1. **Primary**: Read `sprint-status.yaml` for story status === 'done'
2. **Fallback**: Scan output for `REVIEW_PASSED` literal string

### Git Safety

- Never commit without user confirmation (unless `--yolo`)
- Use conventional commit format: `feat(STORY-ID): title`
- Only stage with `git add -A` after checking `git status --porcelain`

### Documentation Sync

When updating CLI options, workflows, or usage patterns, update BOTH:

1. `README.md` - Quick reference
2. `docs/index.html` - Full documentation

## Project Structure

```
src/
├── index.ts              # Entry point
├── orchestrator.ts       # Main workflow
├── config.ts             # State persistence
├── types.ts              # Type definitions
├── agents/               # Agent wrappers
├── claude/               # CLI integration
├── git/                  # Git operations
└── utils/                # Utilities
```

## Debugging

### Verbose Mode

```bash
bun run src/index.ts --verbose
```

Enables:
- Debug log messages
- Labeled agent output streams (`[SM]`, `[Dev]`, etc.)
- Agent lifecycle tracking (start/complete/fail)

### State Inspection

Check `.johnny-bmad-state.json` in the target project:

```bash
cat .johnny-bmad-state.json | jq
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Claude CLI not installed" | Ensure `claude` command is in PATH |
| "Not a BMAD project" | Run from project root with `_bmad/` folder |
| Agent hangs | Check Claude API status, network connectivity |
| State file corrupted | Delete `.johnny-bmad-state.json` and restart |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing`
3. Make changes with tests
4. Run tests: `bun test`
5. Build and test: `bun run build && npx .`
6. Commit with conventional format
7. Push and open a PR

### Commit Message Format

```
feat(scope): add new feature
fix(scope): fix bug description
docs(scope): update documentation
refactor(scope): code cleanup
test(scope): add tests
```

## Support

- **Issues**: https://github.com/webeleon/johnny-bmad/issues
- **Discord**: https://discord.gg/AK7BNxJByt

---

*Generated by BMAD Document Project Workflow*
