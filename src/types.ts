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

export interface State {
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
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

export interface ClaudeResult {
  durationMs: number;
}
