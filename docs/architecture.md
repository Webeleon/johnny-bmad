# Johnny BMAD - Architecture Documentation

## System Overview

Johnny BMAD is a CLI orchestrator that automates BMAD implementation by spawning and coordinating multiple Claude Code processes. The system follows an **Orchestrator Pattern** with a central state machine managing workflow progression.

## Architecture Diagram

```
                                    johnny-bmad CLI
                                          |
                    +---------------------+---------------------+
                    |                     |                     |
              Pre-flight             Orchestrator          State Manager
              Checks                 (Main Loop)           (.json file)
                    |                     |                     |
                    v                     v                     v
            +-------+-------+     +-------+-------+     +-------+-------+
            | Claude CLI    |     | Epic Selection |     | Save/Load    |
            | Detection     |     | Story Loop     |     | Resume       |
            | BMAD Project  |     | Git Commits    |     | Clear        |
            +---------------+     +----------------+     +---------------+
                                          |
                          +---------------+---------------+
                          |               |               |
                    +-----------+   +-----------+   +-----------+
                    | SM Agent  |   | Dev Agent |   | Reviewer  |
                    | (opus)    |   | (sonnet)  |   | (opus)    |
                    +-----------+   +-----------+   +-----------+
                          |               |               |
                          v               v               v
                    +-----------------------------------------+
                    |           Claude CLI Process           |
                    |  (child_process.spawn with prompts)    |
                    +-----------------------------------------+
```

## Core Components

### 1. Entry Point (`src/index.ts`)

**Purpose**: CLI argument parsing and bootstrap

**Responsibilities**:
- Parse command-line arguments (`--resume`, `--verbose`, `--yolo`, `--max-iterations`)
- Display help text
- Global unhandled rejection handler
- Invoke orchestrator

**Key Functions**:
- `parseArgs(argv)` - Manual argument parsing (no external CLI framework)
- `showHelp()` - Display usage information
- `main()` - Entry point

### 2. Orchestrator (`src/orchestrator.ts`)

**Purpose**: Central workflow controller and state machine

**Responsibilities**:
- Pre-flight checks (Claude CLI, BMAD project, Git repo)
- Epic selection and story iteration
- Dev-review loop management
- Error handling with retry logic
- State persistence

**Key Flow**:
```
1. Pre-flight checks
2. Check for ongoing work (state file or sprint-status)
3. Select epic (auto or user prompt)
4. For each story:
   a. Create story file if needed
   b. Run dev-review loop (max N iterations)
   c. Commit if passed
   d. Update sprint-status
5. Continue to next epic or exit
```

**State Transitions**:
- `pending` → `in-progress` → `done`
- Max iterations exceeded → user prompt or auto-complete (yolo)

### 3. State Manager (`src/config.ts`)

**Purpose**: Persist and restore session state

**State File**: `.johnny-bmad-state.json`

**State Structure**:
```typescript
interface State {
  currentEpic: string;
  currentStoryIndex: number;
  devReviewIteration: number;
  completedStories: string[];
  lastUpdated: string;
}
```

**Operations**:
- `loadState()` - Read existing state
- `saveState()` - Persist current progress
- `createInitialState()` - New session
- `clearState()` - Clean up after completion

### 4. Agent System (`src/agents/`)

**Pattern**: Thin wrappers around Claude CLI spawning

| File | Agent | Model | Purpose |
|------|-------|-------|---------|
| `sm.ts` | Scrum Master | opus | Sprint status check |
| `story-creator.ts` | Story Creator | opus | Generate story files |
| `dev.ts` | Developer | sonnet | Implement stories |
| `reviewer.ts` | Reviewer | opus | Code review with output capture |

**Model Selection Rationale**:
- **opus**: Planning and review tasks requiring deep reasoning
- **sonnet**: Implementation tasks (faster, sufficient capability)

### 5. Claude CLI Integration (`src/claude/`)

**`cli.ts`** - Process spawning:
```typescript
spawn('claude', [
  '--model', opts.model,
  '-p', opts.prompt,
  '--allowedTools', opts.allowedTools.join(',')
], { cwd, stdio: 'inherit' | 'pipe' })
```

**`prompts.ts`** - BMAD workflow prompts:
- Each prompt instructs Claude to load `workflow.xml` and execute a specific workflow
- Prompts embed story context (ID, file path, epic)

### 6. File Utilities (`src/utils/files.ts`)

**Purpose**: BMAD file parsing and manipulation

**Key Functions**:
- `isBmadProject()` - Validate project structure
- `loadEpics()` - Parse `epic-*.md` files
- `loadStory()` - Parse story markdown
- `loadSprintStatus()` - Read `sprint-status.yaml`
- `findOngoingWork()` - Detect in-progress stories
- `updateSprintStatus()` - Mark stories/epics done

**Parsing Logic**:
- Regex-based markdown parsing
- Supports multiple story ID formats (`STORY-001`, `8-1-feature-name`)
- Checkbox status extraction (`- [ ]` vs `- [x]`)

### 7. Git Integration (`src/git/commit.ts`)

**Purpose**: Automated commit creation

**Commit Format**: `feat(STORY-ID): Story Title`

**Safety**:
- User confirmation required (unless `--yolo`)
- Checks for changes before committing
- Stages all changes with `git add -A`

## Data Flow

### Sprint Status Flow
```
sprint-status.yaml
      |
      v
findOngoingWork() --> { epicId, stories[] }
      |
      v
Process stories --> updateSprintStatus()
      |
      v
markEpicComplete() --> sprint-status.yaml (updated)
```

### Review Detection
```
Review Agent Output
      |
      +-- Check sprint-status.yaml for story status
      |         |
      |         v
      |   status === 'done' ? PASSED : FAILED
      |
      +-- Fallback: scan output for 'REVIEW_PASSED'
```

## Error Handling

### Retry Logic
```typescript
try {
  await runAgent(cwd, ...);
} catch (error) {
  warn('Retrying...');
  await sleep(2000);
  try {
    await runAgent(cwd, ...);  // Second attempt
  } catch (retryError) {
    saveState();
    exit(1);
  }
}
```

### Unhandled Rejections
Global handler in `index.ts` catches promise rejections:
- Logs timestamp and uptime
- Suggests running again to resume
- Exits with code 1

## Configuration

### CLI Arguments
| Flag | Default | Effect |
|------|---------|--------|
| `--resume` | false | Auto-resume without prompt |
| `--verbose` | false | Enable debug logging |
| `--max-iterations` | 10 | Dev-review cycles per story |
| `--yolo` | false | Auto-complete and auto-commit |

### BMAD Project Structure (Expected)
```
project/
├── _bmad/
│   └── bmm/
│       └── config.yaml
└── _bmad-output/
    ├── planning-artifacts/
    │   └── epic-*.md
    └── implementation-artifacts/
        ├── sprint-status.yaml
        └── story-*.md
```

## Performance Considerations

- **Child Process Spawning**: Uses Node's `child_process.spawn` for cross-runtime compatibility (not Bun.spawn)
- **Streaming Output**: Verbose mode pipes through Transform streams with line buffering
- **State Saves**: JSON file written after each story state change
- **Memory**: No accumulation of large outputs; streams flow through

## Security Notes

- Git commits only after user confirmation (unless `--yolo`)
- No secrets/credentials stored in state file
- Claude CLI handles API authentication externally

---

*Generated by BMAD Document Project Workflow*
