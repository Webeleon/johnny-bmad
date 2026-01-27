/**
 * Timer utility for tracking elapsed time during orchestration.
 */

export interface Timer {
  elapsed: () => number;
  format: () => string;
}

/**
 * Format milliseconds as human-readable duration.
 * Examples: "45s", "2m 34s", "1h 2m"
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * Create a timer that tracks elapsed time from creation.
 */
export function createTimer(): Timer {
  const startTime = Date.now();

  return {
    elapsed: () => Date.now() - startTime,
    format: () => formatDuration(Date.now() - startTime)
  };
}

// Module-level session timer
let sessionTimer: Timer | null = null;

/**
 * Start the session timer. Call once at the beginning of orchestration.
 */
export function startSessionTimer(): void {
  sessionTimer = createTimer();
}

/**
 * Get formatted session elapsed time.
 * Returns "0s" if session timer hasn't been started.
 */
export function getSessionElapsed(): string {
  if (!sessionTimer) {
    return '0s';
  }
  return sessionTimer.format();
}

/**
 * Get raw session elapsed milliseconds.
 * Returns 0 if session timer hasn't been started.
 */
export function getSessionElapsedMs(): number {
  if (!sessionTimer) {
    return 0;
  }
  return sessionTimer.elapsed();
}
