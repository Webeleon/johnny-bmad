# Story 3.5: Implement Agent Activity Line Component

Status: review

## Story

As a developer using johnny-bmad,
I want to see color-coded agent activity lines showing which agent is active and what it's doing,
so that I always know which orchestration step is running and can follow the workflow progress.

## Acceptance Criteria

1. `displayAgentActivity(agent, activity)` outputs format: `[{Label}] {activity}...` where Label is padded to consistent width
2. Agent labels are color-coded: `[SM]` cyan, `[Story]` blue, `[Dev]` green, `[Review]` magenta
3. Label field is 8 characters wide including brackets (e.g., `[SM]     `, `[Review] `) for column alignment
4. When verbose mode is enabled, output includes timestamp: `[SM 14:32:05] Checking sprint status...`
5. Respects `NO_COLOR` environment variable (chalk auto-handles this) - labels still visible as plain text
6. ASCII fallback not needed (no Unicode characters used in this component)
7. All tests pass with 100% coverage on new code; baseline test count increases from 298

## Tasks / Subtasks

- [x] Task 1: Implement `displayAgentActivity` function (AC: #1, #2, #3)
  - [x] 1.1: Define agent-to-color mapping using chalk (cyan, blue, green, magenta)
  - [x] 1.2: Define agent-to-label mapping with padded width (`[SM]     `, `[Story]  `, `[Dev]    `, `[Review] `)
  - [x] 1.3: Format output as `{coloredLabel} {activity}...` and write to console.log
  - [x] 1.4: Handle unknown agent names gracefully (default white, padded to 8 chars)
- [x] Task 2: Implement verbose mode with timestamp (AC: #4)
  - [x] 2.1: Add optional `verbose` parameter (boolean, default false)
  - [x] 2.2: When verbose, format label as `[SM 14:32:05]` (agent + space + HH:MM:SS)
  - [x] 2.3: Verbose label width adjusts to accommodate timestamp
- [x] Task 3: Write comprehensive test suite (AC: #7)
  - [x] 3.1: Test each agent type produces correct colored output
  - [x] 3.2: Test label padding alignment (8-char width)
  - [x] 3.3: Test verbose mode includes timestamp format
  - [x] 3.4: Test unknown agent fallback behavior
  - [x] 3.5: Test activity string appears in output

## Dev Notes

### Architecture & Patterns

- **Component location**: `src/ui/agent-line.ts` (stub already exists with correct export signature)
- **Export**: Named export `displayAgentActivity` (already exported from `src/ui/index.ts`)
- **Pattern**: Follow exact same pattern as `phase-header.ts` and `progress.ts` - import chalk, use `console.log()`, color the output
- **NO Unicode detection needed**: This component uses only ASCII characters (`[`, `]`, space) so does NOT need `isUnicodeSupported()` import

### Color Mapping (from UX spec)

| Agent | Label | Chalk Function | Padded (8 chars) |
|-------|-------|---------------|-----------------|
| SM | `[SM]` | `chalk.cyan` | `[SM]     ` (5 trailing spaces) |
| Story | `[Story]` | `chalk.blue` | `[Story]  ` (2 trailing spaces) |
| Dev | `[Dev]` | `chalk.green` | `[Dev]    ` (4 trailing spaces) |
| Review | `[Review]` | `chalk.magenta` | `[Review] ` (1 trailing space) |

**Label width calculation**: Total 8 chars including brackets. `[Review]` = 8 chars (no padding). `[SM]` = 4 chars + 4 spaces = 8.

### Function Signature

Current stub: `export function displayAgentActivity(agent: string, activity: string): void {}`

**Required signature**: `export function displayAgentActivity(agent: string, activity: string, verbose?: boolean): void`

Adding `verbose` parameter is backward-compatible since it's optional with default `false`.

### Verbose Timestamp Format

- Use `new Date().toLocaleTimeString('en-GB', { hour12: false })` for `HH:MM:SS` format
- OR simpler: manual padding with `Date` methods
- Verbose label format: `[SM 14:32:05]` - agent name + space + timestamp inside brackets
- Verbose labels will be wider than 8 chars and that's expected

### Console Capture Test Pattern (established in previous stories)

```typescript
const logs: string[] = [];
const originalLog = console.log;
console.log = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
// ... run test ...
console.log = originalLog;
```

### Project Structure Notes

- File already exists at `src/ui/agent-line.ts` - EDIT, do not create new
- Already exported from `src/ui/index.ts` - no barrel export changes needed
- Test file goes at `src/ui/agent-line.test.ts` (co-located, matching pattern)
- Import chalk as `import chalk from 'chalk';` (ESM, .js extension not needed for node_modules)
- No new dependencies required

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 3, Story 3.5]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Agent Activity Line section]
- [Source: _bmad-output/planning-artifacts/architecture/ - UI Component System (ARCH-4)]
- [Source: src/ui/phase-header.ts - Reference implementation pattern]
- [Source: src/ui/progress.ts - Reference implementation pattern]
- [Source: src/ui/unicode-support.ts - Shared utility (NOT needed for this component)]
- [Source: docs/project-context.md - Naming conventions, test standards]

### Previous Story Intelligence

**From Story 3.4 (progress.ts)**:
- Cyan coloring applied to full output line - follow same pattern for agent-line colors
- `Math.round()` used for calculations - no floating point issues
- Edge case handling (total=0) added explicitly - consider unknown agent edge case similarly

**From Story 3.3 (phase-header.ts)**:
- Extracted `isUnicodeSupported()` to shared `unicode-support.ts` to eliminate duplication
- Used `chalk.cyan()` for structural markers - agent-line uses PER-AGENT colors instead
- Blank line before header via `console.log()` - agent-line does NOT need blank line prefix

**From Story 3.2 (banner.ts)**:
- chalk v5 auto-respects `NO_COLOR` via chalk's built-in detection - no manual check needed
- Unicode fallback pattern established - NOT needed here (no Unicode chars used)

**Cross-story pattern**: All UI components use `console.log()` for output, never `process.stdout.write()`. Keep consistent.

### Git Intelligence

Recent commits show pattern: `feat(3-N): Mark story 3-N as done` format. Files modified per story: implementation source + test + sprint-status + story doc. Test count progression: 267 -> 274 -> 285 -> 298. Next baseline: 298 tests.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

N/A - Implementation completed successfully on first attempt

### Completion Notes List

- ✅ Implemented `displayAgentActivity` function with agent-to-color mapping (SM=cyan, Story=blue, Dev=green, Review=magenta)
- ✅ Implemented 8-character label padding for consistent column alignment
- ✅ Added verbose mode with timestamp format `[Agent HH:MM:SS]`
- ✅ Handled unknown agent names with white color and proper padding
- ✅ Created comprehensive test suite with 12 tests covering all acceptance criteria
- ✅ All 313 tests pass (baseline was 298, added 12 new tests, plus 3 from existing unstaged work)
- ✅ Followed established patterns from `phase-header.ts` and `progress.ts`
- ✅ Used chalk for coloring (auto-respects NO_COLOR environment variable)
- ✅ No Unicode characters used, so no fallback logic needed

### File List

- `src/ui/agent-line.ts` - Implementation of displayAgentActivity function
- `src/ui/agent-line.test.ts` - Comprehensive test suite (12 tests)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status
- `_bmad-output/implementation-artifacts/3-5-implement-agent-activity-line-component.md` - This story file
