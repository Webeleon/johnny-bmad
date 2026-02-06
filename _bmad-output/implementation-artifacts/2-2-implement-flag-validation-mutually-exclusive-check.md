# Story 2.2: Implement Flag Validation (Mutually Exclusive Check)

Status: review

## Story

As a developer using johnny-bmad,
I want clear error messages when I use conflicting flags,
So that I understand I can't use --batch and --dev-only together.

## Acceptance Criteria

1. **Given** the CLI argument parser
   **When** I run `johnny-bmad --batch --dev-only`
   **Then** the system displays: "[ERROR] Cannot use --batch and --dev-only together"
   **And** displays: "Try: Use --batch to create stories, then --dev-only to implement"
   **And** exits with code 1

2. **Given** the CLI argument parser
   **When** I run `johnny-bmad --batch`
   **Then** validation passes (no conflict)

3. **Given** the CLI argument parser
   **When** I run `johnny-bmad --dev-only`
   **Then** validation passes (no conflict)

4. **Given** the `--yolo` flag
   **When** I run `johnny-bmad --batch --yolo`
   **Then** validation passes (yolo can combine with batch)

5. **Given** the `--yolo` flag
   **When** I run `johnny-bmad --dev-only --yolo`
   **Then** validation passes (yolo can combine with dev-only)

**FRs:** FR4

## Tasks / Subtasks

- [x] Task 1: Add `validateFlags()` function to `src/index.ts` (AC: #1)
  - [x] 1.1: Create `validateFlags(args: CliArgs): void` function that checks `args.batch && args.devOnly`
  - [x] 1.2: Use `formatErrorWithRecovery` pattern: display `[ERROR] Cannot use --batch and --dev-only together` and `Try: Use --batch to create stories, then --dev-only to implement`
  - [x] 1.3: Call `process.exit(1)` after displaying the error
  - [x] 1.4: Export `validateFlags` with `@internal Exported for testing only` docstring

- [x] Task 2: Wire `validateFlags()` into `main()` (AC: #1, #2, #3, #4, #5)
  - [x] 2.1: Call `validateFlags(args)` in `main()` after `parseArgs()` and before the `args.help` check
  - [x] 2.2: Ensure valid flag combinations (batch-only, dev-only-only, batch+yolo, dev-only+yolo) pass through without error

- [x] Task 3: Add comprehensive unit tests for `validateFlags()` (AC: All) — 11 new tests (9 validateFlags unit + 2 main integration)
  - [x] 3.1: Add `validateFlags` to the import statement in `src/index.test.ts`
  - [x] 3.2: Test `--batch --dev-only` → displays error message and calls `process.exit(1)` (AC: #1)
  - [x] 3.3: Test `-b -d` short flags → same error behavior (AC: #1)
  - [x] 3.4: Test `--batch` alone → no error, no exit (AC: #2)
  - [x] 3.5: Test `--dev-only` alone → no error, no exit (AC: #3)
  - [x] 3.6: Test `--batch --yolo` → no error (AC: #4)
  - [x] 3.7: Test `--dev-only --yolo` → no error (AC: #5)
  - [x] 3.8: Test no flags → no error (default/sequential path)
  - [x] 3.9: Test all flags together `--batch --dev-only --yolo` → error (mutual exclusion takes priority)
  - [x] 3.10: Test error message format matches exact strings from AC#1

- [x] Task 4: Verify TypeScript compilation and test coverage (AC: All)
  - [x] 4.1: Run `bunx tsc --noEmit` to verify no new strict type errors
  - [x] 4.2: Run `bun test` to ensure all tests pass (baseline: 217 tests from Story 2.1)
  - [x] 4.3: Run `bun test --coverage` to verify 90%+ coverage for modified files
  - [x] 4.4: Verify existing tests continue to pass (no regressions)

### Review Follow-ups (AI) — Rounds 2-20 (All Resolved)

**Summary:** Story underwent 20 review rounds with 66 total findings (all resolved). **Implementation:** TDD red-green-refactor cycle followed, 11 new tests added (9 validateFlags unit + 2 main integration), all 5 ACs satisfied, 228 tests pass (up from 217 baseline), new code 100% covered, TypeScript compilation clean. **Documentation:** Story bloat reduced from ~430 lines through aggressive consolidation, line references reconciled, test counts corrected, obsolete sections removed. **Round 20 resolutions:** Happy-path tests now use explicit process.exit spy assertions, architecture doc "Round 15" reference fixed to "Story 2.2", architectural seam (validateFlags exit vs determineMode throw) documented in Dev Notes. **Deferred backlog items for future stories:** Test suite restructuring needed (validateFlags/main describe nesting under 'Argument Parsing' is semantically incorrect, pre-existing from Story 2.1), pre-existing coverage gap resolution (lines 7-17, 200, 219, 221-223, 226-228 in src/index.ts not introduced by this story).

## Dev Notes

### Architecture Compliance

This is Story 2.2 in Epic 2 (CLI Flags & Workflow Router). It adds the mutually exclusive flag validation that sits between flag parsing (Story 2.1, complete) and mode determination (Story 2.3, next).

**Key Architecture References:**
- ARCH-5: Workflow Router - `determineMode()` throws on `args.batch && args.devOnly` [Source: architecture/core-architectural-decisions.md#workflow-routing-architecture]
- FR4: Developer can combine any mode with `--yolo` to skip approval gates
- Error Message Pattern: `[ERROR] ... Try: ...` format is mandatory [Source: architecture/implementation-patterns-consistency-rules.md#error-message-format]

**Error Message Format Deviation (Intentional):**
The `validateFlags()` error message uses `[ERROR] Cannot use --batch and --dev-only together` without the colon-separated `[ERROR] {type}: {description}` pattern used elsewhere in index.ts. This deviation is intentional and matches AC#1's exact specification. The simpler format improves readability for this specific CLI validation error.

**Backlog Item:** Architecture docs need formal exemption for CLI validation errors from the `{error_type}: {description}` pattern (tracked since Round 15, deferred to future story to avoid scope creep). Reference: `implementation-patterns-consistency-rules.md:220-226`.

**Architecture Decision:**
The architecture spec shows the validation inside `determineMode()`:
```typescript
function determineMode(args: CliArgs): WorkflowMode {
  if (args.batch && args.devOnly) {
    throw new Error('Cannot use --batch and --dev-only together');
  }
  // ...
}
```

However, `determineMode()` is Story 2.3's scope. For this story, a dedicated `validateFlags()` function was implemented and called in `main()` BEFORE workflow execution, providing early-exit validation that prevents confusing downstream errors.

**Architectural Seam - Exit vs Throw:**
`validateFlags()` uses `process.exit(1)` for CLI validation (user-facing error), while `determineMode()` (Story 2.3) will use `throw new Error(...)` for programmatic error handling. This is intentional:
- `validateFlags()` runs in `main()` CLI context → direct exit appropriate for invalid user input
- `determineMode()` may be called programmatically → throwing allows caller to handle errors
- Story 2.3 guidance: DO NOT duplicate the batch+devOnly check in determineMode() - validateFlags already runs first in main() at line 191, before any mode determination logic
- The architecture spec (core-architectural-decisions.md:309-312) documents the validation conceptually within determineMode's responsibility, but the implementation correctly separates concerns by validating flags early in main()

### Previous Story Intelligence (Story 2.1)

**Key Learnings:**
- All spy-using tests MUST use try/finally pattern for cleanup
- 217 tests currently passing across the project (baseline, pre-Story 2.2)
- `parseArgs()`, `showHelp()`, `main()` are all exported with `@internal` docstrings
- Pre-existing TypeScript errors exist in `src/agents/reviewer.ts:51` and `src/utils/user-input.test.ts:12,22,32` - NOT from this story
- Round 9 open items from Story 2.1 are NOT blockers for this story
- `batch` and `devOnly` are required boolean fields (not optional) in CliArgs - always initialized to `false`
- Story 2.1 already has a test that `parseArgs(['--batch', '--dev-only'])` correctly sets both to `true` (line 177-181 in index.test.ts) - this is the input that Story 2.2's validation will reject

### Git Intelligence

**Most Recent Commit:**
```
71a1c78 feat(2-1-add-batch-and-dev-only-flag-parsing): 2-1-add-batch-and-dev-only-flag-parsing
```

**Files Modified in Story 2.1:**
- `src/types.ts` - Added `batch: boolean` and `devOnly: boolean` to CliArgs (lines 80-81)
- `src/index.ts` - Added flag parsing, showHelp updates, exported parseArgs/showHelp/main
- `src/index.test.ts` - 24 new tests (20 parseArgs + 3 showHelp + 1 main integration)
- `README.md` and `docs/index.html` - Documentation sync for new flags

**Patterns Established:**
- Commit format: `feat(STORY-ID): description`
- Export functions with `@internal Exported for testing only` docstring
- Test structure: `describe('index.ts - Argument Parsing', () => { describe('functionName()', () => { ... }) })`
- Spy cleanup with try/finally blocks

### Technical Requirements

**Files to Modify:**
- `src/index.ts` - Add `validateFlags()` function (~10-15 lines), add call in `main()` (~1 line)
- `src/index.test.ts` - Add `validateFlags()` test suite (~60-80 lines)

**No New Files.** All changes go in existing files.

**No New Dependencies.** Uses existing `CliArgs` interface and `console.error`/`process.exit`.

### Project Structure Notes

- `src/index.ts:187-233` - `main()` function where `validateFlags()` call is wired at line 191
- `src/index.ts:145-181` - `formatErrorWithRecovery()` for reference on error formatting pattern
- `src/index.test.ts` - Test file (507 total lines per Read tool, 506 per wc -l) with validateFlags tests added
- `src/types.ts:74-82` - `CliArgs` interface (already includes `batch` and `devOnly` fields)

### Anti-Pattern Prevention

**DO NOT:**
- Add `validateFlags()` inside `parseArgs()` - keep parsing and validation separate
- Throw an error from `validateFlags()` and catch it in `main()` - directly print and exit for CLI validation
- Add `determineMode()` routing in this story - that's Story 2.3
- Modify the CliArgs interface - it's already complete from Story 2.1
- Add new flags or change existing flag behavior
- Use `Bun.spawn()` or Bun-specific APIs

**DO:**
- Create a clean `validateFlags(args: CliArgs): void` function
- Use `console.error()` for error output (not `console.log()`)
- Include exact error message from AC#1: `[ERROR] Cannot use --batch and --dev-only together`
- Include exact recovery text: `Try: Use --batch to create stories, then --dev-only to implement`
- Export with `@internal` docstring for testing
- Call `process.exit(1)` after error output
- Place `validateFlags()` call in `main()` before `args.help` check
- Follow exact error block format from implementation patterns: `[ERROR]` prefix + `Try:` recovery

### Testing Strategy

**Test File:** `src/index.test.ts` (extend existing, DO NOT create new file)

**New Test Suite Structure:**

```typescript
describe('validateFlags()', () => {
  test('should exit with error when --batch and --dev-only used together', () => {
    const errorSpy = spyOn(console, 'error');
    const exitSpy = spyOn(process, 'exit').mockImplementation((() => {}) as any);
    try {
      validateFlags({ resume: false, help: false, verbose: false, yolo: false, batch: true, devOnly: true });
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy.mock.calls.flat().join(' ')).toContain('Cannot use --batch and --dev-only together');
    } finally {
      errorSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });

  test('should not exit when only --batch is set', () => {
    const exitSpy = spyOn(process, 'exit').mockImplementation((() => {}) as any);
    try {
      validateFlags({ resume: false, help: false, verbose: false, yolo: false, batch: true, devOnly: false });
      expect(exitSpy).not.toHaveBeenCalled();
    } finally {
      exitSpy.mockRestore();
    }
  });

  // ... more tests per AC
});
```

### Cross-Story Dependencies

**Prerequisites (COMPLETE):**
- Story 2.1: `--batch` and `--dev-only` flag parsing (adds `batch` and `devOnly` to CliArgs, exports parseArgs)

**Enables:**
- Story 2.3: `determineMode()` routing logic - can rely on flags being validated before reaching mode determination
- Story 2.4: Help text update - may reference mutual exclusion in help examples

### FRs Covered

- **FR4**: Developer can combine any mode with `--yolo` to skip approval gates (validates yolo is NOT mutually exclusive with batch/dev-only)

### References

- [Source: architecture/core-architectural-decisions.md#workflow-routing-architecture] - `determineMode()` throws on `batch && devOnly`
- [Source: architecture/implementation-patterns-consistency-rules.md#error-message-format] - Error block format with `[ERROR]` + `Try:`
- [Source: epics.md#story-22-implement-flag-validation-mutually-exclusive-check] - Story requirements and ACs
- [Source: src/index.ts:187-231] - `main()` function with validateFlags wired at line 191
- [Source: src/index.ts:145-181] - `formatErrorWithRecovery()` error formatting reference
- [Source: src/index.test.ts] - Test file (507 total lines per Read tool, 506 per wc -l) with comprehensive validateFlags test coverage
- [Source: src/types.ts:74-82] - `CliArgs` interface with `batch` and `devOnly` fields
- [Source: project-context.md#critical-implementation-rules] - ESM .js extensions, cross-runtime compatibility, test co-location
- [Source: 2-1-add-batch-and-dev-only-flag-parsing.md] - Previous story learnings (10 review rounds, 217 tests)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Completion Notes

✅ **All Tasks Complete** - Implemented `validateFlags()` function with mutual exclusion check for `--batch` and `--dev-only` flags. Added 11 new tests (9 validateFlags unit + 2 main integration). Followed TDD red-green-refactor cycle. Final test count: 228 tests pass (up from 217, includes 1 pre-existing help test). TypeScript compilation clean. New code 100% covered.

**Review Iterations Summary:** Story underwent 20 review rounds (66 total findings) - all resolved. Key improvements: Integration tests added, error test hardening, code comments removed, documentation accuracy fixed, story bloat reduced through consolidation, test count reconciliation, architecture doc CLI error format exemption added, happy-path tests enhanced with explicit assertions.

**Final Status (Round 20 Complete):**
- All 5 Round 20 review findings resolved (3 MEDIUM, 2 LOW)
- All tests pass: 228 tests (0 failures, 11 new tests added this story + 1 pre-existing help test)
- TypeScript compilation: No new errors (pre-existing errors unchanged)
- Implementation quality: All ACs satisfied, validateFlags function fully tested (100% coverage)
- **Code improvements:** Happy-path tests now use explicit process.exit spy assertions
- **Documentation improvements:** Architecture seam guidance enhanced for Story 2.3, architecture doc "Round 15" reference fixed to "Story 2.2", review history consolidated
- Story status: Updated to "review" and ready for final acceptance
- **Deferred backlog items:** Test suite restructuring (test describe nesting is pre-existing from Story 2.1), pre-existing coverage gap resolution

### File List

- `src/index.ts` - Added `validateFlags()` function (lines 80-90, includes docstring), wired into `main()` (line 191)
- `src/index.test.ts` - Added `validateFlags` to imports (line 2), added 11 new tests (9 validateFlags unit + 2 main integration) with comprehensive error and happy-path coverage; Round 20: enhanced 5 happy-path tests with explicit process.exit spy assertions (lines 345-368)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story 2-2 status: ready-for-dev → in-progress → review (line 15)
- `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md` - Added CLI error format exemption note (line 228); Round 20: fixed "Round 15" reference to "Story 2.2"
- `_bmad-output/implementation-artifacts/2-2-implement-flag-validation-mutually-exclusive-check.md` - Updated with Round 20 review resolutions, consolidated review history (Rounds 2-20), enhanced architectural seam documentation

## Change Log

- **2026-02-06**: Addressed code review Round 20 findings - 5 items resolved (3 MEDIUM, 2 LOW). Happy-path tests now include explicit process.exit spy assertions with expect(exitSpy).not.toHaveBeenCalled(). Architecture doc "Round 15" reference fixed to "Story 2.2". Architectural seam (validateFlags exit vs determineMode throw) enhanced with explicit guidance for Story 2.3. Review history consolidated (Rounds 2-20 summary). Test suite restructuring deferred as backlog item. All tests pass: 228 (no change). Story marked as "review" and ready for final acceptance.
- **2026-02-06**: Code review Round 20 - 5 findings (3 MEDIUM, 2 LOW) added as action items. All ACs verified IMPLEMENTED. 228 tests pass. New code 100% covered. No code bugs found. Findings are: story bloat, test describe nesting (pre-existing), architecture seam documentation gap, implicit happy-path test assertions, architecture doc internal review reference. Story status set to in-progress pending action item resolution.
- **2026-02-06**: Addressed code review Round 19 findings - 3 MEDIUM items resolved: (1) Consolidated all review sections (Rounds 2-19) into single 3-line summary (saved 81 lines, file reduced from 351 to 270 lines), (2) Added CLI error format exemption to architecture doc (implementation-patterns-consistency-rules.md line 227), (3) Documented test nesting backlog item in consolidated review summary. All implementation quality verified: 228 tests pass, all 5 ACs satisfied, new code 100% covered. Story marked as "review" and ready for final acceptance.
- **2026-02-06**: Code review Round 19 - 3 MEDIUM findings added as action items. All are recurring process observations (story bloat, architecture doc gap, test nesting) previously acknowledged and deferred. Implementation verified correct: all 5 ACs satisfied, 228 tests pass, new code 100% covered. Story status set to in-progress pending action item resolution.
- **2026-02-06**: Addressed code review Round 18 findings - 4 items resolved (3 MEDIUM, 1 LOW). Corrected test count from "12 tests" to "11 new tests" throughout story. Documented architectural seam (validateFlags uses process.exit, determineMode will use throw). Added backlog item note for architecture doc exemption. All documentation-level items. No code changes required. 228 tests pass, all ACs satisfied, new code 100% covered. Story ready for final acceptance.
- **2026-02-06**: Addressed code review Round 17 findings - 6 items resolved (3 MEDIUM, 3 LOW). All items were non-blocking documentation/process observations or future backlog items. No code changes required. Verified implementation correctness: 228 tests pass, all ACs satisfied, new code 100% covered. Story marked as "review" and ready for final acceptance. Backlog items documented for future stories: architecture doc update, test restructuring, pre-existing coverage gap.
- **2026-02-06**: Code review Round 17 - 6 new findings (3 MEDIUM, 3 LOW) added as action items. All findings are documentation/process-level; no code issues found. Implementation is correct and all ACs verified against git diff. 228 tests pass.
- **2026-02-06**: Addressed code review Round 16 findings - 6 items resolved (3 MEDIUM, 3 LOW). Test count reconciliation: corrected all references from "11 tests" to "12 tests" (9 validateFlags unit + 3 main integration). Updated main() line range from 187-231 to 187-233. Documented architecture and test structure issues as future backlog items. 228 tests pass (unchanged). Story marked as "review" and ready for final acceptance.
- **2026-02-06**: Addressed code review Round 15 findings - 6 items resolved (3 MEDIUM, 3 LOW). Aggressively consolidated Dev Agent Record (saved ~100 lines), removed obsolete "CRITICAL: What Already Exists" planning section, cleaned File List annotations. Story reduced from 430 to ~310 lines. 228 tests pass (unchanged). Story marked as "review" and ready for final acceptance.
- **2026-02-06**: Rounds 2-14 - 46 review findings resolved across 13 rounds (code quality improvements: integration tests added, error test hardening, comment removal; documentation quality: ~300 lines bloat removed, 15+ stale line references fixed, all sections reconciled).
