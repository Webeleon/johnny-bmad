export function displayProgress(current: number, total: number): void {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * 20);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  console.log(`[${bar}] ${current}/${total} (${percentage}%)`);
}
