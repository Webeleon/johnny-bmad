import { readFile, writeFile, rename, unlink } from 'fs/promises';
import { join } from 'path';
import inquirer from 'inquirer';
import type { State, LegacyState, WorkflowMode, WorkflowPhase } from './types.js';
import { debug, warn } from './utils/logger.js';

const STATE_FILE = '.johnny-bmad-state.json';

/**
 * Error thrown when user declines state migration
 */
export class MigrationDeclinedError extends Error {
  constructor(message: string = 'User declined state migration') {
    super(message);
    this.name = 'MigrationDeclinedError';
  }
}

/**
 * Error thrown when user prompts fail in non-interactive environment
 * Used for migration prompts (Story 1.2) and future interactive flows
 */
export class NonInteractiveError extends Error {
  constructor(message: string = 'Cannot prompt in non-interactive environment') {
    super(message);
    this.name = 'NonInteractiveError';
  }
}

/**
 * Error thrown when state file cannot be read due to permission issues
 * Halts execution to prevent silent data loss (NFR-R6)
 *
 * Note: Named StatePermissionError to avoid potential collision with
 * TC39 Stage 3 PermissionError proposal (future Node.js global)
 */
export class StatePermissionError extends Error {
  constructor(message: string, public readonly recovery: string) {
    super(message);
    this.name = 'StatePermissionError';
  }
}

/**
 * Error thrown when migration completes but saving the migrated state fails
 * Provides recovery context to prevent user confusion (NFR-R6, Rule 5)
 */
export class MigrationSaveError extends Error {
  public readonly recovery: string;

  constructor(message: string, recovery: string, cause?: Error) {
    super(message, cause ? { cause } : undefined);
    this.name = 'MigrationSaveError';
    this.recovery = recovery;
  }
}

/**
 * Error thrown when user chooses to exit and fix corrupt state manually
 * Used in corrupt state recovery flow (Story 1.4)
 */
export class CorruptStateError extends Error {
  constructor(message: string = 'Corrupt state file - user chose to fix manually') {
    super(message);
    this.name = 'CorruptStateError';
  }
}

/**
 * Default workflow mode for new state objects and migrated legacy states
 * Ensures backward compatibility by defaulting to sequential mode
 *
 * Exported to prevent magic string duplication across the codebase
 * (e.g., orchestrator.ts for mode determination, test fixtures)
 *
 * @see _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md
 *      Migration Strategy section - documents why 'sequential' is the default mode
 */
export const DEFAULT_WORKFLOW_MODE: WorkflowMode = 'sequential';

/**
 * Default workflow phase for new state objects and migrated legacy states
 * Defaults to implementation phase for typical development workflows
 *
 * Exported to prevent magic string duplication across the codebase
 * (e.g., orchestrator.ts for phase determination, test fixtures)
 *
 * @see _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md
 *      Migration Strategy section - documents why 'implementation' is the default phase
 */
export const DEFAULT_WORKFLOW_PHASE: WorkflowPhase = 'implementation';

/**
 * Default epic ID used when partial recovery can't extract a valid currentEpic value
 * Used in attemptPartialRecovery() when currentEpic is missing, empty, or whitespace-only
 *
 * @see Story 1.4 - Corrupt State Detection and Recovery
 */
export const RECOVERY_DEFAULT_EPIC = 'epic-unknown';

export function getStateFilePath(cwd: string): string {
  return join(cwd, STATE_FILE);
}

/**
 * Detects hybrid states with both v0.2.0 and v1+ fields (invalid/ambiguous)
 * Pass top-level state objects only - sub-objects may false-positive.
 *
 * @internal Exported for unit testing only; use isValidState()/isLegacyState() in app code.
 */
export function isHybridState(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  // Explicitly reject arrays - function checks for plain objects only
  if (Array.isArray(obj)) return false;

  const state = obj as Record<string, unknown>;

  const hasV0Fields = 'completedStories' in state || 'currentStoryIndex' in state || 'devReviewIteration' in state;
  const hasV1Fields = 'workflow' in state || 'stories' in state;

  // Hybrid state: has BOTH v0.2.0 AND v1+ fields
  return hasV0Fields && hasV1Fields;
}

/**
 * Validates common top-level fields shared by both v1+ and v0.2.0 states
 * Reduces duplication between isValidState() and isLegacyState()
 *
 * @internal
 * @param obj - Object to validate (expected to be Record<string, unknown>)
 * @returns true if currentEpic and lastUpdated fields are valid
 */
function hasValidTopLevelFields(obj: Record<string, unknown>): boolean {
  // Check required top-level fields (non-empty strings)
  if (typeof obj.currentEpic !== 'string' || obj.currentEpic.trim() === '') return false;
  if (typeof obj.lastUpdated !== 'string' || obj.lastUpdated.trim() === '') return false;

  // Validate currentEpic against path traversal (defense-in-depth)
  // currentEpic is used in file path construction (e.g., finding epic-*.md files)
  // Only allow alphanumeric, hyphens, and underscores (typical epic ID pattern: "epic-1", "epic-42")
  const epicPattern = /^[a-zA-Z0-9_-]+$/;
  if (!epicPattern.test(obj.currentEpic)) return false;

  // Validate lastUpdated is a parseable date string
  // Prevents propagating/migrating invalid timestamps
  // Note: Date.parse() accepts many formats, not just ISO 8601
  if (isNaN(Date.parse(obj.lastUpdated))) return false;

  return true;
}

/**
 * Validates if an object is a valid v1+ State
 * Exported for testing and debugging utilities
 */
export function isValidState(obj: unknown): obj is State {
  if (!obj || typeof obj !== 'object') return false;

  const state = obj as Record<string, unknown>;

  // Validate common top-level fields using shared helper
  if (!hasValidTopLevelFields(state)) return false;

  // Reject hybrid states using shared helper
  if (isHybridState(obj)) return false;

  // Check workflow object (reject arrays)
  if (!state.workflow || typeof state.workflow !== 'object' || Array.isArray(state.workflow)) return false;
  const workflow = state.workflow as Record<string, unknown>;
  if (!['sequential', 'batch', 'dev-only'].includes(workflow.mode as string)) return false;
  if (!['story-creation', 'review', 'implementation'].includes(workflow.phase as string)) return false;
  if (!Number.isInteger(workflow.currentStoryIndex) || (workflow.currentStoryIndex as number) < 0) return false;
  if (!Number.isInteger(workflow.devReviewIteration) || (workflow.devReviewIteration as number) < 0) return false;

  // Check stories object
  if (!state.stories || typeof state.stories !== 'object') return false;
  const stories = state.stories as Record<string, unknown>;
  if (!Array.isArray(stories.completed)) return false;

  // Validate all completed array elements are non-empty strings
  if (!stories.completed.every((item: unknown) => typeof item === 'string' && item.trim() !== '')) return false;

  // Check stories.approvals is a plain object (reject arrays)
  if (!stories.approvals || typeof stories.approvals !== 'object' || Array.isArray(stories.approvals)) return false;

  // Validate stories.approvals values are valid StoryApprovalStatus
  const approvals = stories.approvals as Record<string, unknown>;
  const validStatuses = ['approved', 'needs-changes', 'pending'];
  for (const status of Object.values(approvals)) {
    if (!validStatuses.includes(status as string)) return false;
  }

  return true;
}

/**
 * Validates if an object is a legacy v0.2.0 state (requires migration)
 * Exported for testing and debugging utilities
 */
export function isLegacyState(obj: unknown): obj is LegacyState {
  if (!obj || typeof obj !== 'object') return false;

  const state = obj as Record<string, unknown>;

  // Validate common top-level fields using shared helper
  if (!hasValidTopLevelFields(state)) return false;

  // Check numeric fields (non-negative integers)
  if (!Number.isInteger(state.currentStoryIndex) || (state.currentStoryIndex as number) < 0) return false;
  if (!Number.isInteger(state.devReviewIteration) || (state.devReviewIteration as number) < 0) return false;

  // Check array field - validate all elements are non-empty strings (matching isValidState consistency)
  if (!Array.isArray(state.completedStories)) return false;
  if (!state.completedStories.every((item: unknown) => typeof item === 'string' && item.trim() !== '')) return false;

  // Ensure it's NOT v1 structure (no nested workflow/stories objects) using shared helper
  if (isHybridState(obj)) return false;

  return true;
}

/**
 * Migrates a legacy v0.2.0 state to v1+ format
 *
 * @param legacyState - The legacy state object to migrate
 * @returns A new State object with v1+ structure
 *
 * @example
 * ```typescript
 * const legacy: LegacyState = {
 *   currentEpic: 'epic-1',
 *   currentStoryIndex: 2,
 *   devReviewIteration: 1,
 *   completedStories: ['story-1', 'story-2'],
 *   lastUpdated: '2026-01-15T10:30:00.000Z' // ISO-8601 timestamp
 * };
 * const migrated = migrateV0toV1(legacy);
 * // migrated.workflow.mode === 'sequential'
 * // migrated.workflow.currentStoryIndex === 2
 * ```
 *
 * @remarks
 * **Defensive Copy Design Decision:**
 * - Arrays (completedStories) are defensively copied using spread operator
 * - Objects (workflow, stories, approvals) are created fresh inline
 * - If future code adds nested objects/arrays, consider implementing deep clone pattern
 * - Current implementation sufficient as all nested structures are primitives or empty objects
 */
export function migrateV0toV1(legacyState: LegacyState): State {
  return {
    // Preserve top-level fields
    currentEpic: legacyState.currentEpic,
    lastUpdated: legacyState.lastUpdated,

    // Map to workflow object
    workflow: {
      mode: DEFAULT_WORKFLOW_MODE, // Default to sequential mode for backward compatibility
      phase: DEFAULT_WORKFLOW_PHASE, // Default to implementation phase
      currentStoryIndex: legacyState.currentStoryIndex,
      devReviewIteration: legacyState.devReviewIteration
    },

    // Map to stories object
    stories: {
      completed: [...legacyState.completedStories], // Defensive copy to prevent unintended mutations
      approvals: {} // Default to empty approvals
    }
  };
}

/**
 * Prompts user to migrate legacy v0.2.0 state to v1+ format
 *
 * @param legacyState - The legacy state to migrate
 * @param cwd - Current working directory
 * @returns Migrated State if user confirms
 * @throws {MigrationDeclinedError} When user declines migration
 * @throws {NonInteractiveError} When prompt fails in non-interactive environment
 *
 * @example
 * ```typescript
 * try {
 *   const migrated = await promptMigration(legacy, cwd);
 *   // User confirmed: returns migrated State
 * } catch (error) {
 *   if (error instanceof MigrationDeclinedError) {
 *     // User declined migration
 *     console.log('Try: Delete .johnny-bmad-state.json to start fresh');
 *     process.exit(1);
 *   }
 * }
 * ```
 */
export async function promptMigration(
  legacyState: LegacyState,
  cwd: string
): Promise<State> {
  // Proactive TTY check - safer than fragile string matching on error messages
  // Inquirer error messages have no API contract, so we check stdin.isTTY first
  if (!process.stdin.isTTY) {
    // Per project-context.md Rule 5: Error messages must include recovery
    warn('Cannot prompt for migration in non-interactive environment');
    warn('Try: Run in interactive terminal or delete .johnny-bmad-state.json to start fresh');
    throw new NonInteractiveError();
  }

  // Narrow try/catch to only wrap inquirer.prompt() call
  // Prevents self-catch pattern where MigrationDeclinedError is caught and re-thrown
  let confirmed: boolean;
  try {
    const response = await inquirer.prompt<{ confirmed: boolean }>([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Migrate state file to v1 format?',
        default: true
      }
    ]);
    confirmed = response.confirmed;
  } catch (error) {
    // Unexpected error during prompt (not non-interactive since we checked TTY above)
    // Per project-context.md Rule 5: Error messages must include recovery
    warn(`Unexpected error during migration prompt: ${error instanceof Error ? error.message : String(error)}`);
    warn('Try: Delete .johnny-bmad-state.json to start fresh');
    throw error; // Propagate unexpected errors
  }

  // Handle user response outside try/catch (no self-catch pattern)
  if (confirmed) {
    // User confirmed migration
    const migrated = migrateV0toV1(legacyState);

    // Attempt to save migrated state with error context
    // Per NFR-R6 and Rule 5: surface save failures with recovery guidance
    let writtenTimestamp: string;
    try {
      writtenTimestamp = await saveState(cwd, migrated);
      debug(`Migrated legacy state at ${getStateFilePath(cwd)} to v1 format`);
    } catch (saveError) {
      // Migration computed successfully, but save failed
      // Wrap in MigrationSaveError to provide clear recovery context in CLI
      throw new MigrationSaveError(
        'Migration completed but failed to save new state file',
        'Try: Fix disk/permissions and restart to retry migration. Your original legacy state file should be intact.',
        saveError instanceof Error ? saveError : undefined
      );
    }

    // Return in-memory copy with exact timestamp that was written to disk
    // This ensures in-memory state matches disk state (no timestamp drift)
    const stateWithDiskTimestamp: State = {
      ...migrated,
      lastUpdated: writtenTimestamp
    };

    // Defensive validation: ensure returned state is valid after timestamp spread
    // Guards against future bugs where saveState timestamp logic changes
    // NOTE: This validation is OUTSIDE try/catch to avoid misclassifying validation failures as save errors
    if (!isValidState(stateWithDiskTimestamp)) {
      throw new Error('Internal error: migrated state with disk timestamp failed validation');
    }

    return stateWithDiskTimestamp;
  } else {
    // User declined migration - throw error to let caller handle exit
    // Per project-context.md Rule 5: Error messages must include recovery
    warn('Migration declined.');
    warn('Try: Delete .johnny-bmad-state.json to start fresh');
    throw new MigrationDeclinedError('User declined state migration');
  }
}

/**
 * Attempts to partially recover a structurally invalid state
 *
 * @param parsed - The parsed but invalid state object
 * @param cwd - Current working directory
 * @returns Recovered State if user accepts, or null if user rejects/nothing recoverable
 * @throws {CorruptStateError} When user chooses to exit and fix manually (via promptCorruptRecovery)
 * @throws {NonInteractiveError} When prompt fails in non-interactive environment
 *
 * @remarks
 * This function attempts to extract valid fields from a state that failed `isValidState()` and `isLegacyState()`.
 * It recovers what it can, fills missing fields with defaults, and prompts user for acceptance.
 * If nothing is recoverable, it falls through to promptCorruptRecovery().
 *
 * @example
 * ```typescript
 * const partialState = {
 *   currentEpic: 'epic-1',
 *   lastUpdated: '2026-02-05...',
 *   workflow: { mode: 'invalid-mode' } // Invalid field
 * };
 * const recovered = await attemptPartialRecovery(partialState, cwd);
 * // recovered.currentEpic === 'epic-1' (preserved)
 * // recovered.workflow.mode === 'sequential' (default)
 * ```
 */
export async function attemptPartialRecovery(
  parsed: unknown,
  cwd: string
): Promise<State | null> {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    // Cannot recover from non-object - fall through to corrupt prompt
    return await promptCorruptRecovery(cwd);
  }

  const obj = parsed as Record<string, unknown>;
  const recovered: Partial<State> = {};
  const lost: string[] = [];

  // Try to recover currentEpic
  if (typeof obj.currentEpic === 'string' && obj.currentEpic.trim() !== '') {
    const epicPattern = /^[a-zA-Z0-9_-]+$/;
    if (epicPattern.test(obj.currentEpic)) {
      recovered.currentEpic = obj.currentEpic;
    } else {
      lost.push('currentEpic (invalid pattern)');
    }
  } else {
    lost.push('currentEpic');
  }

  // Try to recover lastUpdated
  if (typeof obj.lastUpdated === 'string' && !isNaN(Date.parse(obj.lastUpdated))) {
    recovered.lastUpdated = obj.lastUpdated;
  } else {
    lost.push('lastUpdated');
  }

  // Try to recover workflow fields
  let workflowRecovered = false;
  if (obj.workflow && typeof obj.workflow === 'object' && !Array.isArray(obj.workflow)) {
    const workflow = obj.workflow as Record<string, unknown>;
    const partialWorkflow: Record<string, unknown> = {};

    if (['sequential', 'batch', 'dev-only'].includes(workflow.mode as string)) {
      partialWorkflow.mode = workflow.mode;
    }
    if (['story-creation', 'review', 'implementation'].includes(workflow.phase as string)) {
      partialWorkflow.phase = workflow.phase;
    }
    if (Number.isInteger(workflow.currentStoryIndex) && (workflow.currentStoryIndex as number) >= 0) {
      partialWorkflow.currentStoryIndex = workflow.currentStoryIndex;
    }
    if (Number.isInteger(workflow.devReviewIteration) && (workflow.devReviewIteration as number) >= 0) {
      partialWorkflow.devReviewIteration = workflow.devReviewIteration;
    }

    if (Object.keys(partialWorkflow).length > 0) {
      // `as any` needed: partialWorkflow is Record<string, unknown> but workflow expects State['workflow']
      // TypeScript can't verify partial objects match full interface at compile time
      recovered.workflow = partialWorkflow as any;
      workflowRecovered = true;
    }
  }
  if (!workflowRecovered) {
    lost.push('workflow');
  }

  // Try to recover stories fields
  let storiesRecovered = false;
  if (obj.stories && typeof obj.stories === 'object' && !Array.isArray(obj.stories)) {
    const stories = obj.stories as Record<string, unknown>;
    const partialStories: Record<string, unknown> = {};

    if (Array.isArray(stories.completed) && stories.completed.every((item: unknown) => typeof item === 'string' && item.trim() !== '')) {
      partialStories.completed = [...stories.completed]; // Defensive copy to prevent downstream mutation
    }
    if (stories.approvals && typeof stories.approvals === 'object' && !Array.isArray(stories.approvals)) {
      const approvals = stories.approvals as Record<string, unknown>;
      const validStatuses = ['approved', 'needs-changes', 'pending'];
      const allValid = Object.values(approvals).every((status: unknown) =>
        typeof status === 'string' && validStatuses.includes(status)
      );
      if (allValid) {
        partialStories.approvals = { ...approvals }; // Defensive copy to prevent downstream mutation
      }
    }

    if (Object.keys(partialStories).length > 0) {
      // `as any` needed: partialStories is Record<string, unknown> but stories expects State['stories']
      // TypeScript can't verify partial objects match full interface at compile time
      recovered.stories = partialStories as any;
      storiesRecovered = true;
    }
  }
  if (!storiesRecovered) {
    lost.push('stories');
  }

  // If nothing recoverable, fall through to corrupt prompt
  if (!recovered.currentEpic && !recovered.lastUpdated && !workflowRecovered && !storiesRecovered) {
    debug('No fields recoverable from invalid state');
    return await promptCorruptRecovery(cwd);
  }

  // Display what was recovered vs lost
  const recoveredFields = Object.keys(recovered).filter(key => recovered[key as keyof State] !== undefined);
  if (recoveredFields.length > 0) {
    warn(`Recovered fields: ${recoveredFields.join(', ')}`);
  }
  if (lost.length > 0) {
    warn(`Lost fields: ${lost.join(', ')}`);
  }

  // Proactive TTY check
  if (!process.stdin.isTTY) {
    warn('Cannot prompt for partial recovery acceptance in non-interactive environment');
    warn('Try: Run in interactive terminal or delete .johnny-bmad-state.json to start fresh');
    throw new NonInteractiveError();
  }

  // Prompt user to accept partial recovery
  let accept: boolean;
  try {
    const response = await inquirer.prompt<{ accept: boolean }>([
      {
        type: 'confirm',
        name: 'accept',
        message: 'Accept partial recovery with defaults for missing fields?',
        default: true
      }
    ]);
    accept = response.accept;
  } catch (error) {
    warn(`Unexpected error during recovery prompt: ${error instanceof Error ? error.message : String(error)}`);
    warn('Try: Delete .johnny-bmad-state.json to start fresh');
    throw error;
  }

  if (!accept) {
    // User rejected - offer corrupt recovery options
    debug('User rejected partial recovery');
    return await promptCorruptRecovery(cwd);
  }

  // Build complete state with recovered + defaults
  const completeState: State = {
    currentEpic: recovered.currentEpic ?? RECOVERY_DEFAULT_EPIC,
    lastUpdated: recovered.lastUpdated ?? new Date().toISOString(),
    workflow: {
      // `as any` needed: recovered.workflow/stories are Record<string, unknown> | undefined
      // Safe because we validated fields during recovery extraction above
      mode: (recovered.workflow as any)?.mode ?? DEFAULT_WORKFLOW_MODE,
      phase: (recovered.workflow as any)?.phase ?? DEFAULT_WORKFLOW_PHASE,
      currentStoryIndex: (recovered.workflow as any)?.currentStoryIndex ?? 0,
      devReviewIteration: (recovered.workflow as any)?.devReviewIteration ?? 0
    },
    stories: {
      // `as any` needed: same reason as workflow - validated during extraction
      completed: (recovered.stories as any)?.completed ?? [],
      approvals: (recovered.stories as any)?.approvals ?? {}
    }
  };

  // Save recovered state using atomic write and get disk timestamp
  let writtenTimestamp: string;
  try {
    writtenTimestamp = await saveState(cwd, completeState);
    debug('Saved recovered state with defaults');
  } catch (saveError) {
    throw new MigrationSaveError(
      'Partial recovery completed but failed to save new state file',
      'Try: Fix disk/permissions and restart to retry recovery',
      saveError instanceof Error ? saveError : undefined
    );
  }

  // Return the saved state with disk timestamp (avoid re-reading from disk)
  const stateWithDiskTimestamp: State = {
    ...completeState,
    lastUpdated: writtenTimestamp
  };

  // Defensive validation: ensure returned state is valid after timestamp spread
  if (!isValidState(stateWithDiskTimestamp)) {
    throw new Error('Internal error: recovered state with disk timestamp failed validation');
  }

  return stateWithDiskTimestamp;
}

/**
 * Prompts user to recover from corrupt state file
 *
 * @param cwd - Current working directory
 * @returns null if user chooses to delete and start fresh
 * @throws {CorruptStateError} When user chooses to exit and fix manually
 * @throws {NonInteractiveError} When prompt fails in non-interactive environment
 *
 * @remarks
 * This function is called when loadState() detects invalid JSON or structurally invalid state.
 * It offers two recovery options:
 * 1. Delete corrupt state and start fresh (returns null)
 * 2. Exit and fix manually (throws CorruptStateError)
 *
 * @example
 * ```typescript
 * try {
 *   const result = await promptCorruptRecovery(cwd);
 *   if (result === null) {
 *     // User chose to delete - orchestrator will create fresh state
 *   }
 * } catch (error) {
 *   if (error instanceof CorruptStateError) {
 *     // User chose to exit and fix manually
 *     console.log(error.message);
 *     process.exit(1);
 *   }
 * }
 * ```
 */
export async function promptCorruptRecovery(cwd: string): Promise<null> {
  // Proactive TTY check - same pattern as promptMigration()
  if (!process.stdin.isTTY) {
    // Per project-context.md Rule 5: Error messages must include recovery
    warn('Cannot prompt for recovery in non-interactive environment');
    warn('Try: Run in interactive terminal or delete .johnny-bmad-state.json to start fresh');
    throw new NonInteractiveError();
  }

  // Display corrupt state warning
  warn('Corrupt state file detected');

  // Narrow try/catch to only wrap inquirer.prompt() call
  let option: string;
  try {
    const response = await inquirer.prompt<{ option: string }>([
      {
        type: 'list',
        name: 'option',
        message: 'Corrupt state file detected. Choose recovery option:',
        choices: [
          { name: '1. Delete and start fresh', value: '1' },
          { name: '2. Exit and fix manually', value: '2' }
        ]
      }
    ]);
    option = response.option;
  } catch (error) {
    // Unexpected error during prompt (not non-interactive since we checked TTY above)
    // Per project-context.md Rule 5: Error messages must include recovery
    warn(`Unexpected error during recovery prompt: ${error instanceof Error ? error.message : String(error)}`);
    warn('Try: Delete .johnny-bmad-state.json to start fresh');
    throw error; // Propagate unexpected errors
  }

  // Handle user response outside try/catch (no self-catch pattern)
  if (option === '1') {
    // User chose to delete and start fresh
    await clearState(cwd);
    debug('Deleted corrupt state file - starting fresh');
    return null;
  } else {
    // User chose to exit and fix manually
    // Per project-context.md Rule 5: Error messages must include recovery
    warn('Exiting to allow manual state file fix');
    warn('Try: Fix JSON in .johnny-bmad-state.json or delete the file');
    throw new CorruptStateError('User chose to exit and fix corrupt state manually');
  }
}

export async function loadState(cwd: string): Promise<State | null> {
  const statePath = getStateFilePath(cwd);
  try {
    const content = await readFile(statePath, 'utf-8');

    // Parse JSON and validate structure
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      debug(`State file corrupted: invalid JSON at ${statePath}`);
      // Offer interactive recovery instead of silent null return
      return await promptCorruptRecovery(cwd);
    }

    // Validate it's a valid v1+ State
    if (isValidState(parsed)) {
      debug(`Loaded v1+ state from ${statePath}`);
      return parsed;
    }

    // Check if it's a legacy v0.2.0 state (needs migration)
    if (isLegacyState(parsed)) {
      debug(`Detected legacy v0.2.0 state at ${statePath} - prompting user for migration`);
      // Migration errors propagate to outer catch, which re-throws MigrationDeclinedError/NonInteractiveError
      return await promptMigration(parsed, cwd);
    }

    // State file exists but has invalid/unknown structure
    // Attempt partial recovery instead of silent null return (Story 1.4, AC #2)
    debug(`State file has invalid structure at ${statePath} - attempting partial recovery`);
    return await attemptPartialRecovery(parsed, cwd);
  } catch (error: unknown) {
    // Re-throw migration, permission, corrupt state, and unknown errors to caller (CLI handles exit)
    // Prevents silent null return that could cause orchestrator to overwrite user's legacy progress
    if (
      error instanceof MigrationDeclinedError ||
      error instanceof MigrationSaveError ||
      error instanceof NonInteractiveError ||
      error instanceof StatePermissionError ||
      error instanceof CorruptStateError
    ) {
      throw error;
    }

    // Distinguish between expected (file not found) and filesystem errors
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      debug('No existing state file found');
      return null;
    } else if (err.code === 'EACCES') {
      // NFR-R6 (zero data loss): Throw error to halt execution and prevent silent data loss
      // Per project-context.md Rule 5: Error messages must include recovery
      throw new StatePermissionError(
        `Permission denied reading state file at ${statePath}`,
        'Try: chmod 644 .johnny-bmad-state.json'
      );
    } else {
      // Re-throw unexpected errors (e.g., inquirer errors, JSON.parse failures, unknown fs errors)
      // Prevents silent data loss by halting execution instead of returning null
      // Note: Only log error message, not full path, to avoid leaking local machine structure
      debug(`Unexpected error reading state: ${err.message || 'unknown error'}`);
      throw error;
    }
  }
}

/**
 * Saves state to disk with atomic write pattern
 *
 * @param cwd - Current working directory
 * @param state - State object to save
 * @returns Promise resolving with ISO timestamp string written to disk
 *
 * @remarks
 * The returned timestamp is the exact value written to state.lastUpdated on disk.
 * This is critical for promptMigration() which needs the disk timestamp to avoid drift.
 */
export async function saveState(cwd: string, state: State): Promise<string> {
  const statePath = getStateFilePath(cwd);
  const tmpPath = `${statePath}.tmp`;

  // Shallow copy with updated timestamp to avoid mutating input's lastUpdated field
  // Note: Nested objects (workflow, stories) remain references, but this is safe because
  // JSON.stringify is synchronous - no mutation risk between copy and serialization
  //
  // Defensive Copy Strategy Alignment:
  // - saveState() uses shallow copy (performance) - safe due to synchronous serialization
  // - migrateV0toV1() uses deep copy (safety) - prevents legacy state mutations
  // Different contexts, appropriate strategies for each use case
  const timestamp = new Date().toISOString();
  const toSave: State = {
    ...state,
    lastUpdated: timestamp
  };

  // Atomic write: write to .tmp file, then rename (Rule 8 from project-context.md)
  try {
    await writeFile(tmpPath, JSON.stringify(toSave, null, 2), 'utf-8');
    await rename(tmpPath, statePath);
    debug(`Saved state to ${statePath}`);
    return timestamp; // Return the exact timestamp written to disk
  } catch (error) {
    // Clean up orphaned .tmp file if rename fails (e.g., cross-device, disk full)
    // Per NFR-R6 and Rule 8: prevent temp file accumulation
    try {
      await unlink(tmpPath);
      debug(`Cleaned up orphaned temp file: ${tmpPath}`);
    } catch (unlinkError) {
      // Best effort cleanup - distinguish ENOENT (no temp file exists) from genuine failures
      const isENOENT = unlinkError instanceof Error && 'code' in unlinkError && unlinkError.code === 'ENOENT';
      if (isENOENT) {
        debug(`No temp file to cleanup (writeFile likely failed before creating ${tmpPath})`);
      } else {
        debug(`Failed to cleanup temp file ${tmpPath}: ${unlinkError}`);
      }
    }
    // Re-throw original error to caller
    throw error;
  }
}

export function createInitialState(epicId: string): State {
  return {
    currentEpic: epicId,
    lastUpdated: new Date().toISOString(),
    workflow: {
      mode: DEFAULT_WORKFLOW_MODE,
      phase: DEFAULT_WORKFLOW_PHASE,
      currentStoryIndex: 0,
      devReviewIteration: 0
    },
    stories: {
      completed: [],
      approvals: {}
    }
  };
}

export async function clearState(cwd: string): Promise<void> {
  const statePath = getStateFilePath(cwd);
  try {
    await unlink(statePath);
    debug('Cleared state file');
  } catch (error) {
    // Only ignore ENOENT (file doesn't exist), surface other errors
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      debug('State file does not exist, nothing to clear');
      return;
    }

    // Surface permission errors and other failures
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new StatePermissionError(
        `Cannot delete state file at ${statePath} - permission denied`,
        'Try: chmod 644 .johnny-bmad-state.json or check file ownership'
      );
    }

    // Re-throw any other unexpected errors
    throw error;
  }
}
