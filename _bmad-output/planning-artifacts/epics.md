---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
workflowStatus: complete
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture/index.md'
  - '_bmad-output/planning-artifacts/architecture/starter-template-evaluation.md'
  - '_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md'
  - '_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# johnny-bmad - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for johnny-bmad, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Developer can invoke johnny-bmad in sequential mode (default, existing behavior)
FR2: Developer can invoke johnny-bmad in batch mode using `--batch` flag
FR3: Developer can invoke johnny-bmad in dev-only mode using `--dev-only` flag
FR4: Developer can combine any mode with `--yolo` to skip approval gates
FR5: Developer can combine any mode with `--verbose` for detailed output (existing)
FR6: Developer can view help text with `--help` flag (existing, updated for new flags)
FR7: System can generate ALL user stories for an epic sequentially
FR8: System can invoke Story Creator agent to create each story file
FR9: System can display each story to developer after creation
FR10: System can track story creation progress (e.g., "Creating story 3/8")
FR11: System STOPS after all stories created and approved (no implementation in batch mode)
FR12: Developer can review EACH story immediately after it's created
FR13: System prompts "OK or changes needed?" after each story creation
FR14: Developer can approve individual story to proceed to next
FR15: Developer can request changes to individual story
FR16: System can iterate on story with developer feedback until approved
FR17: System proceeds to next story only after current story approved
FR18: System displays summary when all stories approved (e.g., "All 8 stories created and approved")
FR19: System can skip per-story approval prompts when `--yolo` flag provided
FR20: System auto-approves each story immediately after creation
FR21: System completes all story creation without human interaction
FR22: System can detect existing story files for current epic
FR23: System can skip story creation phase entirely when `--dev-only` flag provided
FR24: System can iterate through pre-created stories for implementation
FR25: Developer can run dev-only mode with stories created via `--batch` in previous session
FR26: Developer can run dev-only mode with manually created/edited stories
FR27: System can display which stories will be implemented before starting
FR28: System can invoke Dev agent to implement each story
FR29: System can invoke Reviewer agent to validate each implementation
FR30: System can iterate dev/review loop until story passes or max iterations reached
FR31: System can commit changes when story implementation passes review
FR32: System can proceed to next story after successful commit
FR33: Developer can configure max dev/review iterations via `--max-iterations` flag (existing)
FR34: System can skip commit approval prompts when `--yolo` flag provided (existing)
FR35: System can persist workflow state to `.johnny-bmad-state.json`
FR36: System can track current workflow mode (sequential, batch, dev-only)
FR37: System can track current phase (story-creation, approval, implementation)
FR38: System can track current epic, story index, and approval status
FR39: System can automatically detect state file on restart
FR40: System can resume from saved state without user action
FR41: System can display resume feedback (e.g., "Resuming from Epic: dashboard, Story: 4/8, Phase: implementation")
FR42: Developer can restart johnny-bmad after crash/failure and resume from exact position
FR43: System can retry failed API calls with exponential backoff
FR44: System can detect Claude API rate limiting and pause before retrying
FR45: System can preserve state immediately before any operation that could fail
FR46: System can display actionable error messages with context (what failed, where, why)
FR47: System can handle network failures gracefully without losing progress
FR48: System can recover from Story Creator agent failures during batch mode
FR49: System can recover from Dev agent failures during implementation
FR50: System can recover from Reviewer agent failures during validation
FR51: Developer can see which agent is currently active (SM, Story Creator, Dev, Reviewer)
FR52: Developer can see progress indicators during long operations
FR53: Developer can see colored terminal output for status messages (existing)
FR54: System can display workflow phase transitions clearly
FR55: System can display story-by-story progress in batch mode
FR56: System can display epic completion summary
FR57: Developer can use all existing flags without behavior changes
FR58: Developer can run sequential workflow exactly as before (default mode)
FR59: System can preserve existing state file format compatibility
FR60: System can support existing `--yolo` flag behavior in all modes
FR61: System can support existing `--verbose` flag behavior in all modes
FR62: System can support existing `--max-iterations` flag behavior

### NonFunctional Requirements

NFR-R1: System must preserve all work when interrupted (crash, network failure, power loss)
NFR-R2: Automatic resume must restore exact state (mode, epic, story, phase, approval status)
NFR-R3: State file must be written atomically to prevent corruption
NFR-R4: System must resume successfully 100% of the time when state file exists and is valid
NFR-R5: System must detect and report corrupted state files with recovery options
NFR-R6: Zero data loss scenarios - no lost stories, no lost implementations, no lost reviews
NFR-R7: System must handle Claude API rate limiting with retry after cooldown and clear user notification (pause and retry, not fail)
NFR-R8: System must retry failed API calls up to 3 times with exponential backoff (2s, 4s, 8s)
NFR-R9: System must handle transient network failures without session termination
NFR-P1: Command start-up time must be <2 seconds from invocation to first output
NFR-P2: State file read/write operations must complete in <100ms
NFR-P3: Progress updates must display within 1 second of agent state changes
NFR-P4: System must maintain performance with no memory leaks, no response degradation >10%, and no crashes during 8+ hour sessions
NFR-P5: State file size must remain <1MB regardless of epic size or session duration
NFR-M1: Code must achieve 100% test coverage (unit + integration + system tests) in v1.5
NFR-M2: All new flags (--batch, --dev-only) must have test scenarios covering all code paths and edge cases
NFR-M3: State management logic must have regression tests preventing state corruption
NFR-M4: Error handling paths must have test coverage for all failure scenarios
NFR-M5: All new CLI flags must be documented in --help output
NFR-M6: Error messages must include specific recovery commands or actions to resolve the issue (not just "failed")
NFR-M7: State file format changes must maintain backward compatibility or provide migration

### Additional Requirements

**From Architecture:**
- ARCH-1: Brownfield enhancement of existing v0.2.0 codebase (not greenfield)
- ARCH-2: State schema migration - Hybrid auto-migrate with user confirmation for v0.2.0 to v1
- ARCH-3: Enhanced State interface with workflow.mode, workflow.phase, stories.approvals structure
- ARCH-4: UI Component System - New src/ui/ directory with modular components
- ARCH-5: Workflow Router - Single function with mode branching (sequential/batch/dev-only)
- ARCH-6: Retry Logic - retryableOperation() with MAX_RETRIES=3, RETRY_DELAYS=[2000, 4000, 8000]
- ARCH-7: Cross-Runtime Compatibility - Node.js child_process, no Bun-specific APIs
- ARCH-8: NO_COLOR Support - All UI components respect NO_COLOR environment variable
- ARCH-9: ASCII Fallbacks - Unicode characters have ASCII fallbacks for terminal compatibility
- ARCH-10: 100% Test Coverage for v1 New Code - All new batch workflow code must have tests

**From UX Design:**
- UX-1: ASCII Banner - "JOHNNY BMAD" with "Go Johnny Go!" tagline displayed at session start
- UX-2: Per-Story Review Flow - Y/N/V prompts for batch mode approval
- UX-3: Progress Bar Pattern - Story 4/8 [----] format with filled/empty indicators
- UX-4: Phase Headers - Visual separators for phase transitions
- UX-5: Agent Labels - [SM], [Story], [Dev], [Review] color-coded labels
- UX-6: Status Symbols - [OK], [FAIL], [WARN], [INFO], [ERROR] text-based (not just colors)
- UX-7: Resume Messaging - Clear "Resuming from Epic: X, Story: N/M, Phase: Y" format
- UX-8: Celebration Block - Emoji celebration with stats at epic completion
- UX-9: Error Block - [ERROR] format with "Try:" recovery guidance always included
- UX-10: Log File Persistence - Full session logs written to file for post-hoc debugging

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 2 | Sequential mode (preserve existing) |
| FR2 | Epic 2 | Batch mode flag |
| FR3 | Epic 2 | Dev-only mode flag |
| FR4 | Epic 2 | Yolo combination |
| FR5 | Epic 2 | Verbose combination (preserve) |
| FR6 | Epic 2 | Help text update |
| FR7 | Epic 4 | Generate ALL stories |
| FR8 | Epic 4 | Invoke Story Creator agent |
| FR9 | Epic 3 | Display story after creation |
| FR10 | Epic 3 | Story creation progress |
| FR11 | Epic 4 | Stop after approval |
| FR12 | Epic 4 | Review each story after creation |
| FR13 | Epic 4 | Prompt OK or changes |
| FR14 | Epic 4 | Approve individual story |
| FR15 | Epic 4 | Request changes |
| FR16 | Epic 4 | Iterate with feedback |
| FR17 | Epic 4 | Proceed after approval |
| FR18 | Epic 4 | Display summary |
| FR19 | Epic 4 | Skip approval with yolo |
| FR20 | Epic 4 | Auto-approve each story |
| FR21 | Epic 4 | Complete without interaction |
| FR22 | Epic 5 | Detect existing stories |
| FR23 | Epic 5 | Skip story creation |
| FR24 | Epic 5 | Iterate pre-created stories |
| FR25 | Epic 5 | Dev-only with batch stories |
| FR26 | Epic 5 | Dev-only with manual stories |
| FR27 | Epic 5 | Display stories to implement |
| FR28 | Epic 5 | Invoke Dev agent |
| FR29 | Epic 5 | Invoke Reviewer agent |
| FR30 | Epic 5 | Iterate dev/review loop |
| FR31 | Epic 5 | Commit on pass |
| FR32 | Epic 5 | Proceed to next story |
| FR33 | Epic 5 | Max iterations flag (preserve) |
| FR34 | Epic 5 | Skip commit with yolo (preserve) |
| FR35 | Epic 1 | Persist state to file |
| FR36 | Epic 1 | Track workflow mode |
| FR37 | Epic 1 | Track current phase |
| FR38 | Epic 1 | Track epic, story, approval |
| FR39 | Epic 1 | Auto-detect state file |
| FR40 | Epic 1 | Resume from saved state |
| FR41 | Epic 3 | Display resume feedback |
| FR42 | Epic 1 | Resume after crash |
| FR43 | Epic 4+5 | Retry with exponential backoff |
| FR44 | Epic 4+5 | Detect rate limiting |
| FR45 | Epic 4+5 | Preserve state before risky ops |
| FR46 | Epic 3 | Actionable error messages |
| FR47 | Epic 4+5 | Handle network failures |
| FR48 | Epic 4 | Recover from Story Creator failures |
| FR49 | Epic 5 | Recover from Dev agent failures |
| FR50 | Epic 5 | Recover from Reviewer failures |
| FR51 | Epic 3 | Show active agent |
| FR52 | Epic 3 | Progress indicators |
| FR53 | Epic 3 | Colored output (preserve) |
| FR54 | Epic 3 | Phase transitions |
| FR55 | Epic 3 | Story-by-story progress |
| FR56 | Epic 3 | Epic completion summary |
| FR57 | Epic 2 | Preserve existing flags |
| FR58 | Epic 2 | Sequential as default |
| FR59 | Epic 1 | State format compatibility |
| FR60 | Epic 2 | Yolo in all modes |
| FR61 | Epic 2 | Verbose in all modes |
| FR62 | Epic 2 | Max-iterations in all modes |

### NFR Coverage Map

| NFR | Epic | Description |
|-----|------|-------------|
| NFR-R1 | Epic 1 | Preserve work on interrupt |
| NFR-R2 | Epic 1 | Resume restores exact state |
| NFR-R3 | Epic 1 | Atomic state writes |
| NFR-R4 | Epic 1 | Resume 100% reliable |
| NFR-R5 | Epic 1 | Detect corrupt state |
| NFR-R6 | Epic 1 | Zero data loss |
| NFR-R7 | Epic 4+5 | Handle rate limiting |
| NFR-R8 | Epic 4+5 | Retry 3x with backoff |
| NFR-R9 | Epic 4+5 | Handle network failures |
| NFR-P1-P5 | Cross-cutting | Performance validated each epic |
| NFR-M1-M7 | Each epic | Test coverage per epic |

### Additional Requirements Coverage

| Req | Epic | Description |
|-----|------|-------------|
| ARCH-1 | All | Brownfield enhancement |
| ARCH-2 | Epic 1 | State migration with confirmation |
| ARCH-3 | Epic 1 | Enhanced State interface |
| ARCH-4 | Epic 3 | UI Component System |
| ARCH-5 | Epic 2 | Workflow Router |
| ARCH-6 | Epic 4+5 | Retry logic |
| ARCH-7 | All | Cross-runtime compatibility |
| ARCH-8 | Epic 3 | NO_COLOR support |
| ARCH-9 | Epic 3 | ASCII fallbacks |
| ARCH-10 | Each epic | 100% test coverage for new code |
| UX-1 | Epic 3 | ASCII banner |
| UX-2 | Epic 4 | Per-story review flow |
| UX-3 | Epic 3 | Progress bar pattern |
| UX-4 | Epic 3 | Phase headers |
| UX-5 | Epic 3 | Agent labels |
| UX-6 | Epic 3 | Status symbols |
| UX-7 | Epic 3 | Resume messaging |
| UX-8 | Epic 3 | Celebration block |
| UX-9 | Epic 3 | Error block with recovery |
| UX-10 | Epic 3 | Log file persistence |

## Epic List

### Epic 1: State Schema & Migration
**User Outcome:** "My existing v0.2.0 sessions migrate seamlessly to the new format, and state tracking is robust enough for all new workflow modes."

This epic establishes the data foundation for all batch workflow features with reliable state persistence and automatic migration.

**FRs Covered:** FR35-42, FR59
**NFRs Covered:** NFR-R1 through NFR-R6
**Additional:** ARCH-2, ARCH-3

**Delivers:**
- Enhanced State interface (workflow.mode, workflow.phase, stories.approvals)
- Automatic migration from v0.2.0 state format with user confirmation
- Atomic state writes (temp file + rename)
- Corrupt state detection with recovery options
- Zero data loss guarantee

**Estimated Stories:** 4-5

---

### Epic 2: CLI Flags & Workflow Router
**User Outcome:** "I can use the new --batch and --dev-only flags, and johnny-bmad routes to the correct workflow mode while preserving all existing behavior."

This epic adds the CLI entry points and mode routing logic for batch workflow features.

**FRs Covered:** FR1-6, FR57-58, FR60-62
**Additional:** ARCH-5

**Delivers:**
- `--batch` flag parsing and validation
- `--dev-only` flag parsing and validation
- Mutually exclusive flag check (--batch vs --dev-only)
- `determineMode()` routing logic (sequential/batch/dev-only)
- Updated help text with new flags and examples
- All existing flags preserved (--verbose, --yolo, --max-iterations)
- Sequential mode remains default (backward compatible)

**Estimated Stories:** 4-5

---

### Epic 3: Terminal UI Component System
**User Outcome:** "I can clearly see what's happening at every step - which agent is working, my progress through stories, phase transitions, and what to do when errors occur."

This epic creates the visual feedback infrastructure used by all workflows.

**FRs Covered:** FR9, FR10, FR41, FR46, FR51-56
**Additional:** ARCH-4, ARCH-8, ARCH-9, UX-1 through UX-10

**Delivers:**
- `src/ui/` component directory structure
- ASCII "JOHNNY BMAD" banner with "Go Johnny Go!" tagline
- Phase headers (`━━━ Phase: Story Creation ━━━`)
- Progress bars (`Story 4/8 [████░░░░]`)
- Agent activity labels (`[SM]`, `[Story]`, `[Dev]`, `[Review]`)
- Status symbols (`[OK]`, `[FAIL]`, `[WARN]`, `[INFO]`, `[ERROR]`)
- Story review cards for batch approval
- Resume feedback messaging
- Error blocks with "Try:" recovery guidance
- Celebration block with stats
- NO_COLOR environment variable support
- ASCII fallbacks for all Unicode characters

**Estimated Stories:** 6-8

---

### Epic 4: Batch Story Creation Workflow
**User Outcome:** "I can create ALL my epic's stories upfront, review and approve each one, and validate my complete implementation plan BEFORE committing to 8+ hours of automation."

This epic delivers the core batch workflow for story creation with integrated error handling.

**FRs Covered:** FR7, FR8, FR11-21, FR43-45, FR47, FR48
**NFRs Covered:** NFR-R7, NFR-R8, NFR-R9 (integrated)
**Additional:** ARCH-6, UX-2

**Delivers:**
- `runBatchWorkflow()` function in orchestrator
- Generate ALL stories for epic sequentially (Story Creator agent)
- Per-story review: "OK or changes needed?" after each creation
- Y/N/V prompt (Approve/Changes/View full story)
- Change request iteration loop with Story Creator
- Auto-approve with `--yolo` flag
- Summary on completion: "All 8 stories created and approved"
- Exit after approval (no implementation in batch mode)
- Retry with exponential backoff (2s, 4s, 8s)
- Rate limit detection and pause
- State preservation before every agent spawn
- Story Creator failure recovery

**Estimated Stories:** 5-7

---

### Epic 5: Dev-Only Execution Mode
**User Outcome:** "I can run implementation on my pre-approved stories and walk away to plan my next feature while johnny-bmad handles the grunt work."

This epic delivers the dev-only execution mode with integrated error handling.

**FRs Covered:** FR22-34, FR43-45, FR47, FR49, FR50
**NFRs Covered:** NFR-R7, NFR-R8, NFR-R9 (integrated)
**Additional:** ARCH-6

**Delivers:**
- `runDevOnlyWorkflow()` function in orchestrator
- Detect existing story files for current epic
- Skip story creation phase entirely
- Display which stories will be implemented before starting
- Run implementation loop (Dev → Review → Commit) on pre-created stories
- Works with stories from `--batch` or manually created/edited
- Retry with exponential backoff for Dev and Reviewer agents
- Rate limit detection and pause
- State preservation before every agent spawn
- Dev agent failure recovery
- Reviewer agent failure recovery

**Estimated Stories:** 4-6

---

## Epic Summary

| Epic | Title | FRs | Stories |
|------|-------|-----|---------|
| 1 | State Schema & Migration | 9 | 4-5 |
| 2 | CLI Flags & Workflow Router | 12 | 4-5 |
| 3 | Terminal UI Component System | 10 | 6-8 |
| 4 | Batch Story Creation | 17 | 5-7 |
| 5 | Dev-Only Execution | 18 | 4-6 |
| **Total** | | **62 FRs + 20 NFRs** | **23-31 stories** |

---

## Epic 1: State Schema & Migration

**Epic Goal:** My existing v0.2.0 sessions migrate seamlessly to the new format, and state tracking is robust enough for all new workflow modes.

**FRs Covered:** FR35-42, FR59
**NFRs Covered:** NFR-R1 through NFR-R6
**Additional:** ARCH-2, ARCH-3

---

### Story 1.1: Define Enhanced State TypeScript Interface

**As a** developer working on johnny-bmad,
**I want** a well-defined TypeScript interface for the enhanced state schema,
**So that** all workflow modes, phases, and story approvals can be tracked with type safety.

**Acceptance Criteria:**

**Given** the existing `src/types.ts` file
**When** I add the enhanced State interface
**Then** it includes a `workflow` object with `mode: 'sequential' | 'batch' | 'dev-only'`
**And** it includes `workflow.phase: 'story-creation' | 'review' | 'implementation'`
**And** it includes `workflow.currentStoryIndex: number`
**And** it includes `workflow.devReviewIteration: number`
**And** it includes a `stories` object with `completed: string[]`
**And** it includes `stories.approvals: Record<string, 'approved' | 'needs-changes' | 'pending'>`
**And** the interface preserves existing fields (`currentEpic`, `lastUpdated`)
**And** TypeScript compilation passes with no errors

**FRs:** FR36, FR37, FR38
**Additional:** ARCH-3

---

### Story 1.2: Implement v0.2.0 State Detection and Migration

**As a** developer with existing v0.2.0 johnny-bmad sessions,
**I want** automatic detection and migration of my old state files,
**So that** I don't lose my progress when upgrading to v1.

**Acceptance Criteria:**

**Given** a state file exists in v0.2.0 format (missing `workflow` field)
**When** `loadState()` is called
**Then** the system detects the old format
**And** prompts the user: "Migrate state file to v1 format? (y/n)"

**Given** user confirms migration with 'y'
**When** migration executes
**Then** existing `currentEpic` is preserved
**And** existing `completedStories` maps to `stories.completed`
**And** existing `currentStoryIndex` maps to `workflow.currentStoryIndex`
**And** `workflow.mode` defaults to 'sequential'
**And** `workflow.phase` defaults to 'implementation'
**And** `stories.approvals` defaults to empty object
**And** migrated state is saved to file

**Given** user declines migration with 'n'
**When** migration is declined
**Then** the system displays: "Delete .johnny-bmad-state.json to start fresh"
**And** exits with code 1

**FRs:** FR39, FR59
**Additional:** ARCH-2

---

### Story 1.3: Implement Atomic State Write Operations

**As a** developer running long johnny-bmad sessions,
**I want** state writes to be atomic,
**So that** crashes during write don't corrupt my state file.

**Acceptance Criteria:**

**Given** `saveState()` is called with valid state
**When** the write operation executes
**Then** state is written to a temporary file first (`.johnny-bmad-state.json.tmp`)
**And** the temp file is renamed to the final filename atomically
**And** the operation completes in <100ms (NFR-P2)

**Given** a write error occurs (disk full, permissions)
**When** the temp file write fails
**Then** the original state file remains unchanged
**And** an error is thrown with actionable message

**Given** a crash occurs during write
**When** the system restarts
**Then** either the old state or new state exists (never partial)
**And** `loadState()` can read the file successfully

**FRs:** FR35, FR40, FR42
**NFRs:** NFR-R1, NFR-R3, NFR-R6

---

### Story 1.4: Implement Corrupt State Detection and Recovery

**As a** developer whose state file may have been corrupted,
**I want** the system to detect and offer recovery options,
**So that** I can continue working without manual file editing.

**Acceptance Criteria:**

**Given** a state file exists but has invalid JSON
**When** `loadState()` is called
**Then** the system displays: "[WARN] Corrupt state file detected"
**And** offers options: "1. Delete and start fresh  2. Exit and fix manually"

**Given** a state file exists but is missing required fields
**When** `loadState()` validates the structure
**Then** missing fields are detected
**And** the system attempts partial recovery if possible
**And** displays what was recovered vs lost

**Given** state file passes validation
**When** `loadState()` completes
**Then** exact state is restored (mode, epic, story, phase, approvals)
**And** resume succeeds 100% of the time (NFR-R4)

**Given** user selects "Delete and start fresh"
**When** recovery executes
**Then** the corrupt state file is removed
**And** a fresh state is initialized
**And** the user can continue working

**FRs:** FR41
**NFRs:** NFR-R2, NFR-R4, NFR-R5

---

## Epic 2: CLI Flags & Workflow Router

**Epic Goal:** I can use the new --batch and --dev-only flags, and johnny-bmad routes to the correct workflow mode while preserving all existing behavior.

**FRs Covered:** FR1-6, FR57-58, FR60-62
**Additional:** ARCH-5

---

### Story 2.1: Add --batch and --dev-only Flag Parsing

**As a** developer using johnny-bmad,
**I want** to use `--batch` and `--dev-only` command line flags,
**So that** I can choose between different workflow modes.

**Acceptance Criteria:**

**Given** the CLI entry point in `src/index.ts`
**When** I run `johnny-bmad --batch`
**Then** the `batch` flag is parsed and set to `true` in CliArgs
**And** the program proceeds without parsing errors

**Given** the CLI entry point in `src/index.ts`
**When** I run `johnny-bmad --dev-only`
**Then** the `devOnly` flag is parsed and set to `true` in CliArgs
**And** the program proceeds without parsing errors

**Given** the `CliArgs` interface in `src/types.ts`
**When** I review the interface definition
**Then** it includes `batch?: boolean`
**And** it includes `devOnly?: boolean`
**And** TypeScript compilation passes

**Given** no new flags are provided
**When** I run `johnny-bmad` with no arguments
**Then** both `batch` and `devOnly` default to `false`

**FRs:** FR2, FR3

---

### Story 2.2: Implement Flag Validation (Mutually Exclusive Check)

**As a** developer using johnny-bmad,
**I want** clear error messages when I use conflicting flags,
**So that** I understand I can't use --batch and --dev-only together.

**Acceptance Criteria:**

**Given** the CLI argument parser
**When** I run `johnny-bmad --batch --dev-only`
**Then** the system displays: "[ERROR] Cannot use --batch and --dev-only together"
**And** displays: "Try: Use --batch to create stories, then --dev-only to implement"
**And** exits with code 1

**Given** the CLI argument parser
**When** I run `johnny-bmad --batch`
**Then** validation passes (no conflict)

**Given** the CLI argument parser
**When** I run `johnny-bmad --dev-only`
**Then** validation passes (no conflict)

**Given** the `--yolo` flag
**When** I run `johnny-bmad --batch --yolo`
**Then** validation passes (yolo can combine with batch)

**Given** the `--yolo` flag
**When** I run `johnny-bmad --dev-only --yolo`
**Then** validation passes (yolo can combine with dev-only)

**FRs:** FR4

---

### Story 2.3: Implement Workflow Mode Determination

**As a** developer using johnny-bmad,
**I want** the system to route to the correct workflow based on my flags,
**So that** I get the behavior I expect.

**Acceptance Criteria:**

**Given** a `determineMode(args: CliArgs)` function in `src/orchestrator.ts`
**When** `args.batch` is `true`
**Then** the function returns `'batch'`

**Given** a `determineMode(args: CliArgs)` function
**When** `args.devOnly` is `true`
**Then** the function returns `'dev-only'`

**Given** a `determineMode(args: CliArgs)` function
**When** neither `batch` nor `devOnly` is `true`
**Then** the function returns `'sequential'` (default, backward compatible)

**Given** the orchestrator main function
**When** mode is determined
**Then** the mode is stored in `state.workflow.mode`
**And** the orchestrator routes to the appropriate workflow function

**Given** an existing state file with `workflow.mode` set
**When** johnny-bmad resumes
**Then** it uses the mode from state (not from CLI flags)
**And** displays: "Resuming in [mode] mode..."

**FRs:** FR1, FR57, FR58
**Additional:** ARCH-5

---

### Story 2.4: Update Help Text with New Flags and Examples

**As a** developer discovering johnny-bmad,
**I want** clear help text explaining all available flags,
**So that** I understand how to use different workflow modes.

**Acceptance Criteria:**

**Given** the `--help` flag
**When** I run `johnny-bmad --help`
**Then** the output includes description for `--batch`:
  "Create all stories first, review each one, then exit (no implementation)"
**And** includes description for `--dev-only`:
  "Skip story creation, implement existing stories only"

**Given** the help output
**When** I review the examples section
**Then** it shows: `johnny-bmad` - "Start sequential workflow (default)"
**And** shows: `johnny-bmad --batch` - "Create and review stories before implementing"
**And** shows: `johnny-bmad --dev-only` - "Implement pre-created stories"
**And** shows: `johnny-bmad --batch --yolo` - "Create stories without review prompts"

**Given** existing flags (--verbose, --yolo, --max-iterations)
**When** I review the help output
**Then** all existing flag descriptions are preserved unchanged
**And** the new flags are listed alongside existing ones

**Given** the help output
**When** I check the documentation link
**Then** it displays: "Documentation: https://github.com/webeleon/johnny-bmad"

**FRs:** FR5, FR6, FR60, FR61, FR62

---

## Epic 3: Terminal UI Component System

**Epic Goal:** I can clearly see what's happening at every step - which agent is working, my progress through stories, phase transitions, and what to do when errors occur.

**FRs Covered:** FR9, FR10, FR41, FR46, FR51-56
**Additional:** ARCH-4, ARCH-8, ARCH-9, UX-1 through UX-10

---

### Story 3.1: Create UI Component Directory Structure and Index

**As a** developer working on johnny-bmad,
**I want** a well-organized UI component directory,
**So that** all terminal output components are modular and easy to import.

**Acceptance Criteria:**

**Given** the `src/` directory
**When** I create the UI component structure
**Then** a new `src/ui/` directory exists
**And** an `index.ts` file exists with unified exports

**Given** the `src/ui/index.ts` file
**When** UI components are implemented
**Then** all components are exported from this single entry point
**And** other modules can import via `import { displayBanner, displayProgress } from './ui/index.js'`

**Given** the component files to be created
**When** I review the directory structure
**Then** placeholder files exist for: `banner.ts`, `phase-header.ts`, `progress.ts`, `agent-line.ts`, `status.ts`, `story-card.ts`, `error.ts`, `celebration.ts`

**Additional:** ARCH-4

---

### Story 3.2: Implement ASCII Banner Component

**As a** developer starting a johnny-bmad session,
**I want** to see a memorable ASCII banner,
**So that** I know the tool has started and feel the brand identity.

**Acceptance Criteria:**

**Given** the `src/ui/banner.ts` component
**When** `displayBanner()` is called
**Then** it displays the "JOHNNY BMAD" ASCII art
**And** displays the tagline "Go Johnny Go!"
**And** uses cyan color for the banner

**Given** a fresh session start (no state file or new epic)
**When** johnny-bmad starts
**Then** the banner is displayed

**Given** a resume session (state file exists)
**When** johnny-bmad resumes
**Then** the banner is NOT displayed (skip straight to resume message)

**Given** the `NO_COLOR` environment variable is set
**When** `displayBanner()` is called
**Then** the banner displays without color (plain text)

**Given** the `--help` flag
**When** I run `johnny-bmad --help`
**Then** the banner is NOT displayed (help only)

**Additional:** UX-1

---

### Story 3.3: Implement Phase Header Component

**As a** developer running johnny-bmad,
**I want** clear visual markers for phase transitions,
**So that** I know when the workflow moves to a new phase.

**Acceptance Criteria:**

**Given** the `src/ui/phase-header.ts` component
**When** `displayPhaseHeader('Story Creation')` is called
**Then** it displays: `━━━ Phase: Story Creation ━━━`
**And** a blank line precedes the header

**Given** the phase header component
**When** displaying different phases
**Then** it supports: 'Story Creation', 'Review', 'Implementation'
**And** phase names are displayed in Title Case

**Given** a terminal without Unicode support
**When** the phase header is displayed
**Then** it falls back to ASCII: `=== Phase: Story Creation ===`

**Given** the `NO_COLOR` environment variable is set
**When** phase header is displayed
**Then** the separator characters display without color

**FRs:** FR54
**Additional:** UX-4, ARCH-9

---

### Story 3.4: Implement Progress Bar Component

**As a** developer watching johnny-bmad work,
**I want** visual progress indicators,
**So that** I know how far along the epic is.

**Acceptance Criteria:**

**Given** the `src/ui/progress.ts` component
**When** `displayProgress(4, 8, 'implementing')` is called
**Then** it displays: `Story 4/8 [████████░░░░░░░░] implementing...`
**And** the bar width is 16 characters

**Given** progress at 0%
**When** `displayProgress(0, 8, 'starting')` is called
**Then** it displays: `Story 0/8 [░░░░░░░░░░░░░░░░] starting...`

**Given** progress at 100%
**When** `displayProgress(8, 8, 'complete')` is called
**Then** it displays: `Story 8/8 [████████████████] complete`

**Given** a terminal without Unicode support
**When** progress bar is displayed
**Then** it falls back to ASCII: `Story 4/8 [########--------] implementing...`
**And** uses `#` for filled and `-` for empty

**Given** the `NO_COLOR` environment variable is set
**When** progress bar is displayed
**Then** it displays without color styling

**FRs:** FR10, FR52, FR55
**Additional:** UX-3, ARCH-9

---

### Story 3.5: Implement Agent Activity Line Component

**As a** developer watching johnny-bmad work,
**I want** to see which agent is currently active,
**So that** I understand what's happening at each step.

**Acceptance Criteria:**

**Given** the `src/ui/agent-line.ts` component
**When** `displayAgentActivity('SM', 'Checking sprint status')` is called
**Then** it displays: `[SM] Checking sprint status...`
**And** the label `[SM]` is colored cyan

**Given** different agent types
**When** displaying agent activity
**Then** `[SM]` displays in cyan
**And** `[Story]` displays in blue
**And** `[Dev]` displays in green
**And** `[Review]` displays in magenta

**Given** agent labels
**When** formatted for display
**Then** labels have consistent width (8 characters including brackets)
**And** activity text follows with a space

**Given** the `NO_COLOR` environment variable is set
**When** agent activity is displayed
**Then** labels display without color but with brackets intact

**Given** verbose mode is enabled
**When** agent activity is displayed
**Then** timestamp is prepended: `[SM 14:32:05] Checking sprint status...`

**FRs:** FR51
**Additional:** UX-5, ARCH-8

---

### Story 3.6: Implement Status Message Component

**As a** developer watching johnny-bmad output,
**I want** clear status indicators for operations,
**So that** I can quickly identify successes, warnings, and errors.

**Acceptance Criteria:**

**Given** the `src/ui/status.ts` component
**When** `displayStatus('ok', 'Story implemented successfully')` is called
**Then** it displays: `[OK] Story implemented successfully`
**And** `[OK]` is colored green

**Given** different status levels
**When** displaying status messages
**Then** `[OK]` displays in green
**And** `[FAIL]` displays in red
**And** `[WARN]` displays in yellow
**And** `[INFO]` displays in cyan
**And** `[ERROR]` displays in red bold

**Given** the `NO_COLOR` environment variable is set
**When** status messages are displayed
**Then** text labels `[OK]`, `[FAIL]`, etc. are still visible (color-independent)
**And** status is conveyed by text, not just color

**Given** a status message
**When** displayed in the terminal
**Then** it works on monochrome displays (accessibility)

**FRs:** FR53
**Additional:** UX-6, ARCH-8

---

### Story 3.7: Implement Story Review Card Component

**As a** developer reviewing stories in batch mode,
**I want** a clear story summary card with approval prompts,
**So that** I can quickly review and approve each story.

**Acceptance Criteria:**

**Given** the `src/ui/story-card.ts` component
**When** `displayStoryCard(story, 4, 8)` is called
**Then** it displays a header: `━━━ Review Story 4/8 ━━━`
**And** displays the story title
**And** displays task count and acceptance criteria count

**Given** a story review card
**When** the card is displayed
**Then** format is:
```
━━━ Review Story 4/8 ━━━
Title: Implement login form with validation
Tasks: 4 subtasks | Acceptance Criteria: 5 items
```

**Given** the approval prompt
**When** `promptStoryApproval()` is called
**Then** it displays: `[Y] Approve  [N] Request changes  [V] View full story`
**And** waits for user input

**Given** user selects 'Y'
**When** approval is processed
**Then** the function returns `'approved'`

**Given** user selects 'N'
**When** changes are requested
**Then** it prompts: `What changes are needed? > `
**And** returns `'needs-changes'` with the feedback text

**Given** user selects 'V'
**When** full view is requested
**Then** the complete story file content is displayed
**And** the approval prompt is shown again

**Given** a revised story (after changes)
**When** the card is displayed
**Then** header shows: `━━━ Review Story 4/8 (revised) ━━━`

**FRs:** FR9
**Additional:** UX-2

---

### Story 3.8: Implement Error Block and Celebration Components

**As a** developer using johnny-bmad,
**I want** clear error messages with recovery guidance and celebration on completion,
**So that** I know how to fix problems and feel accomplishment when done.

**Acceptance Criteria:**

**Given** the `src/ui/error.ts` component
**When** `displayError('API Error', 'Rate limited', 'Story 4/8', 'wait 60s and restart')` is called
**Then** it displays:
```
[ERROR] API Error: Rate limited
        State saved at Story 4/8
        Try: wait 60s and restart
```

**Given** any error displayed
**When** the error block is shown
**Then** it ALWAYS includes a "Try:" line with actionable recovery command
**And** `[ERROR]` is colored red

**Given** the `src/ui/celebration.ts` component
**When** `displayCelebration({ stories: 8, files: 47, duration: '3h 42m' })` is called
**Then** it displays: `🎉 Epic Complete! 8 stories · 47 files · 3h 42m`
**And** uses magenta/bold styling

**Given** a terminal without emoji support
**When** celebration is displayed
**Then** it falls back to: `* Epic Complete! 8 stories · 47 files · 3h 42m`

**Given** the resume message component in `src/ui/status.ts` or dedicated file
**When** resuming from a previous session
**Then** it displays:
```
Resuming from:
  Epic: user-authentication
  Story: 4/8
  Phase: implementation

State saved. All progress preserved.
```
**And** the message is colored green for reassurance

**FRs:** FR41, FR46, FR56
**Additional:** UX-7, UX-8, UX-9, ARCH-9

---

## Epic 4: Batch Story Creation Workflow

**Epic Goal:** I can create ALL my epic's stories upfront, review and approve each one, and validate my complete implementation plan BEFORE committing to 8+ hours of automation.

**FRs Covered:** FR7, FR8, FR11-21, FR43-45, FR47, FR48
**NFRs Covered:** NFR-R7, NFR-R8, NFR-R9
**Additional:** ARCH-6, UX-2

---

### Story 4.1: Implement runBatchWorkflow Function Shell

**As a** developer working on johnny-bmad,
**I want** a dedicated batch workflow function,
**So that** batch mode execution is cleanly separated from sequential mode.

**Acceptance Criteria:**

**Given** the `src/orchestrator.ts` file
**When** I add the `runBatchWorkflow()` function
**Then** it accepts parameters: `cwd: string`, `state: State`, `args: CliArgs`
**And** it is exported for use by the main orchestrator

**Given** the batch workflow function
**When** `state.workflow.phase` is `'story-creation'`
**Then** it routes to the story creation logic

**Given** the batch workflow function
**When** `state.workflow.phase` is `'review'`
**Then** it routes to the review logic (for resume scenarios)

**Given** the batch workflow function
**When** it starts fresh (no existing state)
**Then** it sets `state.workflow.phase` to `'story-creation'`
**And** saves state before proceeding

**Given** the main orchestrator
**When** `determineMode()` returns `'batch'`
**Then** it calls `runBatchWorkflow()` instead of `runSequentialWorkflow()`

**FRs:** FR7, FR11

---

### Story 4.2: Implement Batch Story Creation Loop

**As a** developer using batch mode,
**I want** all stories for my epic created upfront,
**So that** I can review the complete plan before implementation.

**Acceptance Criteria:**

**Given** the batch workflow in story creation phase
**When** the creation loop starts
**Then** it displays phase header: `━━━ Phase: Story Creation ━━━`

**Given** the epic has N stories to create
**When** the creation loop executes
**Then** it iterates from story 1 to N sequentially
**And** displays progress: `Story 1/N [░░░░░░░░░░░░░░░░] creating...`

**Given** each story creation iteration
**When** the Story Creator agent is invoked
**Then** it displays: `[Story] Creating STORY-XXX...`
**And** saves state BEFORE spawning the agent
**And** spawns the Story Creator agent with appropriate prompt

**Given** a story is successfully created
**When** the agent completes
**Then** the story file exists in `_bmad-output/implementation-artifacts/`
**And** progress updates: `Story 1/N [████░░░░░░░░░░░░] created`
**And** `state.workflow.currentStoryIndex` increments

**Given** all stories are created
**When** the creation loop completes
**Then** `state.workflow.phase` transitions to `'review'`
**And** state is saved

**FRs:** FR7, FR8

---

### Story 4.3: Implement Per-Story Review Flow

**As a** developer using batch mode,
**I want** to review each story immediately after creation,
**So that** I can approve or request changes before moving to the next.

**Acceptance Criteria:**

**Given** a story has been created
**When** the review flow begins
**Then** it displays phase header: `━━━ Phase: Review ━━━` (first story only)

**Given** the review flow for story N
**When** the story card is displayed
**Then** it shows: `━━━ Review Story N/Total ━━━`
**And** displays the story title
**And** displays task count and acceptance criteria count

**Given** the approval prompt
**When** displayed to user
**Then** it shows: `[Y] Approve  [N] Request changes  [V] View full story`
**And** waits for user input

**Given** user selects 'Y' (Approve)
**When** approval is processed
**Then** `state.stories.approvals[storyId]` is set to `'approved'`
**And** displays: `[OK] Story approved`
**And** proceeds to next story (or completion if last)

**Given** user selects 'V' (View full)
**When** view is processed
**Then** the complete story file content is displayed
**And** the approval prompt is shown again

**Given** the last story is approved
**When** all stories have `'approved'` status
**Then** the workflow transitions to completion phase

**FRs:** FR12, FR13, FR14, FR17

---

### Story 4.4: Implement Story Change Request Iteration

**As a** developer reviewing stories in batch mode,
**I want** to request changes and have stories regenerated,
**So that** I can refine stories until they're implementation-ready.

**Acceptance Criteria:**

**Given** user selects 'N' (Request changes)
**When** the change request flow begins
**Then** it prompts: `What changes are needed? > `
**And** waits for user text input

**Given** user provides change feedback
**When** the feedback is captured
**Then** `state.stories.approvals[storyId]` is set to `'needs-changes'`
**And** state is saved

**Given** a story needs changes
**When** the Story Creator agent is re-invoked
**Then** it displays: `[Story] Updating STORY-XXX...`
**And** the agent prompt includes the user's feedback
**And** the existing story file is updated (not duplicated)

**Given** an updated story
**When** the story card is re-displayed
**Then** header shows: `━━━ Review Story N/Total (revised) ━━━`
**And** the approval prompt is shown again

**Given** multiple revision cycles
**When** user continues requesting changes
**Then** the iteration continues until user approves
**And** there is no limit on revision cycles

**FRs:** FR15, FR16

---

### Story 4.5: Implement Auto-Approve Mode for Batch

**As a** developer who trusts the Story Creator,
**I want** to skip approval prompts with --yolo,
**So that** I can create all stories without manual intervention.

**Acceptance Criteria:**

**Given** batch mode with `--yolo` flag
**When** a story is created
**Then** the approval prompt is NOT displayed
**And** the story is automatically approved

**Given** auto-approve mode
**When** each story is created
**Then** `state.stories.approvals[storyId]` is set to `'approved'` immediately
**And** displays: `[OK] Story auto-approved (--yolo)`
**And** proceeds to next story without pause

**Given** auto-approve mode
**When** all stories are created
**Then** the workflow completes without any user interaction during creation/review
**And** displays summary of all auto-approved stories

**Given** batch mode WITHOUT `--yolo` flag
**When** stories are created
**Then** the normal approval prompt flow is used (not auto-approve)

**FRs:** FR19, FR20, FR21

---

### Story 4.6: Implement Batch Completion and Exit

**As a** developer completing batch story creation,
**I want** a clear summary and next steps,
**So that** I know the batch phase is done and what to do next.

**Acceptance Criteria:**

**Given** all stories are approved
**When** the batch workflow completes
**Then** it displays summary:
```
━━━ Batch Complete ━━━
[OK] All 8 stories created and approved

Ready for implementation:
  1. STORY-001: Implement login form ✓
  2. STORY-002: Add session management ✓
  ...
```

**Given** the completion summary
**When** displayed to user
**Then** it shows total story count
**And** lists each story with title and approval status

**Given** batch completion
**When** the workflow exits
**Then** it displays: `Next: johnny-bmad --dev-only`
**And** exits with code 0 (success)

**Given** batch mode
**When** the workflow completes
**Then** it does NOT proceed to implementation
**And** `state.workflow.phase` remains `'review'` (completed)
**And** state is saved for future `--dev-only` run

**Given** a resume after batch completion
**When** user runs `johnny-bmad --batch` again
**Then** it detects all stories approved
**And** displays: "All stories already created and approved. Run --dev-only to implement."

**FRs:** FR11, FR18

---

### Story 4.7: Implement Retry Logic for Story Creator

**As a** developer running batch mode,
**I want** automatic retry on failures,
**So that** transient errors don't fail my entire session.

**Acceptance Criteria:**

**Given** the Story Creator agent spawn
**When** the API call fails
**Then** the system retries up to 3 times
**And** uses exponential backoff: 2s, 4s, 8s delays

**Given** a retry attempt
**When** the retry begins
**Then** it displays: `[WARN] Story Creator failed. Retrying in Xs... (attempt N/3)`

**Given** Claude API rate limiting is detected
**When** rate limit response is received
**Then** it displays: `[WARN] Rate limited. Waiting 60s...`
**And** pauses for the cooldown period
**And** retries after cooldown

**Given** state preservation
**When** BEFORE any Story Creator spawn
**Then** current state is saved to file
**And** includes: current story index, phase, approvals so far

**Given** all retry attempts fail
**When** max retries exceeded
**Then** it displays error block:
```
[ERROR] Story Creator failed after 3 attempts
        State saved at Story 4/8
        Try: Check network connection and restart
```
**And** exits with code 1
**And** state file allows resume from failed story

**Given** a network failure during spawn
**When** the failure is detected
**Then** it is treated as a retryable error
**And** follows the same retry logic

**FRs:** FR43, FR44, FR45, FR47, FR48
**NFRs:** NFR-R7, NFR-R8, NFR-R9
**Additional:** ARCH-6

---

## Epic 5: Dev-Only Execution Mode

**Epic Goal:** I can run implementation on my pre-approved stories and walk away to plan my next feature while johnny-bmad handles the grunt work.

**FRs Covered:** FR22-34, FR43-45, FR47, FR49, FR50
**NFRs Covered:** NFR-R7, NFR-R8, NFR-R9
**Additional:** ARCH-6

---

### Story 5.1: Implement runDevOnlyWorkflow Function Shell

**As a** developer working on johnny-bmad,
**I want** a dedicated dev-only workflow function,
**So that** dev-only mode execution is cleanly separated from other modes.

**Acceptance Criteria:**

**Given** the `src/orchestrator.ts` file
**When** I add the `runDevOnlyWorkflow()` function
**Then** it accepts parameters: `cwd: string`, `state: State`, `args: CliArgs`
**And** it is exported for use by the main orchestrator

**Given** the dev-only workflow function
**When** it starts
**Then** it sets `state.workflow.phase` to `'implementation'`
**And** saves state before proceeding

**Given** the main orchestrator
**When** `determineMode()` returns `'dev-only'`
**Then** it calls `runDevOnlyWorkflow()` instead of other workflow functions

**Given** the dev-only workflow
**When** no existing stories are found
**Then** it displays error:
```
[ERROR] No stories found for epic
        Dev-only mode requires pre-created stories
        Try: Run johnny-bmad --batch first to create stories
```
**And** exits with code 1

**FRs:** FR22, FR23

---

### Story 5.2: Implement Story Detection and Pre-Implementation Display

**As a** developer using dev-only mode,
**I want** to see which stories will be implemented,
**So that** I can confirm the right stories are queued before walking away.

**Acceptance Criteria:**

**Given** the dev-only workflow starts
**When** stories are loaded for the current epic
**Then** it uses `getAllStoriesForEpic()` from `src/utils/files.ts`
**And** loads stories from `_bmad-output/implementation-artifacts/`

**Given** stories created via `--batch` in a previous session
**When** dev-only mode loads them
**Then** all batch-created stories are detected
**And** their approval status is read from state (if available)

**Given** manually created or edited story files
**When** dev-only mode loads them
**Then** they are detected and included in the implementation queue
**And** no approval status is required (manual stories assumed approved)

**Given** stories are successfully loaded
**When** the pre-implementation display is shown
**Then** it displays:
```
━━━ Dev-Only Mode: Implementation ━━━
Found 8 stories for epic: user-authentication

Stories to implement:
  1. STORY-001: Implement login form
  2. STORY-002: Add session management
  ...

Starting implementation...
```

**Given** the `--yolo` flag is NOT set
**When** stories are displayed
**Then** it prompts: `Proceed with implementation? [Y/n]`
**And** waits for confirmation

**Given** the `--yolo` flag IS set
**When** stories are displayed
**Then** it proceeds immediately without confirmation

**FRs:** FR22, FR25, FR26, FR27

---

### Story 5.3: Implement Dev Agent Execution with Retry

**As a** developer running dev-only mode,
**I want** the Dev agent to implement each story with automatic retry,
**So that** transient failures don't stop my implementation session.

**Acceptance Criteria:**

**Given** a story is ready for implementation
**When** the Dev agent is invoked
**Then** it displays: `[Dev] Implementing STORY-XXX...`
**And** saves state BEFORE spawning the agent
**And** spawns the Dev agent (sonnet model) with the story context

**Given** the Dev agent spawn
**When** the API call fails
**Then** the system retries up to 3 times
**And** uses exponential backoff: 2s, 4s, 8s delays

**Given** a retry attempt for Dev agent
**When** the retry begins
**Then** it displays: `[WARN] Dev agent failed. Retrying in Xs... (attempt N/3)`

**Given** Claude API rate limiting is detected
**When** rate limit response is received
**Then** it displays: `[WARN] Rate limited. Waiting 60s...`
**And** pauses for the cooldown period
**And** retries after cooldown

**Given** all retry attempts fail for Dev agent
**When** max retries exceeded
**Then** it displays error block:
```
[ERROR] Dev agent failed after 3 attempts
        State saved at Story 4/8
        Try: Check network connection and restart
```
**And** exits with code 1
**And** state file allows resume from failed story

**FRs:** FR28, FR43, FR44, FR45, FR47, FR49
**NFRs:** NFR-R7, NFR-R8, NFR-R9
**Additional:** ARCH-6

---

### Story 5.4: Implement Reviewer Agent Execution with Retry

**As a** developer running dev-only mode,
**I want** the Reviewer agent to validate implementations with automatic retry,
**So that** code quality is ensured and transient failures don't stop the session.

**Acceptance Criteria:**

**Given** the Dev agent completes successfully
**When** the Reviewer agent is invoked
**Then** it displays: `[Review] Validating STORY-XXX...`
**And** saves state BEFORE spawning the agent
**And** spawns the Reviewer agent (opus model) with review context

**Given** the Reviewer agent output
**When** stdout contains `REVIEW_PASSED`
**Then** the review is marked as passed
**And** `state.workflow.devReviewIteration` is reset to 0

**Given** the Reviewer agent output
**When** stdout contains `REVIEW_FAILED`
**Then** the review is marked as failed
**And** `state.workflow.devReviewIteration` increments

**Given** the Reviewer agent spawn
**When** the API call fails
**Then** the system retries up to 3 times
**And** uses exponential backoff: 2s, 4s, 8s delays

**Given** a retry attempt for Reviewer agent
**When** the retry begins
**Then** it displays: `[WARN] Reviewer failed. Retrying in Xs... (attempt N/3)`

**Given** all retry attempts fail for Reviewer agent
**When** max retries exceeded
**Then** it displays error block:
```
[ERROR] Reviewer failed after 3 attempts
        State saved at Story 4/8, iteration 2
        Try: Check network connection and restart
```
**And** exits with code 1
**And** state file allows resume from failed review

**FRs:** FR29, FR50
**NFRs:** NFR-R7, NFR-R8, NFR-R9
**Additional:** ARCH-6

---

### Story 5.5: Implement Dev/Review Loop and Commit Flow

**As a** developer running dev-only mode,
**I want** the dev/review loop to iterate until success or max attempts,
**So that** code quality issues are fixed automatically before committing.

**Acceptance Criteria:**

**Given** a review fails (REVIEW_FAILED)
**When** iterations are below max (default 3)
**Then** it displays: `[WARN] Review failed. Iteration 2/3...`
**And** re-invokes the Dev agent with review feedback
**And** re-invokes the Reviewer agent after Dev completes

**Given** a review fails
**When** max iterations reached
**Then** it displays:
```
[WARN] Max iterations (3) reached for STORY-XXX
       Manual intervention required
```
**And** prompts: `[S] Skip story  [R] Retry  [A] Abort`

**Given** user selects 'S' (Skip)
**When** skip is processed
**Then** the story is marked as skipped (not completed)
**And** proceeds to next story

**Given** user selects 'A' (Abort)
**When** abort is processed
**Then** state is saved
**And** exits with code 1

**Given** a review passes (REVIEW_PASSED)
**When** the review completes
**Then** it displays: `[OK] Review passed`

**Given** review passes and `--yolo` flag is set
**When** commit flow begins
**Then** changes are committed automatically
**And** commit message follows format: `feat(STORY-XXX): [story title]`

**Given** review passes and `--yolo` flag is NOT set
**When** commit flow begins
**Then** it prompts: `Commit changes? [Y/n]`
**And** waits for user confirmation

**Given** a successful commit
**When** the commit completes
**Then** it displays: `[OK] Committed: feat(STORY-XXX): [title]`
**And** `state.stories.completed` adds the story ID
**And** `state.workflow.currentStoryIndex` increments
**And** state is saved
**And** proceeds to next story

**FRs:** FR30, FR31, FR32, FR33, FR34

---

### Story 5.6: Implement Dev-Only Completion with Celebration

**As a** developer completing a dev-only session,
**I want** a celebration with stats,
**So that** I feel accomplished and know exactly what was achieved.

**Acceptance Criteria:**

**Given** all stories are implemented successfully
**When** the dev-only workflow completes
**Then** it displays the celebration block:
```
🎉 Epic Complete! 8 stories · 47 files · 3h 42m
```

**Given** the celebration display
**When** stats are calculated
**Then** story count is the number of completed stories
**And** file count is total files changed across all commits
**And** duration is elapsed time from session start

**Given** some stories were skipped
**When** the summary is displayed
**Then** it shows:
```
🎉 Epic Complete! 6/8 stories · 32 files · 2h 15m

Skipped stories (manual intervention needed):
  - STORY-004: Complex validation logic
  - STORY-007: Edge case handling
```

**Given** epic completion
**When** final state is saved
**Then** `state.workflow.phase` is set to `'implementation'` (completed)
**And** all completed story IDs are in `state.stories.completed`
**And** state file reflects final status

**Given** a resume after successful completion
**When** user runs `johnny-bmad --dev-only` again
**Then** it detects all stories completed
**And** displays: "Epic already complete. Start a new epic or clear state to re-run."

**Given** the workflow completes
**When** exiting
**Then** it exits with code 0 (success)
**And** displays: `Session complete. Total time: 3h 42m`

**FRs:** FR56 (uses celebration from Epic 3)
