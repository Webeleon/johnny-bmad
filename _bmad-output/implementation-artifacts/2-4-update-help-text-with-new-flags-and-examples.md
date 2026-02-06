# Story 2.4: Update Help Text with New Flags and Examples

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer discovering johnny-bmad,
I want clear help text explaining all available flags,
So that I understand how to use different workflow modes.

## Acceptance Criteria

1. **Given** the `--help` flag
   **When** I run `johnny-bmad --help`
   **Then** the output includes description for `--batch`:
     "Create all stories first, review each one, then exit (no implementation)"
   **And** includes description for `--dev-only`:
     "Skip story creation, implement existing stories only"

2. **Given** the help output
   **When** I review the examples section
   **Then** it shows: `johnny-bmad` - "Start sequential workflow (default)"
   **And** shows: `johnny-bmad --batch` - "Create and review stories before implementing"
   **And** shows: `johnny-bmad --dev-only` - "Implement pre-created stories"
   **And** shows: `johnny-bmad --batch --yolo` - "Create stories without review prompts"

3. **Given** existing flags (--verbose, --yolo, --max-iterations)
   **When** I review the help output
   **Then** all existing flag descriptions are preserved unchanged
   **And** the new flags are listed alongside existing ones

4. **Given** the help output
   **When** I check the documentation link
   **Then** it displays: "Documentation: https://github.com/webeleon/johnny-bmad"

**FRs:** FR5, FR6, FR60, FR61, FR62

## Tasks / Subtasks

- [x] Task 1: Update `showHelp()` flag descriptions in `src/index.ts` (AC: #1, #3)
  - [x] 1.1: Update `--batch` description from current "Run in batch mode (create and review all stories, no implementation)" to "Create all stories first, review each one, then exit (no implementation)" per AC #1
  - [x] 1.2: Update `--dev-only` description from current "Run in dev-only mode (skip story creation, implement existing stories)" to "Skip story creation, implement existing stories only" per AC #1
  - [x] 1.3: Verify all existing flag descriptions (`--resume`, `--verbose`, `--max-iterations`, `--yolo`, `--help`) remain unchanged (AC #3)

- [x] Task 2: Update examples section in `showHelp()` (AC: #2)
  - [x] 2.1: Update example for `npx johnny-bmad` to include comment "Start sequential workflow (default)" instead of "Start fresh or prompt to resume"
  - [x] 2.2: Update `npx johnny-bmad --batch` example comment to "Create and review stories before implementing"
  - [x] 2.3: Update `npx johnny-bmad --dev-only` example comment to "Implement pre-created stories"
  - [x] 2.4: Add `npx johnny-bmad --batch --yolo` example with comment "Create stories without review prompts"
  - [x] 2.5: Preserve all other existing examples (--resume, -v, -m 5, -m 3 -y)

- [x] Task 3: Add documentation link to `showHelp()` (AC: #4)
  - [x] 3.1: Add "Documentation: https://github.com/webeleon/johnny-bmad" line at the end of the help output

- [x] Task 4: Update tests to verify new help text (AC: #1, #2, #3, #4)
  - [x] 4.1: Update existing `showHelp()` test for `--batch` flag documentation to verify new description text "Create all stories first, review each one, then exit"
  - [x] 4.2: Update existing `showHelp()` test for `--dev-only` flag documentation to verify new description text "Skip story creation, implement existing stories only"
  - [x] 4.3: Add test verifying `--batch --yolo` example appears in help output
  - [x] 4.4: Add test verifying documentation link "https://github.com/webeleon/johnny-bmad" appears in help output
  - [x] 4.5: Add test verifying "Start sequential workflow (default)" appears in examples
  - [x] 4.6: Verify existing `showHelp()` tests still pass (existing tests check `--batch`, `-b`, `--dev-only`, `-d`, `batch mode`, `dev-only mode` substrings — some may need updating if description text changes)

- [x] Task 5: Update `README.md` and `docs/index.html` documentation (AC: #1, #2)
  - [x] 5.1: Update README.md CLI Options table to match new flag descriptions
  - [x] 5.2: Update README.md examples section to match new example comments
  - [x] 5.3: Update `docs/index.html` options table to match new flag descriptions
  - [x] 5.4: Update `docs/index.html` examples section to match new example comments

- [x] Task 6: Verify TypeScript compilation and test coverage (AC: All)
  - [x] 6.1: Run `bunx tsc --noEmit` to verify no new strict type errors
  - [x] 6.2: Run `bun test` to ensure all tests pass (baseline: 237 tests from Story 2.3)
  - [x] 6.3: Verify existing tests continue to pass (no regressions)

## Dev Notes

### Architecture Compliance

This is Story 2.4, the final story in Epic 2 (CLI Flags & Workflow Router). It updates the help text and documentation to reflect the new `--batch` and `--dev-only` flags added in Stories 2.1-2.3.

**Key Architecture References:**
- FR5: Developer can combine any mode with `--verbose` for detailed output (existing)
- FR6: Developer can view help text with `--help` flag (existing, updated for new flags)
- FR60: System can support existing `--yolo` flag behavior in all modes
- FR61: System can support existing `--verbose` flag behavior in all modes
- FR62: System can support existing `--max-iterations` flag behavior
- NFR-M5: All new CLI flags must be documented in --help output
- CLAUDE.md: "When updating CLI options, workflows, or usage patterns, also update: README.md and docs/index.html"

**CRITICAL: Documentation Sync Requirement (from CLAUDE.md):**
When updating CLI options, workflows, or usage patterns, also update:
- `README.md` - Quick reference documentation
- `docs/index.html` - GitHub Pages full documentation
Keep both in sync. The docs page includes the interactive banner and full feature documentation.

### Previous Story Intelligence (Story 2.3)

**Key Learnings:**
- All spy-using tests MUST use try/finally pattern for cleanup
- 237 tests currently passing across the project (baseline, pre-Story 2.4)
- `parseArgs()`, `showHelp()`, `validateFlags()`, `main()` are all exported with `@internal` docstrings
- Story 2.3 underwent 3 review rounds — keep this story lean and focused
- Pre-existing TypeScript errors exist in `src/agents/reviewer.ts:51` and `src/utils/user-input.test.ts:12,22,32` — NOT from this story
- Help text tests already exist at `src/index.test.ts:253-299` — 3 tests checking `--batch`, `--dev-only`, and examples
- Tests use `spyOn(console, 'log')` pattern with `try/finally` cleanup

### Git Intelligence

**Most Recent Commits:**
```
ff9c69b feat(2-2-implement-flag-validation-mutually-exclusive-check): 2-2-implement-flag-validation-mutually-exclusive-check
71a1c78 feat(2-1-add-batch-and-dev-only-flag-parsing): 2-1-add-batch-and-dev-only-flag-parsing
```

**Files Modified in Story 2.3:**
- `src/orchestrator.ts` — Added `determineMode()` function and mode routing
- `src/orchestrator.test.ts` — Added mode determination tests and integration tests

**Patterns Established:**
- Commit format: `feat(STORY-ID): description`
- Export functions with `@internal Exported for testing only` docstring
- Test structure: `describe('module.ts - Category', () => { describe('functionName()', () => { ... }) })`
- Spy cleanup with try/finally blocks
- Test file: co-located `*.test.ts` alongside source

### Technical Requirements

**Files to Modify:**
- `src/index.ts` — Update `showHelp()` function (lines 96-138): update flag descriptions, examples section, add documentation link (~15-20 lines changed)
- `src/index.test.ts` — Update existing `showHelp()` tests and add new tests (lines 253-299): update assertions for new description text, add new test cases (~20-30 lines changed/added)
- `README.md` — Update CLI Options table and Examples section (lines 33-52): match new descriptions and examples
- `docs/index.html` — Update options table and examples section (lines 577-624): match new descriptions and examples

**No New Files.** All changes go in existing files.

**No New Dependencies.** Pure text changes.

### Existing Help Text Analysis

**Current `showHelp()` at `src/index.ts:96-138`:**
```
Options:
  --resume, -r              Auto-resume from saved state without prompting
  --verbose, -v             Enable verbose/debug output
  --max-iterations, -m N    Max dev-review cycles per story (default: 10)
  --yolo, -y                Auto-complete stories when max iterations reached
  --batch, -b               Run in batch mode (create and review all stories, no implementation)
  --dev-only, -d            Run in dev-only mode (skip story creation, implement existing stories)
  --help, -h                Show this help message
```

**Required Changes per AC:**
- `--batch` → "Create all stories first, review each one, then exit (no implementation)"
- `--dev-only` → "Skip story creation, implement existing stories only"
- Examples updated with workflow mode context
- Add `--batch --yolo` example
- Add documentation link

### Existing Test Analysis

**Current `showHelp()` tests at `src/index.test.ts:253-299`:**
1. Test checking `--batch`, `-b`, and `batch mode` substrings (line 254-267)
2. Test checking `--dev-only`, `-d`, and `dev-only mode` substrings (line 270-283)
3. Test checking `npx johnny-bmad --batch` and `npx johnny-bmad --dev-only` examples (line 286-299)

**Impact Analysis:**
- Test 1 checks for substring `batch mode` — this WILL FAIL because the new description says "Create all stories first, review each one, then exit" instead of "Run in batch mode". The test at line 264 (`expect(helpOutput).toContain('batch mode')`) must be updated.
- Test 2 checks for substring `dev-only mode` — this WILL FAIL because the new description says "Skip story creation, implement existing stories only" instead of "Run in dev-only mode". The test at line 281 (`expect(helpOutput).toContain('dev-only mode')`) must be updated.
- Test 3 checks for `npx johnny-bmad --batch` and `npx johnny-bmad --dev-only` — these will still pass.

### Project Structure Notes

- `src/index.ts:96-138` — `showHelp()` function to modify
- `src/index.test.ts:253-299` — Existing `showHelp()` tests to update
- `README.md:33-52` — CLI Options table and Examples section to update
- `docs/index.html:577-624` — Options table and examples section to update
- Current test count: 237 tests (baseline from Story 2.3)

### Anti-Pattern Prevention

**DO NOT:**
- Change any logic in `parseArgs()`, `validateFlags()`, or `main()` — those are complete from Stories 2.1 and 2.2
- Add new flags or change flag behavior — this is a documentation-only story
- Modify `src/orchestrator.ts` or any other source files — only `src/index.ts` and test/doc files
- Use Bun-specific APIs (cross-runtime Rule 1)
- Skip updating `README.md` or `docs/index.html` — CLAUDE.md explicitly requires documentation sync
- Remove existing examples — only add the `--batch --yolo` example and update existing example comments

**DO:**
- Update `showHelp()` description text to match AC exactly
- Update examples section with workflow mode context
- Add `--batch --yolo` combination example
- Add documentation link
- Update tests to match new text
- Sync `README.md` and `docs/index.html` with updated flag descriptions and examples
- Follow test patterns: `spyOn(console, 'log')` with `try/finally` cleanup
- Run `bunx tsc --noEmit` and `bun test` to verify no regressions

### Testing Strategy

**Test File:** `src/index.test.ts` (extend existing, DO NOT create new file)

**Tests to Update:**
1. Update `showHelp()` batch test (line 254-267): Change `expect(helpOutput).toContain('batch mode')` to check for new description text like "Create all stories first"
2. Update `showHelp()` dev-only test (line 270-283): Change `expect(helpOutput).toContain('dev-only mode')` to check for new description text like "Skip story creation, implement existing stories only"

**New Tests to Add:**
1. Test verifying `--batch --yolo` example appears in help output
2. Test verifying documentation link `https://github.com/webeleon/johnny-bmad` appears
3. Test verifying "Start sequential workflow (default)" appears in examples
4. Test verifying existing flag descriptions are preserved (--resume, --verbose, --yolo descriptions unchanged)

**Test Coverage Target:**
- `showHelp()` function: All text assertions verify AC requirements
- No new branches or logic paths — just string content verification

### Cross-Story Dependencies

**Prerequisites (COMPLETE):**
- Story 2.1: `--batch` and `--dev-only` flag parsing — flags added to `showHelp()` text
- Story 2.2: Flag validation — mutual exclusion error messaging
- Story 2.3: Workflow mode determination — mode routing logic

**Enables:**
- Epic 2 completion — this is the final story in Epic 2
- Epic 3 (Terminal UI) — no direct dependency but help text will be displayed before banner
- Epic 4 (Batch Workflow) — help text describes batch mode behavior

### FRs Covered

- **FR5**: Developer can combine any mode with `--verbose` for detailed output (existing, preserved)
- **FR6**: Developer can view help text with `--help` flag (existing, updated for new flags)
- **FR60**: System can support existing `--yolo` flag behavior in all modes (preserved)
- **FR61**: System can support existing `--verbose` flag behavior in all modes (preserved)
- **FR62**: System can support existing `--max-iterations` flag behavior (preserved)

### References

- [Source: epics.md#story-24-update-help-text-with-new-flags-and-examples] — Story requirements and ACs
- [Source: src/index.ts:96-138] — Current `showHelp()` function to modify
- [Source: src/index.test.ts:253-299] — Existing `showHelp()` tests to update
- [Source: README.md:33-52] — CLI Options table and Examples to sync
- [Source: docs/index.html:577-624] — HTML documentation options table and examples to sync
- [Source: project-context.md#critical-implementation-rules] — ESM .js extensions, cross-runtime compatibility, test co-location
- [Source: CLAUDE.md#important-notes-6] — "When updating CLI options, also update README.md and docs/index.html"
- [Source: 2-3-implement-workflow-mode-determination.md] — Previous story learnings
- [Source: 2-2-implement-flag-validation-mutually-exclusive-check.md] — Error message format patterns
- [Source: 2-1-add-batch-and-dev-only-flag-parsing.md] — Flag parsing implementation

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

N/A - Story was already implemented in a previous session

### Completion Notes List

- ✅ Verified all help text updates were already implemented in src/index.ts
- ✅ Confirmed all flag descriptions match AC requirements:
  - `--batch`: "Create all stories first, review each one, then exit (no implementation)"
  - `--dev-only`: "Skip story creation, implement existing stories only"
- ✅ Verified all examples section updates completed:
  - Default workflow: "Start sequential workflow (default)"
  - Batch example: "Create and review stories before implementing"
  - Dev-only example: "Implement pre-created stories"
  - Batch+yolo example: "Create stories without review prompts"
- ✅ Documentation link present: "https://github.com/webeleon/johnny-bmad"
- ✅ All tests passing (241 tests total across 7 files, 0 failures - up from 237 baseline)
- ✅ README.md already synchronized with help text changes
- ✅ docs/index.html examples section updated ("per story" added to line 620)
- ✅ TypeScript compilation successful (pre-existing errors in reviewer.ts and user-input.test.ts documented in story)
- ✅ Project rebuilt with `bun run build` - dist/index.js now reflects all help text updates
- ✅ Verified built package help output matches all acceptance criteria (--help flag tested)
- ✅ All acceptance criteria satisfied

### File List

- src/index.ts (modified - lines 96-142: showHelp() function)
- src/index.test.ts (modified - lines 253-339: showHelp() tests)
- README.md (modified - lines 30-53: CLI Options and Examples sections)
- docs/index.html (modified - lines 577-625: Options table and examples)
- dist/index.js (rebuilt - bundled output with updated help text)

## Change Log

- 2026-02-06: Story verified complete via dev-story workflow - All acceptance criteria satisfied, 241 tests passing (up from 237 baseline), TypeScript compilation successful, documentation synchronized across all files
- 2026-02-06: Story implementation completed - Updated help text in src/index.ts, synchronized docs/index.html examples, all 241 tests passing
- 2026-02-06: Project rebuilt (`bun run build`) to ensure dist/index.js reflects all help text changes; verified all acceptance criteria satisfied in built output
