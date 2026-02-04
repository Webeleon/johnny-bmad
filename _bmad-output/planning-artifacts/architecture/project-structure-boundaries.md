# Project Structure & Boundaries

## Complete Project Directory Structure

**johnny-bmad v1 - Complete Structure (Existing v0.2.0 + New v1 Additions):**

```
johnny-bmad/
├── package.json                      # npm package configuration
├── tsconfig.json                     # TypeScript configuration (ES2022, ESM, strict)
├── bun.lock                          # Bun lockfile
├── .gitignore                        # Git ignore patterns
├── .npmignore                        # npm publish ignore patterns
├── README.md                         # Project readme and quick start
├── CHANGELOG.md                      # Version history (semantic versioning)
├── CLAUDE.md                         # AI development context and patterns
├── .johnny-bmad-state.json          # Runtime state file (gitignored, user-generated)
│
├── docs/                             # Project documentation (existing)
│   ├── index.md                      # Documentation index
│   ├── index.html                    # GitHub Pages documentation site
│   ├── project-overview.md           # Executive summary
│   ├── architecture.md               # System design (existing v0.2.0 docs)
│   ├── source-tree-analysis.md       # Code organization
│   └── development-guide.md          # Setup and contributing
│
├── _bmad/                            # BMAD configuration (development context)
│   └── bmm/
│       ├── config.yaml               # BMAD module configuration
│       └── workflows/                # BMAD workflow definitions
│
├── _bmad-output/                     # BMAD output artifacts (development context)
│   ├── planning-artifacts/           # PRD, Architecture, Epics
│   │   ├── prd.md
│   │   ├── validation-report-prd.md
│   │   ├── ux-design-specification.md
│   │   └── architecture.md           # THIS DOCUMENT (being created)
│   ├── implementation-artifacts/     # Stories, sprint status
│   │   ├── sprint-status.yaml
│   │   └── story-*.md
│   └── analysis/                     # Brainstorming sessions, research
│
├── dist/                             # Build output (gitignored)
│   └── index.js                      # Bundled CLI entry point (Bun build)
│
├── node_modules/                     # Dependencies (gitignored)
│
└── src/                              # TypeScript source code
    ├── index.ts                      # CLI entry point, argument parsing
    │                                 # - Existing: --verbose, --yolo, --max-iterations, --help
    │                                 # - NEW v1: --batch, --dev-only flag parsing
    │                                 # - NEW v1: Flag validation (mutually exclusive check)
    │                                 # - Unhandled rejection handler
    │
    ├── orchestrator.ts               # Main workflow loop, state machine
    │                                 # - Existing: runSequentialWorkflow (v0.2.0)
    │                                 # - NEW v1: determineMode() - mode routing logic
    │                                 # - NEW v1: runBatchWorkflow() - batch workflow function
    │                                 # - NEW v1: runDevOnlyWorkflow() - dev-only function
    │                                 # - Pre-flight checks (Claude CLI, BMAD project, Git)
    │                                 # - Epic selection logic
    │                                 # - State save/load integration
    │
    ├── orchestrator.test.ts          # Orchestrator tests (existing, extended)
    │                                 # - Existing: Epic continuation logic tests
    │                                 # - NEW v1: Mode determination tests
    │                                 # - NEW v1: Workflow routing tests
    │                                 # - NEW v1: Resume routing tests (mode/phase)
    │
    ├── config.ts                     # State persistence (.johnny-bmad-state.json)
    │                                 # - Existing: loadState(), saveState(), clearState()
    │                                 # - NEW v1: migrateV0toV1() - migration logic
    │                                 # - NEW v1: User prompt for migration confirmation
    │                                 # - Atomic write pattern (temp file + rename)
    │
    ├── config.test.ts                # NEW v1: State management tests
    │                                 # - migrateV0toV1() unit tests with v0.2.0 fixtures
    │                                 # - Migration prompt flow integration tests
    │                                 # - Backward compatibility tests
    │                                 # - Atomic write validation
    │
    ├── types.ts                      # TypeScript interfaces and types
    │                                 # - Existing: CliArgs, ClaudeOptions, ClaudeResult
    │                                 # - NEW v1: Enhanced State interface (explicit workflow structure)
    │                                 # - NEW v1: WorkflowMode type ('sequential' | 'batch' | 'dev-only')
    │                                 # - NEW v1: WorkflowPhase type ('story-creation' | 'review' | 'implementation')
    │                                 # - NEW v1: StoryApproval type ('approved' | 'needs-changes' | 'pending')
    │
    ├── fixtures/                     # NEW v1: Test fixtures directory
    │   ├── v0.2.0-state.json        # v0.2.0 state file for migration tests
    │   ├── v0.2.0-state-completed.json
    │   └── v0.2.0-state-partial.json
    │
    ├── agents/                       # Agent wrappers (existing, unchanged)
    │   ├── sm.ts                     # Scrum Master agent (opus)
    │   ├── story-creator.ts          # Story creation agent (opus)
    │   ├── dev.ts                    # Development agent (sonnet)
    │   └── reviewer.ts               # Review agent (opus) - captures output
    │
    ├── claude/                       # Claude CLI integration (existing, enhanced)
    │   ├── cli.ts                    # Spawns Claude CLI processes
    │   │                             # - Existing: spawnClaude(), checkClaudeInstalled()
    │   │                             # - NEW v1: retryableOperation() - 3 attempts, exponential backoff
    │   │                             # - Constants: MAX_RETRIES = 3, RETRY_DELAYS = [2000, 4000, 8000]
    │   │
    │   └── prompts.ts                # Prompt templates for each agent role (existing, unchanged)
    │
    ├── git/                          # Git operations (existing, unchanged)
    │   └── commit.ts                 # Git staging and commit operations
    │                                 # - commitStoryChanges(), isGitRepo()
    │                                 # - Conventional commit format: feat(STORY-ID): title
    │                                 # - User confirmation (unless --yolo)
    │
    ├── utils/                        # Utility modules (existing, unchanged)
    │   ├── logger.ts                 # Colored console logging with timestamps
    │   │                             # - info(), warn(), error(), success(), debug()
    │   │                             # - header(), subHeader(), step()
    │   │                             # - setVerbose(), isVerbose()
    │   │                             # - agentLifecycle() for verbose mode
    │   │
    │   ├── files.ts                  # BMAD file parsing (epics, stories, config)
    │   │                             # - isBmadProject(), loadConfig()
    │   │                             # - loadEpics(), loadStory(), storyFileExists()
    │   │                             # - loadSprintStatus(), updateSprintStatus()
    │   │                             # - findOngoingWork(), getAllStoriesForEpic()
    │   │
    │   ├── files.test.ts             # File parsing tests (existing)
    │   │
    │   ├── user-input.ts             # Inquirer-based user prompts (existing, unchanged)
    │   │                             # - selectEpic(), confirmResume()
    │   │                             # - handleMaxIterations(), confirmAction()
    │   │
    │   ├── user-input.test.ts        # User input tests (existing)
    │   │
    │   ├── timer.ts                  # Session timing utilities (existing)
    │   │
    │   ├── stream-wrapper.ts         # Labeled output streams for verbose mode (existing)
    │   │
    │   └── stream-wrapper.test.ts    # Stream wrapper tests (existing)
    │
    └── ui/                           # NEW v1: Terminal UI components
        ├── index.ts                  # Unified exports for all UI components
        │
        ├── banner.ts                 # ASCII banner display (brand identity)
        │                             # - displayBanner() - "JOHNNY BMAD" ASCII art + tagline
        │                             # - Shown on fresh session start only (not on resume)
        │                             # - Cyan color, respects NO_COLOR
        │
        ├── banner.test.ts            # Banner component tests
        │                             # - ASCII art rendering
        │                             # - NO_COLOR environment variable handling
        │                             # - Fresh session vs resume detection
        │
        ├── phase-header.ts           # Phase transition headers (━━━ Phase ━━━)
        │                             # - displayPhaseHeader(phase: string)
        │                             # - Format: ━━━ Phase: {phase_name} ━━━
        │                             # - Unicode separator ━ with ASCII fallback =
        │                             # - Title Case phase names
        │
        ├── phase-header.test.ts      # Phase header tests
        │                             # - Format validation
        │                             # - Unicode/ASCII fallback
        │                             # - All phase types (Story Creation, Review, Implementation)
        │
        ├── agent-line.ts             # Agent activity formatting ([SM], [Dev], [Review])
        │                             # - displayAgentActivity(agent, activity)
        │                             # - Format: [{agent_label}] {activity}...
        │                             # - Fixed width labels (8 chars), color-coded
        │                             # - Lowercase present tense verb + "..."
        │
        ├── agent-line.test.ts        # Agent line tests
        │                             # - Label formatting and padding
        │                             # - Color coding per agent
        │                             # - Activity description format
        │
        ├── progress.ts               # Progress bar rendering (Story 4/8 [████░░░░])
        │                             # - displayProgress(current, total, status)
        │                             # - Format: Story {current}/{total} [{bar}] {status}...
        │                             # - 16 char bar width, Unicode █░ with ASCII #- fallback
        │
        ├── progress.test.ts          # Progress bar tests
        │                             # - Bar width calculation
        │                             # - Fill percentage accuracy
        │                             # - Unicode/ASCII fallback
        │                             # - Status text formatting
        │
        ├── story-card.ts             # Story review card (batch mode approval)
        │                             # - displayStoryCard(story, index, total)
        │                             # - promptStoryApproval(): 'approved' | 'needs-changes'
        │                             # - Format: ━━━ Review Story {n}/{total} ━━━
        │                             # - Shows title, task count, AC count
        │                             # - [Y] Approve  [N] Request changes  [V] View full
        │
        ├── story-card.test.ts        # Story card tests
        │                             # - Card display formatting
        │                             # - Approval prompt interaction
        │                             # - Change request flow
        │                             # - Full story view option
        │
        ├── status.ts                 # Status message formatting ([OK], [FAIL], [WARN])
        │                             # - displayStatus(level, message)
        │                             # - Format: [STATUS] message
        │                             # - Status symbols: [OK], [FAIL], [WARN], [INFO], [ERROR]
        │                             # - Color-coded, color-independent (text labels)
        │
        ├── status.test.ts            # Status message tests
        │                             # - All status levels
        │                             # - Message formatting
        │                             # - Color independence (NO_COLOR)
        │
        ├── celebration.ts            # Epic completion block (🎉 celebration)
        │                             # - displayCelebration(stats)
        │                             # - Format: 🎉 Epic Complete! {stories} · {files} · {duration}
        │                             # - Stats: story count, file count, duration
        │
        ├── celebration.test.ts       # Celebration block tests
        │                             # - Stats formatting
        │                             # - Duration calculation
        │                             # - Emoji/ASCII fallback
        │
        ├── error.ts                  # Error block with recovery guidance
        │                             # - displayError(errorType, description, context, recoveryCmd)
        │                             # - Format: [ERROR] {type}: {description}
        │                             #           {context}
        │                             #           Try: {recovery_command}
        │                             # - ALL errors include actionable "Try:" command
        │
        └── error.test.ts             # Error block tests
                                      # - Error message formatting
                                      # - Recovery command inclusion
                                      # - Multi-line context handling
```

## Architectural Boundaries

**Process Boundaries (CLI Tool):**

Since johnny-bmad is a CLI orchestrator (not a web app), architectural boundaries are primarily **process-based**:

**Agent Process Boundaries:**
- **Orchestrator Process** (main johnny-bmad process)
  - Spawns child processes via Node.js `child_process.spawn`
  - Manages workflow state and routing
  - Coordinates agent execution

- **Claude CLI Child Processes** (4 agent types)
  - SM Agent (opus) - Sprint status checks
  - Story Creator (opus) - Story file generation
  - Dev Agent (sonnet) - Story implementation
  - Reviewer (opus) - Code validation
  - Each runs in isolated process with `stdio` configuration

**Communication Boundaries:**
- **Orchestrator → Agents:** BMAD workflow prompts via stdin
- **Agents → Orchestrator:**
  - Interactive mode: `stdio: 'inherit'` (real-time to terminal)
  - Review mode: `stdio: 'pipe'` (captured for review detection)
- **State File:** Persistent JSON file for resume capability
- **BMAD Files:** Read-only access to epics, stories, sprint-status.yaml

**No API Boundaries:**
- No REST API layer (CLI tool, not web service)
- No GraphQL endpoints
- No WebSocket connections
- Direct Claude CLI process spawning

**No Database Boundaries:**
- State persistence via JSON file (`.johnny-bmad-state.json`)
- No SQL or NoSQL database
- BMAD files read from filesystem (markdown, YAML)

---

**Component Boundaries (Terminal UI):**

**UI Component Isolation:**
- Each UI component (`src/ui/*.ts`) is self-contained
- No dependencies between UI components
- All components export pure functions
- Logger (`src/utils/logger.ts`) remains separate for core logging

**Component Communication:**
- **Orchestrator → UI Components:** Direct function calls
  - Example: `displayPhaseHeader('Story Creation')`
  - Example: `displayProgress(4, 8, 'implementing')`
- **UI Components → Terminal:** Direct console output
  - Respects `NO_COLOR` environment variable
  - Provides ASCII fallbacks for Unicode

**State Component Isolation:**
- **State Manager** (`src/config.ts`) owns all state operations
- No other components write to state file directly
- Atomic write pattern enforced (temp file + rename)

---

**Data Flow Boundaries:**

**Workflow State Flow:**
```
User CLI Flags
    ↓
CLI Parser (index.ts) - validates flags, determines initial mode
    ↓
Orchestrator (orchestrator.ts) - loads/creates state
    ↓
State Manager (config.ts) - reads/writes state file
    ↓ (migration if needed)
Migration Logic - converts v0.2.0 → v1 with user prompt
    ↓
Workflow Router - routes to appropriate workflow function
    ↓
Workflow Functions - execute batch/sequential/dev-only
    ↓ (agents spawn)
Claude CLI Processes - implement/review stories
    ↓ (state updates)
State Manager - saves progress atomically
    ↓ (resume)
Orchestrator - routes to correct phase based on state
```

**Error Recovery Flow:**
```
Risky Operation (Claude spawn, file write, API call)
    ↓
State Save (BEFORE operation) - atomic write
    ↓
Try Operation
    ↓
Catch Error
    ↓
Retry Logic - exponential backoff (2s, 4s, 8s)
    ↓ (if max retries exceeded)
Error Display - [ERROR] with recovery command
    ↓
Exit(1) - state already saved, resume possible
```

## Requirements to Structure Mapping

**FR1-6: Workflow Mode Selection**
```
src/index.ts
  - parseArgs() - NEW: --batch, --dev-only flags
  - Flag validation - NEW: mutually exclusive check

src/orchestrator.ts
  - determineMode() - NEW: mode routing logic
  - runOrchestrator() - NEW: mode branching
```

**FR7-11: Batch Story Creation**
```
src/orchestrator.ts
  - runBatchWorkflow() - NEW: PHASE 1 story creation loop

src/agents/story-creator.ts
  - Existing agent wrapper (unchanged)

src/ui/phase-header.ts
  - NEW: displayPhaseHeader('Story Creation')

src/ui/progress.ts
  - NEW: displayProgress(current, total, 'creating')
```

**FR12-18: Per-Story Review & Approval**
```
src/orchestrator.ts
  - runBatchWorkflow() - NEW: PHASE 2 review loop

src/ui/story-card.ts
  - NEW: displayStoryCard(story, index, total)
  - NEW: promptStoryApproval() - Y/N/V prompt

src/agents/story-creator.ts
  - Existing agent for story updates (unchanged)
```

**FR19-21: Auto-Approve Story Creation**
```
src/orchestrator.ts
  - runBatchWorkflow() - NEW: --yolo flag handling in batch mode
```

**FR22-27: Dev-Only Execution**
```
src/orchestrator.ts
  - runDevOnlyWorkflow() - NEW: skip story creation, use existing stories

src/utils/files.ts
  - Existing: getAllStoriesForEpic() - loads pre-created stories
```

**FR28-34: Implementation Loop**
```
src/orchestrator.ts
  - Existing: runSequentialWorkflow() (preserved)
  - Existing: Dev/Review loop logic

src/agents/dev.ts, src/agents/reviewer.ts
  - Existing agent wrappers (unchanged)
```

**FR35-42: State Management & Resume**
```
src/config.ts
  - NEW: migrateV0toV1() - migration with user prompt
  - Enhanced: loadState() - detects old format, prompts migration
  - Enhanced: saveState() - atomic writes with new schema

src/types.ts
  - NEW: Enhanced State interface (workflow, stories structure)

src/orchestrator.ts
  - Enhanced: Resume routing based on state.workflow.mode and state.workflow.phase
```

**FR43-50: Error Handling & Recovery**
```
src/claude/cli.ts
  - NEW: retryableOperation() - 3 attempts, exponential backoff
  - Constants: MAX_RETRIES, RETRY_DELAYS

src/ui/error.ts
  - NEW: displayError() - [ERROR] format with "Try:" recovery

src/orchestrator.ts
  - Enhanced: State save before all risky operations
```

**FR51-56: CLI Output & User Feedback**
```
src/ui/banner.ts
  - NEW: displayBanner() - ASCII art brand identity

src/ui/phase-header.ts
  - NEW: Phase transition markers

src/ui/agent-line.ts
  - NEW: Agent activity formatting

src/ui/progress.ts
  - NEW: Progress bar rendering

src/ui/status.ts
  - NEW: Status message formatting

src/ui/celebration.ts
  - NEW: Epic completion summary
```

**FR57-62: Backward Compatibility**
```
src/config.ts
  - NEW: migrateV0toV1() - v0.2.0 state migration

src/orchestrator.ts
  - Preserved: runSequentialWorkflow() as default
  - Preserved: All existing flags (--verbose, --yolo, --max-iterations)

src/index.ts
  - Preserved: Existing flag parsing
  - NEW: Additive flags only (--batch, --dev-only)
```

---

**Cross-Cutting Concerns Mapping:**

**1. State Persistence (Spans All Workflows):**
```
src/config.ts
  - saveState() - called before every risky operation
  - loadState() - called on orchestrator start
  - Atomic write pattern (temp file + rename)

Affects:
  - src/orchestrator.ts (all workflow functions)
  - src/agents/* (state tracking during execution)
```

**2. Error Recovery & Retry (Spans All Agent Interactions):**
```
src/claude/cli.ts
  - retryableOperation() - wraps all Claude spawns
  - Constants: MAX_RETRIES = 3, RETRY_DELAYS = [2000, 4000, 8000]

src/ui/error.ts
  - displayError() - consistent error formatting

Affects:
  - src/agents/* (all agent wrappers call retryableOperation)
  - src/orchestrator.ts (error handling in workflow functions)
```

**3. Terminal Output Formatting (Spans Entire System):**
```
src/ui/* (all components)
  - Consistent formatting patterns
  - NO_COLOR support
  - ASCII fallbacks

src/utils/logger.ts
  - Core logging (info, warn, error, success, debug)
  - Verbose mode support

Affects:
  - src/orchestrator.ts (progress display, phase transitions)
  - src/agents/* (agent activity lines)
  - All error handlers (error blocks)
```

**4. Test Coverage (All New Code):**
```
src/*.test.ts
  - Co-located test files alongside implementation
  - 100% coverage (true 90%+) required for new code

src/fixtures/*.json
  - Test fixtures for migration tests

Affects:
  - src/ui/*.test.ts (all UI components)
  - src/config.test.ts (migration logic)
  - src/orchestrator.test.ts (workflow routing)
```

## Integration Points

**Internal Communication (Within johnny-bmad):**

**Orchestrator ↔ State Manager:**
```typescript
// Orchestrator calls State Manager
const state = await loadState();  // Read state
await saveState(updatedState);    // Write state

// State Manager handles migration transparently
if (!raw.workflow) {
  // Prompt user, migrate if confirmed
  return migratedState;
}
```

**Orchestrator ↔ UI Components:**
```typescript
// Orchestrator calls UI components directly
import { displayPhaseHeader, displayProgress, displayStoryCard } from './ui/index.js';

// Phase transition
displayPhaseHeader('Story Creation');

// Progress updates
displayProgress(4, 8, 'creating');

// Story review
const approval = await promptStoryApproval(story, 4, 8);
```

**Orchestrator ↔ Agents:**
```typescript
// Orchestrator spawns agents via wrappers
import { runSMAgent } from './agents/sm.js';
import { runStoryCreatorAgent } from './agents/story-creator.js';
import { runDevAgent } from './agents/dev.js';
import { runReviewerAgent } from './agents/reviewer.js';

// Example: Create story in batch mode
await runStoryCreatorAgent(cwd, epicId, storyId, storyTitle);
```

**Claude CLI Integration ↔ Retry Logic:**
```typescript
// All agent wrappers use retryableOperation
import { retryableOperation } from '../claude/cli.js';

export async function runDevAgent(cwd: string, storyId: string) {
  await saveState(state);  // Save before risky op
  return await retryableOperation(
    () => spawnClaude({ model: 'sonnet', prompt: devPrompt, cwd }),
    'Dev agent'
  );
}
```

---

**External Integrations (Outside johnny-bmad):**

**Claude CLI (External Dependency):**
```
johnny-bmad orchestrator
    ↓ (spawns via child_process)
Claude CLI process (claude command in PATH)
    ↓ (communicates with)
Claude API (Anthropic)
```

**Integration Points:**
- **Pre-flight check:** `checkClaudeInstalled()` validates `claude` in PATH
- **Process spawn:** `child_process.spawn('claude', args)`
- **Output capture:** `stdio: 'pipe'` for review agent, `stdio: 'inherit'` for others
- **Error handling:** Retry logic for API failures, rate limiting

**BMAD Project Files (External Context):**
```
johnny-bmad orchestrator
    ↓ (reads)
BMAD project files
  - _bmad/bmm/config.yaml (project configuration)
  - _bmad-output/planning-artifacts/epic-*.md (epic definitions)
  - _bmad-output/implementation-artifacts/sprint-status.yaml (progress tracking)
  - _bmad-output/implementation-artifacts/story-*.md (story files)
```

**Integration Points:**
- **Project validation:** `isBmadProject()` checks for `_bmad/` folder
- **Epic loading:** `loadEpics()` parses epic markdown files
- **Story loading:** `loadStory()` parses story markdown
- **Progress tracking:** `loadSprintStatus()`, `updateSprintStatus()`

**Git (Optional External Tool):**
```
johnny-bmad orchestrator
    ↓ (optional commits via)
Git commands (if git repo detected)
```

**Integration Points:**
- **Git detection:** `isGitRepo()` checks for `.git` directory
- **Commit creation:** `commitStoryChanges()` stages and commits
- **User confirmation:** Required unless `--yolo` flag
- **Graceful fallback:** Works without git (just no commits)

---

**Data Flow Through Architecture:**

**Batch Workflow Data Flow:**
```
1. User runs: johnny-bmad --batch
   ↓
2. CLI Parser (index.ts)
   - Parses --batch flag
   - Validates no --dev-only conflict
   ↓
3. Orchestrator (orchestrator.ts)
   - Loads/creates state (migration if v0.2.0 detected)
   - determineMode() returns 'batch'
   - Routes to runBatchWorkflow()
   ↓
4. Batch Workflow - PHASE 1: Story Creation
   - FOR EACH story to create:
     - Save state before spawn
     - Spawn Story Creator agent (opus)
     - Agent writes story file to _bmad-output/implementation-artifacts/
     - Display progress: Story 1/8 [██░░░░░░░░░░░░░░] creating...
   ↓
5. Batch Workflow - PHASE 2: Review
   - FOR EACH created story:
     - Display story card (title, task count, AC count)
     - Prompt: [Y] Approve  [N] Request changes  [V] View full
     - If 'needs-changes': Re-spawn Story Creator, iterate
     - If 'approved': Mark in state.stories.approvals
     - Display progress: Reviewing story 4/8...
   ↓
6. Batch Workflow - COMPLETE
   - Display summary: All 8 stories created and approved
   - Save final state (mode: 'batch', phase: 'review', all approved)
   - Display next step: "Next: johnny-bmad --dev-only"
   - Exit(0)
```

**Dev-Only Workflow Data Flow:**
```
1. User runs: johnny-bmad --dev-only
   ↓
2. CLI Parser (index.ts)
   - Parses --dev-only flag
   - Validates no --batch conflict
   ↓
3. Orchestrator (orchestrator.ts)
   - Loads state (no migration needed, assumes fresh or post-batch)
   - determineMode() returns 'dev-only'
   - Routes to runDevOnlyWorkflow()
   ↓
4. Dev-Only Workflow - Load Stories
   - getAllStoriesForEpic() from sprint-status.yaml
   - Verify stories exist (error if missing)
   ↓
5. Dev-Only Workflow - Implementation Loop
   - FOR EACH existing story:
     - Save state before implementation
     - Display: Story 4/8 [████████░░░░░░░░] implementing...
     - Spawn Dev agent (sonnet) - implements story
     - Spawn Reviewer agent (opus) - validates code
     - If review passes: Commit changes
     - If review fails: Retry dev/review (max iterations)
     - Mark story complete in state
   ↓
6. Dev-Only Workflow - COMPLETE
   - Display celebration: 🎉 Epic Complete! 8 stories · 47 files · 3h 42m
   - Save final state
   - Exit(0)
```

**State Persistence Data Flow:**
```
State File (.johnny-bmad-state.json)
  ↓ (read on start)
loadState()
  ↓ (detect old format)
migrateV0toV1() - if v0.2.0 detected
  ↓ (user prompt)
User confirms migration: Y/N
  ↓ (if Y)
Migrated state returned
  ↓ (in-memory state updates during workflow)
Orchestrator workflow functions
  ↓ (before every risky operation)
saveState() - atomic write (temp file + rename)
  ↓ (persisted to disk)
State File (.johnny-bmad-state.json) - updated
```

## File Organization Patterns

**Configuration Files (Root Level):**
```
package.json          # npm package metadata, dependencies, scripts
  - Dependencies: chalk, inquirer, yaml
  - Scripts: dev, build, test, publish:npm

tsconfig.json         # TypeScript compiler configuration
  - Target: ES2022
  - Module: ESNext (ESM)
  - Strict: true
  - ImportHelpers: .js extensions required

bun.lock              # Dependency lockfile (Bun)

.gitignore            # Git ignore patterns
  - node_modules/, dist/, .johnny-bmad-state.json

.npmignore            # npm publish ignore patterns
  - _bmad/, _bmad-output/, *.test.ts, fixtures/

CLAUDE.md             # AI development context
  - Tech stack patterns
  - Code style guidelines
  - Testing approach
  - Important notes for AI agents
```

**Source Organization (src/ Directory):**
```
Flat structure for main files:
  - index.ts (entry point)
  - orchestrator.ts (main workflow)
  - config.ts (state management)
  - types.ts (shared interfaces)

Subdirectories for related modules:
  - agents/ (4 agent wrappers)
  - claude/ (CLI integration, prompts)
  - git/ (git operations)
  - utils/ (logger, files, user-input, timer, stream-wrapper)
  - ui/ (NEW v1: terminal UI components)
  - fixtures/ (NEW v1: test data)

Pattern: Domain-based organization
  - Each subdirectory represents a cohesive domain
  - Minimal cross-dependencies
  - Clear responsibilities
```

**Test Organization (Co-located Pattern):**
```
Test files co-located with implementation:
  - src/orchestrator.ts → src/orchestrator.test.ts
  - src/config.ts → src/config.test.ts
  - src/ui/progress.ts → src/ui/progress.test.ts

Test data in fixtures/:
  - src/fixtures/v0.2.0-state.json
  - src/fixtures/v0.2.0-state-completed.json

Pattern: Co-location for discoverability
  - Tests next to code they test
  - Easy to find and maintain
  - 1:1 mapping (one test file per source file)
```

**Asset Organization (Not Applicable):**
```
No static assets in CLI tool:
  - No images, fonts, or media files
  - No CSS or styling files
  - Terminal output is text-based
  - ASCII art defined in code (banner.ts)
```

## Development Workflow Integration

**Development Server Structure:**
```
Development mode: bun run dev
  - Runs: bun run src/index.ts with watch mode
  - Live recompilation on file changes
  - TypeScript compiled on-the-fly by Bun
  - No build step required for development

Working directory:
  - Developer works in johnny-bmad project root
  - Tests run against source code (no build required)
  - State file gitignored (user-specific)
```

**Build Process Structure:**
```
Build command: bun run build
  - Runs: bun build src/index.ts --outdir dist --target node
  - Output: dist/index.js (single bundled file)
  - Shebang: #!/usr/bin/env node (added automatically)
  - Target: Node.js compatibility (not Bun-specific)

Build inputs:
  - All src/**/*.ts files (except *.test.ts)
  - Dependencies bundled (chalk, inquirer, yaml)

Build outputs:
  - dist/index.js (executable CLI bundle)
  - No sourcemaps in production builds
```

**Deployment Structure:**
```
Deployment method: npm publish
  - Command: bun run publish:npm
  - Runs: build → npm publish --access public → git tag → git push tag

Package structure:
  - dist/index.js (bundled entry point)
  - package.json (metadata and dependencies)
  - README.md (documentation)
  - CHANGELOG.md (version history)

Installation:
  - npm install -g @webeleon/johnny-bmad
  - Installs to: npm global bin directory
  - Command available: johnny-bmad

Runtime structure:
  - Runs from: npm global installation
  - Expects: BMAD project in current working directory
  - Creates: .johnny-bmad-state.json in CWD (current working directory)
```

**Testing Workflow Structure:**
```
Test command: bun test
  - Runs all *.test.ts files
  - Co-located tests discovered automatically
  - Framework: Bun's built-in test runner

Coverage command: bun test --coverage
  - Generates coverage report
  - NEW v1: Validates 90%+ for new code
  - Quality gate before release

Test execution flow:
  1. Unit tests (component isolation)
  2. Integration tests (component interaction)
  3. System tests (full workflow validation)
  4. Coverage validation (90%+ for new code)
```
