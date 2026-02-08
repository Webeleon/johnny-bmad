export interface CelebrationStats {
  stories: number;
  files: number;
  duration: string;
}

export function displayCelebration(stats: CelebrationStats): void {}

export function displayResumeMessage(epic: string, storyNum: number, totalStories: number, phase: string): void {}
