# Johnny BMAD - Source Tree Analysis

## Directory Structure

```
johnny-bmad/
├── src/                          # TypeScript source code
│   ├── index.ts                  # CLI entry point, argument parsing
│   ├── orchestrator.ts           # Main workflow loop and state machine
│   ├── config.ts                 # State persistence (.johnny-bmad-state.json)
│   ├── types.ts                  # TypeScript interfaces and types
│   │
│   ├── agents/                   # Claude agent wrappers
│   │   ├── sm.ts                 # Scrum Master agent (opus)
│   │   ├── story-creator.ts      # Story creation agent (opus)
│   │   ├── dev.ts                # Development agent (sonnet)
│   │   └── reviewer.ts           # Review agent (opus) - captures output
│   │
│   ├── claude/                   # Claude CLI integration
│   │   ├── cli.ts                # Spawns Claude CLI processes
│   │   └── prompts.ts            # Prompt templates for each agent role
│   │
│   ├── git/                      # Git operations
│   │   └── commit.ts             # Git staging and commit operations
│   │
│   └── utils/                    # Utility modules
│       ├── logger.ts             # Colored console logging with timestamps
│       ├── files.ts              # BMAD file parsing (epics, stories, config)
│       ├── files.test.ts         # Unit tests for file parsing
│       ├── user-input.ts         # Inquirer-based user prompts
│       ├── user-input.test.ts    # Tests for user input utilities
│       ├── timer.ts              # Session timing utilities
│       ├── stream-wrapper.ts     # Labeled output streams for verbose mode
│       └── stream-wrapper.test.ts # Tests for stream wrapper
│
├── dist/                         # Build output (compiled JS)
│   └── index.js                  # Bundled CLI entry point
│
├── docs/                         # Documentation
│   └── index.html                # GitHub Pages documentation site
│
├── node_modules/                 # Dependencies (not in git)
│
├── _bmad/                        # BMAD configuration (development context)
│
├── _bmad-output/                 # BMAD output artifacts (development context)
│
├── package.json                  # NPM package configuration
├── tsconfig.json                 # TypeScript configuration
├── bun.lock                      # Bun lockfile
├── .gitignore                    # Git ignore patterns
├── .npmignore                    # NPM publish ignore patterns
├── README.md                     # Project readme
├── CHANGELOG.md                  # Version history
└── CLAUDE.md                     # AI development context
```

## File Details

### Entry Point

| File | Lines | Purpose |
|------|-------|---------|
| `src/index.ts` | 123 | CLI bootstrap, argument parsing, help display |

**Key Exports**: None (entry point)
**Key Functions**: `parseArgs()`, `showHelp()`, `main()`

### Core Logic

| File | Lines | Purpose |
|------|-------|---------|
| `src/orchestrator.ts` | 409 | Main workflow orchestration |
| `src/config.ts` | 51 | State file operations |
| `src/types.ts` | 95 | TypeScript type definitions |

**orchestrator.ts Key Exports**:
- `runOrchestrator(args: CliArgs): Promise<void>`

**config.ts Key Exports**:
- `loadState()`, `saveState()`, `createInitialState()`, `clearState()`

### Agents (`src/agents/`)

| File | Lines | Model | Purpose |
|------|-------|-------|---------|
| `sm.ts` | 19 | opus | Sprint status check |
| `story-creator.ts` | 24 | opus | Generate story files |
| `dev.ts` | 23 | sonnet | Implement stories |
| `reviewer.ts` | 125 | opus | Code review with output capture |

**Common Pattern**: Each agent wraps `spawnClaude()` with role-specific prompt and model.

**reviewer.ts Special**: Captures stdout to detect `REVIEW_PASSED`/`REVIEW_FAILED` or reads `sprint-status.yaml`.

### Claude Integration (`src/claude/`)

| File | Lines | Purpose |
|------|-------|---------|
| `cli.ts` | 82 | Claude CLI process spawning |
| `prompts.ts` | 86 | BMAD workflow prompt templates |

**cli.ts Key Exports**:
- `spawnClaude(opts: ClaudeOptions): Promise<ClaudeResult>`
- `checkClaudeInstalled(): Promise<boolean>`

**prompts.ts Key Exports**:
- `getSmAgentPrompt()`
- `getCreateStoryPrompt(storyId, storyTitle, epicId)`
- `getDevStoryPrompt(storyId, storyFilePath)`
- `getReviewStoryPrompt(storyId, storyFilePath)`

### Git Operations (`src/git/`)

| File | Lines | Purpose |
|------|-------|---------|
| `commit.ts` | 100 | Git staging and commit operations |

**Key Exports**:
- `commitStoryChanges(cwd, storyId, storyTitle): Promise<boolean>`
- `isGitRepo(cwd): Promise<boolean>`

### Utilities (`src/utils/`)

| File | Lines | Purpose |
|------|-------|---------|
| `logger.ts` | 156 | Colored console logging |
| `files.ts` | 413 | BMAD file parsing |
| `user-input.ts` | 96 | Interactive prompts |
| `timer.ts` | 75 | Session timing |
| `stream-wrapper.ts` | 52 | Labeled output streams |

**logger.ts Key Exports**:
- `info()`, `warn()`, `error()`, `debug()`, `success()`
- `header()`, `subHeader()`, `step()`
- `setVerbose()`, `isVerbose()`
- `agentLifecycle()` - verbose mode agent tracking

**files.ts Key Exports**:
- `isBmadProject()`, `loadConfig()`
- `loadEpics()`, `loadStory()`, `storyFileExists()`
- `loadSprintStatus()`, `updateSprintStatus()`, `markEpicComplete()`
- `findOngoingWork()`, `getAllStoriesForEpic()`, `getEpicsFromSprintStatus()`

**user-input.ts Key Exports**:
- `selectEpic()`, `confirmResume()`, `handleMaxIterations()`
- `confirmAction()`, `promptForInput()`, `confirmContinueNextEpic()`

### Test Files

| File | Lines | Coverage |
|------|-------|----------|
| `files.test.ts` | 175 | `findOngoingWork()`, `getAllStoriesForEpic()` |
| `user-input.test.ts` | ~30 | User prompt utilities |
| `stream-wrapper.test.ts` | ~20 | Stream labeling |
| `orchestrator.test.ts` | 36 | Epic continuation logic |

**Test Framework**: Bun's built-in test runner (`bun:test`)

## Import Graph

```
index.ts
    └── orchestrator.ts
            ├── config.ts
            │       └── types.ts
            ├── utils/files.ts
            │       └── types.ts
            ├── utils/user-input.ts
            │       └── types.ts
            ├── utils/logger.ts
            │       ├── types.ts
            │       └── timer.ts
            ├── claude/cli.ts
            │       ├── types.ts
            │       ├── utils/logger.ts
            │       └── utils/stream-wrapper.ts
            ├── agents/sm.ts
            │       ├── claude/cli.ts
            │       └── claude/prompts.ts
            ├── agents/story-creator.ts
            │       ├── claude/cli.ts
            │       └── claude/prompts.ts
            ├── agents/dev.ts
            │       ├── claude/cli.ts
            │       └── claude/prompts.ts
            ├── agents/reviewer.ts
            │       ├── claude/prompts.ts
            │       └── utils/stream-wrapper.ts
            └── git/commit.ts
                    └── utils/logger.ts
```

## Critical Files

| Priority | File | Why Critical |
|----------|------|--------------|
| 1 | `orchestrator.ts` | Core workflow logic, state machine |
| 2 | `files.ts` | BMAD file parsing, sprint status |
| 3 | `reviewer.ts` | Review detection determines story completion |
| 4 | `config.ts` | State persistence for resume |
| 5 | `cli.ts` | Claude process spawning |

---

*Generated by BMAD Document Project Workflow*
