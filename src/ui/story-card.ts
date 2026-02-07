export function displayStoryCard(storyId: string, title: string, status: string): void {
  const maxContent = 34; // inner width of box
  const truncId = storyId.length > maxContent - 7 ? storyId.slice(0, maxContent - 10) + '...' : storyId;
  const truncTitle = title.length > maxContent ? title.slice(0, maxContent - 3) + '...' : title;
  const truncStatus = status.length > maxContent - 8 ? status.slice(0, maxContent - 11) + '...' : status;

  console.log(`
┌────────────────────────────────────┐
│ Story: ${truncId.padEnd(maxContent - 7)}│
│ ${truncTitle.padEnd(maxContent)}│
│ Status: ${truncStatus.padEnd(maxContent - 8)}│
└────────────────────────────────────┘
`);
}
