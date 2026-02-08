export interface StoryCardData {
  title: string;
  epicId: string;
  storyId: string;
  acceptanceCriteria: string[];
  tasks: string[];
}

export function displayStoryCard(_story: StoryCardData, _index: number, _total: number): void {}

// NOTE: Signature matches architecture example (project-structure-boundaries.md:558)
// Implementation will be completed in Story 3.7
export async function promptStoryApproval(
  _story: StoryCardData,
  _index: number,
  _total: number
): Promise<'approved' | 'needs-changes' | 'view'> {
  return 'approved';
}
