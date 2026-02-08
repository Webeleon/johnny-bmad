import chalk from 'chalk';
import { isUnicodeSupported } from './unicode-support.js';

// Unicode banner with box-drawing characters (from UX spec)
const UNICODE_BANNER = `     ██╗ ██████╗ ██╗  ██╗███╗   ██╗███╗   ██╗██╗   ██╗
     ██║██╔═══██╗██║  ██║████╗  ██║████╗  ██║╚██╗ ██╔╝
     ██║██║   ██║███████║██╔██╗ ██║██╔██╗ ██║ ╚████╔╝
██   ██║██║   ██║██╔══██║██║╚██╗██║██║╚██╗██║  ╚██╔╝
╚█████╔╝╚██████╔╝██║  ██║██║ ╚████║██║ ╚████║   ██║
 ╚════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝   ╚═╝
                    ╔╗ ╔╦╗╔═╗╔╦╗
                    ╠╩╗║║║╠═╣ ║║  🎸 Go Johnny Go!
                    ╚═╝╩ ╩╩ ╩═╩╝
`;

// ASCII-only fallback banner for terminals without Unicode support
// Uses recognizable ASCII art with literal text labels for clarity
const ASCII_BANNER = `
     ###   ####  #   # #   # #   # #   #
      #   #    # #   # ##  # ##  # #   #
      #   #    # ##### # # # # # #  ###
  #   #   #    # #   # #  ## #  ##   #
   ###     ####  #   # #   # #   #   #
                   JOHNNY

                  ####  #   #   #   ####
                  #   # ## ##  # #  #   #  > Go Johnny Go!
                  ####  # # #  ###  #   #
                  #   # #   # #   # #   #
                  ####  #   # #   # ####
                   BMAD
`;

/**
 * Displays the JOHNNY BMAD ASCII art banner with tagline.
 * Uses cyan color by default, respects NO_COLOR environment variable.
 * Falls back to ASCII-only version if Unicode is not supported.
 */
export function displayBanner(): void {
  // Select banner based on terminal capability
  const banner = isUnicodeSupported() ? UNICODE_BANNER : ASCII_BANNER;

  // Output banner with cyan color (chalk automatically respects NO_COLOR)
  console.log(chalk.cyan(banner));
}
