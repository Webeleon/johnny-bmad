/**
 * Check if Unicode is supported by the terminal.
 * Returns false for TERM=dumb or when explicitly requested via JOHNNY_BMAD_ASCII.
 */
export function isUnicodeSupported(): boolean {
  return process.env.TERM !== 'dumb' && process.env.JOHNNY_BMAD_ASCII !== '1';
}
