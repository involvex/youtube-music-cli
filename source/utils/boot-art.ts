/** Pixelfont (pyfiglet) boot banners — keep Ink + immersive in sync. */

/** Full product name — ~63 cols */
export const YMC_ART_FULL = [
	'█▄█\u2001█▀█\u2001█ █\u2001▀█▀\u2001█ █\u2001█▄▄\u2001█▀▀\u2001▄▄\u2001█▀▄▀█\u2001█ █\u2001█▀\u2001█\u2001█▀▀\u2001▄▄\u2001█▀▀\u2001█\u2001\u2001\u2001█\u2001',
	' █\u2001\u2001█▄█\u2001█▄█\u2001 █\u2001\u2001█▄█\u2001█▄█\u2001██▄\u2001\u2001\u2001\u2001█ ▀ █\u2001█▄█\u2001▄█\u2001█\u2001█▄▄\u2001\u2001\u2001\u2001█▄▄\u2001█▄▄\u2001█\u2001',
] as const;

/** Compact mark — ~14 cols */
export const YMC_ART_COMPACT = [
	'█▄█\u2001█▀▄▀█\u2001█▀▀\u2001',
	' █\u2001\u2001█ ▀ █\u2001█▄▄\u2001',
] as const;

export const BOOT_TAGLINE = 'terminal music player';

/**
 * Pick boot art that fits the terminal. Prefer the full pixelfont wordmark
 * when there is room; fall back to compact "YMC" or plain text.
 */
export function resolveBootArt(columns: number): string[] {
	const fullWidth = Math.max(...YMC_ART_FULL.map(line => line.length));
	const compactWidth = Math.max(...YMC_ART_COMPACT.map(line => line.length));

	if (columns >= fullWidth + 6) {
		return [...YMC_ART_FULL];
	}

	if (columns >= compactWidth + 4) {
		return [...YMC_ART_COMPACT];
	}

	return ['YMC'];
}
