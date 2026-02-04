/**
 * Workflow execution mode
 * - sequential: Process stories one at a time (default)
 * - batch: Create all stories upfront, then implement
 * - dev-only: Skip story creation and review, only implement
 */
export type WorkflowMode = 'sequential' | 'batch' | 'dev-only';

/**
 * Current phase in the workflow execution
 * - story-creation: Creating story files from epics
 * - review: Reviewing implemented code
 * - implementation: Implementing story requirements
 */
export type WorkflowPhase = 'story-creation' | 'review' | 'implementation';

/**
 * Story approval status after review
 * - approved: Story passed review and is complete
 * - needs-changes: Story requires fixes before completion
 * - pending: Story awaiting review
 */
export type StoryApprovalStatus = 'approved' | 'needs-changes' | 'pending';

/**
 * Workflow state tracking for enhanced orchestration modes (v1+)
 *
 * Tracks the current execution mode, phase, story index, and iteration count.
 * Used by sequential, batch, and dev-only workflow modes to coordinate
 * story creation, implementation, and review cycles.
 *
 * @property mode - Workflow execution mode (sequential/batch/dev-only)
 * @property phase - Current workflow phase (story-creation/review/implementation)
 * @property currentStoryIndex - Zero-based index of current story being processed
 * @property devReviewIteration - Number of dev-review cycles for current story (batch/dev-only modes)
 */
export interface WorkflowState {
  mode: WorkflowMode;
  phase: WorkflowPhase;
  currentStoryIndex: number;
  devReviewIteration: number;
}

/**
 * Story progress tracking with approval states (v1+)
 *
 * Maintains lists of completed stories and their review approval status.
 * The approvals field enables batch and dev-only workflow modes to track
 * which stories have been approved, need changes, or are pending review.
 *
 * @property completed - Array of completed story IDs (e.g., ['story-1', 'story-2'])
 * @property approvals - Map of story ID to approval status (approved/needs-changes/pending)
 *
 * @example
 * ```typescript
 * const stories: StoriesState = {
 *   completed: ['story-1', 'story-2'],
 *   approvals: {
 *     'story-1': 'approved',
 *     'story-2': 'needs-changes',
 *     'story-3': 'pending'
 *   }
 * };
 * ```
 *
 * @note In sequential mode (v0.2.0 behavior), approvals remain empty as stories
 *       are created and implemented one at a time without batch review.
 */
export interface StoriesState {
  completed: string[];
  approvals: Record<string, StoryApprovalStatus>;
}

export interface CliArgs {
  resume: boolean;
  help: boolean;
  verbose: boolean;
  maxIterations?: number;
  yolo: boolean;
}

export interface BmadConfig {
  project: {
    name: string;
    description?: string;
  };
  testing?: {
    command?: string;
  };
}

export interface SprintStatus {
  generated?: string;
  project?: string;
  tracking_system?: string;
  story_location?: string;
  development_status?: Record<string, string>;
  sprint?: {
    number: number;
    status: string;
    startDate?: string;
    endDate?: string;
  };
  stories?: StoryStatus[];
}

export interface StoryStatus {
  id: string;
  title: string;
  status: 'pending' | 'ready-for-dev' | 'in-progress' | 'review' | 'done' | 'blocked';
  epic?: string;
}

export interface OngoingWork {
  epicId: string;
  stories: Array<{ id: string; status: string }>;
  source: 'state' | 'sprint-status';
}

export interface Epic {
  id: string;
  title: string;
  description?: string;
  stories: EpicStory[];
  filePath: string;
}

export interface EpicStory {
  id: string;
  title: string;
  status?: string;
}

export interface Story {
  id: string;
  title: string;
  description?: string;
  acceptanceCriteria: AcceptanceCriterion[];
  filePath: string;
}

export interface AcceptanceCriterion {
  text: string;
  done: boolean;
}

/**
 * Enhanced state schema for v1+ with workflow mode support
 */
export interface State {
  // Core identifiers
  currentEpic: string;
  lastUpdated: string;

  // Workflow state
  workflow: WorkflowState;

  // Progress tracking
  stories: StoriesState;
}

/**
 * Legacy state schema from v0.2.0 for migration support
 *
 * Represents the flat state structure used in johnny-bmad v0.2.0 and earlier.
 * This interface is used by the migration logic (Story 1.2) to detect and
 * transform legacy state files to the new v1+ nested structure.
 *
 * @deprecated This schema is for migration only. Use {@link State} for v1+.
 *
 * **Migration Mapping (v0.2.0 → v1+):**
 * - `currentEpic` → `State.currentEpic` (preserved at top level)
 * - `currentStoryIndex` → `State.workflow.currentStoryIndex`
 * - `devReviewIteration` → `State.workflow.devReviewIteration`
 * - `completedStories` → `State.stories.completed`
 * - `lastUpdated` → `State.lastUpdated` (preserved at top level)
 *
 * **New fields added in v1:**
 * - `State.workflow.mode` (defaults to 'sequential' on migration)
 * - `State.workflow.phase` (defaults to 'implementation' on migration)
 * - `State.stories.approvals` (defaults to empty object on migration)
 *
 * @see {@link State} for the current v1+ state schema
 * @see {@link loadState} for migration logic (Story 1.2: Implement v0.2.0 State Detection and Migration)
 *
 * @example
 * ```typescript
 * // Example legacy v0.2.0 state file
 * const legacyState: LegacyState = {
 *   currentEpic: 'epic-1',
 *   currentStoryIndex: 2,
 *   devReviewIteration: 1,
 *   completedStories: ['story-1', 'story-2'],
 *   lastUpdated: '2024-01-15T10:30:00.000Z'
 * };
 * ```
 */
export interface LegacyState {
  currentEpic: string;
  currentStoryIndex: number;
  devReviewIteration: number;
  completedStories: string[];
  lastUpdated: string;
}

export interface ClaudeOptions {
  model: 'opus' | 'sonnet';
  prompt: string;
  cwd: string;
  allowedTools?: string[];
  agentRole?: string;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

export interface ClaudeResult {
  durationMs: number;
}
