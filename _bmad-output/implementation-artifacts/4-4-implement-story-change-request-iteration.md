# Story 4.4: implement-story-change-request-iteration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer reviewing stories in batch mode,
I want to request changes and have stories regenerated,
So that I can refine stories until they're implementation-ready.

## Acceptance Criteria

1. **Given** user selects 'N' (Request changes)
   **When** the change request flow begins
   **Then** it prompts: `What changes are needed? > `
   **And** waits for user text input

2. **Given** user provides change feedback
   **When** the feedback is captured
   **Then** `state.stories.approvals[storyId]` is set to `'needs-changes'`
   **And** state is saved

3. **Given** a story needs changes
   **When** the Story Creator agent is re-invoked
   **Then** it displays: `[Story] Updating STORY-XXX...`
   **And** the agent prompt includes the user's feedback
   **And** the existing story file is updated (not duplicated)

4. **Given** an updated story
   **When** the story card is re-displayed
   **Then** header shows: `━━━ Review Story N/Total (revised) ━━━`
   **And** the approval prompt is shown again

5. **Given** multiple revision cycles
   **When** user continues requesting changes
   **Then** the iteration continues until user approves
   **And** there is no limit on revision cycles

## Tasks / Subtasks

- [x] Implement change request feedback capture (AC: 1, 2)
  - [x] Add prompt for user feedback when 'N' (needs-changes) selected
  - [x] Capture and store user feedback text
  - [x] Set state.stories.approvals[storyId] to 'needs-changes'
  - [x] Save state with needs-changes status

- [x] Implement Story Creator re-invocation with feedback (AC: 3)
  - [x] Add conditional check for needs-changes status in review loop
  - [x] Display `[Story] Updating STORY-XXX...` message
  - [x] Invoke Story Creator agent with original story path + user feedback
  - [x] Update existing story file (same path, not new file)
  - [x] Handle agent spawn errors with retry logic (existing pattern)

- [x] Implement revision iteration loop (AC: 4, 5)
  - [x] Re-display story card with (revised) indicator after update
  - [x] Re-run approval prompt after story update
  - [x] Continue iteration until user approves (no cycle limit)
  - [x] Handle unlimited revision cycles gracefully

- [x] Integrate with existing review loop (AC: 1-5)
  - [x] Replace placeholder 'needs-changes' handler in runBatchStoryReviewLoop
  - [x] Add while loop for revision iteration within review flow
  - [x] Maintain state saves before/after agent invocations
  - [x] Preserve exit behavior on approval (proceed to next story)

- [x] Add comprehensive test coverage (AC: 1-5)
  - [x] Test change request feedback capture and storage
  - [x] Test Story Creator re-invocation with feedback
  - [x] Test story file update (not duplication)
  - [x] Test revision cycle iteration
  - [x] Test state progression through revision cycles
  - [x] Test error handling during revision (agent failures)

## Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Fix terminal output format mismatch - Epic requires `[Story] Updating STORY-XXX...` but implementation outputs `▸ Updating Story: XXX` via `subHeader()` [src/agents/story-creator.ts:45] [epics.md:1107]

- [x] [AI-Review][MEDIUM] Add retry logic for story updater invocation - Story Dev Notes require "existing retry logic (3 retries, exponential backoff)" but current implementation has no retries [src/agents/story-creator.ts:48] [src/orchestrator.ts:322-330]

- [x] [AI-Review][MEDIUM] Add recovery guidance to error message - Project rules require "Try:" instructions but error message lacks specific recovery steps [src/orchestrator.ts:326] [project-context.md:164]

- [x] [AI-Review][LOW] Add JSDoc to runStoryCreator for consistency - New function has comprehensive JSDoc but existing function lacks same documentation detail [src/agents/story-creator.ts:6-23]

- [ ] [AI-Review][LOW] Inconsistent JSDoc style between runStoryCreator and runStoryUpdater - runStoryCreator mentions "Claude Opus" model but runStoryUpdater does not [src/agents/story-creator.ts:19-36 vs 38-51]

- [ ] [AI-Review][LOW] Remove unused variable `updateSuccess` - Variable is declared and set but never checked since error path already returns early [src/orchestrator.ts:324]

- [ ] [AI-Review][LOW] Remove unused variable `isRevised` - Variable tracks revision state but is never used, revised state already handled by displayStoryCard parameter [src/orchestrator.ts:308]

- [x] [AI-Review][MEDIUM] Add retry logic for story updater invocation - Story Dev Notes require "existing retry logic (3 retries, exponential backoff)" but current implementation has no retries [src/agents/story-creator.ts:48] [src/orchestrator.ts:322-330]

- [x] [AI-Review][MEDIUM] Add recovery guidance to error message - Project rules require "Try:" instructions but error message lacks specific recovery steps [src/orchestrator.ts:326] [project-context.md:164]

- [x] [AI-Review][LOW] Add JSDoc to runStoryCreator for consistency - New function has comprehensive JSDoc but existing function lacks same documentation detail [src/agents/story-creator.ts:6-23]

## Dev Notes

This is the change request iteration feature for Epic 4 (Batch Story Creation Workflow). It implements the ability for users to request changes to stories during the review phase and have the Story Creator agent regenerate them with the requested modifications.

**Key Implementation Points:**

- This story builds on the `runBatchStoryReviewLoop()` function from Story 4-3
- The current 'needs-changes' handler breaks out of the review loop - needs to be replaced with iteration logic
- Story Creator agent must be re-invoked with the original story path AND user feedback
- The existing story file must be updated, not duplicated
- No limit on revision cycles - user iterates until satisfied
- State must be saved before each agent invocation for resume capability

**Critical Context from Previous Stories:**

**From Story 4-3 (Per-Story Review Flow):**
- Review loop exists in `src/orchestrator.ts:178-312` as `runBatchStoryReviewLoop()`
- Current 'needs-changes' handling at lines 318-332 breaks out of review loop
- Approval state tracked in `state.stories.approvals[storyId]`
- Story files located in `_bmad-output/implementation-artifacts/`
- UI component `promptStoryApproval()` returns 'approved', 'needs-changes', or 'view'

**From Story 4-2 (Batch Story Creation Loop):**
- Story Creator agent spawned via `spawnStoryCreatorAgent(cwd, epic, storyNum, prompt)`
- Story Creator prompt template in `src/claude/prompts.ts`
- Story files created with pattern: `{storyKey}.md`
- Agent spawn wrapper returns stdout/stderr for error handling

**From Story 4-1 (Batch Workflow Function Shell):**
- `runBatchWorkflow()` function has phase-based routing
- State workflow phase: 'story-creation' → 'review' → 'completion'
- State saved before each phase transition

**Integration Points:**

**File: `src/orchestrator.ts`**
- Replace 'needs-changes' handler in `runBatchStoryReviewLoop()` (lines 318-332)
- Add revision iteration logic (while loop) within review flow
- Invoke Story Creator agent with feedback parameter
- Update story file in-place (same path)

**File: `src/claude/prompts.ts`**
- Add/modify Story Creator prompt template to accept user feedback
- Feedback should be incorporated as "Revision Request: {user feedback}"

**File: `src/utils/files.ts`**
- Use `loadStory(cwd, storyId)` to load existing story
- Story file path pattern: `{implementationArtifacts}/{storyKey}.md`

**Terminal Output Format:**

```
━━━ Review Story 4/8 ━━━
Title: Implement login form with validation
Tasks: 4 subtasks | Acceptance Criteria: 5 items
? Your choice (Y/n/V)
[N] Request changes
What changes are needed? > Add password complexity requirements

[Story] Updating STORY-004...

━━━ Review Story 4/8 (revised) ━━━
Title: Implement login form with password complexity
Tasks: 5 subtasks | Acceptance Criteria: 6 items
? Your choice (Y/n/V)
[Y] Approve
[OK] Story approved
```

**State Management:**

- Before change request: `state.stories.approvals[storyId] = 'needs-changes'`
- Save state with feedback captured (for future resume capability)
- During Story Creator re-invocation: Save state before agent spawn
- After story update: Re-run approval prompt
- After approval: `state.stories.approvals[storyId] = 'approved'`, proceed to next

**Story Creator Prompt Enhancement:**

The Story Creator agent needs to receive both the original story context and the user's feedback:

```
REVISION REQUEST:
{userFeedback}

Please update the following story with the requested changes:

[Original Story Content]
```

**Critical Implementation Details:**

1. **Change Request Feedback Capture:**
   - When user selects 'N' (needs-changes), prompt: `What changes are needed? > `
   - Use readline or inquirer for multi-line input capability
   - Store feedback in temporary variable for agent invocation
   - Set `state.stories.approvals[storyId] = 'needs-changes'`
   - Save state before proceeding (resume capability)

2. **Story Creator Re-invocation:**
   - Load existing story file content for context
   - Invoke Story Creator agent with revision prompt
   - Pass original story path as target (in-place update)
   - Display `[Story] Updating STORY-XXX...` message
   - Use existing retry logic from story creation phase (3 retries, exponential backoff)

3. **Story File Update:**
   - Story Creator must OVERWRITE the existing file, not create a new one
   - File path: `{implementationArtifacts}/{storyKey}.md` (same as original)
   - No versioning or backup of previous story (simplification for v1)

4. **Revision Iteration Loop:**
   - After story update, re-display story card with `(revised)` indicator
   - Re-run `promptStoryApproval()` for user approval
   - If user approves → proceed to next story
   - If user requests changes again → repeat iteration
   - No limit on cycles - user iterates until satisfied
   - State saved after each iteration

**Error Handling:**

- Story Creator agent failure: Use existing retry logic (3 attempts, exponential backoff)
- All retries exhausted: Display error, save state, exit with guidance
- State save failure: Preserve previous state, display error
- User interruption (Ctrl+C): State already saved before agent spawn

**Testing Approach:**

- Unit test: Change request feedback capture and storage
- Unit test: Story Creator re-invocation with feedback parameter
- Unit test: Story file update (overwrite, not duplicate)
- Unit test: Revision iteration loop (multiple cycles)
- Unit test: State progression through revision cycles
- Integration test: Full change request flow with real agent
- Integration test: Resume from needs-changes state
- Coverage note: Target 90%+ coverage for new revision logic

### Project Structure Notes

- **Primary File:** `src/orchestrator.ts` - Replace 'needs-changes' handler in `runBatchStoryReviewLoop()` with iteration logic
- **Agent Prompts:** `src/claude/prompts.ts` - Add/modify Story Creator prompt template for revision requests
- **UI Components:** Use existing `src/ui/story-card.ts` - Already handles 'needs-changes' response
- **Utilities:** Use existing `src/utils/files.ts` - `loadStory()` for loading existing story
- **Tests:** `src/orchestrator.test.ts` - Add tests for revision iteration logic
- No new files or directories required

### References

- [Source: _bmad-output/planning-artifacts/epics.md#story-44-implement-story-change-request-iteration]
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#workflow-routing-architecture]
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#process-patterns]
- [Source: _bmad-output/implementation-artifacts/4-1-implement-runbatchworkflow-function-shell.md] (Function shell)
- [Source: _bmad-output/implementation-artifacts/4-2-implement-batch-story-creation-loop.md] (Story creation pattern)
- [Source: _bmad-output/implementation-artifacts/4-3-implement-per-story-review-flow.md] (Review flow - current needs-changes handler)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] (UX-2: Per-Story Review Flow)

## Dev Agent Record

### Agent Model Used

- **Dev Agent:** Claude Opus 4.6 (glm-4.7)
- **Implementation Date:** 2026-02-09
- **Development Approach:** Test-Driven Development (Red-Green-Refactor cycle)

### Debug Log References

No critical issues encountered during implementation. The development proceeded smoothly with:
- All 428 tests passing
- Tests added for new functionality before implementation
- Existing tests updated to reflect new behavior

### Completion Notes List

**Implementation Summary:**

1. **Change Request Feedback Capture (AC 1, 2):**
   - The UI component `promptStoryApproval()` already had the feedback capture built in from Story 4-3
   - Modified `runBatchStoryReviewLoop()` to handle the `NeedsChangesResult` type properly
   - State is saved with 'needs-changes' status before Story Creator re-invocation

2. **Story Creator Re-invocation (AC 3):**
   - Added `runStoryUpdater()` function in `src/agents/story-creator.ts`
   - Added `getUpdateStoryPrompt()` function in `src/claude/prompts.ts`
   - Story Creator agent is re-invoked with the original story path and user feedback
   - Displays `[Story] Updating STORY-XXX...` message during update

3. **Revision Iteration Loop (AC 4, 5):**
   - Implemented `while` loop that continues until user approves
   - Story card is re-displayed with `(revised)` indicator after update
   - Approval prompt is re-run after each story update
   - No limit on revision cycles - user iterates until satisfied

4. **Review Loop Integration (AC 1-5):**
   - Replaced placeholder 'needs-changes' handler with full iteration logic
   - State is saved before and after agent invocations for resume capability
   - Exit behavior preserved - proceeds to next story after approval

5. **Test Coverage:**
   - Added 4 new test cases for Story 4-4 functionality
   - Updated 2 existing tests to reflect new behavior
   - All 428 tests passing
   - Coverage includes: feedback capture, story updater invocation, revision cycles, state persistence, and error handling

**Files Modified:**
- `src/orchestrator.ts` - Updated `runBatchStoryReviewLoop()` with revision iteration logic
- `src/agents/story-creator.ts` - Added `runStoryUpdater()` function
- `src/claude/prompts.ts` - Added `getUpdateStoryPrompt()` function
- `src/orchestrator.test.ts` - Added tests for new functionality, updated existing tests

## File List

### Modified Files
- `src/orchestrator.ts` - Updated `runBatchStoryReviewLoop()` with revision iteration logic
- `src/agents/story-creator.ts` - Added `runStoryUpdater()` function
- `src/claude/prompts.ts` - Added `getUpdateStoryPrompt()` function
- `src/orchestrator.test.ts` - Added tests for new functionality, updated existing tests

## Change Log

### 2026-02-09: Code Review Follow-ups Addressed
- ✅ Resolved review finding [HIGH]: Fixed terminal output format to use `[Story] Updating STORY-XXX...` format
- ✅ Resolved review finding [MEDIUM]: Added retry logic for story updater invocation (3 retries, exponential backoff)
- ✅ Resolved review finding [MEDIUM]: Added recovery guidance to error message with "Try:" instructions
- ✅ Resolved review finding [LOW]: Added comprehensive JSDoc to runStoryCreator function for consistency
- All 428 tests passing

**Key Technical Decisions:**
- Used the existing `spawnClaude()` infrastructure for Story Creator re-invocation
- Maintained consistency with existing error handling patterns
- Preserved backward compatibility with state management
- Story updates are done in-place (same file path, not creating new files)

### Review Follow-up Resolution (2026-02-09)

**Code Review Findings Addressed:**
- ✅ **[HIGH] Fixed terminal output format**: Changed `subHeader(`Updating Story: ${storyId}`)` to `info(`[Story] Updating ${storyId}...`)` to match epic specification
- ✅ **[MEDIUM] Added retry logic**: Implemented 3-retry loop with exponential backoff (2s, 4s) for story updater invocation, matching existing error handling patterns
- ✅ **[MEDIUM] Added recovery guidance**: Error message now includes "Try: Address the changes manually or run johnny-bmad again to retry." instructions
- ✅ **[LOW] Added JSDoc to runStoryCreator**: Added comprehensive JSDoc documentation matching the style of runStoryUpdater

**Test Updates:**
- Updated test "should handle error when story updater fails" to verify retry behavior
- Test now checks for 3 retry attempts and proper error logging
- Mocked setTimeout to avoid delays in tests
- All 428 tests passing
