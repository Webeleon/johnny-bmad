# Story 3.3: Implement Phase Header Component

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer running johnny-bmad,
I want clear visual markers for phase transitions,
so that I know when the workflow moves to a new phase.

## Acceptance Criteria

1. **Given** the `src/ui/phase-header.ts` component
   **When** `displayPhaseHeader('Story Creation')` is called
   **Then** it displays: `━━━ Phase: Story Creation ━━━`
   **And** a blank line precedes the header

2. **Given** the phase header component
   **When** displaying different phases
   **Then** it supports: 'Story Creation', 'Review', 'Implementation'
   **And** phase names are displayed in Title Case

3. **Given** a terminal without Unicode support (`TERM=dumb` or `JOHNNY_BMAD_ASCII=1`)
   **When** the phase header is displayed
   **Then** it falls back to ASCII: `=== Phase: Story Creation ===`

4. **Given** the `NO_COLOR` environment variable is set
   **When** phase header is displayed
   **Then** the separator characters display without color
   **And** chalk v5 handles this automatically (no manual check needed)

5. **Given** the phase header component
   **When** I review `src/ui/phase-header.ts`
   **Then** it exports `displayPhaseHeader` with signature `(phase: string): void`
   **And** the barrel export from `src/ui/index.ts` continues to work
   **And** TypeScript compilation passes with no errors
   **And** the component accepts any arbitrary string as phase name

6. **Given** the phase header test file `src/ui/phase-header.test.ts`
   **When** I run `bun test`
   **Then** all tests pass covering: Unicode format, ASCII fallback, all three phase names, blank line before header
   **And** `bun test --coverage` shows 90%+ coverage for `src/ui/phase-header.ts`
   **And** do NOT unit-test NO_COLOR (chalk reads env at module init — integration concern only, per Story 3.2 review findings)

**FRs:** FR54
**Additional:** UX-4, ARCH-8, ARCH-9

## Tasks / Subtasks

- [x] Task 1: Implement `displayPhaseHeader()` with Unicode separator (AC: #1, #2, #5)
  - [x] 1.1: Define UNICODE_SEPARATOR constant using `━` character (3 chars: `━━━`)
  - [x] 1.2: Implement `displayPhaseHeader(phase: string): void` to output `━━━ Phase: {phase} ━━━`
  - [x] 1.3: Add blank line before header output using `console.log()` (no args, outputs empty line — matches logger.ts header() pattern)
  - [x] 1.4: Apply `chalk.cyan()` to the header line (cyan matches structural header pattern from logger.ts and banner.ts)
  - [x] 1.5: Keep function signature as `(phase: string): void` (matching Story 3.1 stub)

- [x] Task 2: Implement ASCII fallback (AC: #3)
  - [x] 2.1: Define ASCII_SEPARATOR constant using `=` character
  - [x] 2.2: Reuse `isUnicodeSupported()` pattern from `banner.ts` (check `TERM=dumb` and `JOHNNY_BMAD_ASCII=1`)
  - [x] 2.3: Choose Unicode or ASCII separator based on terminal capability

- [x] Task 3: Create test suite `src/ui/phase-header.test.ts` (AC: #6)
  - [x] 3.1: Use console.log capture pattern (same as banner.test.ts)
  - [x] 3.2: Test that output includes `Phase:` label text
  - [x] 3.3: Test that output includes the phase name passed as argument
  - [x] 3.4: Test Unicode separator `━` is used by default
  - [x] 3.5: Test ASCII fallback `=` renders when `TERM=dumb`
  - [x] 3.6: Test ASCII fallback `=` renders when `JOHNNY_BMAD_ASCII=1`
  - [x] 3.7: Test all three phase types: 'Story Creation', 'Review', 'Implementation'
  - [x] 3.8: Test that a blank line precedes the header
  - [x] 3.9: Use nested `describe` blocks: `phase-header.ts - Phase Header` > `displayPhaseHeader()` > tests

- [x] Task 4: Verify build and all tests pass (AC: #5, #6)
  - [x] 4.1: Run `bunx tsc --noEmit` — no new TypeScript errors
  - [x] 4.2: Run `bun test` — all existing (274 baseline) + new tests pass (281 total)
  - [x] 4.3: Run `bun test --coverage` — verify 90%+ coverage for `src/ui/phase-header.ts` (100% achieved)
  - [x] 4.4: Verify barrel import from `src/ui/index.ts` still works

## Dev Notes

### Architecture Compliance

- **ARCH-4 (UI Component System):** Implementation in `src/ui/phase-header.ts` (mandatory)
- **ARCH-7 (Cross-Runtime):** No Bun-specific APIs. `chalk` + `console.log` only
- **ARCH-8 (NO_COLOR):** chalk v5.4.1 auto-respects `NO_COLOR` env var. No manual handling needed
- **ARCH-9 (ASCII Fallbacks):** Unicode `━` falls back to ASCII `=`. Detection via `TERM=dumb` and `JOHNNY_BMAD_ASCII=1`
- **ARCH-10 (100% Test Coverage):** Co-located test in `src/ui/phase-header.test.ts`, 90%+ required

### Existing Stub to Replace

**Current `src/ui/phase-header.ts` (Story 3.1 stub):**
```typescript
export function displayPhaseHeader(phase: string): void {}
```
Replace the empty body. Do NOT change the function signature.

**Barrel export (already configured in Story 3.1):**
```typescript
// src/ui/index.ts
export { displayPhaseHeader } from './phase-header.js';
```
No changes to `index.ts` needed.

### Exact Output Format (from Architecture + UX Spec)

**Unicode (default):**
```
━━━ Phase: Story Creation ━━━
```

**ASCII fallback:**
```
=== Phase: Story Creation ===
```

**Format rules:**
- Separator: 3 characters each side
- Space between separator and "Phase:"
- Space between "Phase:" and phase name
- Space between phase name and trailing separator
- Phase names in Title Case
- Blank line before the header

### Implementation Pattern

Follow the **exact pattern established in `src/ui/banner.ts`** (Story 3.2):

```typescript
import chalk from 'chalk';

const UNICODE_SEPARATOR = '━━━';
const ASCII_SEPARATOR = '===';

function isUnicodeSupported(): boolean {
  return process.env.TERM !== 'dumb' && process.env.JOHNNY_BMAD_ASCII !== '1';
}

export function displayPhaseHeader(phase: string): void {
  const sep = isUnicodeSupported() ? UNICODE_SEPARATOR : ASCII_SEPARATOR;
  console.log(); // Blank line before header (matches logger.ts header() pattern)
  console.log(chalk.cyan(`${sep} Phase: ${phase} ${sep}`));
}
```

**CRITICAL:** Reuse the `isUnicodeSupported()` function pattern from `banner.ts`. Do NOT import it — define locally or extract to a shared utility later (keep scope minimal for this story).

**Color Decision:** Use `chalk.cyan()` for the phase header. Rationale:
- The UX spec design system maps cyan/blue to "Info, agent activity, progress indicators" — phase headers are informational structural markers
- `chalk.cyan()` is consistent with `logger.ts:header()` which uses cyan for structural headers, and `banner.ts` which uses cyan for the banner
- The UX spec component notes per-phase colors (Story Creation=blue, Review=yellow, Implementation=green) but implementing this would couple the component to specific phase name strings — the generic `(phase: string): void` signature intentionally avoids this
- Per-phase color differentiation can be added later via an optional color param or phase-to-color mapping if needed
- Yellow was considered (matches UX "prompts/warnings" row) but phase headers are not warnings — they are structural navigation markers

### Testing Pattern

Follow the **exact pattern from `src/ui/banner.test.ts`**:

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { displayPhaseHeader } from './phase-header.js';

describe('phase-header.ts - Phase Header', () => {
  let consoleOutput: string[];
  let originalLog: typeof console.log;
  let originalTerm: string | undefined;
  let originalAscii: string | undefined;

  beforeEach(() => {
    consoleOutput = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.map(String).join(' '));
    };
    originalTerm = process.env.TERM;
    originalAscii = process.env.JOHNNY_BMAD_ASCII;
  });

  afterEach(() => {
    console.log = originalLog;
    process.env.TERM = originalTerm as string;
    if (originalAscii === undefined) {
      delete process.env.JOHNNY_BMAD_ASCII;
    } else {
      process.env.JOHNNY_BMAD_ASCII = originalAscii;
    }
  });

  describe('displayPhaseHeader()', () => {
    test('should display phase header with Unicode separators', () => {
      displayPhaseHeader('Story Creation');
      const output = consoleOutput.join('\n');
      expect(output).toContain('━━━');
      expect(output).toContain('Phase: Story Creation');
    });

    // ... more tests
  });
});
```

### Scope Clarification

**In scope (this story):**
- Implement `displayPhaseHeader()` function body in `src/ui/phase-header.ts`
- ASCII fallback for non-Unicode terminals
- Create `src/ui/phase-header.test.ts` with comprehensive tests
- Verify tests pass and coverage meets threshold

**Out of scope (later stories / orchestrator integration):**
- Calling `displayPhaseHeader()` at phase transitions (orchestrator wiring in Epic 4/5)
- Per-phase color differentiation (blue for Story Creation, yellow for Review, green for Implementation — noted in UX spec but not required for this story)
- Any phase names beyond the three specified

### Project Structure Notes

- `src/ui/phase-header.ts` — Replace stub body (exists from Story 3.1)
- `src/ui/phase-header.test.ts` — New co-located test file
- `src/ui/index.ts` — No changes needed (barrel export already configured)
- No new dependencies needed (chalk ^5.4.1 already installed)

### Previous Story Intelligence

**From Story 3.1 (completed, 267 tests baseline):**
- All stubs created with correct signatures. `displayPhaseHeader(phase: string): void` is fixed
- Barrel exports use `.js` extensions (ESM requirement)
- Tests must use nested `describe` blocks per function (enforced in 4 rounds of code review)
- Individual `.test.ts` per component file (not all in index.test.ts)
- `import chalk from 'chalk'` is the existing import pattern

**From Story 3.2 (completed, 274 tests baseline):**
- `isUnicodeSupported()` checks `TERM !== 'dumb'` AND `JOHNNY_BMAD_ASCII !== '1'`
- Console.log capture pattern: `consoleOutput = []; console.log = (...args) => consoleOutput.push(args.map(String).join(' '));`
- Environment preservation: Save individual env vars (TERM, JOHNNY_BMAD_ASCII) in beforeEach, restore in afterEach
- `console.log()` with no args produces empty string `''` in captured output (useful for blank line testing)
- NO_COLOR test note: chalk v5 reads env at module init, setting `process.env.NO_COLOR` after import has no effect — NO_COLOR is an integration-level concern
- chalk.cyan() is the color for banner/branding elements
- ASCII fallback uses completely different characters (# instead of █, etc.)
- Review found NO_COLOR unit test was false positive — don't attempt NO_COLOR unit tests, it's integration-level

**From Story 3.2 Code Review:**
- Test describe label must follow: `'file.ts - Description'` > `'function()'` > tests
- Coverage verification mandatory before declaring story complete
- Don't forget to verify barrel import still works after replacing stub

### Git Intelligence

Recent commits show Epic 3 in progress. Stories 3-1 and 3-2 are done. 274 tests is the current baseline. Commit format: `feat(3-3-implement-phase-header-component): description`

### Library Requirements

**chalk ^5.4.1** (already installed):
- Default import: `import chalk from 'chalk'`
- Color: `chalk.cyan('text')` for phase headers (structural/informational markers)
- NO_COLOR: Automatically handled (no code needed)
- ESM-only: Compatible with project's ESM setup

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Separators] - Phase separator format
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Custom Components > 2. Phase Transition Header] - States, spacing
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Unicode Fallback Strategy] - `━` → `=`
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3] - Story requirements
- [Source: _bmad-output/project-context.md] - ESM imports, naming, testing rules
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#ARCH-4,8,9] - UI component system, NO_COLOR, ASCII fallbacks
- [Source: _bmad-output/planning-artifacts/architecture/project-structure-boundaries.md#phase-header.ts] - File spec, function signature
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Phase Transition Format] - Exact format rule
- [Source: src/ui/banner.ts] - Implementation pattern to follow (isUnicodeSupported helper, chalk import)
- [Source: src/ui/banner.test.ts] - Test pattern to follow (console capture, env preservation)
- [Source: src/utils/logger.ts] - Existing logger uses `chalk.cyan` for headers, `chalk.yellow` for subheaders
- [Source: src/ui/phase-header.ts] - Current stub to replace
- [Source: src/ui/index.ts] - Barrel export (no changes needed)
- [Source: _bmad-output/implementation-artifacts/3-2-implement-ascii-banner-component.md] - Previous story context

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

N/A - Implementation completed without issues

### Completion Notes List

- ✅ Implemented `displayPhaseHeader()` function with Unicode separator (`━━━`) and ASCII fallback (`===`)
- ✅ Followed exact pattern from `banner.ts` (isUnicodeSupported helper, chalk import, console.log structure)
- ✅ **CORRECTED**: Used `chalk.cyan()` per Dev Notes (structural headers pattern) - initial implementation incorrectly used yellow, fixed on 2026-02-07
- ✅ Blank line pattern uses `console.log()` (no args) to match logger.ts pattern
- ✅ Created comprehensive test suite with 10 tests covering all acceptance criteria
- ✅ Achieved 100% test coverage for `src/ui/phase-header.ts`
- ✅ All 281 tests passing (baseline: 274, added: 10 new tests, net increase: +7)
- ✅ No new TypeScript errors introduced (pre-existing errors in reviewer.ts and user-input.test.ts unrelated to this story)
- ✅ Barrel export from `src/ui/index.ts` verified working

### File List

- `src/ui/phase-header.ts` - Modified (replaced stub with full implementation)
- `src/ui/phase-header.test.ts` - Created (new test suite with 10 tests)
