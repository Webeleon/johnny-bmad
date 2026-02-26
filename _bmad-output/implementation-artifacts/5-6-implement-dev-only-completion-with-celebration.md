# Story 5.6: Implement Dev-Only Completion with Celebration

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer completing a dev-only session,
I want a celebration with stats,
So that I feel accomplished and know exactly what was achieved.

## Acceptance Criteria

1. **Given** all stories are implemented successfully
   **When** the dev-only workflow completes
   **Then** it displays the celebration block:
   ```
   🎉 Epic Complete! 8 stories · 47 files · 3h 42m
   ```

2. **Given** the celebration display
   **When** stats are calculated
   **Then** story count is the number of completed stories
   **And** file count is total files changed across all commits
   **And** duration is elapsed time from session start

3. **Given** some stories were skipped
   **When** the summary is displayed
   **Then** it shows:
   ```
   🎉 Epic Complete! 6/8 stories · 32 files · 2h 15m

   Skipped stories (manual intervention needed):
     - STORY-004: Complex validation logic
     - STORY-007: Edge case handling
   ```

4. **Given** epic completion
   **When** final state is saved
   **Then** `state.workflow.phase` is set to `'implementation'` (completed)
   **And** all completed story IDs are in `state.stories.completed`
   **And** state file reflects final status

5. **Given** a resume after successful completion
   **When** user runs `johnny-bmad --dev-only` again
   **Then** it detects all stories completed
   **And** displays: "Epic already complete. Start a new epic or clear state to re-run."

6. **Given** the workflow completes
   **When** exiting
   **Then** it exits with code 0 (success)
   **And** displays: `Session complete. Total time: 3h 42m`

## Tasks / Subtasks

- [x] Task 1: Implement completion detection logic (AC: 5)
  - [x] 1.1 Create `checkEpicCompletion()` function in orchestrator.ts
  - [x] 1.2 Compare `state.stories.completed.length` against total stories in epic
  - [x] 1.3 Return boolean indicating if all stories are done
  - [x] 1.4 Handle case where some stories were skipped

- [x] Task 2: Implement stats calculation (AC: 2)
  - [x] 2.1 Create `calculateSessionStats()` function in orchestrator.ts
  - [x] 2.2 Calculate completed story count from `state.stories.completed`
  - [x] 2.3 Calculate file count using `git diff --stat` across all commits in session
  - [x] 2.4 Calculate duration from session start time (stored in state or measured from first commit)
  - [x] 2.5 Format duration as human-readable string (e.g., "3h 42m", "45m", "1h 5m")

- [x] Task 3: Implement celebration display (AC: 1, 3)
  - [x] 3.1 Create `displayCompletionSummary()` function in orchestrator.ts
  - [x] 3.2 Call `displayCelebration()` from `src/ui/celebration.ts` with calculated stats
  - [x] 3.3 If stories were skipped, list them with titles
  - [x] 3.4 Display final message: `Session complete. Total time: {duration}`

- [x] Task 4: Implement final state update (AC: 4)
  - [x] 4.1 Ensure `state.workflow.phase` remains `'implementation'` on completion
  - [x] 4.2 Verify all completed story IDs are in `state.stories.completed`
  - [x] 4.3 Save final state with `saveState()`
  - [x] 4.4 Add completion timestamp to state (optional enhancement)

- [x] Task 5: Implement completion detection on workflow start (AC: 5)
  - [x] 5.1 At start of `runDevOnlyWorkflow()`, check if epic is already complete
  - [x] 5.2 If complete, display: "Epic already complete. Start a new epic or clear state to re-run."
  - [x] 5.3 Exit with code 0 (not an error, just nothing to do)

- [x] Task 6: Integrate completion into dev-only loop (AC: 1, 6)
  - [x] 6.1 After final story commit in `runDevOnlyImplementationLoop()`, detect completion
  - [x] 6.2 Calculate stats for the completed epic
  - [x] 6.3 Display celebration block
  - [x] 6.4 Display session complete message
  - [x] 6.5 Exit with code 0

- [x] Task 7: Write unit tests
  - [x] 7.1 Create tests for `checkEpicCompletion()` - all complete, partial, none complete
  - [x] 7.2 Create tests for `calculateSessionStats()` - stories, files, duration
  - [x] 7.3 Create tests for duration formatting - hours, minutes, seconds
  - [x] 7.4 Create tests for skipped stories detection
  - [x] 7.5 Create tests for completion detection on workflow start
  - [x] 7.6 Create tests for final state update

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Fix file count calculation in `calculateSessionStats()` - currently uses `git diff --stat HEAD` which only counts uncommitted changes, not all files changed across the session [src/orchestrator.ts:1721-1737]
- [x] [AI-Review][MEDIUM] Add unit test for git file counting logic including failure case [src/orchestrator.test.ts]
- [x] [AI-Review][MEDIUM] Fix type casting hack in `displayCompletionSummary()` - properly handle partial completion display without `as unknown as number` [src/orchestrator.ts:1797-1803]
- [x] [AI-Review][LOW] Add completion timestamp to state (optional enhancement from Task 4.4) [src/orchestrator.ts]

## Dev Notes

### Architecture Pattern to Follow

This story completes the dev-only workflow by adding the celebration and summary at the end. Key patterns:

1. **Stats Calculation:** Use git commands to gather file change statistics
   ```typescript
   // Get files changed across all commits in this session
   const firstCommitTime = // from state or session start
   const diffStat = await execGitCommand(['diff', '--stat', firstCommitTime]);
   // Parse to extract file count
   ```

2. **Duration Formatting:** Human-readable time formatting
   ```typescript
   function formatDuration(minutes: number): string {
     if (minutes < 60) return `${minutes}m`;
     const hours = Math.floor(minutes / 60);
     const mins = minutes % 60;
     return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
   }
   ```

3. **Completion Detection:** Check against total stories for epic
   ```typescript
   function checkEpicCompletion(state: State, totalStories: number): boolean {
     return state.stories.completed.length === totalStories;
   }
   ```

### Existing Functions to Reuse

From `src/ui/celebration.ts`:
```typescript
// Already implemented in Story 3-8
displayCelebration(stats: CelebrationStats): void
// Displays: 🎉 Epic Complete! {stories} stories · {files} files · {duration}
```

From `src/git/commit.ts`:
```typescript
// Git command execution pattern
import { execSync } from 'child_process';
```

From `src/config.ts`:
```typescript
// State management
saveState(cwd: string, state: State): Promise<void>
```

### Critical Implementation Rules

From project-context.md and architecture:

1. **ESM imports:** Always use `.js` extensions in imports
   ```typescript
   import { displayCelebration } from './ui/celebration.js';
   ```

2. **No Bun-specific APIs:** Use Node.js APIs only

3. **State persistence:** ALWAYS save state at completion
   ```typescript
   await saveState(cwd, state);
   ```

4. **Exit codes:** Success = 0, Error = 1
   ```typescript
   process.exit(0); // Normal completion
   ```

### Completion Flow

```
┌─────────────────────────────────────────────────────────────┐
│  runDevOnlyImplementationLoop                               │
│  For each story:                                            │
│    - Dev → Review → Commit                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  After last story committed                                 │
│  Check: Is this the final story?                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  calculateSessionStats()                                    │
│  - Count completed stories                                  │
│  - Get file count from git                                  │
│  - Calculate duration                                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  displayCompletionSummary()                                 │
│  - displayCelebration(stats)                                │
│  - List skipped stories (if any)                            │
│  - Display "Session complete" message                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Final state save                                           │
│  - saveState()                                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Exit with code 0                                           │
└─────────────────────────────────────────────────────────────┘
```

### Display Format Reference

Celebration (all stories completed):
```
🎉 Epic Complete! 8 stories · 47 files · 3h 42m
```

Celebration (some skipped):
```
🎉 Epic Complete! 6/8 stories · 32 files · 2h 15m

Skipped stories (manual intervention needed):
  - 5-4-complex-validation: Complex validation logic
  - 5-7-edge-case: Edge case handling
```

Session complete:
```
Session complete. Total time: 3h 42m
```

Already complete (on resume):
```
Epic already complete. Start a new epic or clear state to re-run.
```

### Previous Story Learnings (Stories 5-1 through 5-5)

From Story 5-5 Review Follow-ups:
- State saving should happen BEFORE throwing non-retryable errors
- Error messages must include "Try:" recovery guidance
- Function signatures should have explicit return types
- Tests need proper async/await handling and mocking
- Integration with existing code requires careful state management

From Story 5-1 through 5-4:
- Dev-only workflow structure is established
- State tracking for stories.completed is working
- UI components are available and tested
- Git commit integration is functional

### Integration with Existing Code

The completion logic integrates at the end of `runDevOnlyImplementationLoop()`:

```typescript
// In runDevOnlyImplementationLoop:
for (let i = startIndex; i < stories.length; i++) {
  // ... existing implementation loop ...

  // After successful commit
  state.stories.completed.push(story.id);
  state.workflow.currentStoryIndex = i + 1;
  await saveState(cwd, state);

  // Check if this was the last story (NEW - Story 5-6)
  if (i === stories.length - 1) {
    // All stories processed - show completion
    const stats = calculateSessionStats(state, stories);
    displayCompletionSummary(stats, skippedStories);
    console.log(`Session complete. Total time: ${stats.duration}`);
    process.exit(0);
  }
}
```

Also add completion check at start of `runDevOnlyWorkflow()`:

```typescript
export async function runDevOnlyWorkflow(
  cwd: string,
  state: State,
  args: CliArgs
): Promise<void> {
  // Check if epic already complete (NEW - Story 5-6)
  const stories = await getAllStoriesForEpic(cwd, state.currentEpic);
  const completedCount = state.stories.completed.length;

  if (completedCount === stories.length && stories.length > 0) {
    console.log('Epic already complete. Start a new epic or clear state to re-run.');
    process.exit(0);
  }

  // ... rest of existing workflow ...
}
```

### Project Structure Notes

- Code changes primarily in `src/orchestrator.ts`
- Test file: `src/orchestrator.test.ts` (co-located)
- Reuse existing `displayCelebration()` from `src/ui/celebration.ts`
- Git operations use Node.js `child_process` module

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.6] - Story definition and acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#ARCH-4] - UI Component System
- [Source: src/ui/celebration.ts:1-58] - displayCelebration function
- [Source: src/orchestrator.ts:1731-1768] - runDevOnlyImplementationLoop integration point
- [Source: src/config.ts:1-100] - State management patterns

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

N/A

### Completion Notes List

1. Implemented `checkEpicCompletion()` function in `src/orchestrator.ts` (lines ~1660-1680)
   - Returns true when all stories are completed
   - Handles edge case when totalStories is 0
   - Simple comparison of completed.length against totalStories

2. Implemented `calculateSessionStats()` function in `src/orchestrator.ts` (lines ~1682-1750)
   - Calculates completed story count and total stories
   - Uses git diff --stat to count changed files
   - Formats duration using existing getSessionElapsedMs() from timer utility
   - Identifies skipped stories by comparing completed list against all stories

3. Implemented `displayCompletionSummary()` function in `src/orchestrator.ts` (lines ~1752-1820)
   - Displays celebration block with stats
   - Handles partial completion (X/Y stories) when stories were skipped
   - Lists skipped stories with their titles

4. Integrated completion detection at start of `runDevOnlyWorkflow()` (lines ~2050-2060)
   - Checks if epic is already complete before starting
   - Displays message and exits with code 0 if complete

5. Integrated completion into `runDevOnlyImplementationLoop()` (lines ~1950-1970)
   - Detects when last story is processed
   - Calculates stats and displays celebration
   - Exits with code 0 on successful completion

6. Added comprehensive unit tests in `src/orchestrator.test.ts` (Story 5-6 describe block)
   - 10 tests covering all completion scenarios
   - Tests for checkEpicCompletion, calculateSessionStats, and displayCompletionSummary
   - Tests for duration formatting and skipped stories detection

7. **Review Follow-ups Completed:**
   - Fixed file count calculation in `calculateSessionStats()` - now uses `git log --since` to count files changed across all commits in the session, with fallback to `git diff --name-only` if git log fails
   - Extracted `countFilesChangedSince()` function for better testability and added unit tests
   - Fixed type casting hack in `displayCompletionSummary()` - updated `CelebrationStats.stories` type to accept `number | string` in `src/ui/celebration.ts`
   - Added optional `completedAt` timestamp to State interface in `src/types.ts` and set it when epic completes

### File List

- `src/orchestrator.ts` - Added completion detection, stats calculation, and celebration display functions; extracted `countFilesChangedSince()` for better testability; fixed file count calculation to use git log
- `src/orchestrator.test.ts` - Added comprehensive unit tests for Story 5-6; added tests for `countFilesChangedSince()`
- `src/ui/celebration.ts` - Updated `CelebrationStats.stories` type from `number` to `number | string` to support partial completion display (e.g., "6/8")
- `src/types.ts` - Added optional `completedAt?: string` field to State interface for tracking epic completion time
