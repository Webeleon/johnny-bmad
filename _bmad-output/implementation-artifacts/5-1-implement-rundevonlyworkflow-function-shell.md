# Story 5.1: Implement runDevOnlyWorkflow Function Shell

Status: done

## Story

As a developer working on johnny-bmad,
I want a dedicated dev-only workflow function,
so that dev-only mode execution is cleanly separated from other modes.

## Acceptance Criteria

1. **Given** the `src/orchestrator.ts` file
   **When** I add the `runDevOnlyWorkflow()` function
   **Then** it accepts parameters: `cwd: string`, `state: State`, `args: CliArgs`
   **And** it is exported for use by the main orchestrator

2. **Given** the dev-only workflow function
   **When** it starts
   **Then** it sets `state.workflow.phase` to `'implementation'`
   **And** saves state before proceeding

3. **Given** the main orchestrator
   **When** `determineMode()` returns `'dev-only'`
   **Then** it calls `runDevOnlyWorkflow()` instead of other workflow functions

4. **Given** the dev-only workflow
   **When** no existing stories are found
   **Then** it displays error:
   ```
   [ERROR] No stories found for epic
           Dev-only mode requires pre-created stories
           Try: Run johnny-bmad --batch first to create stories
   ```
   **And** exits with code 1

## Tasks / Subtasks

- [x] Task 1: Create runDevOnlyWorkflow function signature (AC: 1)
  - [x] 1.1 Add function with parameters: cwd: string, state: State, args: CliArgs
  - [x] 1.2 Add JSDoc documentation describing the function purpose
  - [x] 1.3 Export function for use by main orchestrator
  - [x] 1.4 Add @internal tag to indicate it's not a public API

- [x] Task 2: Implement initial state setup (AC: 2)
  - [x] 2.1 Set state.workflow.phase to 'implementation' at function start
  - [x] 2.2 Call saveState() before proceeding with any workflow logic
  - [x] 2.3 Use await for async saveState call

- [x] Task 3: Wire orchestrator to call runDevOnlyWorkflow (AC: 3)
  - [x] 3.1 Locate the dev-only mode branch in runOrchestrator (around line 1121)
  - [x] 3.2 Replace the current warning placeholder with call to runDevOnlyWorkflow()
  - [x] 3.3 Pass cwd, state!, and args to the function call
  - [x] 3.4 Add process.exit(0) after runDevOnlyWorkflow for clean exit (matching batch mode pattern)

- [x] Task 4: Implement story detection with error handling (AC: 4)
  - [x] 4.1 Load sprint status using loadSprintStatus(cwd)
  - [x] 4.2 Get stories using getAllStoriesForEpic(sprintStatus, state.currentEpic)
  - [x] 4.3 Check if stories array is empty
  - [x] 4.4 Display error using displayStatus('error', ...) or error() function
  - [x] 4.5 Display "Try:" recovery guidance message
  - [x] 4.6 Call process.exit(1) to terminate with error code

- [x] Task 5: Add phase header and placeholder for implementation loop
  - [x] 5.1 Display phase header using displayPhaseHeader('Implementation')
  - [x] 5.2 Add TODO comment indicating Stories 5-2 through 5-6 will implement the loop
  - [x] 5.3 Add placeholder return for successful completion (no stories to implement yet)

- [x] Task 6: Write unit tests
  - [x] 6.1 Create orchestrator.test.ts if not exists, or add to existing
  - [x] 6.2 Test function accepts correct parameters
  - [x] 6.3 Test state.phase is set to 'implementation'
  - [x] 6.4 Test error handling when no stories found
  - [x] 6.5 Test process.exit(1) is called when no stories found (mock process.exit)

## Dev Notes

### Architecture Pattern to Follow

This story follows the pattern established by `runBatchWorkflow()` (lines 882-919 in orchestrator.ts). Key patterns:

1. **Function signature:** Accept cwd, state, args - matching runBatchWorkflow
2. **Phase routing:** Dev-only only uses 'implementation' phase (no story-creation or review phases)
3. **Error format:** Use displayStatus('error', ...) followed by error() with "Try:" guidance

### Critical Implementation Rules

From project-context.md:

1. **ESM imports:** Always use `.js` extensions
   ```typescript
   // Already imported at top of orchestrator.ts
   import { displayPhaseHeader } from './ui/phase-header.js';
   import { displayStatus } from './ui/status.js';
   import { loadSprintStatus, getAllStoriesForEpic } from './utils/files.js';
   import { saveState } from './config.js';
   import { error } from './utils/logger.js';
   ```

2. **No Bun-specific APIs:** Already using Node.js child_process in this codebase

3. **State persistence:** ALWAYS save state BEFORE risky operations (already implemented in config.ts)

4. **Error messages:** ALWAYS include "Try:" recovery guidance

### Existing Code Reference

The orchestrator already has a placeholder for dev-only mode (around line 1121-1124):

```typescript
} else if (activeMode === 'dev-only') {
  warn('Dev-only workflow not yet implemented');
  warn('        Try: Run without --dev-only flag for default sequential mode');
  return;
}
```

This placeholder should be replaced with the actual workflow call:

```typescript
} else if (activeMode === 'dev-only') {
  await runDevOnlyWorkflow(cwd, state!, args);
  process.exit(0);
}
```

### Dependencies Already in Place

- `determineMode()` function (line 72-78) - routes to 'dev-only' when args.devOnly is true
- State interface with `workflow.phase` field - already defined in types.ts
- UI components for error/status display - already implemented in Epic 3
- File utilities for story detection - already implemented in utils/files.ts

### Sprint Status Update Note

When this story is complete, the sprint-status.yaml entry `5-1-implement-rundevonlyworkflow-function-shell` should be updated from `backlog` to `done` by the reviewer agent after successful review.

### Project Structure Notes

- All code changes in `src/orchestrator.ts` (single file for this story)
- Test file: `src/orchestrator.test.ts` (co-located with implementation)
- No new files to create - this is a shell function only

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.1] - Story definition and acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#Workflow-Routing-Architecture] - Workflow router pattern
- [Source: _bmad-output/project-context.md#Critical-Implementation-Rules] - Cross-runtime compatibility and ESM imports
- [Source: src/orchestrator.ts:882-919] - runBatchWorkflow pattern to follow
- [Source: src/types.ts:152-162] - State interface with workflow.phase field

## Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Fix weak test for AC 1 - add actual parameter validation [src/orchestrator.test.ts:6436-6439] - test body is empty and validates nothing
  - Fixed: Test now validates function signature by calling runDevOnlyWorkflow with mock parameters and verifying state.phase is set
- [x] [AI-Review][HIGH] Add dedicated test for AC 3 orchestrator routing in Story 5-1 test suite - verify runDevOnlyWorkflow is called when mode is dev-only
  - Fixed: Added new test "AC 3: should invoke runDevOnlyWorkflow function when activeMode is dev-only" that verifies displayPhaseHeader('Implementation') is called
- [x] [AI-Review][HIGH] Investigate and fix potential test hang in orchestrator.test.ts - tests timeout while files.test.ts runs fine
  - Fixed: Root cause was batch mode routing tests missing process.exit mock. Added process.exit mock to all runOrchestrator routing tests.
- [x] [AI-Review][HIGH] Add test for process.exit(0) after successful runDevOnlyWorkflow completion (Task 3.4) - currently untested
  - Fixed: AC 3 routing test now verifies process.exit(0) is called after runDevOnlyWorkflow completes
- [x] [AI-Review][MEDIUM] Verify error message format matches AC 4 exactly - displayStatus('error', ...) may not produce [ERROR] prefix as specified
  - Verified: displayStatus('error', ...) produces [ERROR] prefix as specified in src/ui/status.ts line 16
- [x] [AI-Review][MEDIUM] Consider adding @ts-expect-error or void expression for intentionally unused _args parameter for better documentation
  - No change needed: Underscore prefix (_args) is idiomatic TypeScript for intentionally unused parameters
- [x] [AI-Review][LOW] Replace confusing `expect(true).toBe(false)` pattern with `expect.fail()` in unreachable code tests [src/orchestrator.test.ts:6562]
  - No change: This is a standard Bun test pattern when expect.fail() is not available. Pattern is used consistently across the test file.
- [x] [AI-Review][LOW] Expand TODO comment with brief description of what Stories 5-2 through 5-6 will implement for better roadmap clarity
  - Fixed: Added summary line to TODO comment describing the implementation loop purpose

### Round 2 Review Findings (2026-02-19)

- [ ] [AI-Review][MEDIUM] Add explicit `Promise<void>` return type to function signature [src/orchestrator.ts:942] - JSDoc documents return type but signature lacks explicit annotation
- [ ] [AI-Review][MEDIUM] Add test for malformed sprint-status response edge case [src/orchestrator.test.ts:6682-6733] - loadSprintStatus() throws without try/catch, no "Try:" guidance
- [ ] [AI-Review][MEDIUM] Add test for args.yolo=true future extensibility path [src/orchestrator.test.ts:6524-6531] - verify function won't break when yolo mode implemented
- [ ] [AI-Review][LOW] Document process.exit(1) behavior in JSDoc @throws tag [src/orchestrator.ts:940-941] - callers should know function may never return
- [ ] [AI-Review][LOW] Add specific story IDs to TODO comment for traceability [src/orchestrator.ts:973-981] - reference 5-2-implement-story-detection-and-pre-implementation-display etc.
- [ ] [AI-Review][LOW] Consider centralizing mock cleanup pattern in tests [src/orchestrator.test.ts:6598-6636] - could use afterEach for consistency

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

N/A - no issues encountered during implementation

### Completion Notes List

- Implemented `runDevOnlyWorkflow()` function in `src/orchestrator.ts` following the pattern established by `runBatchWorkflow()`
- Function signature matches AC 1: accepts `cwd: string`, `state: State`, `args: CliArgs`
- Added comprehensive JSDoc documentation with `@internal` tag
- State phase is set to 'implementation' at function start (AC 2)
- `saveState()` is called before proceeding with workflow logic (AC 2)
- Orchestrator dev-only branch now calls `runDevOnlyWorkflow()` with `process.exit(0)` (AC 3)
- Error handling displays proper error message with recovery guidance when no stories found (AC 4)
- Phase header displayed when stories exist, TODO comment added for future stories (Task 5)
- All 9 unit tests pass for Story 5-1 (including new AC 3 routing test)
- **Review Follow-ups Addressed:**
  - Fixed weak AC 1 test with actual parameter validation
  - Added dedicated AC 3 test verifying runDevOnlyWorkflow routing
  - Fixed test hang caused by missing process.exit mocks in routing tests
  - Verified error message format produces [ERROR] prefix as specified
  - Added summary line to TODO comment for better roadmap clarity
  - Expanded TODO comment with brief description of Stories 5-2 through 5-6 scope

### File List

- `src/orchestrator.ts` - Added `runDevOnlyWorkflow()` function and updated orchestrator routing
- `src/orchestrator.test.ts` - Added unit tests for `runDevOnlyWorkflow()` function
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated status to in-progress
