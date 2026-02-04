# Core Architectural Decisions

## Decision Priority Analysis

**Critical Decisions (Block Implementation):**

1. **Enhanced State Schema** - Required for batch workflow state tracking and resume capability
2. **State Migration Strategy** - Required for backward compatibility with v0.2.0 users
3. **Workflow Router Design** - Required for routing between sequential/batch/dev-only modes
4. **UI Component Organization** - Required for implementing new terminal output patterns from UX spec
5. **Test Coverage for New Code** - 100% coverage (true 90%+) required for all v1 enhancements

**Important Decisions (Shape Architecture):**

All decisions for v1 are critical - batch workflow cannot function without state tracking, migration handling, workflow routing, UI components, and comprehensive test coverage.

**Deferred Decisions (Post-MVP):**

The following decisions are deferred to v1.5 (Testing Infrastructure) per PRD roadmap:
- **CI/CD pipeline implementation** (GitHub Actions for automated testing and deployment)
- **100% test coverage for EXISTING v0.2.0 code** (bringing legacy codebase to coverage standard)
- **Test framework enhancements** beyond current Bun test runner
- **Monitoring and logging infrastructure** for production analytics

**NOT Deferred - v1 Requirements:**
- **100% test coverage for ALL NEW v1 code** (batch workflow, UI components, state migration) - REQUIRED before v1 release

## Data Architecture

**State File Schema (Enhanced for Batch Workflow):**

**Decision:** Explicit Workflow State Structure (Migration Required)

**Schema:**
```typescript
interface State {
  // Core identifiers
  currentEpic: string;
  lastUpdated: string;

  // Workflow state
  workflow: {
    mode: 'sequential' | 'batch' | 'dev-only';
    phase: 'story-creation' | 'review' | 'implementation';
    currentStoryIndex: number;
    devReviewIteration: number;
  };

  // Progress tracking
  stories: {
    completed: string[];
    approvals: Record<string, 'approved' | 'needs-changes' | 'pending'>;
  };
}
```

**Rationale:**
- Clean, explicit structure easier to reason about long-term
- Workflow state clearly separated from progress tracking
- Alpha status allows breaking changes with user disclaimer
- Sets foundation for future workflow enhancements

**Migration Strategy:** Hybrid (Auto-migrate with Confirmation)

```typescript
function loadState(): State {
  const raw = readStateFile();

  // Detect old v0.2.0 format
  if (!raw.workflow) {
    const answer = await prompt('Migrate state file to v1 format? (y/n)');
    if (answer === 'y') {
      const migrated = migrateV0toV1(raw);
      saveState(migrated);
      return migrated;
    } else {
      console.log('Delete .johnny-bmad-state.json to start fresh');
      process.exit(1);
    }
  }

  return raw as State;
}
```

**Migration Implementation:**
- Automatic detection of v0.2.0 format (missing `workflow` field)
- User prompt with clear choice: migrate or fresh start
- Migration preserves: currentEpic, completedStories, currentStoryIndex
- Migration defaults: mode='sequential', phase='implementation', approvals={}
- Release notes include migration disclaimer and guidance

**Backward Compatibility:**
- v1 can read and migrate v0.2.0 state files
- Users must confirm migration (explicit consent)
- Fallback: delete state file for fresh start
- No silent migration (user always aware of change)

**State Persistence Guarantees (Preserved from v0.2.0):**
- Atomic writes (write to temp file, then rename)
- State saved before every risky operation (agent spawns, API calls)
- Resume capability from exact workflow position (mode, phase, story index)
- State file written on: story creation start, review start, implementation start, story completion

**Affects:**
- State manager (`src/config.ts`) - schema update, migration logic
- Orchestrator (`src/orchestrator.ts`) - reads workflow state for routing
- All agents - state tracking during execution
- Resume logic - routes to correct phase based on state

**Testing Requirements:**
- Unit tests for `migrateV0toV1()` with v0.2.0 state fixtures
- Integration tests for migration prompt flow (accept/decline)
- System tests for backward compatibility with real v0.2.0 state files
- Coverage requirement: 100% (true 90%+) for all migration logic

## Authentication & Security

**Decision:** Not Applicable - CLI Tool (Local Execution Only)

This is a local CLI orchestrator with no authentication requirements. Security considerations limited to:
- Git commit safety (user confirmation required)
- No API keys stored in state file
- Claude API authentication handled externally by Claude CLI

## API & Communication Patterns

**Decision:** Not Applicable - No Web API Layer

Communication pattern is **process spawning** (Claude CLI child processes), not HTTP/REST/GraphQL APIs.

**Process Communication Architecture (Existing v0.2.0):**
- **Spawn Method:** Node.js `child_process.spawn` (cross-runtime compatible)
- **Agent Prompts:** Template strings with BMAD workflow context
- **Output Capture:**
  - Interactive mode: `stdio: 'inherit'` for real-time output
  - Review agent: `stdio: 'pipe'` to capture stdout for review detection
- **Error Handling:** Retry with exponential backoff (2s, 4s, 8s)

**Preserved Patterns:**
- Claude CLI spawning remains unchanged
- Agent wrapper pattern continues (thin wrappers with role-specific prompts)
- Model selection per agent type (opus for planning/review, sonnet for implementation)

## Frontend Architecture

**Decision:** Terminal UI Component System

**UI Component Organization:** Component-Based Structure (`src/ui/`)

```
src/ui/
├── banner.ts         # ASCII banner display (brand identity)
├── phase-header.ts   # Phase transition headers (━━━ Phase ━━━)
├── agent-line.ts     # Agent activity formatting ([SM], [Dev], [Review])
├── progress.ts       # Progress bar rendering (Story 4/8 [████░░░░])
├── story-card.ts     # Story review card (batch mode approval)
├── status.ts         # Status message formatting ([OK], [FAIL], [WARN])
├── celebration.ts    # Epic completion block (🎉 celebration)
├── error.ts          # Error block with recovery guidance
└── index.ts          # Unified exports
```

**Rationale:**
- Aligns with UX specification component strategy
- Each component focused and testable in isolation
- Clean separation of concerns
- Easy to extend with new components
- Unified exports via `index.ts` for clean imports

**Component Responsibilities:**
- **banner.ts:** Display ASCII art "JOHNNY BMAD" with tagline, shown on fresh session start only
- **phase-header.ts:** Visual separators for phase transitions (story-creation, review, implementation)
- **agent-line.ts:** Formatted agent activity messages with color-coded labels
- **progress.ts:** Story progress indicators with fill bars and percentages
- **story-card.ts:** Interactive story review UI for batch mode approval prompts
- **status.ts:** Status symbols and messages ([OK], [FAIL], [WARN], [INFO], [ERROR])
- **celebration.ts:** Epic completion summary with stats (stories, files, duration)
- **error.ts:** Error blocks with actionable recovery commands ("Try: ...")

**Terminal Compatibility (Cross-Cutting):**
- All components respect `NO_COLOR` environment variable
- ASCII fallbacks for Unicode characters (█ → #, ░ → -, ━ → =)
- Color-independent status (text labels, not just colors)
- Works on macOS Terminal, iTerm, Windows Terminal, Linux terminals
- Screen reader compatible (plain text, no animations)

**Integration with Existing Logger:**
- `src/utils/logger.ts` remains for core logging (info, warn, error, success, debug)
- `src/ui/` components handle visual/interactive terminal elements
- Logger used for verbose mode timestamps and agent lifecycle tracking
- UI components called directly for workflow-specific output

**Affects:**
- Orchestrator - imports UI components for phase transitions and progress
- Batch workflow - uses story-card for review prompts
- Error handlers - use error component for recovery guidance
- Agent wrappers - use agent-line for activity messages

**Testing Requirements:**
- Unit tests for each UI component (banner, phase-header, progress, story-card, status, celebration, error)
- Integration tests for component interactions with logger
- Terminal compatibility tests (NO_COLOR, ASCII fallbacks, color-independence)
- Coverage requirement: 100% (true 90%+) for all UI components

## Infrastructure & Deployment

**Deployment Strategy (Preserved from v0.2.0):**
- **Distribution:** npm package (`@webeleon/johnny-bmad`)
- **Build:** Bun bundler → single `dist/index.js` file
- **Entry Point:** `#!/usr/bin/env node` shebang for CLI execution
- **Package Manager:** npm (published to npmjs.com)
- **Version Control:** Git with semantic versioning

**CI/CD Pipeline (Deferred to v1.5):**
Per PRD roadmap, comprehensive CI/CD infrastructure is scheduled for v1.5:
- GitHub Actions for automated testing
- Automated npm publishing on version tags
- Cross-platform testing (macOS, Linux, Windows)

**Testing Approach (v1 - New Code Only):**

**Framework:** Bun's built-in test runner (`bun:test`)

**Coverage Requirement:** 100% (true 90%+) for ALL NEW v1 code

**Test Categories:**

1. **Unit Tests** (Component Isolation)
   - State migration logic (`migrateV0toV1()` with v0.2.0 state fixtures)
   - UI components (banner, phase-header, progress, story-card, status, celebration, error)
   - Mode determination (`determineMode()` with flag combinations)
   - Workflow router branching logic

2. **Integration Tests** (Component Interaction)
   - Batch workflow end-to-end (create → review → approve → exit)
   - Dev-only workflow end-to-end (load stories → implement → commit)
   - State persistence across phases (save → load → resume)
   - Migration prompt flow (detect → prompt → migrate → save)

3. **System Tests** (Full Workflow)
   - Complete batch session (fresh start → all stories approved)
   - Resume from each phase (story-creation, review)
   - Error recovery (API failures, network errors, Ctrl+C)
   - Backward compatibility (v0.2.0 state migration)

**Test File Organization:**
- Co-located with implementation: `*.test.ts` alongside source files
- Example: `src/ui/progress.ts` → `src/ui/progress.test.ts`
- Migration tests: `src/config.test.ts` (extensive v0.2.0 fixtures)

**Coverage Validation:**
```bash
bun test --coverage  # Must show 90%+ for new code
```

**Quality Gate:** v1 cannot release until all new code reaches 90%+ test coverage

**Existing v0.2.0 Code:**
- Current partial coverage continues (files.test.ts, orchestrator.test.ts, user-input.test.ts, stream-wrapper.test.ts)
- Bringing existing code to 100% coverage deferred to v1.5
- Existing tests must continue to pass (regression prevention)

**Environment Configuration:**
- **Config File:** Not implemented in v1 (deferred to v2+ per PRD)
- **State File:** `.johnny-bmad-state.json` (internal, not user-configurable)
- **BMAD Config:** Reads `_bmad/bmm/config.yaml` from target project
- **Model Selection:** Hardcoded in agent wrappers (opus/sonnet)

**Monitoring & Logging (v1 Scope):**
- **Verbose Mode:** `--verbose` flag for detailed agent output
- **State Inspection:** `.johnny-bmad-state.json` readable JSON for debugging
- **Error Messages:** Actionable recovery guidance with "Try: [command]" format
- **Session Logging:** Terminal output only (no persistent log files in v1)

**Affects:**
- Build process (`bun run build`) - unchanged
- Publishing process (`bun run publish:npm`) - unchanged
- Testing approach - 100% coverage for new v1 code, existing tests continue to pass

## Workflow Routing Architecture

**Workflow Router Design:** Single Function with Mode Branching

**Implementation:**
```typescript
async function runOrchestrator(args: CliArgs) {
  // Common: Pre-flight checks (Claude CLI, BMAD project, Git repo)
  // Common: Load/create state with migration handling
  // Common: Select epic (SM Agent or user prompt)

  const mode = determineMode(args); // sequential | batch | dev-only

  if (mode === 'batch') {
    await runBatchWorkflow(cwd, state, args);
  } else if (mode === 'dev-only') {
    await runDevOnlyWorkflow(cwd, state, args);
  } else {
    await runSequentialWorkflow(cwd, state, args); // existing v0.2.0
  }

  // Common: Save final state
  // Common: Check for next epic continuation
}
```

**Mode Determination Logic:**
```typescript
function determineMode(args: CliArgs): WorkflowMode {
  if (args.batch && args.devOnly) {
    throw new Error('Cannot use --batch and --dev-only together');
  }

  if (args.batch) return 'batch';
  if (args.devOnly) return 'dev-only';
  return 'sequential'; // default (backward compatible)
}
```

**Rationale:**
- Simple, straightforward routing for 3 workflow modes
- Clear entry point in orchestrator.ts
- Avoids over-engineering (no OOP complexity for 3 workflows)
- Easy to understand and maintain
- Shared pre-flight and post-flight logic
- Mode-specific workflow functions for clean separation

**Workflow Function Responsibilities:**

**runSequentialWorkflow (Existing v0.2.0):**
- FOR EACH STORY: Create → Dev/Review Loop → Commit → Next Story
- Continues until epic complete
- Mode: `sequential`, Phase: always `implementation`

**runBatchWorkflow (New v1):**
- PHASE 1: Create ALL stories (Story Creator Agent, loop until done)
- PHASE 2: Review EACH story (Per-story approval with change iteration)
- PHASE 3: Stop (no implementation in batch mode)
- Mode: `batch`, Phase: `story-creation` → `review`
- Exit after all stories approved with "Next: johnny-bmad --dev-only"

**runDevOnlyWorkflow (New v1):**
- Prerequisite: Stories already exist (pre-created via --batch or manually)
- FOR EACH EXISTING STORY: Dev/Review Loop → Commit → Next Story
- Mode: `dev-only`, Phase: always `implementation`
- Skips story creation entirely

**Resume Routing:**
When state file exists, orchestrator:
1. Loads state (with migration if needed)
2. Determines mode from `state.workflow.mode`
3. Routes to appropriate workflow function
4. Workflow function checks `state.workflow.phase` to resume at correct position

**Error Handling:**
- Mutually exclusive flag validation (--batch vs --dev-only)
- Missing stories error in dev-only mode with guidance
- State corruption handled by migration logic

**Affects:**
- Orchestrator (`src/orchestrator.ts`) - main routing logic
- CLI parser (`src/index.ts`) - flag validation
- State manager (`src/config.ts`) - mode/phase tracking
- All workflow functions - phase-aware resume

**Testing Requirements:**
- Unit tests for `determineMode()` with all flag combinations
- Unit tests for flag validation (mutually exclusive check)
- Integration tests for workflow routing (sequential, batch, dev-only)
- Integration tests for resume routing based on state.workflow.mode and state.workflow.phase
- System tests for complete workflows with state persistence and resume
- Coverage requirement: 100% (true 90%+) for all routing logic

## Decision Impact Analysis

**Implementation Sequence:**

1. **State Schema & Migration** (Foundation)
   - Update `State` interface in `src/types.ts`
   - Implement migration logic in `src/config.ts`
   - Add user prompt for migration confirmation
   - **Write tests:** Unit tests for `migrateV0toV1()` with v0.2.0 fixtures, integration tests for prompt flow
   - **Coverage target:** 100% for migration logic

2. **UI Component System** (Infrastructure)
   - Create `src/ui/` directory structure
   - Implement component files (banner, phase-header, agent-line, progress, story-card, status, celebration, error)
   - Add unified exports in `src/ui/index.ts`
   - **Write tests:** Unit test for each component, terminal compatibility tests
   - **Coverage target:** 100% for all UI components

3. **Workflow Router** (Core Logic)
   - Add mode determination logic in `src/orchestrator.ts`
   - Implement `runBatchWorkflow()` function
   - Implement `runDevOnlyWorkflow()` function
   - Preserve `runSequentialWorkflow()` (refactored from existing code)
   - **Write tests:** Unit tests for `determineMode()`, integration tests for each workflow function, resume routing tests
   - **Coverage target:** 100% for all new routing and workflow logic

4. **CLI Flag Expansion** (Entry Point)
   - Add `--batch` and `--dev-only` flag parsing in `src/index.ts`
   - Add flag validation (mutually exclusive check)
   - Update help text with new flags and examples
   - **Write tests:** Unit tests for flag parsing and validation
   - **Coverage target:** 100% for new flag handling code

5. **Integration & Testing** (Validation)
   - End-to-end testing of batch workflow (create → review → approve)
   - End-to-end testing of dev-only workflow (implement pre-created stories)
   - Resume testing for all modes and phases
   - Migration testing with v0.2.0 state files
   - **Run coverage:** `bun test --coverage` and verify 90%+ for all new code
   - **Quality gate:** Must reach 90%+ before v1 release

**Cross-Component Dependencies:**

**State Schema → All Components:**
- State manager must be updated first (foundation)
- Orchestrator depends on new workflow state fields
- UI components depend on phase tracking for display
- Migration logic must work before workflows can use new schema

**UI Components → Workflow Functions:**
- Banner displayed at session start (orchestrator calls)
- Phase headers used by batch workflow (phase transitions)
- Story card used by batch review flow (approval prompts)
- Progress bars used by all workflows (story tracking)
- Error blocks used by all error handlers (recovery guidance)

**Workflow Router → State & UI:**
- Router reads state.workflow.mode for routing decision
- Router reads state.workflow.phase for resume positioning
- Router calls UI components for phase transitions and progress
- Router updates state before each risky operation

**CLI Flags → Router → State:**
- CLI flags determine initial mode (sequential/batch/dev-only)
- Router validates flag combinations
- Mode stored in state for resume
- State persists mode across sessions

**Backward Compatibility Chain:**
- State migration enables v0.2.0 users to upgrade
- Sequential mode remains default (no flags = sequential)
- Existing flags continue working (--verbose, --yolo, --max-iterations)
- New flags are purely additive (--batch, --dev-only)
- All v0.2.0 behaviors preserved in sequential mode

**Testing Dependencies:**
- State migration tests must pass before workflow tests (foundation)
- UI component tests can run independently (isolated)
- Workflow router tests depend on state schema being finalized
- Integration tests depend on all units being tested
- System tests run last (validate complete workflows)

**Critical Path:**
State Schema + Tests → UI Components + Tests → Workflow Router + Tests → CLI Flags + Tests → Integration Testing → Coverage Validation (90%+)

Each implementation step includes corresponding test creation, ensuring continuous validation and meeting the 100% (true 90%+) coverage requirement for all new v1 code.
