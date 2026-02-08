export interface CelebrationStats {
  stories: number;
  files: number;
  duration: string;
}

export function displayCelebration(_stats: CelebrationStats): void {}

export function displayResumeMessage(
  _epic: string,
  _storyNum: number,
  _totalStories: number,
  _phase: string
): void {}
