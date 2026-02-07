export function displayError(message: string, recovery?: string): void {
  console.error(`\n[ERROR] ${message}`);
  if (recovery) {
    console.error(`[RECOVERY] ${recovery}\n`);
  }
}
