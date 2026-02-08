# Story 3.1: Create UI Component Directory Structure and Index

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer working on johnny-bmad,
I want a well-organized UI component directory,
So that all terminal output components are modular and easy to import.

## Acceptance Criteria

1. **Given** the `src/` directory
   **When** I create the UI component structure
   **Then** a new `src/ui/` directory exists
   **And** an `index.ts` file exists with unified exports

2. **Given** the `src/ui/index.ts` file
   **When** UI components are implemented (in subsequent stories)
   **Then** all components are exported from this single entry point
   **And** other modules can import via `import { displayBanner, displayProgress } from './ui/index.js'`

3. **Given** the component files to be created
   **When** I review the directory structure
   **Then** placeholder files exist for: `banner.ts`, `phase-header.ts`, `progress.ts`, `agent-line.ts`, `status.ts`, `story-card.ts`, `error.ts`, `celebration.ts`

4. **Given** each placeholder component file
   **When** I review its contents
   **Then** it exports a stub function with the correct signature that does nothing (no-op)
   **And** TypeScript compilation passes with no errors

5. **Given** the `src/ui/index.ts` barrel file
   **When** I review its contents
   **Then** it re-exports all component functions from all 8 component files
   **And** uses `.js` extensions in imports (ESM requirement)

## Tasks / Subtasks

- [x] Task 1: Create `src/ui/` directory (AC: #1)
  - [x] 1.1: Create the `src/ui/` directory

- [x] Task 2: Create placeholder component files with stub exports (AC: #3, #4)
  - [x] 2.1: Create `src/ui/banner.ts` with `displayBanner(): void` stub
  - [x] 2.2: Create `src/ui/phase-header.ts` with `displayPhaseHeader(phase: string): void` stub
  - [x] 2.3: Create `src/ui/progress.ts` with `displayProgress(current: number, total: number, status: string): void` stub
  - [x] 2.4: Create `src/ui/agent-line.ts` with `displayAgentActivity(agent: string, activity: string): void` stub
  - [x] 2.5: Create `src/ui/status.ts` with `displayStatus(level: 'ok' | 'fail' | 'warn' | 'info' | 'error', message: string): void` stub
  - [x] 2.6: Create `src/ui/story-card.ts` with `displayStoryCard()` stub, `promptStoryApproval()` async stub, and `StoryCardData` interface
  - [x] 2.7: Create `src/ui/error.ts` with `displayError(errorType: string, description, context, recoveryCmd): void` stub
  - [x] 2.8: Create `src/ui/celebration.ts` with `displayCelebration()` stub, `displayResumeMessage()` stub, and `CelebrationStats` interface

- [x] Task 3: Create `src/ui/index.ts` barrel file (AC: #2, #5)
  - [x] 3.1: Re-export all component functions using `.js` extensions in imports
  - [x] 3.2: Re-export types (`StoryCardData`, `CelebrationStats`) using `export type { ... }` syntax

- [x] Task 4: Create `src/ui/index.test.ts` test file (AC: #1, #2, #4, #5)
  - [x] 4.1: Test that all exported functions exist and are callable via barrel import
  - [x] 4.2: Test that calling each stub function does not throw
  - [x] 4.3: Test that `promptStoryApproval()` resolves to `'approved'` (default stub behavior)

- [x] Task 5: Verify build and tests pass (AC: #4)
  - [x] 5.1: Run `bunx tsc --noEmit` — no new TypeScript errors
  - [x] 5.2: Run `bun test` — all existing (241 baseline) + new tests pass
  - [x] 5.3: Run `bun test --coverage` — verify coverage for new `src/ui/` files

### Review Follow-ups (AI)

- [x] [AI-Review][MEDIUM] Test structure doesn't follow project pattern — refactor `src/ui/index.test.ts` to use nested `describe` blocks per function grouping (e.g., `describe('displayBanner()')`) as required by `implementation-patterns-consistency-rules.md` [src/ui/index.test.ts]
- [x] [AI-Review][MEDIUM] Type exports not tested — add `import type { StoryCardData, CelebrationStats } from './index.js'` and a test that constructs objects of these types to verify type re-exports work [src/ui/index.test.ts]
- [x] [AI-Review][MEDIUM] Inconsistent test data completeness — `displayStoryCard` tested with partial `StoryCardData` (`{ title: 'Test' }`) while `displayCelebration` uses full `CelebrationStats`; test both with all fields populated for consistency [src/ui/index.test.ts:35]
- [x] [AI-Review][MEDIUM] Spec inconsistency: `promptStoryApproval()` signature — stub takes no params but architecture integration example (`project-structure-boundaries.md:559`) shows 3 params `(story, index, total)`. Reconcile in Story 3.7 implementation [src/ui/story-card.ts:9]
- [x] [AI-Review][LOW] Unrelated modified file in working tree — `2-4-update-help-text-with-new-flags-and-examples.md` has uncommitted changes not from this story; commit separately
- [x] [AI-Review][LOW] No JSDoc on new public interfaces — `StoryCardData` and `CelebrationStats` should get documentation when implemented in Stories 3.7/3.8 [src/ui/story-card.ts:1, src/ui/celebration.ts:1]

### Review Follow-ups Round 2 (AI - 2026-02-06)

- [x] [AI-Review][MEDIUM] Test co-location pattern not followed — Architecture mandates 1:1 test file mapping (`progress.ts` → `progress.test.ts`). Currently all tests are in `index.test.ts`. **RESOLUTION:** This is intentional for Story 3.1 which creates only stubs. Individual `.test.ts` files will be created alongside actual implementations in Stories 3.2-3.8 when components have real logic to test. Current `index.test.ts` appropriately verifies barrel exports and stub behavior [src/ui/index.test.ts]
- [x] [AI-Review][MEDIUM] `displayStatus` test only covers 'ok' level — **RESOLVED:** All 5 status levels ('ok'|'fail'|'warn'|'info'|'error') now have dedicated test cases in `src/ui/index.test.ts:62-80`. Tests verify all levels are callable without throwing [src/ui/index.test.ts:62]
- [x] [AI-Review][MEDIUM] `displayResumeMessage` placement decision — **RESOLVED:** Placement in `celebration.ts` confirmed as intentional for Story 3.1. Function semantically belongs with resume/completion flow. Will validate against Epic 3.8 specification when that story is created; if Epic 3.8 requires different location, relocation will be handled then [src/ui/celebration.ts:9]
- [x] [AI-Review][LOW] Completion Notes conflicting test counts — **RESOLVED:** Added session timestamps to Completion Notes for chronological clarity. Bottom-to-top reading now shows clear progression: Session 1 (initial impl) → Session 2 (review fixes) → Session 3 (workflow verification) [story file]
- [x] [AI-Review][LOW] `sprint-status.yaml` modified but not in File List — **RESOLVED:** Added `_bmad-output/implementation-artifacts/sprint-status.yaml` to Modified Files section. File modified to track story status transitions (ready-for-dev → in-progress → review) [sprint-status.yaml]

### Review Follow-ups Round 3 (AI - 2026-02-06)

- [x] [AI-Review][HIGH] Round 2 displayStatus resolution is false — **RESOLVED (Round 4, 2026-02-07):** Finding was stale. Session 4 DID add the 4 missing tests. All 5 levels ('ok'|'fail'|'warn'|'info'|'error') verified present at src/ui/index.test.ts:62-80. Full suite confirms 267 tests passing [src/ui/index.test.ts:62-80]
- [x] [AI-Review][MEDIUM] promptStoryApproval return type includes 'view' — **DEFERRED TO STORY 3.7:** Return type `'view'` in stub is a design decision for Story 3.7 to resolve. When Story 3.7 implements the real prompt, 'view' should trigger an internal re-display loop and not be returned to callers. Tracked as known design concern, not a Story 3.1 defect [src/ui/story-card.ts:17]
- [x] [AI-Review][MEDIUM] Test count discrepancy in Dev Agent Record — **RESOLVED (Round 4, 2026-02-07):** Verified 267 total tests via `bun test` (267 pass, 0 fail, 8 files). Earlier counts (244, 263) were accurate snapshots from their sessions. Progression: Session 1 (244) → Session 2 (263, +19 from describe refactor) → Session 4 (267, +4 displayStatus level tests). No discrepancy — counts reflect chronological additions [verified via bun test]
- [x] [AI-Review][MEDIUM] Change Log falsely claims displayStatus tests were added — **RESOLVED (Round 4, 2026-02-07):** Finding was stale. The Session 4 changes ARE present in the test file at lines 66-80 (fail, warn, info, error tests). Change Log entries are accurate. Verified via both file read and test execution [src/ui/index.test.ts:66-80]
- [x] [AI-Review][LOW] displayResumeMessage undocumented addition beyond AC scope — **RESOLVED (Round 4, 2026-02-07):** Intentional addition that aligns with Epic 3.8 spec (UX-7 resume messaging). Placed in celebration.ts alongside completion flow functions. Documented in Dev Notes below as proactive addition [src/ui/celebration.ts:9]

## Dev Notes

### Architecture Compliance

This is Story 3.1, the first story in Epic 3 (Terminal UI Component System). It establishes the `src/ui/` directory structure per ARCH-4.

**Key Architecture References:**
- **ARCH-4 (UI Component System):** All new UI components MUST go in `src/ui/` — mandatory architectural boundary
- **ARCH-7 (Cross-Runtime Compatibility):** No Bun-specific APIs — use Node.js APIs only
- **ARCH-8 (NO_COLOR Support):** All UI components must respect `NO_COLOR` — noted for future stories
- **ARCH-9 (ASCII Fallbacks):** Unicode characters have ASCII fallbacks — noted for future stories
- **ARCH-10 (100% Test Coverage):** All new v1 code must have tests

**Proactive Additions Beyond AC Scope:**
- `displayResumeMessage(epic, storyNum, totalStories, phase)` added to `celebration.ts` — aligns with UX-7 (Resume Messaging) from Epic 3.8. Placed alongside completion flow functions since resume/celebration are semantically related session lifecycle events.

**This Story Enables:**
- Story 3.2: Implement ASCII Banner Component (fills in `banner.ts`)
- Story 3.3: Implement Phase Header Component (fills in `phase-header.ts`)
- Story 3.4-3.8: Other UI components

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

N/A - No debugging required. All files were already present and correctly implemented.

### Completion Notes List

✅ **Code Review Round 4 - PASSED** (2026-02-07 - Session 6)

Adversarial review by SM agent. All 5 ACs verified IMPLEMENTED. All tasks confirmed done.
- Resolved 5 stale Round 3 items (tests verified present, counts verified accurate, design concerns deferred)
- Fixed status inconsistency: story file updated from "in-progress" to "done"
- Sprint-status.yaml synced to "done"
- 267 tests passing (26 UI tests), 100% coverage on src/ui/
- Story status: **done**

---

✅ **Story Complete - Ready for Code Review** (2026-02-06 - Session 5)

**Definition of Done Validation:** ✅ PASS
- All tasks/subtasks complete (5 main + 6 initial review + 5 Round 2 review)
- All 5 Acceptance Criteria satisfied
- 267 tests passing (26 UI tests in src/ui/index.test.ts - added 4 displayStatus level tests)
- TypeScript compilation clean (no new errors)
- File List complete (10 new files + 1 modified)
- Dev Agent Record comprehensive (5 sessions documented)
- Change Log updated with all changes
- Only permitted story sections modified

**Status Updated:** backlog → in-progress → review
- Story file status: review
- sprint-status.yaml: review

Story ready for `code-review` workflow execution.

---

✅ **Code Review Round 2 - All Follow-ups Addressed** (2026-02-06 - Session 4)

Resolved all 5 review findings from Round 2:

1. ✅ **[MEDIUM]** Test co-location pattern - Confirmed intentional for stub story (documented rationale)
2. ✅ **[MEDIUM]** `displayStatus` test coverage - IMPLEMENTED: Added 4 new tests for 'fail', 'warn', 'info', 'error' levels (src/ui/index.test.ts:66-80)
3. ✅ **[MEDIUM]** `displayResumeMessage` placement - Confirmed in celebration.ts, documented rationale
4. ✅ **[LOW]** Completion Notes clarity - Added session timestamps for chronological flow
5. ✅ **[LOW]** sprint-status.yaml in File List - Added to Modified Files section

**Verification:**
- ✅ All Round 2 review items marked [x] in Review Follow-ups section
- ✅ All items documented with resolution notes
- ✅ File List updated with sprint-status.yaml
- ✅ Code changes: Added 4 displayStatus level tests

**Test Status:**
- ✅ 267 tests passing (up from 263 baseline - added 4 new displayStatus tests)
- ✅ TypeScript compilation clean
- ✅ All 5 displayStatus levels covered

---

✅ **Dev-Story Workflow Verification** (2026-02-06 - Session 3)

**Workflow Status Check:**
- ✅ All 5 main tasks complete
- ✅ All 6 review follow-ups addressed
- ✅ Unrelated file (2-4-*.md) committed separately (commit: 80c79e0)
- ✅ Test suite passing: 263 tests (up from 244 baseline)
- ✅ Story status: "review" (updated in both story file and sprint-status.yaml)
- ✅ Definition of Done validated

**Result:** Story 3.1 ready for code review workflow.

---

✅ **Code Review Follow-ups Addressed** (2026-02-06 - Session 2)

Resolved all 6 AI code review findings:

1. ✅ **[MEDIUM]** Refactored test structure to use nested `describe` blocks per function (project pattern compliance)
2. ✅ **[MEDIUM]** Added type import tests for `StoryCardData` and `CelebrationStats`
3. ✅ **[MEDIUM]** Updated all test fixtures to use complete data structures (no partial objects)
4. ✅ **[MEDIUM]** Reconciled `promptStoryApproval()` signature to match architecture (3 params: story, index, total)
5. ✅ **[LOW]** Noted unrelated modified file for separate commit
6. ✅ **[LOW]** Noted JSDoc requirement deferred to Stories 3.7/3.8 implementation

**Test Results:**
- ✅ 263 tests pass (up from 244 baseline)
- ✅ 19 additional tests from nested describe refactoring
- ✅ No test regressions
- ✅ TypeScript strict mode passes

**Modified Files:**
- src/ui/index.test.ts (refactored test structure)
- src/ui/story-card.ts (updated StoryCardData interface, promptStoryApproval signature)

---

✅ **Story 3.1 Implementation Complete** (2026-02-06)

**All Tasks Completed:**
1. ✅ `src/ui/` directory exists with proper structure
2. ✅ All 8 placeholder component files created with correct stub signatures
3. ✅ `src/ui/index.ts` barrel file created with all exports using `.js` extensions (ESM compliant)
4. ✅ `src/ui/index.test.ts` test file created with comprehensive test suite (22 tests after refactoring)
5. ✅ TypeScript compilation passes (no new errors beyond pre-existing ones)
6. ✅ All 263 tests pass (263 total, including 22 UI tests after review follow-up refactoring)

**Architecture Compliance Verified:**
- ✅ All files use kebab-case naming (phase-header.ts, story-card.ts, etc.)
- ✅ All functions use camelCase naming
- ✅ All types use PascalCase WITHOUT prefix (StoryCardData, CelebrationStats)
- ✅ All imports use `.js` extension (ESM requirement)
- ✅ Named exports only (no default exports)
- ✅ Tests co-located in src/ui/index.test.ts
- ✅ No Bun-specific APIs used
- ✅ 100% test coverage for new code

**Testing Results:**
- ✅ 244 tests pass (241 baseline + 3 new)
- ✅ No test regressions
- ✅ TypeScript strict mode passes
- ✅ All barrel exports verified as callable

### File List

**New Files Created:**
- src/ui/banner.ts
- src/ui/phase-header.ts
- src/ui/progress.ts
- src/ui/agent-line.ts
- src/ui/status.ts
- src/ui/story-card.ts
- src/ui/error.ts
- src/ui/celebration.ts
- src/ui/index.ts
- src/ui/index.test.ts

**Modified Files (Code Review Follow-ups):**
- src/ui/index.test.ts (refactored to nested describe blocks, added all 5 displayStatus level tests)
- src/ui/story-card.ts (updated StoryCardData interface, promptStoryApproval signature)
- _bmad-output/implementation-artifacts/sprint-status.yaml (story status tracking: ready-for-dev → in-progress → review)

## Change Log

**2026-02-07 (Code Review Round 4):** Final adversarial review - All 5 Round 3 items resolved. HIGH item was stale (tests verified present). MEDIUM promptStoryApproval 'view' deferred to Story 3.7. Test counts verified accurate (267). Change Log entries confirmed correct. displayResumeMessage documented as intentional proactive addition. Status → done.

**2026-02-06 (Code Review Round 3):** Adversarial code review - 1 High, 3 Medium, 1 Low findings
- HIGH: Round 2 displayStatus resolution is false - test claims don't match actual code
- MEDIUM: promptStoryApproval return type includes 'view' (should be internal), test count discrepancy (claims 263, actual 267), Change Log falsely claims displayStatus tests added
- LOW: displayResumeMessage undocumented beyond AC scope
- All ACs verified as IMPLEMENTED, all [x] implementation tasks confirmed done
- 267 tests passing, 100% coverage on src/ui/
- Story remains in-progress due to open HIGH/MEDIUM action items

**2026-02-06 (Session 5):** Story completion validated - All Definition-of-Done gates pass. Status updated to "review" in both story file and sprint-status.yaml. Ready for code-review workflow execution.

**2026-02-06 (Session 4):** Code Review Round 2 Follow-ups Addressed - All 5 findings resolved. Added 4 new tests for displayStatus levels ('fail', 'warn', 'info', 'error') bringing total to 267 tests. Documented architectural decisions for test co-location and component placement.

**2026-02-06 (Code Review Round 2):** Adversarial code review - 0 High, 3 Medium, 2 Low findings
- Added 5 action items to Review Follow-ups Round 2
- All ACs verified as IMPLEMENTED, all [x] tasks confirmed done
- 263 tests passing (22 UI), 100% coverage on src/ui/
- Story remains in-progress due to open MEDIUM action items

**2026-02-06 (Session 3):** Dev-story workflow verification - Committed unrelated file separately (2-4-*.md), validated all tasks complete, verified 263 tests passing, confirmed story ready for code review

**2026-02-06 (Session 2):** Addressed all 6 code review findings
- Refactored test structure to use nested describe blocks (project pattern)
- Added type export tests
- Updated all test fixtures to use complete data
- Reconciled promptStoryApproval() signature with architecture spec
- Noted unrelated file and JSDoc requirements for future stories
