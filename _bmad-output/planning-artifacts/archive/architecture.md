---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '/Users/j/@webeleon/johnny-bmad/_bmad-output/planning-artifacts/prd.md'
  - '/Users/j/@webeleon/johnny-bmad/_bmad-output/planning-artifacts/validation-report-prd.md'
  - '/Users/j/@webeleon/johnny-bmad/_bmad-output/planning-artifacts/ux-design-specification.md'
  - '/Users/j/@webeleon/johnny-bmad/docs/index.md'
  - '/Users/j/@webeleon/johnny-bmad/docs/project-overview.md'
  - '/Users/j/@webeleon/johnny-bmad/docs/architecture.md'
  - '/Users/j/@webeleon/johnny-bmad/docs/source-tree-analysis.md'
  - '/Users/j/@webeleon/johnny-bmad/docs/development-guide.md'
workflowType: 'architecture'
project_name: 'johnny-bmad'
user_name: 'J'
date: '2026-02-03'
lastStep: 8
status: 'complete'
completedAt: '2026-02-03'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (62 FRs across 10 capability areas):**

The architecture must support three distinct workflow modes:

1. **Sequential Mode** (FR1, FR28-34, FR57-62): Existing v0.2.0 behavior - create story → implement → review → commit → repeat
2. **Batch Mode** (FR2, FR7-21): New workflow - create ALL stories → review each → approve all → STOP (implementation separate)
3. **Dev-Only Mode** (FR3, FR22-27): Implementation-only workflow - skip story creation, iterate through pre-created stories

**Core Architectural Capabilities Required:**

- **Multi-Agent Orchestration** (FR7-11, FR28-34): System spawns Claude CLI processes with specialized roles (SM Agent, Story Creator, Dev Agent, Reviewer Agent) using different models (opus for planning/review, sonnet for implementation)
- **State Management** (FR35-42): Persistent state tracking via `.johnny-bmad-state.json` enabling automatic resume after crashes, tracking mode/phase/epic/story position
- **Per-Story Review Flow** (FR12-18): Interactive approval workflow in batch mode - prompt after each story creation, iterate on changes until approved
- **Error Recovery** (FR43-50): Retry logic with exponential backoff, API rate limit detection, state preservation before failures
- **CLI Output System** (FR51-56): Agent visibility, progress indicators, colored terminal output, phase transition markers
- **Backward Compatibility** (FR57-62): All existing flags and behaviors must remain unchanged

**Non-Functional Requirements (20 NFRs across 3 categories):**

**Reliability NFRs (NFR-R1 to NFR-R9) - Critical Architecture Drivers:**
- Zero data loss during crashes/interruptions → Atomic state file writes required
- 100% resume success rate → State must capture exact workflow position (mode, phase, story index, approval status)
- API resilience → Retry with exponential backoff (2s, 4s, 8s), rate limit detection with pause/retry

**Performance NFRs (NFR-P1 to NFR-P5) - Architecture Constraints:**
- CLI startup <2 seconds → Minimal initialization overhead
- State file operations <100ms → Simple JSON format, atomic writes
- 8+ hour session stability → No memory leaks, <10% performance degradation, stateless agent spawning

**Maintainability NFRs (NFR-M1 to NFR-M7) - Quality Requirements:**
- 100% test coverage (v1.5 roadmap) → Architecture must be testable (unit, integration, system tests)
- Clear error messages with recovery steps → Centralized error formatting with "Try: [command]" pattern
- Backward compatible state file format → Migration strategy if schema changes

**Scale & Complexity:**

- **Primary domain**: CLI Tool / Developer Tools (terminal-based orchestrator)
- **Complexity level**: Medium (enhancing existing production tool, not greenfield)
- **Estimated architectural components**: 8-10 core components
  - CLI entry point (argument parsing, help display)
  - Orchestrator (state machine, workflow routing)
  - State manager (JSON persistence, atomic writes)
  - Agent system (4 agent wrappers: SM, Story Creator, Dev, Reviewer)
  - Claude CLI integration (process spawning, output capture)
  - Git integration (commit creation with safety checks)
  - File utilities (BMAD file parsing: epics, stories, sprint-status.yaml)
  - UI system (terminal output: colors, progress bars, agent labels)
  - User input system (prompts: confirmations, text input, selections)
  - Logger (verbose mode, timestamps, agent lifecycle tracking)

### Technical Constraints & Dependencies

**Cross-Runtime Compatibility (Critical Constraint):**
- Must support both **Bun** (development/preferred) AND **Node.js 18+** (npm package users)
- CANNOT use Bun-specific APIs (e.g., `Bun.spawn`) → Must use Node.js `child_process.spawn`
- Limits architectural choices to Node.js-compatible patterns

**Existing Technology Stack (Must Preserve):**
- TypeScript (ES2022), ESM modules
- Dependencies: chalk (colors), inquirer (prompts), yaml (parsing)
- Build: Bun bundler → single `dist/index.js` file
- Entry point: `#!/usr/bin/env node` shebang for CLI execution

**Brownfield Context (v0.2.0 in Production):**
- Sequential workflow already implemented and working
- State file format `.johnny-bmad-state.json` already in use
- Existing users depend on current behavior → Zero breaking changes allowed
- Flags: `--verbose`, `--yolo`, `--max-iterations` must continue working unchanged

**External Dependencies:**
- **Claude CLI** required in PATH → Architecture must detect/validate presence
- **BMAD project structure** required → Must validate `_bmad/` folder, `config.yaml`, `sprint-status.yaml`
- **Git** optional but recommended → Git operations must gracefully handle non-git repos

**Review Detection Complexity:**
- **Primary method**: Read `sprint-status.yaml` for story status === 'done'
- **Fallback method**: Scan Reviewer agent stdout for literal string `REVIEW_PASSED` or `REVIEW_FAILED`
- Architecture must support both detection mechanisms

### Cross-Cutting Concerns Identified

**1. State Persistence (Spans All Workflows)**
- Every workflow phase must save state before risky operations
- State file must be written atomically to prevent corruption
- Resume logic must route to correct phase based on saved state
- Affects: Orchestrator, all agents, error handlers

**2. Error Recovery & Retry Logic (Spans All Agent Interactions)**
- All Claude CLI spawns must wrap in try/catch with retry
- Exponential backoff: 2s → 4s → 8s before giving up
- State must be saved before surfacing errors to user
- Affects: Claude CLI integration, all agents, orchestrator

**3. Logging & Output Formatting (Spans Entire System)**
- Verbose mode: Labeled output streams (`[SM]`, `[Story]`, `[Dev]`, `[Review]`)
- Default mode: Clean narrative with phase transitions, progress bars
- Agent lifecycle tracking (start, complete, fail) in verbose mode
- All output must respect `NO_COLOR` environment variable
- Affects: All agents, orchestrator, UI components, error handlers

**4. Backward Compatibility (Constrains All New Features)**
- Sequential mode must remain default behavior
- All existing flags must work unchanged
- State file format changes require migration strategy
- New features are purely additive (`--batch`, `--dev-only`)
- Affects: CLI parser, orchestrator, state manager

**5. Git Safety (Spans Commit Operations)**
- User confirmation required before commits (unless `--yolo`)
- Must check for uncommitted changes before staging
- Conventional commit format: `feat(STORY-ID): title`
- Must validate git repo exists before attempting operations
- Affects: Git integration, orchestrator, user input system

**6. Cross-Runtime Support (Constrains All Process Spawning)**
- No Bun-specific APIs allowed
- Child process spawning must use Node.js `child_process` module
- Affects: Claude CLI integration, all agent implementations

**7. Terminal Compatibility (Spans All Output)**
- ASCII fallbacks for Unicode characters (█ → #, ░ → -, ━ → =)
- Color-independent status (text labels required: `[OK]`, `[FAIL]`)
- Works on macOS Terminal, iTerm, Windows Terminal, Linux terminals
- Screen reader compatibility (plain text, no animations)
- Affects: UI system, logger, all output formatting

## Starter Template Evaluation

### Primary Technology Domain

**CLI Tool / Developer Tools** - Terminal-based orchestrator for BMAD implementation automation

**Project Context:** Brownfield enhancement of existing v0.2.0 production tool

### Starter Options Considered

**Evaluation Context:**
This is a brownfield enhancement project, not greenfield development. Rather than evaluating fresh starter templates, we assessed the existing johnny-bmad v0.2.0 architecture for its suitability as the foundation for batch workflow enhancement.

**Existing Architecture Assessment:**
- ✅ Production-proven CLI orchestration pattern
- ✅ Cross-runtime compatibility (Bun + Node.js)
- ✅ State persistence and resume capability already implemented
- ✅ Multi-agent coordination architecture already established
- ✅ Well-organized codebase with clear separation of concerns
- ✅ Active maintenance and successful npm distribution

**Alternative Considered:**
- Fresh rewrite with modern CLI framework (e.g., oclif, commander-based starter)
- **Rejected:** Would break backward compatibility, lose production-proven patterns, require complete rewrite

### Selected Starter: johnny-bmad v0.2.0 Architecture (Brownfield Enhancement)

**Rationale for Selection:**

The existing v0.2.0 architecture provides a solid foundation for batch workflow enhancement:

1. **Production-Proven Reliability:** Current sequential workflow demonstrates the orchestration pattern works in production use
2. **Backward Compatibility Requirement:** PRD mandates zero breaking changes - must build on existing architecture
3. **State Management Already Solved:** `.johnny-bmad-state.json` persistence and resume logic proven reliable
4. **Multi-Agent Pattern Established:** SM, Story Creator, Dev, Reviewer agents already working with proper model selection
5. **Cross-Runtime Compatibility:** Existing Node.js `child_process` usage ensures npm package compatibility
6. **Clean Codebase Structure:** Well-organized with clear component boundaries for extension

**Project Initialization:**

**No initialization command needed** - existing project structure will be enhanced with:
- New workflow modes (`--batch`, `--dev-only` flags)
- Enhanced state tracking for batch phases
- Per-story review flow components
- Extended CLI output system for batch progress

**Existing v0.2.0 codebase location:** `/Users/j/@webeleon/johnny-bmad`

### Architectural Decisions Provided by Existing v0.2.0

**Language & Runtime:**
- **TypeScript (ES2022):** Strict mode enabled, ESM modules
- **Dual Runtime Support:** Bun (development/preferred) + Node.js 18+ (npm compatibility)
- **Target:** ES2022 with ESNext modules
- **Build Output:** Single bundled `dist/index.js` with `#!/usr/bin/env node` shebang

**Dependencies & Libraries:**
- **chalk (5.4.1):** Terminal color output for status messages
- **inquirer (9.3.7):** Interactive user prompts (confirmations, selections, text input)
- **yaml (2.7.0):** BMAD configuration and sprint-status file parsing
- **Node.js built-ins:** `child_process` for Claude CLI spawning, `fs` for file operations

**Build Tooling:**
- **Bun bundler:** Single-file output for distribution
- **Target:** Node.js compatibility (not Bun-specific APIs)
- **Output:** `dist/index.js` published to npm as `@webeleon/johnny-bmad`
- **Package.json scripts:** `dev` (watch mode), `build`, `test`, `publish:npm`

**Testing Framework:**
- **Bun's built-in test runner:** `bun:test` with `describe`, `test`, `expect`
- **Co-located test files:** `*.test.ts` alongside implementation
- **Current coverage:** Partial (files.test.ts, orchestrator.test.ts, user-input.test.ts, stream-wrapper.test.ts)
- **v1.5 target:** 100% coverage (unit, integration, system tests)

**Code Organization:**
```
src/
├── index.ts              # CLI entry point, argument parsing
├── orchestrator.ts       # Main workflow loop, state machine
├── config.ts             # State persistence (.johnny-bmad-state.json)
├── types.ts              # TypeScript interfaces
├── agents/               # Agent wrappers (SM, Story Creator, Dev, Reviewer)
├── claude/               # Claude CLI integration (cli.ts, prompts.ts)
├── git/                  # Git operations (commit.ts)
└── utils/                # Utilities (logger, files, user-input, timer, stream-wrapper)
```

**Architectural Patterns Established:**
- **Orchestrator Pattern:** Central state machine (`orchestrator.ts`) manages workflow progression
- **Agent Wrappers:** Thin wrappers around Claude CLI spawning with role-specific prompts
- **State Persistence:** JSON file for automatic resume capability
- **Error Recovery:** Try/catch with 2-second delay retry on Claude CLI failures
- **Multi-Agent Coordination:** Specialized agents (opus for planning/review, sonnet for implementation)

**Development Experience:**
- **Watch Mode:** `bun run dev` with automatic recompilation
- **Verbose Mode:** `--verbose` flag enables labeled output streams `[SM]`, `[Dev]`, `[Review]`
- **State Inspection:** `.johnny-bmad-state.json` readable JSON for debugging
- **Cross-runtime Testing:** Test with both `bun run src/index.ts` and `npx .` (built package)
- **Git Integration:** Optional but recommended for automatic commits

**CLI Interface Already Established:**
- **Argument Parsing:** Manual parsing in `index.ts` (no external CLI framework)
- **Help Text:** `--help` flag with usage information
- **Existing Flags:** `--verbose`, `--yolo`, `--max-iterations`, `--resume` (deprecated, auto-resume is default)
- **User Prompts:** Inquirer-based confirmations and selections
- **Colored Output:** Chalk-based with info/warn/error/success/debug levels

**Cross-Cutting Concerns Already Solved:**
1. **State Persistence:** Atomic writes, resume on restart, progress tracking
2. **Error Handling:** Retry logic, state saves before failures, unhandled rejection handler
3. **Logging:** Timestamp-based, verbose mode support, agent lifecycle tracking
4. **Git Safety:** User confirmation before commits, conventional commit format
5. **Cross-Runtime Compatibility:** Node.js `child_process`, no Bun-specific APIs
6. **BMAD Project Validation:** Pre-flight checks for `_bmad/` folder, config.yaml

### Enhancement Strategy for Batch Workflow (v1)

**Architectural Extensions Required:**

1. **Workflow Mode Router:** Extend orchestrator to route between sequential/batch/dev-only modes
2. **Batch Phase State:** Track story creation → review → implementation phases in state file
3. **Per-Story Review Components:** New UI components for story display and approval prompts
4. **Enhanced State Schema:** Add `mode`, `phase`, `approvalStatus` fields to state file
5. **CLI Flag Expansion:** Add `--batch`, `--dev-only` to existing argument parser
6. **UI Component Library:** Extract terminal output formatting into reusable components (`src/ui/`)

**Architectural Constraints to Preserve:**

- ✅ Sequential mode remains default behavior (backward compatibility)
- ✅ All existing flags continue working unchanged
- ✅ State file format backward compatible or provides migration
- ✅ No Bun-specific APIs introduced (maintain Node.js compatibility)
- ✅ Existing agent wrappers and prompts remain functional
- ✅ Git safety and user confirmation patterns preserved

**Note:** Enhancement implementation will follow existing code organization patterns and extend (not replace) the proven v0.2.0 architecture.

## Core Architectural Decisions

### Decision Priority Analysis

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

### Data Architecture

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

### Authentication & Security

**Decision:** Not Applicable - CLI Tool (Local Execution Only)

This is a local CLI orchestrator with no authentication requirements. Security considerations limited to:
- Git commit safety (user confirmation required)
- No API keys stored in state file
- Claude API authentication handled externally by Claude CLI

### API & Communication Patterns

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

### Frontend Architecture

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

### Infrastructure & Deployment

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

### Workflow Routing Architecture

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

### Decision Impact Analysis

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

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 4 main categories where AI agents could make different implementation choices

This document establishes mandatory patterns that ALL AI agents MUST follow when implementing johnny-bmad v1 batch workflow enhancements. These patterns prevent conflicts, ensure consistency, and enable seamless integration of code written by different agents.

### Naming Patterns

**File Naming Conventions:**

**Rule:** All TypeScript files use **kebab-case** naming

**Rationale:** Matches existing v0.2.0 codebase pattern (orchestrator.ts, story-creator.ts, user-input.ts)

**Examples:**
- ✅ `story-card.ts`, `phase-header.ts`, `dev-only.ts`
- ✅ `story-card.test.ts`, `batch-workflow.ts`
- ❌ `storyCard.ts`, `StoryCard.ts`, `story_card.ts`

**Applies to:** All new files in src/ui/, workflow functions, test files

---

**Function/Method Naming Conventions:**

**Rule:** All functions and methods use **camelCase** naming

**Rationale:** Standard TypeScript convention, matches existing v0.2.0 pattern

**Examples:**
- ✅ `migrateV0toV1()`, `runBatchWorkflow()`, `determineMode()`
- ✅ `loadState()`, `saveState()`, `displayBanner()`
- ❌ `migrate_v0_to_v1()`, `MigrateV0ToV1()`, `MIGRATE_V0_TO_V1()`

**Applies to:** All functions, methods, exported utilities

---

**Variable/Parameter Naming Conventions:**

**Rule:** All variables and parameters use **camelCase** naming

**Rationale:** Matches existing v0.2.0 pattern (currentEpic, currentStoryIndex)

**Examples:**
- ✅ `storyApprovals`, `workflowMode`, `currentPhase`
- ✅ `epicId`, `storyIndex`, `approvalStatus`
- ❌ `story_approvals`, `WorkflowMode`, `CURRENT_PHASE`

**Applies to:** All variables, function parameters, destructured properties

---

**Interface/Type Naming Conventions:**

**Rule:** All interfaces and types use **PascalCase without prefix**

**Rationale:** Matches existing v0.2.0 pattern (State, CliArgs, ClaudeOptions)

**Examples:**
- ✅ `WorkflowMode`, `WorkflowPhase`, `StoryApproval`
- ✅ `BatchWorkflowState`, `MigrationResult`
- ❌ `IWorkflowMode`, `TWorkflowPhase`, `workflowMode`

**Applies to:** All TypeScript interfaces, type aliases, enums

---

**Constant Naming Conventions:**

**Rule:** All constants use **SCREAMING_SNAKE_CASE** naming

**Rationale:** Clear visual distinction for constants, widely recognized pattern

**Examples:**
- ✅ `MAX_RETRIES = 3`, `RETRY_DELAYS = [2000, 4000, 8000]`
- ✅ `DEFAULT_MODE = 'sequential'`, `PHASE_STORY_CREATION = 'story-creation'`
- ❌ `maxRetries`, `MaxRetries`, `max_retries`

**Applies to:** All module-level constants, configuration values, magic numbers extracted as constants

### Structure Patterns

**Project Organization (Established by v0.2.0):**

**Existing Structure (DO NOT CHANGE):**
```
src/
├── index.ts              # CLI entry point, argument parsing
├── orchestrator.ts       # Main workflow loop, state machine
├── config.ts             # State persistence
├── types.ts              # TypeScript interfaces
├── agents/               # Agent wrappers
├── claude/               # Claude CLI integration
├── git/                  # Git operations
└── utils/                # Utilities (logger, files, user-input, timer)
```

**New Structure (v1 Additions):**
```
src/
└── ui/                   # NEW: Terminal UI components
    ├── banner.ts
    ├── phase-header.ts
    ├── agent-line.ts
    ├── progress.ts
    ├── story-card.ts
    ├── status.ts
    ├── celebration.ts
    ├── error.ts
    └── index.ts          # Unified exports
```

**Rule:** All new UI components MUST go in `src/ui/`, all other utilities continue in `src/utils/`

---

**Test File Organization:**

**Rule:** All test files are **co-located** with implementation using `*.test.ts` suffix

**Examples:**
- `src/ui/progress.ts` → `src/ui/progress.test.ts`
- `src/config.ts` → `src/config.test.ts`
- `src/orchestrator.ts` → `src/orchestrator.test.ts`

**Fixture Organization:**
- Simple test data: Inline in test files
- Complex fixtures (v0.2.0 state files): `src/fixtures/*.json`

**Mock Organization:**
- Inline mocks preferred (defined in test files)
- Shared mocks only if reused across multiple test files

### Format Patterns

**Terminal Output Formats:**

**Progress Bar Format:**

**Rule:** `Story {current}/{total} [{bar}] {status}...`

**Details:**
- Bar width: 16 characters total
- Filled: `█` (Unicode) or `#` (ASCII fallback)
- Empty: `░` (Unicode) or `-` (ASCII fallback)
- Status: lowercase present tense verb + "..."

**Examples:**
- ✅ `Story 4/8 [████████░░░░░░░░] implementing...`
- ✅ `Story 1/6 [██░░░░░░░░░░░░░░] creating...`
- ❌ `[4/8] ████░░░░ Implementing` (wrong format)
- ❌ `Story 4 of 8: 50%` (wrong format)

---

**Status Message Format:**

**Rule:** `[STATUS] message`

**Status Symbols (6 chars padded, ALL CAPS):**
- `[OK]   ` - Success, completion
- `[FAIL] ` - Failure, review failed
- `[WARN] ` - Warning, non-blocking
- `[INFO] ` - Information, status updates
- `[ERROR]` - Errors, blocking issues

**Examples:**
- ✅ `[OK]    Story created successfully`
- ✅ `[FAIL]  Review failed - tests not passing`
- ✅ `[WARN]  API rate limit approaching`
- ✅ `[ERROR] Claude CLI not found`
- ❌ `✓ Story created` (wrong format)
- ❌ `ERROR: Claude CLI not found` (missing brackets)

---

**Phase Transition Format:**

**Rule:** `━━━ Phase: {phase_name} ━━━`

**Details:**
- Separator: `━` (Unicode) or `=` (ASCII fallback)
- Separator length: 3 characters each side
- Phase names: Title Case

**Examples:**
- ✅ `━━━ Phase: Story Creation ━━━`
- ✅ `━━━ Phase: Review ━━━`
- ✅ `━━━ Phase: Implementation ━━━`
- ❌ `--- PHASE: STORY CREATION ---` (wrong separator, wrong case)

---

**Agent Activity Format:**

**Rule:** `[{agent_label}] {activity_description}...`

**Agent Labels (8 chars padded, color-coded):**
- `[SM]     ` (cyan) - Scrum Master
- `[Story]  ` (blue) - Story Creator
- `[Dev]    ` (green) - Dev Agent
- `[Review] ` (magenta) - Reviewer Agent

**Activity Description:** lowercase, present tense verb + object + "..."

**Examples:**
- ✅ `[SM]     Checking sprint status...`
- ✅ `[Story]  Creating STORY-001...`
- ✅ `[Dev]    Implementing story...`
- ✅ `[Review] Validating code...`
- ❌ `SM: Checking sprint status` (wrong format)
- ❌ `[SM] Checked sprint status` (past tense)

---

**Error Message Format:**

**Rule:**
```
[ERROR] {error_type}: {brief_description}
        {additional_context}
        Try: {exact_recovery_command}
```

**Examples:**
```
✅ [ERROR] Claude CLI not found
        johnny-bmad requires Claude Code CLI in PATH
        Try: Install from https://claude.ai/download

✅ [ERROR] API Rate Limit
        Claude API rate limited
        Try: Wait 60 seconds and restart

❌ ERROR: Claude CLI not found (missing brackets and recovery)
❌ Claude CLI not found (no ERROR prefix)
```

**Rule:** ALL error messages MUST include actionable "Try:" recovery command

### Process Patterns

**Error Handling & Retry Logic:**

**Retry Pattern:** 3 attempts with exponential backoff

**Constants:**
```typescript
const RETRY_DELAYS = [2000, 4000, 8000]; // 2s, 4s, 8s
const MAX_RETRIES = 3;
```

**Implementation Pattern:**
```typescript
async function retryableOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error; // Final attempt failed
      }
      const delay = RETRY_DELAYS[attempt];
      console.log(`[WARN] ${operationName} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Unreachable'); // TypeScript exhaustiveness
}
```

**Applies to:** All Claude CLI spawns, all file operations, all API calls

---

**State Persistence Pattern:**

**Rule:** Save state BEFORE every risky operation

**Risky Operations:**
- Claude CLI spawn
- File write operations
- API calls
- User prompts (could Ctrl+C)

**Implementation Pattern:**
```typescript
async function riskyOperation() {
  await saveState(currentState);  // ALWAYS save first
  const result = await claudeSpawn(...);
  // State updates happen in memory
  // Will be saved before NEXT risky operation
  return result;
}
```

**Atomic Write Pattern:**
```typescript
async function saveState(state: State) {
  const tempFile = `${STATE_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(state, null, 2));
  await fs.rename(tempFile, STATE_FILE); // Atomic on POSIX systems
}
```

**Applies to:** State manager (`src/config.ts`), orchestrator, all workflow functions

---

**Exit Code Pattern:**

**Rule:** Simple 0/1 exit codes

**Exit Codes:**
- `0` - Success (epic complete, workflow finished)
- `1` - Any error (user error, system error, API error)

**Detailed errors:** Written to stderr, not encoded in exit code

**Rationale:** Standard CLI convention, easier for shell scripts

**Applies to:** CLI entry point (`src/index.ts`), all error handlers

---

**Test Structure Pattern:**

**Rule:** Hybrid test structure - file/module describe, nested by function or scenario

**Pattern:**
```typescript
import { describe, test, expect } from 'bun:test';
import { functionToTest } from './module.js';

describe('module.ts - Module Description', () => {
  describe('functionToTest()', () => {
    test('should handle normal case', () => {
      expect(functionToTest(input)).toBe(expected);
    });

    test('should handle edge case', () => {
      expect(functionToTest(null)).toBeNull();
    });

    test('should throw on invalid input', () => {
      expect(() => functionToTest(invalid)).toThrow();
    });
  });

  describe('anotherFunction()', () => {
    // More tests...
  });
});
```

**Applies to:** All test files (`*.test.ts`)

---

**Coverage Validation Pattern:**

**Rule:** 100% coverage (true 90%+) for ALL NEW v1 code

**Validation Command:**
```bash
bun test --coverage
```

**Coverage Requirements:**
- **NEW code:** 90%+ required (UI components, migration logic, workflow router, CLI flags)
- **EXISTING code:** Continue current coverage (no regression)

**Pre-commit Checklist:**
1. Run `bun test --coverage`
2. Verify 90%+ for new files: `src/ui/*`, `src/config.ts` (migration), workflow functions
3. Verify all existing tests still pass
4. No coverage regressions

**Quality Gate:** v1 CANNOT release until new code reaches 90%+ coverage

**Applies to:** All new code in v1, enforced before release

### Enforcement Guidelines

**All AI Agents MUST:**

1. **Follow naming conventions exactly** - kebab-case files, camelCase functions/variables, PascalCase types, SCREAMING_SNAKE_CASE constants
2. **Use exact terminal output formats** - progress bars, status messages, phase headers, agent labels, error blocks as specified
3. **Implement retry logic with exponential backoff** - 3 attempts, 2s/4s/8s delays, save state before retries
4. **Save state before every risky operation** - atomic writes, before Claude spawn, before file writes, before API calls
5. **Write tests with 90%+ coverage for all new code** - co-located *.test.ts, hybrid test structure, inline fixtures for simple data
6. **Use consistent error message format** - [ERROR] prefix, brief description, context, "Try:" recovery command
7. **Respect existing v0.2.0 structure** - extend, don't replace; new UI components in src/ui/, utilities in src/utils/
8. **Maintain backward compatibility** - sequential mode default, existing flags unchanged, v0.2.0 state migration supported

**Pattern Enforcement:**

**During Development:**
- Code review against this document
- Test coverage validation (`bun test --coverage`)
- Manual testing of terminal output formatting
- Backward compatibility testing with v0.2.0 state files

**Pre-commit Validation:**
- All tests pass (`bun test`)
- Coverage ≥90% for new code
- No existing test regressions
- Terminal output matches format patterns

**Quality Gates:**
- v1 cannot release without 90%+ coverage for new code
- All patterns must be followed consistently
- No breaking changes to v0.2.0 behavior

**Pattern Updates:**
- Updates to this document require architecture revision
- All agents must be notified of pattern changes
- Migration plan required for breaking pattern changes

### Pattern Examples

**Good Examples:**

**File Naming:**
```
✅ src/ui/story-card.ts
✅ src/ui/story-card.test.ts
✅ src/workflows/batch-workflow.ts
```

**Code Naming:**
```typescript
✅ const MAX_RETRIES = 3;
✅ interface WorkflowState { mode: WorkflowMode; }
✅ function migrateV0toV1(oldState: any): State { ... }
✅ const currentPhase = state.workflow.phase;
```

**Terminal Output:**
```typescript
✅ console.log('Story 4/8 [████████░░░░░░░░] implementing...');
✅ console.log('[OK]    Story created successfully');
✅ console.log('━━━ Phase: Review ━━━');
✅ console.log('[SM]     Checking sprint status...');
```

**Error Handling:**
```typescript
✅ async function spawnAgent() {
    await saveState(state); // Save before risky op
    return await retryableOperation(
      () => spawnClaude(opts),
      'Claude spawn'
    );
  }
```

**Test Structure:**
```typescript
✅ describe('config.ts - State Migration', () => {
    describe('migrateV0toV1()', () => {
      test('should preserve currentEpic', () => {
        const result = migrateV0toV1(v020State);
        expect(result.currentEpic).toBe('user-auth');
      });
    });
  });
```

---

**Anti-Patterns (What to Avoid):**

**File Naming:**
```
❌ src/ui/StoryCard.ts (PascalCase)
❌ src/ui/story_card.ts (snake_case)
❌ src/ui/storyCard.test.ts (camelCase)
```

**Code Naming:**
```typescript
❌ const maxRetries = 3; (camelCase constant)
❌ interface IWorkflowState { ... } (prefix notation)
❌ function migrate_v0_to_v1() { ... } (snake_case)
❌ const current_phase = ...; (snake_case variable)
```

**Terminal Output:**
```typescript
❌ console.log('[4/8] ████░░░░ Implementing'); (wrong format)
❌ console.log('✓ Story created'); (no status prefix)
❌ console.log('--- PHASE: STORY CREATION ---'); (wrong separator)
❌ console.log('SM: Checking status'); (wrong agent format)
```

**Error Handling:**
```typescript
❌ // No retry logic
   const result = await riskyOperation();

❌ // Retry without backoff
   for (let i = 0; i < 3; i++) {
     try { return await op(); }
     catch { /* immediate retry */ }
   }

❌ // State saved AFTER risky operation
   const result = await riskyOp();
   await saveState(state); // Too late!
```

**Test Structure:**
```typescript
❌ // No describe blocks
   test('migrate works', () => { ... });

❌ // Unclear test organization
   describe('tests', () => {
     test('test 1', () => { ... });
     test('test 2', () => { ... });
   });
```

**Error Messages:**
```typescript
❌ console.error('Claude CLI not found'); // No recovery
❌ console.error('ERROR: Network failure'); // No brackets, no Try:
❌ throw new Error('Failed'); // Not actionable
```

## Project Structure & Boundaries

### Complete Project Directory Structure

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

### Architectural Boundaries

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

### Requirements to Structure Mapping

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

### Integration Points

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

### File Organization Patterns

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

### Development Workflow Integration

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

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**

All architectural decisions work together harmoniously without conflicts:

- **State Schema (Explicit Workflow Structure)** integrates seamlessly with Workflow Router (mode branching) - router reads `state.workflow.mode` and `state.workflow.phase` for routing decisions
- **Migration Strategy (Hybrid with Confirmation)** supports Backward Compatibility requirement - v0.2.0 users can upgrade with explicit consent or fresh start
- **UI Component Organization (src/ui/)** aligns with Test Coverage requirement - each component independently testable with clear responsibility boundaries
- **Workflow Router (Mode Branching)** complements State Schema - simple if/else routing based on explicit workflow state fields
- **Test Coverage (100% for new code)** enforces quality across all decisions - state migration, UI components, workflow routing all tested comprehensively

**Technology Stack Compatibility:**
- TypeScript ES2022 + ESM → Bun bundler → Node.js target ✅ (cross-runtime achieved)
- chalk + inquirer + yaml → All compatible with Node.js 18+ and Bun ✅
- Bun test runner → Works with co-located test pattern ✅
- Node.js child_process → Cross-runtime compatible (no Bun-specific APIs) ✅

**No contradictory decisions identified** ✅

---

**Pattern Consistency:**

Implementation patterns fully support architectural decisions:

- **Naming Patterns** align with TypeScript/Node.js ecosystem standards (camelCase, kebab-case, PascalCase conventions)
- **Terminal Output Formats** implement UX specification requirements (progress bars, status messages, phase headers, agent labels)
- **Error Handling Patterns** satisfy NFR-R7 to R9 (retry with exponential backoff, rate limit handling, graceful recovery)
- **State Persistence Patterns** implement NFR-R1 to R6 (atomic writes, zero data loss, 100% resume success)
- **Test Organization Patterns** enable NFR-M1 (100% coverage for new code through co-located tests, hybrid structure, coverage validation)

**All patterns coherent and mutually reinforcing** ✅

---

**Structure Alignment:**

Project structure supports all architectural decisions and patterns:

- **src/ui/ directory** enables UI component decision - clean separation, independently testable
- **src/fixtures/ directory** supports test coverage requirement - v0.2.0 state fixtures for migration tests
- **Enhanced State schema in types.ts** supports workflow router - explicit mode/phase fields for routing
- **Workflow functions in orchestrator.ts** implement mode branching - runBatchWorkflow(), runDevOnlyWorkflow(), runSequentialWorkflow()
- **Migration logic in config.ts** implements backward compatibility - migrateV0toV1() with user prompt

**Structure enables all chosen patterns and integration points** ✅

### Requirements Coverage Validation ✅

**Functional Requirements Coverage (62 FRs across 10 categories):**

**All Categories 100% Covered:**

1. **Workflow Mode Selection (FR1-6):** ✅ COVERED
   - Architecture: Workflow router with `determineMode()`, CLI flag parsing for --batch/--dev-only, flag validation
   - Files: src/orchestrator.ts (routing logic), src/index.ts (flag parsing)

2. **Batch Story Creation (FR7-11):** ✅ COVERED
   - Architecture: runBatchWorkflow() PHASE 1, Story Creator agent wrapper
   - Files: src/orchestrator.ts (batch workflow), src/agents/story-creator.ts, src/ui/phase-header.ts, src/ui/progress.ts

3. **Per-Story Review & Approval (FR12-18):** ✅ COVERED
   - Architecture: runBatchWorkflow() PHASE 2, interactive story card with Y/N/V prompt, change iteration loop
   - Files: src/orchestrator.ts (review loop), src/ui/story-card.ts (approval UI)

4. **Auto-Approve Story Creation (FR19-21):** ✅ COVERED
   - Architecture: --yolo flag handling in batch mode, auto-approval without prompts
   - Files: src/orchestrator.ts (batch workflow with yolo mode)

5. **Dev-Only Execution (FR22-27):** ✅ COVERED
   - Architecture: runDevOnlyWorkflow() function, pre-created story loading
   - Files: src/orchestrator.ts (dev-only workflow), src/utils/files.ts (getAllStoriesForEpic)

6. **Implementation Loop (FR28-34):** ✅ COVERED
   - Architecture: Existing dev/review loop preserved, agent wrappers unchanged
   - Files: src/orchestrator.ts (sequential workflow), src/agents/* (all agents)

7. **State Management & Resume (FR35-42):** ✅ COVERED
   - Architecture: Enhanced State schema with explicit workflow structure, migration logic, atomic writes, phase-aware resume routing
   - Files: src/config.ts (state operations, migration), src/types.ts (State interface), src/orchestrator.ts (resume routing)

8. **Error Handling & Recovery (FR43-50):** ✅ COVERED
   - Architecture: retryableOperation() with 3 attempts and exponential backoff, state save before risky ops, error UI component
   - Files: src/claude/cli.ts (retry logic), src/ui/error.ts (error display), src/config.ts (state save)

9. **CLI Output & User Feedback (FR51-56):** ✅ COVERED
   - Architecture: Complete UI component system with banner, progress, status, phase headers, agent labels, celebration
   - Files: src/ui/* (all 8 UI components + index.ts)

10. **Backward Compatibility (FR57-62):** ✅ COVERED
    - Architecture: Migration logic, sequential mode as default, existing flags preserved, additive new flags
    - Files: src/config.ts (migration), src/orchestrator.ts (sequential mode preserved), src/index.ts (flag parsing)

**Requirements Coverage:** 62/62 FRs (100%) ✅

---

**Non-Functional Requirements Coverage (20 NFRs across 3 categories):**

**Reliability (NFR-R1 to NFR-R9):** ✅ COVERED
- NFR-R1 (Zero data loss): Atomic state writes with temp file + rename pattern
- NFR-R2 (100% resume success): State captures exact position (mode, phase, epic, story index, approvals)
- NFR-R3 (Atomic state writes): Implemented in saveState() with temp file pattern
- NFR-R4 (Resume success rate): Orchestrator resume routing based on state.workflow.mode and state.workflow.phase
- NFR-R5 (Corrupted state detection): Migration logic detects old format, prompts user for recovery
- NFR-R6 (Zero data loss scenarios): State saved before every risky operation
- NFR-R7 (API rate limiting): retryableOperation() with exponential backoff handles rate limits
- NFR-R8 (Retry failed API calls): 3 attempts with 2s/4s/8s delays
- NFR-R9 (Transient network failures): Retry logic handles without session termination

**Performance (NFR-P1 to NFR-P5):** ✅ COVERED
- NFR-P1 (<2s startup): Minimal initialization, no heavy dependencies
- NFR-P2 (<100ms state ops): Simple JSON format, atomic writes
- NFR-P3 (Progress updates <1s): UI components called directly, no heavy processing
- NFR-P4 (8h session stability): Stateless agent spawning, no memory accumulation, retry logic prevents hanging
- NFR-P5 (State file <1MB): Simple JSON structure with minimal data

**Maintainability (NFR-M1 to NFR-M7):** ✅ COVERED
- NFR-M1 (100% test coverage): 90%+ coverage requirement for all new v1 code, co-located tests
- NFR-M2 (Test scenarios for new flags): Flag validation tests, workflow routing tests specified
- NFR-M3 (State regression tests): Migration tests with v0.2.0 fixtures, atomic write validation
- NFR-M4 (Error handling tests): retryableOperation() tests, error display tests
- NFR-M5 (CLI flags documented): --help text updated with --batch, --dev-only
- NFR-M6 (Error messages with recovery): All errors include "Try:" command pattern
- NFR-M7 (Backward compatible state): Migration logic or user guidance provided

**Requirements Coverage:** 20/20 NFRs (100%) ✅

### Implementation Readiness Validation ✅

**Decision Completeness:**
- ✅ All 4 critical decisions documented with full rationale (State Schema, Migration Strategy, UI Organization, Workflow Router)
- ✅ Technology versions verified (chalk 5.4.1, inquirer 9.3.7, yaml 2.7.0)
- ✅ Implementation patterns comprehensive (naming, output formats, error handling, test organization)
- ✅ Concrete examples provided (good examples + anti-patterns for all major patterns)

**AI agents have clear architectural guidance** ✅

---

**Structure Completeness:**
- ✅ Complete project directory tree with all files and directories specified
- ✅ All new v1 components detailed (8 UI components, 3 workflow functions, migration logic, enhanced state schema)
- ✅ Integration points clearly mapped (internal: orchestrator ↔ state/UI/agents, external: Claude CLI, BMAD files, Git)
- ✅ Component boundaries well-defined (process isolation, UI component isolation, state manager ownership)

**Project structure is complete and implementation-ready** ✅

---

**Pattern Completeness:**
- ✅ All 4 conflict point categories addressed (naming, output formats, error handling, test organization)
- ✅ Naming conventions comprehensive (files, functions, variables, types, constants)
- ✅ Communication patterns fully specified (process spawning, stdio configuration, state persistence)
- ✅ Process patterns complete (retry logic with constants, state save timing, exit codes, test structure)

**Patterns prevent AI agent implementation conflicts** ✅

### Gap Analysis Results

**Critical Gaps:** NONE ✅
- All blocking architectural decisions made
- All critical patterns defined and documented
- All requirements have architectural support
- Project structure fully specified

**Important Gaps:** NONE ✅
- Detailed specifications provided for all components
- Examples and anti-patterns comprehensive
- Enforcement guidelines clear
- Requirements-to-structure mapping complete

**Nice-to-Have Gaps (Intentionally Deferred per PRD Roadmap):**

| Gap | Rationale for Deferral | Target Version |
|-----|------------------------|----------------|
| CI/CD Pipeline | Testing infrastructure separate from batch workflow | v1.5 |
| 100% Coverage for Existing Code | Bring legacy v0.2.0 code to coverage standard | v1.5 |
| User-Facing Config File | Not needed for v1 batch workflow | v2+ |
| Monitoring Infrastructure | Production analytics not needed for v1 | v1.5 |

**All gaps are planned, documented deferrals** ✅

### Validation Issues Addressed

**Critical Issues:** NONE identified ✅
**Important Issues:** NONE identified ✅
**Minor Issues:** NONE identified ✅

**No architectural issues require resolution before implementation** ✅

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed (62 FRs, 20 NFRs, UX spec, project docs)
- [x] Scale and complexity assessed (Medium complexity, CLI tool domain)
- [x] Technical constraints identified (cross-runtime, brownfield, backward compatibility)
- [x] Cross-cutting concerns mapped (7 concerns: state persistence, error recovery, logging, backward compat, git safety, cross-runtime, terminal compat)

**✅ Architectural Decisions**

- [x] Critical decisions documented with versions (State Schema, Migration Strategy, UI Organization, Workflow Router, Test Coverage)
- [x] Technology stack fully specified (TypeScript ES2022, Bun/Node.js 18+, chalk/inquirer/yaml)
- [x] Integration patterns defined (process spawning, stdio configuration, state persistence)
- [x] Performance considerations addressed (NFR-P1 to P5 all covered)

**✅ Implementation Patterns**

- [x] Naming conventions established (kebab-case files, camelCase functions, PascalCase types, SCREAMING_SNAKE_CASE constants)
- [x] Structure patterns defined (src/ui/ for components, co-located tests, fixtures directory)
- [x] Communication patterns specified (process boundaries, component isolation, data flow)
- [x] Process patterns documented (retry logic, state persistence, exit codes, test organization)

**✅ Project Structure**

- [x] Complete directory structure defined (existing v0.2.0 + new v1 additions fully specified)
- [x] Component boundaries established (process boundaries, UI component isolation, state manager ownership)
- [x] Integration points mapped (internal communication, external integrations, data flows)
- [x] Requirements to structure mapping complete (all 62 FRs mapped to specific files)

### Architecture Readiness Assessment

**Overall Status:** ✅ **READY FOR IMPLEMENTATION**

**Confidence Level:** **HIGH**

**Rationale:**
- Complete requirements coverage (62/62 FRs, 20/20 NFRs)
- Coherent decisions with no conflicts or contradictions
- Comprehensive patterns preventing AI agent conflicts
- Detailed project structure with all files specified
- Clear enforcement guidelines and examples
- Zero critical or important gaps
- All validation checks passed

**Key Strengths:**

1. **Backward Compatibility Design** - Migration strategy preserves v0.2.0 user experience while enabling v1 enhancements
2. **Cross-Runtime Architecture** - Node.js child_process pattern ensures npm package compatibility beyond Bun
3. **State Resilience** - Atomic writes + save-before-risky-ops pattern guarantees zero data loss in 8+ hour sessions
4. **UI Component Isolation** - Independent terminal components with 100% test coverage enable confident parallel development
5. **Clear Enforcement** - Comprehensive examples and anti-patterns guide AI agents to consistent implementation
6. **Brownfield Enhancement Strategy** - Extends proven v0.2.0 architecture rather than risky rewrite

**Areas for Future Enhancement (Post-v1):**

1. **CI/CD Automation** (v1.5) - GitHub Actions for automated testing and npm publishing
2. **Legacy Code Coverage** (v1.5) - Bring existing v0.2.0 code to 100% test coverage
3. **User-Facing Configuration** (v2+) - Config file for model selection, retry limits, output preferences
4. **Monitoring & Analytics** (v1.5) - Production usage metrics and error telemetry

**Note:** All future enhancements intentionally deferred per PRD roadmap - v1 scope is laser-focused on batch workflow reliability

### Implementation Handoff

**AI Agent Guidelines:**

All AI agents implementing johnny-bmad v1 MUST:

1. **Follow architectural decisions exactly as documented** - State Schema (explicit workflow structure), Migration Strategy (hybrid with confirmation), UI Component Organization (src/ui/), Workflow Router (mode branching), Test Coverage (90%+ for new code)

2. **Use implementation patterns consistently across all components** - Naming conventions (kebab-case files, camelCase functions, PascalCase types, SCREAMING_SNAKE_CASE constants), Terminal output formats (exact patterns for progress, status, phase headers, agent labels, errors), Error handling (3 retries, exponential backoff, state save before operations), Test organization (co-located *.test.ts, hybrid structure)

3. **Respect project structure and boundaries** - New UI components in src/ui/ only, utilities continue in src/utils/, no modifications to agents/ (existing wrappers unchanged), workflow functions in orchestrator.ts

4. **Refer to this document for all architectural questions** - This document is the source of truth for v1 batch workflow architecture

**Critical Implementation Rules:**

- **NEVER use Bun-specific APIs** - Use Node.js child_process.spawn, not Bun.spawn
- **ALWAYS save state before risky operations** - Claude spawn, file writes, API calls
- **ALWAYS write tests for new code** - 90%+ coverage required before v1 release
- **NEVER break backward compatibility** - Sequential mode default, existing flags unchanged, v0.2.0 state migration supported
- **ALWAYS follow terminal output formats exactly** - Use patterns from Implementation Patterns section

**First Implementation Priority:**

**Step 1: State Schema & Migration Foundation**

Implement enhanced State interface and migration logic first (foundation for all other work):

1. Update `src/types.ts` - Add enhanced State interface with workflow structure
2. Update `src/config.ts` - Implement migrateV0toV1() with user prompt
3. Write `src/config.test.ts` - Migration tests with v0.2.0 fixtures
4. Create `src/fixtures/` - Add v0.2.0 state fixtures for testing
5. Validate: Run `bun test --coverage` and verify 90%+ for config.ts migration logic

**Implementation Sequence:**
```
State Schema + Tests (Foundation)
    ↓
UI Component System + Tests (Infrastructure)
    ↓
Workflow Router + Tests (Core Logic)
    ↓
CLI Flag Expansion + Tests (Entry Point)
    ↓
Integration & System Tests (Validation)
    ↓
Coverage Validation (Quality Gate: 90%+)
```

**Architecture document location:** `_bmad-output/planning-artifacts/architecture.md`

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-02-03
**Document Location:** _bmad-output/planning-artifacts/architecture.md

### Final Architecture Deliverables

**📋 Complete Architecture Document**

- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**🏗️ Implementation Ready Foundation**

- 5 architectural decisions made (State Schema, Migration Strategy, UI Organization, Workflow Router, Test Coverage)
- 4 implementation pattern categories defined (Naming, Structure, Format, Process)
- 8-10 architectural components specified (CLI entry, orchestrator, state manager, agents, Claude integration, git, file utils, UI system, user input, logger)
- 82 requirements fully supported (62 FRs + 20 NFRs)

**📚 AI Agent Implementation Guide**

- Technology stack with verified versions (TypeScript ES2022, Bun/Node.js 18+, chalk 5.4.1, inquirer 9.3.7, yaml 2.7.0)
- Consistency rules that prevent implementation conflicts (naming conventions, output formats, error patterns, test organization)
- Project structure with clear boundaries (process boundaries, component isolation, data flow)
- Integration patterns and communication standards (process spawning, state persistence, retry logic)

### Implementation Handoff

**For AI Agents:**
This architecture document is your complete guide for implementing johnny-bmad v1 batch workflow enhancement. Follow all decisions, patterns, and structures exactly as documented.

**First Implementation Priority:**

**Step 1: State Schema & Migration Foundation**

Implement enhanced State interface and migration logic first (foundation for all other work):

1. Update `src/types.ts` - Add enhanced State interface with workflow structure
2. Update `src/config.ts` - Implement migrateV0toV1() with user prompt
3. Write `src/config.test.ts` - Migration tests with v0.2.0 fixtures
4. Create `src/fixtures/` - Add v0.2.0 state fixtures for testing
5. Validate: Run `bun test --coverage` and verify 90%+ for config.ts migration logic

**Development Sequence:**

1. State Schema + Tests (Foundation)
2. UI Component System + Tests (Infrastructure)
3. Workflow Router + Tests (Core Logic)
4. CLI Flag Expansion + Tests (Entry Point)
5. Integration & System Tests (Validation)
6. Coverage Validation (Quality Gate: 90%+)

### Quality Assurance Checklist

**✅ Architecture Coherence**

- [x] All decisions work together without conflicts
- [x] Technology choices are compatible
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**

- [x] All functional requirements are supported (62/62 FRs)
- [x] All non-functional requirements are addressed (20/20 NFRs)
- [x] Cross-cutting concerns are handled (7 concerns documented)
- [x] Integration points are defined (internal + external)

**✅ Implementation Readiness**

- [x] Decisions are specific and actionable (5 critical decisions with full rationale)
- [x] Patterns prevent agent conflicts (4 pattern categories with examples + anti-patterns)
- [x] Structure is complete and unambiguous (all files and directories specified)
- [x] Examples are provided for clarity (good examples + anti-patterns for all patterns)

### Project Success Factors

**🎯 Clear Decision Framework**
Every technology choice was made collaboratively with clear rationale, ensuring all stakeholders understand the architectural direction.

**🔧 Consistency Guarantee**
Implementation patterns and rules ensure that multiple AI agents will produce compatible, consistent code that works together seamlessly.

**📋 Complete Coverage**
All project requirements are architecturally supported, with clear mapping from business needs to technical implementation (62 FRs + 20 NFRs = 100% coverage).

**🏗️ Solid Foundation**
The existing v0.2.0 architecture provides a production-proven foundation - enhancement strategy extends (not replaces) proven patterns.

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Next Phase:** Begin implementation using the architectural decisions and patterns documented herein.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.
