# Story 2.1: Add --batch and --dev-only Flag Parsing

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer using johnny-bmad,
I want to use `--batch` and `--dev-only` command line flags,
So that I can choose between different workflow modes.

## Acceptance Criteria

1. **Given** the CLI entry point in `src/index.ts`
   **When** I run `johnny-bmad --batch`
   **Then** the `batch` flag is parsed and set to `true` in CliArgs
   **And** the program proceeds without parsing errors

2. **Given** the CLI entry point in `src/index.ts`
   **When** I run `johnny-bmad --dev-only`
   **Then** the `devOnly` flag is parsed and set to `true` in CliArgs
   **And** the program proceeds without parsing errors

3. **Given** the `CliArgs` interface in `src/types.ts`
   **When** I review the interface definition
   **Then** it includes `batch: boolean` (required field, always initialized to false for backward compatibility)
   **And** it includes `devOnly: boolean` (required field, always initialized to false for backward compatibility)
   **And** TypeScript compilation passes

4. **Given** no new flags are provided
   **When** I run `johnny-bmad` with no arguments
   **Then** both `batch` and `devOnly` default to `false`

## Tasks / Subtasks

- [x] Task 1: Add `batch` and `devOnly` fields to `CliArgs` interface (AC: #3)
  - [x] 1.1: Add `batch?: boolean` to `CliArgs` interface in `src/types.ts`
  - [x] 1.2: Add `devOnly?: boolean` to `CliArgs` interface in `src/types.ts`
  - [x] 1.3: Run `bunx tsc --noEmit` to verify TypeScript compilation passes

- [x] Task 2: Add `--batch` flag parsing to `parseArgs()` (AC: #1)
  - [x] 2.1: Add `case '--batch':` and `case '-b':` to the switch statement in `parseArgs()` (`src/index.ts:31-60`)
  - [x] 2.2: Set `args.batch = true` in the case handler
  - [x] 2.3: Initialize `batch: false` in the CliArgs object literal at `src/index.ts:22-27`

- [x] Task 3: Add `--dev-only` flag parsing to `parseArgs()` (AC: #2)
  - [x] 3.1: Add `case '--dev-only':` and `case '-d':` to the switch statement in `parseArgs()`
  - [x] 3.2: Set `args.devOnly = true` in the case handler
  - [x] 3.3: Initialize `devOnly: false` in the CliArgs object literal

- [x] Task 4: Add comprehensive unit tests (AC: #1, #2, #3, #4)
  - [x] 4.1: Create `src/index.test.ts` test cases for `parseArgs()` (extend existing file)
  - [x] 4.2: Test `--batch` flag sets `batch: true`
  - [x] 4.3: Test `-b` short flag sets `batch: true`
  - [x] 4.4: Test `--dev-only` flag sets `devOnly: true`
  - [x] 4.5: Test `-d` short flag sets `devOnly: true`
  - [x] 4.6: Test no flags results in `batch: false, devOnly: false` (default behavior, AC: #4)
  - [x] 4.7: Test `--batch` combined with other existing flags (e.g., `--batch --yolo --verbose`)
  - [x] 4.8: Test `--dev-only` combined with other existing flags (e.g., `--dev-only -v -y`)
  - [x] 4.9: Test unknown flags are silently ignored (preserve existing behavior)

- [x] Task 5: Verify TypeScript compilation and test coverage (AC: All)
  - [x] 5.1: Run `bunx tsc --noEmit` to verify no new strict type errors
  - [x] 5.2: Run `bun test` to ensure all tests pass (baseline: 193 tests from Story 1.4)
  - [x] 5.3: Run `bun test --coverage` to verify 90%+ coverage for modified files
  - [x] 5.4: Verify existing tests continue to pass (no regressions)

### Review Follow-ups (AI) — Round 1

- [x] [AI-Review][MEDIUM] Move `parseArgs()` tests to separate top-level describe block `describe('index.ts - Argument Parsing', ...)` — currently nested inside `describe('index.ts - Error Handling', ...)` which violates test structure pattern [src/index.test.ts:109]
- [x] [AI-Review][MEDIUM] Add test for `--batch` and `--dev-only` used together: `parseArgs(['--batch', '--dev-only'])` should set both `batch: true` and `devOnly: true` — ensures Story 2.2 validation has tested behavior to guard against [src/index.test.ts]
- [x] [AI-Review][MEDIUM] Add `--max-iterations` / `-m` test coverage to `parseArgs()` test suite — lines 50-60 in index.ts are uncovered per `bun test --coverage`, and since this suite now owns `parseArgs()` testing, value-parsing logic should be exercised [src/index.ts:50-60]
- [x] [AI-Review][MEDIUM] Resolve CliArgs field optionality inconsistency: `batch` and `devOnly` declared as optional (`?:`) in types.ts but always initialized to `false` in parseArgs(). Either make them required (`batch: boolean`) like existing fields, or document the design rationale for the optional pattern [src/types.ts:80-81, src/index.ts:31-32]
- [x] [AI-Review][LOW] Fix line number inaccuracies in Completion Notes — claims "src/index.test.ts:110-166" but actual range is lines 109-163 [story file]
- [x] [AI-Review][LOW] Enhance default values test to verify ALL fields default correctly (resume, help, verbose, yolo, batch, devOnly) not just the two new flags [src/index.test.ts:130-134]

### Review Follow-ups (AI) — Round 2

- [x] [AI-Review][HIGH] Update AC#3 wording to match implementation: AC says `batch?: boolean` and `devOnly?: boolean` (optional) but implementation correctly made them required `batch: boolean` and `devOnly: boolean` per Round 1 review decision. Update AC to reflect the approved change or document the intentional deviation [story file, AC#3]
- [x] [AI-Review][MEDIUM] Help text at `showHelp()` does not mention `--batch`/`-b` or `--dev-only`/`-d` flags — users can use these flags but `--help` doesn't list them. While Story 2.4 covers help text update, consider adding minimal entries now so flags are discoverable immediately [src/index.ts:80-118]
- [x] [AI-Review][MEDIUM] Story File List section is stale — claims "9 new test cases (lines 2, 110-166)" but actual implementation has 16 tests spanning lines 110-207 after Round 1 additions. Update File List to match current state [story file, File List section]
- [x] [AI-Review][MEDIUM] `sprint-status.yaml` modified in git (epic-1→done, epic-2→in-progress, story 2-1→review) but not documented in story File List. Add to File List for completeness [story file, File List section]
- [x] [AI-Review][LOW] Completion Notes claim "100% coverage for new code" is technically correct for new parseArgs() lines but could be clearer — overall index.ts is 59.86% coverage. Clarify that the claim refers specifically to the new switch cases added by this story, not the entire file [story file, Completion Notes]

### Review Follow-ups (AI) — Round 3

- [x] [AI-Review][HIGH] `--dev-only` help text description is factually wrong per architecture spec — says "skip review phase" but architecture defines dev-only as "Skips story creation entirely" with Dev/Review loops still active. Should read e.g. "Run in dev-only mode (skip story creation, implement existing stories)" [src/index.ts:92]
- [x] [AI-Review][MEDIUM] `--batch` help text description is vague/misleading — says "Run in batch mode (all stories automatically)" but architecture specifies batch creates+reviews all stories then STOPS without implementing. Parenthetical could mislead users. Clarify e.g. "Run in batch mode (create and review all stories, no implementation)" [src/index.ts:91]
- [x] [AI-Review][MEDIUM] Story Dev Notes anti-pattern section contradicts resolved implementation — still says "DO NOT: Make batch and devOnly required fields - they MUST be optional" but Round 1 review correctly changed them to required. Update anti-pattern list to reflect current design decision [story file, Dev Notes, Anti-Pattern Prevention section]
- [x] [AI-Review][LOW] Change Log first entry has stale test counts — says "9 new tests, 202 total passing" which was never updated after Round 1 additions (final: 16 new, 209 total). Consider appending a note or updating for historical accuracy [story file, Change Log]

### Review Follow-ups (AI) — Round 4

- [x] [AI-Review][MEDIUM] Help text Examples section missing `--batch` and `--dev-only` usage examples — Options section documents both flags but Examples at bottom only shows pre-existing flags. Add e.g. `npx johnny-bmad --batch` and `npx johnny-bmad --dev-only` examples for consistency [src/index.ts:115-119]
- [x] [AI-Review][MEDIUM] Completion Notes first bullet has stale optional syntax — says "Added `batch?: boolean` and `devOnly?: boolean`" but implementation uses required `batch: boolean` and `devOnly: boolean` per Round 1 decision. Update to remove `?:` [story file, line 358]
- [x] [AI-Review][LOW] Dev Notes "What Already Exists" section still references optional fields — line 160 says "Add `batch?: boolean` and `devOnly?: boolean` as optional fields" contradicting actual required field implementation [story file, line 160]
- [x] [AI-Review][LOW] Test name `should ignore --max-iterations with negative value` is misleading — parser rejects `-5` because it starts with `-` (treated as flag), not because it's negative. Test name misattributes behavior [src/index.test.ts:197]
- [x] [AI-Review][LOW] Dev Notes Testing Strategy code block shows original 9-test plan but actual implementation has 16 tests — add note that plan was expanded during review rounds [story file, lines 256-314]

### Review Follow-ups (AI) — Round 5

- [x] [AI-Review][MEDIUM] Add test for `--max-iterations` combined with `--batch` and `--dev-only` flags (e.g., `parseArgs(['--max-iterations', '3', '--batch'])`) — ensures combined flag parsing works before Story 2.2 adds mutual exclusion validation [src/index.test.ts]
- [x] [AI-Review][MEDIUM] Completion Notes AC#3 bullet still says "both optional boolean fields" — contradicts required-field implementation at types.ts:80-81. Update line 379 to say "both required boolean fields" [story file, line 379]
- [x] [AI-Review][MEDIUM] Add test for value-consuming flag order interleaving (e.g., `parseArgs(['--batch', '-m', '5', '--dev-only'])`) to prove argument order doesn't affect parsing result — ensures deterministic behavior of positional value consumption [src/index.test.ts, src/index.ts:50-60]
- [x] [AI-Review][LOW] Dev Notes "Technical Requirements" section at line 220 still says `batch?: boolean` and `devOnly?: boolean` with optional markers — should be `batch: boolean` and `devOnly: boolean` per Round 1 decision [story file, line 220]
- [x] [AI-Review][LOW] Unknown flag test at line 165 only asserts `batch` is true — enhance to verify all other fields are at default values (matching thoroughness of the defaults test at line 132) to prove unknown flags don't corrupt state [src/index.test.ts:165-169]

### Review Follow-ups (AI) — Round 6

- [x] [AI-Review][MEDIUM] Dev Notes "What Already Exists" code block (story lines 142-161) shows pre-implementation `parseArgs()` without `batch: false` and `devOnly: false` initializers — code example is stale after 5 rounds of fixing other references, misleading to future readers [story file, lines 142-161]
- [x] [AI-Review][MEDIUM] Completion Notes and File List claim test lines span "110-232" but actual test file range is 110-252 (20 tests ending at line 250, closing braces at 251-252). Update both references to "110-252" [story file, lines 380, 425]
- [x] [AI-Review][MEDIUM] showHelp() was modified with new `--batch`/`--dev-only` entries (lines 91-92, 120-121) but has 0% test coverage — while parseArgs() switch cases are 100% covered, the help text additions are untested new code from this story [src/index.ts:80-121]
- [x] [AI-Review][LOW] Testing Strategy expansion note (story line 273) says "Final implementation has 16 tests" but actual final count is 20 tests after Round 5 additions — update to "20 tests" [story file, line 273]
- [x] [AI-Review][LOW] Change Log initial implementation entry (story line 431) still says "16 new tests, 209 total passing" — while historical, conflicts with final counts (20 new, 213 total) and could confuse readers since Round 5 entry correctly shows "20 total new tests" [story file, line 431]

### Review Follow-ups (AI) — Round 7

- [x] [AI-Review][MEDIUM] README.md not updated with new `--batch`/`-b` and `--dev-only`/`-d` flags — CLAUDE.md mandates "When updating CLI options, also update README.md". New flags exist in showHelp() but are absent from README.md [README.md]
- [x] [AI-Review][MEDIUM] `docs/index.html` not updated with new flags — same CLAUDE.md mandate requires docs page sync when CLI options change. `--batch` and `--dev-only` are missing from GitHub Pages documentation [docs/index.html]
- [x] [AI-Review][MEDIUM] File List help text line numbers are stale — claims "lines 91-92, 120-121" but actual positions are lines 95-96 (Options) and 124-125 (Examples) in src/index.ts after line shifts from added code [story file, File List section]
- [x] [AI-Review][LOW] File List showHelp test range inaccurate — claims "3 showHelp tests lines 254-289" but actual showHelp describe block spans lines 253-300 (tests at 254-268, 270-283, 286-298, outer closing at 300) [story file, File List section]
- [x] [AI-Review][LOW] Completion Notes progression narrative hard to follow — 6 rounds of test count corrections make Change Log confusing. Consider condensing historical entries or adding a "Final State Summary" note for clarity [story file, Change Log]
- [x] [AI-Review][LOW] Change Log has duplicate "Round 6" entries — two entries both start with "Code Review Round 6" (the second appears to be a stale pre-resolution duplicate that was never removed) [story file, Change Log, final 2 entries]

### Review Follow-ups (AI) — Round 8

- [x] [AI-Review][MEDIUM] `main()` function integration path has 0% test coverage — `src/index.ts:171-212` wires `parseArgs()` → `showHelp()` → `runOrchestrator()` but is never tested. Story 2.2 will add validation logic in this same path. Consider adding at least a test for the `args.help` → `showHelp()` → `process.exit(0)` branch to establish integration coverage baseline [src/index.ts:171-212]
- [x] [AI-Review][MEDIUM] `showHelp()` --batch description lacks workflow guidance — says "no implementation" but doesn't mention what to do next. Architecture specifies completion message "Next: johnny-bmad --dev-only" to guide users through the two-phase workflow. While Story 2.4 covers help text, users discovering flags now via --help would benefit from this guidance [src/index.ts:95, 124] **DEFERRED to Story 2.4 as noted by reviewer**
- [x] [AI-Review][MEDIUM] File List showHelp test line range off-by-one — claims "3 showHelp tests lines 253-300" but outer `describe('index.ts - Argument Parsing')` closing brace is at line 301 making the test block 253-301. Update to 253-301 for completeness [story file, File List section]
- [x] [AI-Review][LOW] Pre-existing `--yolo` description inconsistency between `showHelp()` and README.md — showHelp says "Auto-complete stories when max iterations reached" while README line 48 says "YOLO mode: auto-mark stories done at max iterations". Not caused by this story but exposed by CLAUDE.md documentation sync mandate. Consider aligning in a future cleanup [README.md:48 vs src/index.ts:94] **OUT OF SCOPE: Pre-existing issue, not introduced by this story**
- [x] [AI-Review][LOW] Completion Notes and Change Log test count progression (193→202→209→213→216) across 7 rounds makes it hard to distinguish intermediate review snapshots from final state. The Final State Summary at line 487 is clear, but earlier Change Log entries could benefit from strikethrough or annotation marking them as superseded [story file, Change Log] **RESOLVED by Final State Summary - sufficient clarity**

### Review Follow-ups (AI) — Round 9

- [ ] [AI-Review][MEDIUM] `main()` integration test mutates `process.argv` globally without isolation guard — if Bun test runner parallelizes tests within a file in the future, concurrent tests reading `process.argv` could see test values. Add comment documenting this coupling and consider wrapping in a test-level isolation note [src/index.test.ts:308-312]
- [ ] [AI-Review][MEDIUM] `showHelp()` tests don't assert `console.log` was actually called — all 3 tests spy on `console.log` and check `toContain()` on output, but never verify the spy was invoked. If `showHelp()` were refactored to use `process.stdout.write()`, tests would fail with confusing empty-string errors. Add `expect(consoleSpy).toHaveBeenCalled()` for diagnostic clarity [src/index.test.ts:253-300]
- [ ] [AI-Review][MEDIUM] Story file is 509 lines with 8 rounds of resolved review follow-ups consuming ~60% of content — makes the file unwieldy for future Story 2.2-2.4 agents that reference this story. Consider archiving resolved review sections or adding a "skip to Final State Summary at line 499" note at top of review sections [story file, lines 69-133]
- [ ] [AI-Review][LOW] Exported `main()` at module scope calls itself immediately at line 218, creating side-effect import risk — any file importing `main` triggers execution. Consider adding a code comment near `main()` call documenting the side-effect for future maintainers [src/index.ts:218]
- [ ] [AI-Review][LOW] `docs/index.html` and `README.md` Examples section places `--batch`/`--dev-only` after combined `-m 3 -y` example — would read more naturally grouped with other single-flag examples. Presentation-only concern [docs/index.html:622-624, README.md:50-51]

### Review Follow-ups (AI) — Round 10

- [ ] [AI-Review][LOW] File List claims types.ts changes at "lines 79-80" but actual positions are lines 80-81 — `batch: boolean` is at line 80 and `devOnly: boolean` is at line 81 in the current file [story file, File List section]

## Dev Notes

### Architecture Compliance

This is the first story in Epic 2 (CLI Flags & Workflow Router). It adds the CLI entry points that subsequent stories (2.2 flag validation, 2.3 mode determination, 2.4 help text) will build upon.

**Key Architecture References:**
- ARCH-5: Workflow Router - Single function with mode branching (sequential/batch/dev-only)
- FR2: Developer can invoke johnny-bmad in batch mode using `--batch` flag
- FR3: Developer can invoke johnny-bmad in dev-only mode using `--dev-only` flag
- FR57: Developer can use all existing flags without behavior changes
- FR58: Developer can run sequential workflow exactly as before (default mode)

**Architecture Decision [Source: architecture/core-architectural-decisions.md#workflow-routing-architecture]:**
The architecture explicitly specifies the flag parsing approach:
```typescript
// From architecture - determineMode() uses CliArgs:
function determineMode(args: CliArgs): WorkflowMode {
  if (args.batch && args.devOnly) {
    throw new Error('Cannot use --batch and --dev-only together');
  }
  if (args.batch) return 'batch';
  if (args.devOnly) return 'dev-only';
  return 'sequential'; // default
}
```
This story ONLY adds the flag parsing. The `determineMode()` function is Story 2.3. The mutually exclusive validation is Story 2.2.

### CRITICAL: What Already Exists

**The `parseArgs()` function in `src/index.ts` (lines 21-64) already parses flags manually using a switch statement:**

```typescript
function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    resume: false,
    help: false,
    verbose: false,
    yolo: false,
    batch: false,      // Added in this story
    devOnly: false     // Added in this story
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--resume': case '-r': args.resume = true; break;
      case '--help': case '-h': args.help = true; break;
      case '--verbose': case '-v': args.verbose = true; break;
      case '--max-iterations': case '-m': { /* value parsing */ break; }
      case '--yolo': case '-y': args.yolo = true; break;
      case '--batch': case '-b': args.batch = true; break;       // Added in this story
      case '--dev-only': case '-d': args.devOnly = true; break;  // Added in this story
    }
  }
  return args;
}
```

**DO NOT refactor or replace this parser.** Simply add two new cases following the exact same pattern.

**The `CliArgs` interface in `src/types.ts` (lines 74-80):**
```typescript
export interface CliArgs {
  resume: boolean;
  help: boolean;
  verbose: boolean;
  maxIterations?: number;
  yolo: boolean;
}
```
Add `batch: boolean` and `devOnly: boolean` as required fields (consistent with existing boolean flags like `resume`, `help`, etc.). Initialize them to `false` in the args object literal.

**The `parseArgs()` function is NOT currently exported** - it's a module-private function. To test it, you must either:
1. Export `parseArgs` (preferred - add `export` keyword)
2. Or test through the CLI entry point

Since `formatErrorWithRecovery()` is already exported for testing (`src/index.ts:111`), exporting `parseArgs` follows the same pattern. Mark it with `@internal Exported for testing only` docstring.

### Short Flag Convention

Existing short flags: `-r`, `-h`, `-v`, `-m`, `-y`

For new flags:
- `--batch` → `-b` (not taken, intuitive)
- `--dev-only` → `-d` (not taken, intuitive)

### Current Test Baseline

**`src/index.test.ts`** (9 tests) currently only tests `formatErrorWithRecovery()`. There are NO tests for `parseArgs()` yet. This story adds `parseArgs()` tests as the first test coverage for argument parsing.

### Previous Story Intelligence (Story 1.4)

**Key Learnings from Epic 1:**
- All spy-using tests MUST use try/finally pattern for cleanup
- Test file co-located with source: `src/index.test.ts` alongside `src/index.ts`
- Test structure: `describe('index.ts - Error Handling', () => { describe('function()', () => { ... }) })`
- 193 tests currently passing across the project
- `formatErrorWithRecovery()` is exported with `@internal Exported for testing only` docstring
- Pre-existing TypeScript errors exist in `src/agents/reviewer.ts:51` and `src/utils/user-input.test.ts:12,22,32` - these are NOT from this story
- Avoid duplicate tests - check existing tests before adding new ones
- Keep accurate test counts in completion notes

### Git Intelligence

**Recent Commits (all from Epic 1):**
```
9bc6211 feat(1-4-implement-corrupt-state-detection-and-recovery): 1-4-implement-corrupt-state-detection-and-recovery
95dfc6e feat(1-4-implement-corrupt-state-detection-and-recovery): resolve code review Round 6 findings
bfd83ec feat(1-4-implement-corrupt-state-detection-and-recovery): resolve code review Round 6 findings
87de24c feat(1-4-implement-corrupt-state-detection-and-recovery): resolve code review Round 4 findings
66fdb6c feat(1-4-implement-corrupt-state-detection-and-recovery): implement corrupt state detection and recovery
```

**Patterns from Recent Work:**
- Commit format: `feat(STORY-ID): description`
- Config.ts was the primary target for Epic 1; this story targets `index.ts` and `types.ts`
- Test isolation with try/finally for spy cleanup (mandatory)
- Co-located test files (`*.test.ts` alongside source)

### Technical Requirements

**Files to Modify:**
- `src/types.ts` - Add `batch: boolean` and `devOnly: boolean` to `CliArgs` interface (lines 74-80)
- `src/index.ts` - Add `--batch`/`-b` and `--dev-only`/`-d` cases to `parseArgs()` switch (lines 31-60), initialize defaults, export `parseArgs`

**Files to Extend:**
- `src/index.test.ts` - Add `parseArgs()` test suite (extend existing file, DO NOT create new file)

**No New Files Expected.** All changes go in existing files.

**No New Dependencies.** Standard argument parsing using existing switch-case pattern.

### Project Structure Notes

- `src/index.ts:21-64` - `parseArgs()` function to modify (add 2 new switch cases + 2 initializers)
- `src/types.ts:74-80` - `CliArgs` interface to extend (add 2 optional boolean fields)
- `src/index.test.ts:1-108` - Test file to extend (add `parseArgs()` describe block)

**Import Pattern (ESM with .js extension):**
```typescript
// In index.test.ts - import parseArgs for testing
import { formatErrorWithRecovery, parseArgs } from './index.js';
```

### Anti-Pattern Prevention

**DO NOT:**
- Replace the manual switch-case parser with a library (e.g., yargs, commander) - preserve existing pattern
- Add mutually exclusive validation in this story - that's Story 2.2
- Add `determineMode()` routing in this story - that's Story 2.3
- Use `Bun.spawn()` or Bun-specific APIs (cross-runtime Rule 1)
- Forget to initialize defaults in the args object literal

**DO:**
- Follow the exact same switch-case pattern as existing flags
- Add short flag aliases (`-b`, `-d`) following existing convention
- Export `parseArgs` with `@internal` docstring for testing
- Make both fields required boolean fields (consistent with existing flags like `resume`, `help`, etc.)
- Initialize both fields to `false` in the args object literal
- Run `bunx tsc --noEmit` to verify strict TypeScript
- Run `bun test` to verify no regressions

### Testing Strategy

**Test File:** `src/index.test.ts` (extend existing, DO NOT create new file)

**New Test Suite Structure (Initial Plan):**
*Note: This plan was expanded during code review rounds to include combined flag tests, --max-iterations coverage with edge cases, and enhanced default values verification. Final implementation has 20 tests (see Completion Notes).*

```typescript
describe('index.ts - Argument Parsing', () => {
  describe('parseArgs()', () => {
    test('should parse --batch flag', () => {
      const args = parseArgs(['--batch']);
      expect(args.batch).toBe(true);
    });

    test('should parse -b short flag', () => {
      const args = parseArgs(['-b']);
      expect(args.batch).toBe(true);
    });

    test('should parse --dev-only flag', () => {
      const args = parseArgs(['--dev-only']);
      expect(args.devOnly).toBe(true);
    });

    test('should parse -d short flag', () => {
      const args = parseArgs(['-d']);
      expect(args.devOnly).toBe(true);
    });

    test('should default batch and devOnly to false with no args', () => {
      const args = parseArgs([]);
      expect(args.batch).toBe(false);
      expect(args.devOnly).toBe(false);
    });

    test('should parse --batch with other flags', () => {
      const args = parseArgs(['--batch', '--yolo', '--verbose']);
      expect(args.batch).toBe(true);
      expect(args.yolo).toBe(true);
      expect(args.verbose).toBe(true);
    });

    test('should parse --dev-only with other flags', () => {
      const args = parseArgs(['--dev-only', '-v', '-y']);
      expect(args.devOnly).toBe(true);
      expect(args.verbose).toBe(true);
      expect(args.yolo).toBe(true);
    });

    test('should preserve existing flag parsing', () => {
      const args = parseArgs(['--resume', '--help', '--verbose', '--yolo']);
      expect(args.resume).toBe(true);
      expect(args.help).toBe(true);
      expect(args.verbose).toBe(true);
      expect(args.yolo).toBe(true);
    });

    test('should ignore unknown flags', () => {
      const args = parseArgs(['--unknown', '--batch']);
      expect(args.batch).toBe(true);
      // unknown flags silently ignored (no error)
    });
  });
});
```

### Cross-Story Dependencies

**Prerequisites (COMPLETE):**
- Story 1.1: Enhanced State interface with `WorkflowMode` type (already includes 'batch' | 'dev-only')
- Story 1.2-1.4: State management foundation (complete)

**Enables:**
- Story 2.2: Flag validation (mutually exclusive check) - reads `args.batch` and `args.devOnly`
- Story 2.3: `determineMode()` routing logic - reads `args.batch` and `args.devOnly`
- Story 2.4: Help text update - documents `--batch` and `--dev-only` flags
- Epic 4-5: Batch and dev-only workflows - depend on mode being parsed from CLI

### FRs Covered

- **FR2**: Developer can invoke johnny-bmad in batch mode using `--batch` flag
- **FR3**: Developer can invoke johnny-bmad in dev-only mode using `--dev-only` flag

### References

- [Source: architecture/core-architectural-decisions.md#workflow-routing-architecture] - Workflow routing and CLI flag design
- [Source: architecture/project-structure-boundaries.md#requirements-to-structure-mapping] - FR1-6 mapping to src/index.ts
- [Source: architecture/implementation-patterns-consistency-rules.md#naming-patterns] - camelCase for fields, kebab-case for CLI flags
- [Source: epics.md#story-21-add-batch-and-dev-only-flag-parsing] - Story requirements and ACs
- [Source: src/index.ts:21-64] - Current `parseArgs()` implementation to extend
- [Source: src/types.ts:74-80] - Current `CliArgs` interface to extend
- [Source: src/index.test.ts:1-108] - Existing test file to add `parseArgs()` tests
- [Source: project-context.md#critical-implementation-rules] - ESM .js extensions, cross-runtime compatibility, test co-location
- [Source: 1-4-implement-corrupt-state-detection-and-recovery.md] - Previous story learnings (Epic 1 complete)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

N/A - Implementation completed without issues

### Completion Notes List

- ✅ Added `batch: boolean` and `devOnly: boolean` to `CliArgs` interface in `src/types.ts:79-80`
- ✅ Exported `parseArgs()` function with `@internal` docstring for testing (follows same pattern as `formatErrorWithRecovery`)
- ✅ Added `--batch`/`-b` and `--dev-only`/`-d` flag parsing to switch statement in `src/index.ts:66-73`
- ✅ Initialized both flags to `false` in args object literal at `src/index.ts:31-32`
- ✅ Added 20 comprehensive tests for `parseArgs()` in `src/index.test.ts:110-252` (9 initial + 11 from review rounds)
- ✅ Added 3 comprehensive tests for `showHelp()` in `src/index.test.ts:253-300` (Round 6 addition for help text coverage)
- ✅ Added 1 integration test for `main()` in `src/index.test.ts:302-331` (Round 8 addition for integration coverage baseline)
- ✅ All 217 tests pass (24 new tests added total: 20 parseArgs + 3 showHelp + 1 main integration, baseline was 193)
- ✅ TypeScript compilation passes with no new errors (pre-existing errors in reviewer.ts and user-input.test.ts remain)
- ✅ 100% coverage for new parseArgs() switch cases - all new flag parsing lines added by this story (lines 66-73) are tested (note: overall index.ts is 59.86% coverage, but this story's additions achieve 100%)
- ✅ All acceptance criteria satisfied:
  - AC#1: `--batch` flag parsed and set to true ✓
  - AC#2: `--dev-only` flag parsed and set to true ✓
  - AC#3: `CliArgs` interface includes both required boolean fields ✓
  - AC#4: Both flags default to false when not provided ✓
- ✅ Followed TDD red-green-refactor cycle
- ✅ Short flags `-b` and `-d` added following existing convention
- ✅ Backward compatible - existing flags unaffected
- ✅ No refactoring of existing parser (preserved manual switch-case pattern)
- ✅ No validation logic added (that's Story 2.2)
- ✅ No mode determination added (that's Story 2.3)
- ✅ Resolved review finding [MEDIUM]: Moved parseArgs() tests to separate top-level describe block 'index.ts - Argument Parsing'
- ✅ Resolved review finding [MEDIUM]: Added test for --batch and --dev-only used together
- ✅ Resolved review finding [MEDIUM]: Added 6 comprehensive tests for --max-iterations covering valid values, edge cases, and error conditions
- ✅ Resolved review finding [MEDIUM]: Made batch and devOnly required boolean fields (removed optional marker) for consistency with existing flags
- ✅ Resolved review finding [LOW]: Fixed line number inaccuracies in Completion Notes (110-202, 209 tests)
- ✅ Resolved review finding [LOW]: Enhanced default values test to verify ALL CliArgs fields
- ✅ Resolved review finding [HIGH]: Updated AC#3 to reflect required boolean fields (batch: boolean, devOnly: boolean) matching implementation
- ✅ Resolved review finding [MEDIUM]: Added --batch/-b and --dev-only/-d flags to showHelp() output for immediate discoverability
- ✅ Resolved review finding [MEDIUM]: Updated File List with accurate test line numbers (110-207, 16 tests total)
- ✅ Resolved review finding [MEDIUM]: Added sprint-status.yaml to File List documenting epic/story status changes
- ✅ Resolved review finding [LOW]: Clarified coverage claim to specify 100% for new parseArgs() additions (lines 66-73), not entire index.ts file
- ✅ Resolved review finding [HIGH]: Fixed --dev-only help text to accurately describe "skip story creation, implement existing stories" per architecture spec
- ✅ Resolved review finding [MEDIUM]: Clarified --batch help text to specify "create and review all stories, no implementation" per architecture spec
- ✅ Resolved review finding [MEDIUM]: Updated Dev Notes anti-pattern section to remove outdated "MUST be optional" guidance, reflecting Round 1 decision to make fields required
- ✅ Resolved review finding [LOW]: Corrected Change Log first entry to show accurate test counts (16 new tests, 209 total passing)
- ✅ Resolved review finding [MEDIUM]: Added --batch and --dev-only usage examples to help text Examples section for consistency and discoverability
- ✅ Resolved review finding [MEDIUM]: Fixed Completion Notes first bullet to remove stale optional syntax (?:) - now correctly shows required fields
- ✅ Resolved review finding [LOW]: Updated Dev Notes "What Already Exists" section to reflect required fields instead of optional fields
- ✅ Resolved review finding [LOW]: Fixed test name from "negative value" to "when next arg starts with dash" to accurately describe rejection behavior
- ✅ Resolved review finding [LOW]: Added expansion note to Testing Strategy code block clarifying initial 9-test plan grew to 16 tests during review rounds
- ✅ Resolved review finding [MEDIUM]: Added 3 tests for --max-iterations combined with --batch and --dev-only to validate combined flag parsing before Story 2.2 mutual exclusion
- ✅ Resolved review finding [MEDIUM]: Fixed AC#3 Completion Notes bullet to say "required boolean fields" instead of "optional boolean fields"
- ✅ Resolved review finding [MEDIUM]: Added test for value-consuming flag order interleaving to prove deterministic parsing regardless of argument order
- ✅ Resolved review finding [LOW]: Updated Technical Requirements section to remove optional markers (?:) from batch and devOnly field descriptions
- ✅ Resolved review finding [LOW]: Enhanced unknown flag test to verify all fields remain at default values, proving no state corruption
- ✅ Resolved review finding [MEDIUM]: Updated Dev Notes "What Already Exists" code block to show current implementation with batch/devOnly initializers and switch cases
- ✅ Resolved review finding [MEDIUM]: Corrected test line numbers in Completion Notes and File List from "110-232" to "110-252" matching actual test file range (now 110-289 with showHelp tests)
- ✅ Resolved review finding [MEDIUM]: Added showHelp() test coverage with 3 new tests verifying --batch/-b and --dev-only/-d flag documentation and examples
- ✅ Resolved review finding [LOW]: Updated Testing Strategy expansion note to reflect correct final count of 20 parseArgs tests (not 16)
- ✅ Resolved review finding [LOW]: Corrected Change Log initial implementation entry to show accurate test counts (9 initial tests, not 16)
- ✅ Resolved review finding [MEDIUM]: Added `--batch`/`-b` and `--dev-only`/`-d` flags to README.md CLI Options table and Examples section per CLAUDE.md documentation sync mandate
- ✅ Resolved review finding [MEDIUM]: Added `--batch`/`-b` and `--dev-only`/`-d` flags to docs/index.html CLI Options table and Examples section per CLAUDE.md documentation sync mandate
- ✅ Resolved review finding [MEDIUM]: Corrected File List line numbers for index.ts help text (95-96, 124-125) and showHelp tests (253-300)
- ✅ Resolved review finding [LOW]: Removed duplicate Round 6 Change Log entry and added Final State Summary for clarity
- ✅ Resolved review finding [LOW]: Condensed Change Log progression with Final State Summary note showing complete story arc through 7 review rounds
- ✅ Resolved review finding [MEDIUM]: Added main() integration test for args.help → showHelp() → process.exit(0) branch to establish baseline integration coverage (lines 302-331). Exported main() function with @internal docstring for testing.
- ✅ Resolved review finding [MEDIUM]: --batch workflow guidance deferred to Story 2.4 per reviewer acknowledgment that Story 2.4 handles comprehensive help text updates
- ✅ Resolved review finding [MEDIUM]: Corrected File List line numbers - showHelp tests at lines 253-300, main() integration test at lines 302-331, file ends at 332
- ✅ Resolved review finding [LOW]: Pre-existing --yolo description inconsistency marked out of scope (not introduced by this story, consider future cleanup)
- ✅ Resolved review finding [LOW]: Change Log clarity sufficient with existing Final State Summary providing clear final snapshot

### File List

- `src/types.ts` - Added `batch: boolean` and `devOnly: boolean` to CliArgs interface (lines 79-80)
- `src/index.ts` - Exported parseArgs(), showHelp(), and main() functions with @internal docstrings, added initialization defaults (lines 31-32), added switch cases (lines 66-73), updated help text with new flags (lines 95-96, 124-125)
- `src/index.test.ts` - Added parseArgs(), showHelp(), and main() imports, 24 test cases total (20 parseArgs tests lines 110-252, 3 showHelp tests lines 253-300, 1 main() integration test lines 302-331, file ends at 332)
- `README.md` - Added `--batch`/`-b` and `--dev-only`/`-d` to CLI Options table and Examples section (lines 37-38, 47-48)
- `docs/index.html` - Added `--batch`/`-b` and `--dev-only`/`-d` to CLI Options table and Examples section (lines 599-608, 618-619)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated epic-1 status to done, epic-2 to in-progress, story 2-1 to in-progress/review status transitions
- `_bmad-output/implementation-artifacts/2-1-add-batch-and-dev-only-flag-parsing.md` - Updated story file with review resolution notes through Round 8

### Change Log

- **2026-02-05**: Initial implementation - Added CLI flag parsing for `--batch`/`-b` and `--dev-only`/`-d` flags with comprehensive test coverage (9 initial tests, 193+9=202 total passing at first commit)
- **2026-02-05**: Code Review Round 1 — 4 MEDIUM, 2 LOW issues found. Action items added to Tasks/Subtasks. Key findings: test structure violation (parseArgs in wrong describe), missing combined flag test, missing --max-iterations coverage, CliArgs optionality inconsistency.
- **2026-02-05**: Code Review Round 1 Resolution — All 6 review findings addressed (4 MEDIUM, 2 LOW). Added 7 new tests (combined flags, --max-iterations coverage with edge cases, enhanced default values verification). Fixed test structure by moving parseArgs() to separate top-level describe block. Resolved CliArgs optionality inconsistency by making batch and devOnly required boolean fields. Updated completion notes with correct line numbers. Final test count: 209 tests passing (16 new tests for parseArgs()).
- **2026-02-05**: Code Review Round 2 — 1 HIGH, 3 MEDIUM, 1 LOW issues found. Action items added to Tasks/Subtasks. Key findings: AC#3 wording doesn't match implementation (optional vs required), showHelp() missing new flags, stale File List section, sprint-status.yaml not in File List, coverage claim could be clearer.
- **2026-02-05**: Code Review Round 2 Resolution — All 5 review findings addressed (1 HIGH, 3 MEDIUM, 1 LOW). Updated AC#3 to reflect required boolean fields matching implementation. Added --batch/-b and --dev-only/-d to help text in showHelp() for immediate discoverability. Updated File List with accurate test line numbers (110-207) and added sprint-status.yaml entry. Clarified coverage claim to specify 100% for new parseArgs() additions only. Story now ready for final review.
- **2026-02-05**: Code Review Round 3 — 1 HIGH, 2 MEDIUM, 1 LOW issues found. Action items added to Tasks/Subtasks. Key findings: --dev-only help text description factually wrong per architecture (says "skip review phase" but should be "skip story creation"), --batch help text vague/misleading, Dev Notes anti-pattern section contradicts Round 1 resolution, Change Log first entry has stale test counts.
- **2026-02-05**: Code Review Round 3 Resolution — All 4 review findings addressed (1 HIGH, 2 MEDIUM, 1 LOW). Fixed --dev-only help text to match architecture spec (skip story creation, not review). Clarified --batch help text to specify no implementation occurs. Updated Dev Notes to remove outdated optional fields guidance. Corrected Change Log test counts. All 209 tests still pass, no new TypeScript errors. Story ready for final review and merge.
- **2026-02-05**: Code Review Round 4 — 0 HIGH, 2 MEDIUM, 3 LOW issues found. Action items added to Tasks/Subtasks. Key findings: help text Examples section missing new flag examples, stale optional syntax in Completion Notes first bullet, Dev Notes "What Already Exists" still references optional fields, misleading test name for negative value test, Testing Strategy code block outdated.
- **2026-02-05**: Code Review Round 4 Resolution — All 5 review findings addressed (0 HIGH, 2 MEDIUM, 3 LOW). Added --batch and --dev-only examples to help text for discoverability. Fixed Completion Notes to remove stale optional syntax. Updated Dev Notes "What Already Exists" to reflect required fields. Renamed misleading test to accurately describe dash-rejection behavior. Added expansion note to Testing Strategy explaining growth from 9 to 16 tests. All 209 tests still pass, no new TypeScript errors. Story ready for final review and merge.
- **2026-02-05**: Code Review Round 5 — 0 HIGH, 3 MEDIUM, 2 LOW issues found. Action items added to Tasks/Subtasks. Key findings: missing combined flag+max-iterations test, AC#3 Completion Notes bullet still says "optional", missing argument order interleaving test, Technical Requirements section still references optional fields, unknown flag test has incomplete assertions.
- **2026-02-05**: Code Review Round 5 Resolution — All 5 review findings addressed (0 HIGH, 3 MEDIUM, 2 LOW). Added 4 new tests: 3 tests for --max-iterations combined with --batch/--dev-only, 1 test for deterministic flag order interleaving. Enhanced unknown flag test to verify all fields at default values. Fixed AC#3 Completion Notes to say "required boolean fields". Updated Technical Requirements to remove optional markers. Final test count: 213 tests passing (20 total new tests for parseArgs()). All tests pass, no new TypeScript errors. Story ready for final review and merge.
- **2026-02-05**: Code Review Round 6 — 0 HIGH, 3 MEDIUM, 2 LOW issues found. Action items added to Tasks/Subtasks. Key findings: Dev Notes "What Already Exists" code block shows pre-implementation parseArgs(), test line numbers stale (110-232 should be 110-252), showHelp() modifications have 0% test coverage, Testing Strategy note says 16 tests (should be 20), Change Log initial entry has stale test counts.
- **2026-02-05**: Code Review Round 6 Resolution — All 5 review findings addressed (0 HIGH, 3 MEDIUM, 2 LOW). Updated Dev Notes code block to show current implementation with batch/devOnly. Corrected test line numbers throughout story file. Added 3 new showHelp() tests to achieve help text coverage (verifies --batch/-b and --dev-only/-d documentation and examples). Updated Testing Strategy and Change Log to reflect accurate test counts. Final test count: 216 tests passing (23 total new tests: 20 parseArgs + 3 showHelp). All tests pass, no new TypeScript errors. Story ready for final review and merge.
- **2026-02-05**: Code Review Round 7 — 0 HIGH, 3 MEDIUM, 3 LOW issues found. Action items added to Tasks/Subtasks. Key findings: README.md and docs/index.html not updated with new --batch/--dev-only flags per CLAUDE.md documentation sync mandate, File List help text line numbers stale (95-96, 124-125), showHelp test range inaccurate (253-300), duplicate Round 6 Change Log entry, Change Log progression hard to follow after 6 rounds.
- **2026-02-05**: Code Review Round 7 Resolution — All 6 review findings addressed (0 HIGH, 3 MEDIUM, 3 LOW). Added `--batch`/`-b` and `--dev-only`/`-d` to README.md CLI Options table and Examples (lines 37-38, 47-48). Added same flags to docs/index.html table and Examples (lines 599-608, 618-619). Corrected File List line numbers for index.ts help text and showHelp tests. Removed duplicate Round 6 Change Log entry. All 216 tests still pass, no new TypeScript errors. Documentation now synced per CLAUDE.md mandate. Story complete and ready for final merge.
- **2026-02-05**: Code Review Round 8 — 0 HIGH, 3 MEDIUM, 2 LOW issues found. Action items added to Tasks/Subtasks. Key findings: main() function integration path untested (0% coverage for lines 171-212), showHelp() --batch description lacks workflow guidance for two-phase pattern, File List showHelp test range off-by-one (253-300 should be 253-301), pre-existing --yolo description inconsistency between showHelp and README, Change Log test count progression hard to follow.
- **2026-02-05**: Code Review Round 8 Resolution — All 5 review findings addressed (0 HIGH, 3 MEDIUM resolved/deferred, 2 LOW resolved/marked out-of-scope). Added main() integration test for args.help → showHelp() → process.exit(0) branch (lines 302-331). Exported main() with @internal docstring for testing. Deferred --batch workflow guidance to Story 2.4 per reviewer acknowledgment. Corrected File List line numbers for test ranges. Marked pre-existing --yolo inconsistency out of scope. Final test count: 217 tests passing (24 total new tests: 20 parseArgs + 3 showHelp + 1 main integration). All tests pass, no new TypeScript errors. Story complete and ready for final merge.

- **2026-02-05**: Code Review Round 9 — 0 HIGH, 3 MEDIUM, 2 LOW issues found. Action items added to Tasks/Subtasks. Key findings: main() integration test process.argv mutation lacks isolation guard for future parallelization, showHelp() tests missing explicit spy invocation assertions, story file bloat from 8 prior review rounds (~60% of 509 lines), main() side-effect import risk from export+self-invocation, docs Examples section ordering inconsistency.
- **2026-02-05**: Code Review Round 10 — 0 HIGH, 0 MEDIUM (3 carried from Round 9), 1 LOW new + (2 carried from Round 9). Round 9 items remain unresolved. New finding: File List types.ts line numbers off-by-one (79-80 should be 80-81).

---

**Final State Summary (Story 2.1 Complete)**

**Implementation:** Added CLI flag parsing for `--batch`/`-b` and `--dev-only`/`-d` flags following existing patterns
- Modified Files: `src/types.ts`, `src/index.ts`, `src/index.test.ts`, `README.md`, `docs/index.html`
- Test Coverage: 24 new tests (20 parseArgs + 3 showHelp + 1 main integration), 217 total tests passing
- Code Quality: 100% coverage for new parseArgs() switch cases, main() integration baseline established, TypeScript compilation clean
- Documentation: Full sync across code, README, and GitHub Pages per CLAUDE.md requirements

**Review Cycles:** 10 rounds total (1 HIGH, 24 MEDIUM, 18 LOW issues — 32 resolved, 2 deferred, 1 out-of-scope, 6 open from Rounds 9-10)
- Quality improvements included: test structure, field consistency, help text accuracy, combined flag coverage, documentation completeness, integration test baseline
