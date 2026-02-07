import chalk from 'chalk';
import { isUnicodeSupported } from './unicode-support.js';

const BAR_WIDTH = 16;
const UNICODE_FILLED = '█';
const UNICODE_EMPTY = '░';
const ASCII_FILLED = '#';
const ASCII_EMPTY = '-';

export function displayProgress(current: number, total: number, status: string): void {
  const useUnicode = isUnicodeSupported();
  const filled = useUnicode ? UNICODE_FILLED : ASCII_FILLED;
  const empty = useUnicode ? UNICODE_EMPTY : ASCII_EMPTY;

  const rawFilledCount = total > 0 ? Math.round((current / total) * BAR_WIDTH) : 0;
  const filledCount = Math.max(0, Math.min(BAR_WIDTH, rawFilledCount)) || 0;
  const emptyCount = BAR_WIDTH - filledCount;

  const bar = filled.repeat(filledCount) + empty.repeat(emptyCount);
  const suffix = current >= total ? '' : '...';

  console.log(chalk.cyan(`Story ${current}/${total} [${bar}] ${status}${suffix}`));
}
