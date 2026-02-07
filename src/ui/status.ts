export function displayStatus(message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
  const icons = { info: 'ℹ', success: '✓', warning: '⚠', error: '✗' };
  console.log(`${icons[type]} ${message}`);
}
