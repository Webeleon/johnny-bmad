# Story 5.5: Implement Dev/Review Loop and Commit Flow

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer running dev-only mode,
I want the dev/review loop to iterate until success or max attempts,
So that code quality issues are fixed automatically before committing.

## Acceptance Criteria

1. **Given** a review fails (REVIEW_FAILED)
   **When** iterations are below max (default 3)
   **Then** it displays: `[WARN] Review failed. Iteration 2/3...`
   **And** re-invokes the Dev agent with review feedback
   **And** re-invokes the Reviewer agent after Dev completes

2. **Given** a review fails
   **When** max iterations reached
   **Then** it displays:
   ```
   [WARN] Max iterations (3) reached for STORY-XXX
          Manual intervention required
   ```
   **And** prompts: `[S] Skip story  [R] Retry  [A] Abort`

3. **Given** user selects 'S' (Skip)
   **When** skip is processed
   **Then** the story is marked as skipped (not completed)
   **And** proceeds to next story

4. **Given** user selects 'A' (Abort)
   **When** abort is processed
   **Then** state is saved
   **And** exits with code 1

5. **Given** a review passes (REVIEW_PASSED)
   **When** the review completes
   **Then** it displays: `[OK] Review passed`

6. **Given** review passes and `--yolo` flag is set
   **When** commit flow begins
   **Then** changes are committed automatically
   **And** commit message follows format: `feat(STORY-XXX): [story title]`

7. **Given** review passes and `--yolo` flag is NOT set
   **When** commit flow begins
   **Then** it prompts: `Commit changes? [Y/n]`
   **And** waits for user confirmation

8. **Given** a successful commit
   **When** the commit completes
   **Then** it displays: `[OK] Committed: feat(STORY-XXX): [title]`
   **And** `state.stories.completed` adds the story ID
   **And** `state.workflow.currentStoryIndex` increments
   **And** state is saved
   **And** proceeds to next story

## Tasks / Subtasks

- [x] Task 1: Implement dev/review iteration loop (AC: 1, 2)
  - [x] 1.1 Create `runDevReviewIteration()` function in orchestrator.ts
  - [x] 1.2 Accept parameters: `cwd`, `story`, `storyFilePath`, `state`, `currentStoryNum`, `totalStories`, `args`
  - [x] 1.3 Loop while `state.workflow.devReviewIteration < maxIterations`
  - [x] 1.4 On REVIEW_FAILED: increment iteration, display `[WARN] Review failed. Iteration N/max...`
  - [x] 1.5 Re-invoke Dev agent with review feedback (pass previous review output to agent)
  - [x] 1.6 Re-invoke Reviewer agent after Dev completes
  - [x] 1.7 On max iterations reached: display warning and prompt for action

- [x] Task 2: Implement max iterations user prompt (AC: 2, 3, 4)
  - [x] 2.1 Create `promptMaxIterationsAction()` function in user-input.ts
  - [x] 2.2 Display: `[S] Skip story  [R] Retry  [A] Abort`
  - [x] 2.3 On 'S': mark story as skipped, save state, return 'skipped'
  - [x] 2.4 On 'R': reset `devReviewIteration` to 0, re-run iteration loop
  - [x] 2.5 On 'A': save state, exit with code 1

- [x] Task 3: Implement commit flow (AC: 5, 6, 7, 8)
  - [x] 3.1 Create `runCommitFlow()` function in orchestrator.ts
  - [x] 3.2 Accept parameters: `cwd`, `storyId`, `storyTitle`, `state`, `args`
  - [x] 3.3 If `--yolo`: auto-commit without prompt
  - [x] 3.4 If NOT `--yolo`: prompt `Commit changes? [Y/n]`
  - [x] 3.5 On 'Y' or auto: call `commitStoryChanges()` with format `feat(STORY-XXX): [title]`
  - [x] 3.6 On commit success: display `[OK] Committed: feat(...)`
  - [x] 3.7 Update `state.stories.completed` with story ID
  - [x] 3.8 Increment `state.workflow.currentStoryIndex`
  - [x] 3.9 Save state after successful commit

- [x] Task 4: Integrate into dev-only implementation loop
  - [x] 4.1 Update `runDevOnlyImplementationLoop()` to use new iteration and commit functions
  - [x] 4.2 Call `runDevReviewIteration()` after initial Dev/Reviewer cycle
  - [x] 4.3 Handle 'skipped' return to proceed to next story
  - [x] 4.4 Call `runCommitFlow()` after successful review
  - [x] 4.5 Continue to next story after commit

- [x] Task 5: Write unit tests
  - [x] 5.1 Create tests for `runDevReviewIteration()` success path
  - [x] 5.2 Create tests for iteration loop with multiple failures
  - [x] 5.3 Create tests for max iterations prompt handling
  - [x] 5.4 Create tests for skip story functionality
  - [x] 5.5 Create tests for retry from max iterations
  - [x] 5.6 Create tests for abort from max iterations
  - [x] 5.7 Create tests for commit flow with `--yolo`
  - [x] 5.8 Create tests for commit flow with user prompt
  - [x] 5.9 Create tests for commit message format
  - [x] 5.10 Create tests for state updates after commit

- [x] Review Follow-ups (AI)
  - [x] [AI-Review][MEDIUM] Add story file to git tracking - The story file `5-5-implement-dev-review-loop-and-commit-flow.md` is currently untracked (`??` in git status) and should be added to version control [_bmad-output/implementation-artifacts/5-5-implement-dev-review-loop-and-commit-flow.md]
  - [x] [AI-Review][LOW] Add JSDoc @exits tag to promptMaxIterationsAction - Document the abort action that exits with code 1 in the function's JSDoc [src/utils/user-input.ts:118-136]

## Dev Notes

### Architecture Pattern to Follow

This story integrates the Dev and Reviewer agents into a complete implementation loop with commit flow. Key patterns:

1. **Iteration Tracking:** Use `state.workflow.devReviewIteration` to track retry attempts
   - Reset to 0 on successful review
   - Increment on failed review
   - Compare against `args.maxIterations` (default: 3)

2. **State Persistence:** ALWAYS save state before risky operations and after significant state changes
   - Before spawning Dev agent
   - After review result determination
   - After successful commit

3. **Review Feedback Passing:** Pass previous review output to Dev agent so it knows what to fix
   ```typescript
   // Include review feedback in Dev agent prompt
   const devPrompt = buildDevPrompt(story, previousReviewOutput);
   ```

4. **Commit Message Format:** Follow conventional commits pattern
   ```typescript
   `feat(${storyId}): ${storyTitle}`
   // Example: feat(5-5-implement-dev-review-loop): Implement dev/review loop
   ```

### Existing Functions to Reuse

From `src/orchestrator.ts` (already implemented in Stories 5-3 and 5-4):
```typescript
// Dev agent with retry (Story 5-3)
runDevAgentWithRetry(
  cwd: string,
  storyId: string,
  storyFilePath: string,
  state: State,
  currentStoryNum: number,
  totalStories: number
): Promise<void>

// Reviewer agent with retry (Story 5-4)
runReviewerAgentWithRetry(
  cwd: string,
  storyId: string,
  storyFilePath: string,
  state: State,
  currentStoryNum: number,
  totalStories: number
): Promise<ReviewResult>
```

From `src/git/commit.ts`:
```typescript
// Commit function (already exists)
commitStoryChanges(
  cwd: string,
  storyId: string,
  storyTitle: string
): Promise<void>
```

From `src/utils/user-input.ts`:
```typescript
// Add new function for max iterations prompt
promptMaxIterationsAction(): Promise<'skip' | 'retry' | 'abort'>

// Existing confirmation function
confirmAction(message: string): Promise<boolean>
```

From `src/ui/`:
```typescript
// Already imported in orchestrator.ts
displayAgentActivity(agent: string, message: string)
displayProgress(current: number, total: number, status: string)
displayStatus(level: string, message: string)  // 'ok', 'fail', 'warn'
```

### Critical Implementation Rules

From project-context.md and architecture:

1. **ESM imports:** Always use `.js` extensions in imports
   ```typescript
   import { promptMaxIterationsAction } from './utils/user-input.js';
   ```

2. **No Bun-specific APIs:** Use Node.js APIs only

3. **State persistence:** ALWAYS save state BEFORE risky operations
   ```typescript
   await saveState(cwd, state);
   ```

4. **Error messages:** ALWAYS include "Try:" recovery guidance
   ```typescript
   error('Try: Check git status and resolve conflicts manually');
   ```

### Dev/Review Loop Flow

```
┌─────────────────────────────────────────────────────────────┐
│  runDevOnlyImplementationLoop                               │
│  For each story:                                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Initial Dev Agent                                          │
│  [Dev] Implementing STORY-XXX...                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Initial Reviewer Agent                                     │
│  [Review] Validating STORY-XXX...                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
    ┌──────────────┐       ┌──────────────┐
    │ REVIEW_PASSED│       │ REVIEW_FAILED│
    └──────┬───────┘       └──────┬───────┘
           │                      │
           ▼                      ▼
    ┌──────────────┐       ┌──────────────────────────┐
    │ Commit Flow  │       │ runDevReviewIteration()  │
    │ [OK] Pass    │       │ Loop until pass or max   │
    └──────┬───────┘       └────────────┬─────────────┘
           │                            │
           │              ┌─────────────┴─────────────┐
           │              │                           │
           │              ▼                           ▼
           │      ┌──────────────┐          ┌────────────────┐
           │      │ Iteration <  │          │ Max iterations │
           │      │ max          │          │ reached        │
           │      └──────┬───────┘          └───────┬────────┘
           │             │                          │
           │             ▼                          ▼
           │    ┌──────────────┐          ┌────────────────┐
           │    │ Re-run Dev   │          │ Prompt: S/R/A  │
           │    │ + Reviewer   │          └───────┬────────┘
           │    └──────────────┘                  │
           │                                      ▼
           │                         ┌────────────────────────┐
           │                         │ S: Skip, R: Retry,     │
           │                         │ A: Abort               │
           │                         └────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│  Commit Flow                                                │
│  If --yolo: auto-commit                                     │
│  Else: prompt "Commit changes? [Y/n]"                       │
│  Format: feat(STORY-XXX): [title]                           │
│  [OK] Committed: feat(...)                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Update state                                               │
│  - state.stories.completed.push(storyId)                    │
│  - state.workflow.currentStoryIndex++                       │
│  - saveState()                                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Next story                                                 │
└─────────────────────────────────────────────────────────────┘
```

### Display Format Reference

Iteration warning:
```
[WARN] Review failed. Iteration 2/3...
```

Max iterations reached:
```
[WARN] Max iterations (3) reached for 5-5-implement-dev-review-loop
       Manual intervention required

[S] Skip story  [R] Retry  [A] Abort
```

Review passed:
```
[OK] Review passed
```

Commit prompt (non-yolo):
```
Commit changes? [Y/n]
```

Commit success:
```
[OK] Committed: feat(5-5-implement-dev-review-loop): Implement dev/review loop
```

### Previous Story Learnings (Stories 5-3, 5-4)

From Story 5-3 and 5-4 Review Follow-ups:
- State saving should happen BEFORE throwing non-retryable errors
- Review feedback must be passed to Dev agent on iteration
- JSDoc @exits tag should document process.exit behavior
- Error messages must include "Try:" recovery guidance
- Function signatures should have explicit return types
- Tests need proper async/await handling and mocking
- Double state-save behavior is intentional defensive programming

### Integration with Existing Code

The dev/review loop and commit flow integrate into `runDevOnlyImplementationLoop()`:

```typescript
// In runDevOnlyImplementationLoop:
for (let i = startIndex; i < stories.length; i++) {
  const story = stories[i];
  const currentStoryNum = i + 1;
  const totalStories = stories.length;

  // Display progress
  displayProgress(currentStoryNum, totalStories, 'implementing');

  // Step 1: Run Dev agent with retry
  displayAgentActivity('Dev', `Implementing ${story.id}...`);
  await runDevAgentWithRetry(cwd, story.id, storyFilePath, state, currentStoryNum, totalStories);

  // Step 2: Run Reviewer agent with retry
  displayAgentActivity('Review', `Validating ${story.id}...`);
  const reviewResult = await runReviewerAgentWithRetry(
    cwd, story.id, storyFilePath, state, currentStoryNum, totalStories
  );

  // Step 3: Handle review result (NEW - Story 5-5)
  if (reviewResult.passed) {
    displayStatus('ok', 'Review passed');
    state.workflow.devReviewIteration = 0;
  } else {
    // Run dev/review iteration loop
    const iterationResult = await runDevReviewIteration(
      cwd, story, storyFilePath, state, currentStoryNum, totalStories, args
    );

    if (iterationResult === 'skipped') {
      continue; // Skip to next story
    }
    // If not skipped, iteration succeeded and we can commit
  }

  // Step 4: Commit flow (NEW - Story 5-5)
  const commitSuccess = await runCommitFlow(cwd, story.id, story.title, state, args);
  if (!commitSuccess) {
    // Handle commit failure or user decline
    continue;
  }

  // Step 5: Update state and continue
  state.stories.completed.push(story.id);
  state.workflow.currentStoryIndex = i + 1;
  await saveState(cwd, state);
}
```

### Project Structure Notes

- Code changes primarily in `src/orchestrator.ts`
- New user input function in `src/utils/user-input.ts`
- Test file: `src/orchestrator.test.ts` (co-located)
- Reuse existing `commitStoryChanges()` from `src/git/commit.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.5] - Story definition and acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#ARCH-6] - Retry logic specification
- [Source: src/orchestrator.ts:1138-1263] - runDevAgentWithRetry pattern
- [Source: src/orchestrator.ts:1318-1462] - runReviewerAgentWithRetry pattern
- [Source: src/orchestrator.ts:1491-1550] - runDevOnlyImplementationLoop integration point
- [Source: src/git/commit.ts:1-50] - commitStoryChanges function
- [Source: src/utils/user-input.ts:1-100] - User input patterns

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

N/A - Implementation verified via test suite

### Completion Notes List

1. ✅ Resolved review finding [MEDIUM]: Add story file to git tracking - Staged `_bmad-output/implementation-artifacts/5-5-implement-dev-review-loop-and-commit-flow.md` for commit
2. ✅ Resolved review finding [LOW]: Add JSDoc @exits tag to promptMaxIterationsAction - Added `@exits Process exits with code 1 when user selects 'abort' (handled by caller)` to document the abort action behavior

### Original Implementation Notes

1. ✅ Task 1: Implemented `runDevReviewIteration()` function in orchestrator.ts (lines 1511-1592)
   - Handles dev/review retry cycle when review fails
   - Iterates until review passes, max iterations reached, or user skips
   - Passes review feedback to Dev agent for fixes
   - Saves state before each risky operation

2. ✅ Task 2: Implemented `promptMaxIterationsAction()` function in user-input.ts (lines 118-136)
   - Displays prompt: `[S] Skip story  [R] Retry  [A] Abort`
   - Returns user selection as 'skip', 'retry', or 'abort'
   - Used when max iterations reached

3. ✅ Task 3: Implemented `runCommitFlow()` function in orchestrator.ts (lines 1625-1656)
   - Supports --yolo mode for auto-commit
   - Prompts user with "Commit changes? [Y/n]" in non-yolo mode
   - Calls `commitStoryChanges()` with format `feat(STORY-XXX): [title]`
   - Displays success message on commit

4. ✅ Task 4: Integrated into `runDevOnlyImplementationLoop()` (lines 1731-1768)
   - Calls `runDevReviewIteration()` after initial Dev/Reviewer cycle when review fails
   - Handles 'skipped' return to proceed to next story
   - Calls `runCommitFlow()` after successful review
   - Updates state after commit

5. ✅ Task 5: Comprehensive unit tests (25 tests passing)
   - Tests for runDevReviewIteration success path
   - Tests for iteration loop with multiple failures
   - Tests for max iterations prompt handling
   - Tests for skip, retry, and abort functionality
   - Tests for commit flow with --yolo and user prompt
   - Tests for commit message format
   - Tests for state updates after commit
   - Tests for integration with runDevOnlyImplementationLoop

### File List

- src/orchestrator.ts (modified - added runDevReviewIteration, runCommitFlow, integrated into runDevOnlyImplementationLoop)
- src/utils/user-input.ts (modified - added promptMaxIterationsAction)
- src/orchestrator.test.ts (modified - added 25 comprehensive tests)
