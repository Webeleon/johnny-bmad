# Implementation Patterns & Consistency Rules

## Pattern Categories Defined

**Critical Conflict Points Identified:** 4 main categories where AI agents could make different implementation choices

This document establishes mandatory patterns that ALL AI agents MUST follow when implementing johnny-bmad v1 batch workflow enhancements. These patterns prevent conflicts, ensure consistency, and enable seamless integration of code written by different agents.

## Naming Patterns

**File Naming Conventions:**

**Rule:** All TypeScript files use **kebab-case** naming

**Rationale:** Matches existing v0.2.0 codebase pattern (orchestrator.ts, story-creator.ts, user-input.ts)

**Examples:**
- ✅ `story-card.ts`, `phase-header.ts`, `dev-only.ts`
- ✅ `story-card.test.ts`, `batch-workflow.ts`
- ❌ `storyCard.ts`, `StoryCard.ts`, `story_card.ts`

**Applies to:** All new files in src/ui/, workflow functions, test files

---

**Function/Method Naming Conventions:**

**Rule:** All functions and methods use **camelCase** naming

**Rationale:** Standard TypeScript convention, matches existing v0.2.0 pattern

**Examples:**
- ✅ `migrateV0toV1()`, `runBatchWorkflow()`, `determineMode()`
- ✅ `loadState()`, `saveState()`, `displayBanner()`
- ❌ `migrate_v0_to_v1()`, `MigrateV0ToV1()`, `MIGRATE_V0_TO_V1()`

**Applies to:** All functions, methods, exported utilities

---

**Variable/Parameter Naming Conventions:**

**Rule:** All variables and parameters use **camelCase** naming

**Rationale:** Matches existing v0.2.0 pattern (currentEpic, currentStoryIndex)

**Examples:**
- ✅ `storyApprovals`, `workflowMode`, `currentPhase`
- ✅ `epicId`, `storyIndex`, `approvalStatus`
- ❌ `story_approvals`, `WorkflowMode`, `CURRENT_PHASE`

**Applies to:** All variables, function parameters, destructured properties

---

**Interface/Type Naming Conventions:**

**Rule:** All interfaces and types use **PascalCase without prefix**

**Rationale:** Matches existing v0.2.0 pattern (State, CliArgs, ClaudeOptions)

**Examples:**
- ✅ `WorkflowMode`, `WorkflowPhase`, `StoryApproval`
- ✅ `BatchWorkflowState`, `MigrationResult`
- ❌ `IWorkflowMode`, `TWorkflowPhase`, `workflowMode`

**Applies to:** All TypeScript interfaces, type aliases, enums

---

**Constant Naming Conventions:**

**Rule:** All constants use **SCREAMING_SNAKE_CASE** naming

**Rationale:** Clear visual distinction for constants, widely recognized pattern

**Examples:**
- ✅ `MAX_RETRIES = 3`, `RETRY_DELAYS = [2000, 4000, 8000]`
- ✅ `DEFAULT_MODE = 'sequential'`, `PHASE_STORY_CREATION = 'story-creation'`
- ❌ `maxRetries`, `MaxRetries`, `max_retries`

**Applies to:** All module-level constants, configuration values, magic numbers extracted as constants

## Structure Patterns

**Project Organization (Established by v0.2.0):**

**Existing Structure (DO NOT CHANGE):**
```
src/
├── index.ts              # CLI entry point, argument parsing
├── orchestrator.ts       # Main workflow loop, state machine
├── config.ts             # State persistence
├── types.ts              # TypeScript interfaces
├── agents/               # Agent wrappers
├── claude/               # Claude CLI integration
├── git/                  # Git operations
└── utils/                # Utilities (logger, files, user-input, timer)
```

**New Structure (v1 Additions):**
```
src/
└── ui/                   # NEW: Terminal UI components
    ├── banner.ts
    ├── phase-header.ts
    ├── agent-line.ts
    ├── progress.ts
    ├── story-card.ts
    ├── status.ts
    ├── celebration.ts
    ├── error.ts
    └── index.ts          # Unified exports
```

**Rule:** All new UI components MUST go in `src/ui/`, all other utilities continue in `src/utils/`

---

**Test File Organization:**

**Rule:** All test files are **co-located** with implementation using `*.test.ts` suffix

**Examples:**
- `src/ui/progress.ts` → `src/ui/progress.test.ts`
- `src/config.ts` → `src/config.test.ts`
- `src/orchestrator.ts` → `src/orchestrator.test.ts`

**Fixture Organization:**
- Simple test data: Inline in test files
- Complex fixtures (v0.2.0 state files): `src/fixtures/*.json`

**Mock Organization:**
- Inline mocks preferred (defined in test files)
- Shared mocks only if reused across multiple test files

## Format Patterns

**Terminal Output Formats:**

**Progress Bar Format:**

**Rule:** `Story {current}/{total} [{bar}] {status}...`

**Details:**
- Bar width: 16 characters total
- Filled: `█` (Unicode) or `#` (ASCII fallback)
- Empty: `░` (Unicode) or `-` (ASCII fallback)
- Status: lowercase present tense verb + "..."

**Examples:**
- ✅ `Story 4/8 [████████░░░░░░░░] implementing...`
- ✅ `Story 1/6 [██░░░░░░░░░░░░░░] creating...`
- ❌ `[4/8] ████░░░░ Implementing` (wrong format)
- ❌ `Story 4 of 8: 50%` (wrong format)

---

**Status Message Format:**

**Rule:** `[STATUS] message`

**Status Symbols (6 chars padded, ALL CAPS):**
- `[OK]   ` - Success, completion
- `[FAIL] ` - Failure, review failed
- `[WARN] ` - Warning, non-blocking
- `[INFO] ` - Information, status updates
- `[ERROR]` - Errors, blocking issues

**Examples:**
- ✅ `[OK]    Story created successfully`
- ✅ `[FAIL]  Review failed - tests not passing`
- ✅ `[WARN]  API rate limit approaching`
- ✅ `[ERROR] Claude CLI not found`
- ❌ `✓ Story created` (wrong format)
- ❌ `ERROR: Claude CLI not found` (missing brackets)

---

**Phase Transition Format:**

**Rule:** `━━━ Phase: {phase_name} ━━━`

**Details:**
- Separator: `━` (Unicode) or `=` (ASCII fallback)
- Separator length: 3 characters each side
- Phase names: Title Case

**Examples:**
- ✅ `━━━ Phase: Story Creation ━━━`
- ✅ `━━━ Phase: Review ━━━`
- ✅ `━━━ Phase: Implementation ━━━`
- ❌ `--- PHASE: STORY CREATION ---` (wrong separator, wrong case)

---

**Agent Activity Format:**

**Rule:** `[{agent_label}] {activity_description}...`

**Agent Labels (8 chars padded, color-coded):**
- `[SM]     ` (cyan) - Scrum Master
- `[Story]  ` (blue) - Story Creator
- `[Dev]    ` (green) - Dev Agent
- `[Review] ` (magenta) - Reviewer Agent

**Activity Description:** lowercase, present tense verb + object + "..."

**Examples:**
- ✅ `[SM]     Checking sprint status...`
- ✅ `[Story]  Creating STORY-001...`
- ✅ `[Dev]    Implementing story...`
- ✅ `[Review] Validating code...`
- ❌ `SM: Checking sprint status` (wrong format)
- ❌ `[SM] Checked sprint status` (past tense)

---

**Error Message Format:**

**Rule:**
```
[ERROR] {error_type}: {brief_description}
        {additional_context}
        Try: {exact_recovery_command}
```

**Examples:**
```
✅ [ERROR] Claude CLI not found
        johnny-bmad requires Claude Code CLI in PATH
        Try: Install from https://claude.ai/download

✅ [ERROR] API Rate Limit
        Claude API rate limited
        Try: Wait 60 seconds and restart

❌ ERROR: Claude CLI not found (missing brackets and recovery)
❌ Claude CLI not found (no ERROR prefix)
```

**Rule:** ALL error messages MUST include actionable "Try:" recovery command

## Process Patterns

**Error Handling & Retry Logic:**

**Retry Pattern:** 3 attempts with exponential backoff

**Constants:**
```typescript
const RETRY_DELAYS = [2000, 4000, 8000]; // 2s, 4s, 8s
const MAX_RETRIES = 3;
```

**Implementation Pattern:**
```typescript
async function retryableOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error; // Final attempt failed
      }
      const delay = RETRY_DELAYS[attempt];
      console.log(`[WARN] ${operationName} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Unreachable'); // TypeScript exhaustiveness
}
```

**Applies to:** All Claude CLI spawns, all file operations, all API calls

---

**State Persistence Pattern:**

**Rule:** Save state BEFORE every risky operation

**Risky Operations:**
- Claude CLI spawn
- File write operations
- API calls
- User prompts (could Ctrl+C)

**Implementation Pattern:**
```typescript
async function riskyOperation() {
  await saveState(currentState);  // ALWAYS save first
  const result = await claudeSpawn(...);
  // State updates happen in memory
  // Will be saved before NEXT risky operation
  return result;
}
```

**Atomic Write Pattern:**
```typescript
async function saveState(state: State) {
  const tempFile = `${STATE_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(state, null, 2));
  await fs.rename(tempFile, STATE_FILE); // Atomic on POSIX systems
}
```

**Applies to:** State manager (`src/config.ts`), orchestrator, all workflow functions

---

**Exit Code Pattern:**

**Rule:** Simple 0/1 exit codes

**Exit Codes:**
- `0` - Success (epic complete, workflow finished)
- `1` - Any error (user error, system error, API error)

**Detailed errors:** Written to stderr, not encoded in exit code

**Rationale:** Standard CLI convention, easier for shell scripts

**Applies to:** CLI entry point (`src/index.ts`), all error handlers

---

**Test Structure Pattern:**

**Rule:** Hybrid test structure - file/module describe, nested by function or scenario

**Pattern:**
```typescript
import { describe, test, expect } from 'bun:test';
import { functionToTest } from './module.js';

describe('module.ts - Module Description', () => {
  describe('functionToTest()', () => {
    test('should handle normal case', () => {
      expect(functionToTest(input)).toBe(expected);
    });

    test('should handle edge case', () => {
      expect(functionToTest(null)).toBeNull();
    });

    test('should throw on invalid input', () => {
      expect(() => functionToTest(invalid)).toThrow();
    });
  });

  describe('anotherFunction()', () => {
    // More tests...
  });
});
```

**Applies to:** All test files (`*.test.ts`)

---

**Coverage Validation Pattern:**

**Rule:** 100% coverage (true 90%+) for ALL NEW v1 code

**Validation Command:**
```bash
bun test --coverage
```

**Coverage Requirements:**
- **NEW code:** 90%+ required (UI components, migration logic, workflow router, CLI flags)
- **EXISTING code:** Continue current coverage (no regression)

**Pre-commit Checklist:**
1. Run `bun test --coverage`
2. Verify 90%+ for new files: `src/ui/*`, `src/config.ts` (migration), workflow functions
3. Verify all existing tests still pass
4. No coverage regressions

**Quality Gate:** v1 CANNOT release until new code reaches 90%+ coverage

**Applies to:** All new code in v1, enforced before release

## Enforcement Guidelines

**All AI Agents MUST:**

1. **Follow naming conventions exactly** - kebab-case files, camelCase functions/variables, PascalCase types, SCREAMING_SNAKE_CASE constants
2. **Use exact terminal output formats** - progress bars, status messages, phase headers, agent labels, error blocks as specified
3. **Implement retry logic with exponential backoff** - 3 attempts, 2s/4s/8s delays, save state before retries
4. **Save state before every risky operation** - atomic writes, before Claude spawn, before file writes, before API calls
5. **Write tests with 90%+ coverage for all new code** - co-located *.test.ts, hybrid test structure, inline fixtures for simple data
6. **Use consistent error message format** - [ERROR] prefix, brief description, context, "Try:" recovery command
7. **Respect existing v0.2.0 structure** - extend, don't replace; new UI components in src/ui/, utilities in src/utils/
8. **Maintain backward compatibility** - sequential mode default, existing flags unchanged, v0.2.0 state migration supported

**Pattern Enforcement:**

**During Development:**
- Code review against this document
- Test coverage validation (`bun test --coverage`)
- Manual testing of terminal output formatting
- Backward compatibility testing with v0.2.0 state files

**Pre-commit Validation:**
- All tests pass (`bun test`)
- Coverage ≥90% for new code
- No existing test regressions
- Terminal output matches format patterns

**Quality Gates:**
- v1 cannot release without 90%+ coverage for new code
- All patterns must be followed consistently
- No breaking changes to v0.2.0 behavior

**Pattern Updates:**
- Updates to this document require architecture revision
- All agents must be notified of pattern changes
- Migration plan required for breaking pattern changes

## Pattern Examples

**Good Examples:**

**File Naming:**
```
✅ src/ui/story-card.ts
✅ src/ui/story-card.test.ts
✅ src/workflows/batch-workflow.ts
```

**Code Naming:**
```typescript
✅ const MAX_RETRIES = 3;
✅ interface WorkflowState { mode: WorkflowMode; }
✅ function migrateV0toV1(oldState: any): State { ... }
✅ const currentPhase = state.workflow.phase;
```

**Terminal Output:**
```typescript
✅ console.log('Story 4/8 [████████░░░░░░░░] implementing...');
✅ console.log('[OK]    Story created successfully');
✅ console.log('━━━ Phase: Review ━━━');
✅ console.log('[SM]     Checking sprint status...');
```

**Error Handling:**
```typescript
✅ async function spawnAgent() {
    await saveState(state); // Save before risky op
    return await retryableOperation(
      () => spawnClaude(opts),
      'Claude spawn'
    );
  }
```

**Test Structure:**
```typescript
✅ describe('config.ts - State Migration', () => {
    describe('migrateV0toV1()', () => {
      test('should preserve currentEpic', () => {
        const result = migrateV0toV1(v020State);
        expect(result.currentEpic).toBe('user-auth');
      });
    });
  });
```

---

**Anti-Patterns (What to Avoid):**

**File Naming:**
```
❌ src/ui/StoryCard.ts (PascalCase)
❌ src/ui/story_card.ts (snake_case)
❌ src/ui/storyCard.test.ts (camelCase)
```

**Code Naming:**
```typescript
❌ const maxRetries = 3; (camelCase constant)
❌ interface IWorkflowState { ... } (prefix notation)
❌ function migrate_v0_to_v1() { ... } (snake_case)
❌ const current_phase = ...; (snake_case variable)
```

**Terminal Output:**
```typescript
❌ console.log('[4/8] ████░░░░ Implementing'); (wrong format)
❌ console.log('✓ Story created'); (no status prefix)
❌ console.log('--- PHASE: STORY CREATION ---'); (wrong separator)
❌ console.log('SM: Checking status'); (wrong agent format)
```

**Error Handling:**
```typescript
❌ // No retry logic
   const result = await riskyOperation();

❌ // Retry without backoff
   for (let i = 0; i < 3; i++) {
     try { return await op(); }
     catch { /* immediate retry */ }
   }

❌ // State saved AFTER risky operation
   const result = await riskyOp();
   await saveState(state); // Too late!
```

**Test Structure:**
```typescript
❌ // No describe blocks
   test('migrate works', () => { ... });

❌ // Unclear test organization
   describe('tests', () => {
     test('test 1', () => { ... });
     test('test 2', () => { ... });
   });
```

**Error Messages:**
```typescript
❌ console.error('Claude CLI not found'); // No recovery
❌ console.error('ERROR: Network failure'); // No brackets, no Try:
❌ throw new Error('Failed'); // Not actionable
```
